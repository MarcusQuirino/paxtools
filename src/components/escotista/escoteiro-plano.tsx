import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useProgression } from "@/hooks/use-progression";
import { useResolvedPlan } from "@/hooks/use-resolved-plan";
import {
  planItemState,
  type PlanItemResolved,
  type PlanItemState,
} from "@/lib/plan-view";
import { Award, CheckCircle2, Clock, Sparkles, Star } from "lucide-react";

const NO_ESPECIALIDADES = { ramoGroup: "younger" as const, standings: [] };

/**
 * An escoteiro's Plano as an escotista reads it: read-only, in the
 * escoteiro's own order, split into what is next, what awaits approval and
 * what is done. Only the escoteiro edits their Plano.
 */
export function EscoteiroPlano({
  escoteiroId,
  name,
}: {
  escoteiroId: Id<"users">;
  name: string;
}) {
  const { data: items } = useSuspenseQuery(
    convexQuery(api.plan.getPlanForUser, { targetUserId: escoteiroId }),
  );
  const { data: especialidadesRecord } = useSuspenseQuery(
    convexQuery(api.specialties.getEscoteiroEspecialidades, { escoteiroId }),
  );
  const progression = useProgression(escoteiroId);
  const resolved = useResolvedPlan(
    items,
    progression,
    especialidadesRecord ?? NO_ESPECIALIDADES,
  );

  const firstName = name.split(" ")[0];

  if (resolved.length === 0) {
    return (
      <div
        data-testid="escoteiro-plano-vazio"
        className="rounded-md border-2 border-dashed border-black bg-card p-8 text-center space-y-3"
      >
        <Sparkles className="size-8 mx-auto text-primary" />
        <p className="text-sm font-black uppercase">
          {firstName} ainda não montou um plano
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          O plano aparece aqui quando o escoteiro marca com a estrela as ações e
          especialidades que quer fazer.
        </p>
      </div>
    );
  }

  const byState: Record<PlanItemState, PlanItemResolved[]> = {
    open: [],
    pending: [],
    done: [],
  };
  for (const item of resolved) byState[planItemState(item)].push(item);

  return (
    <div className="space-y-4" data-testid="escoteiro-plano">
      <div className="rounded-md border-2 border-black bg-card p-4 shadow-[3px_3px_0px_0px_#000]">
        <div className="flex items-center gap-2">
          <Star className="size-4 fill-yellow-400 text-black" />
          <p className="text-sm font-black uppercase">Plano de {firstName}</p>
        </div>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          Na ordem de prioridade que o escoteiro definiu.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Count label="A fazer" value={byState.open.length} />
          <Count
            label="Aguardando"
            value={byState.pending.length}
            className="bg-amber-100"
          />
          <Count
            label="Concluídos"
            value={byState.done.length}
            className="bg-green-100"
          />
        </div>
      </div>

      {byState.open.length > 0 && (
        <Section title="Próximos passos">
          {byState.open.map((item, i) => (
            <PlanoRow key={item.itemKey} item={item} rank={i + 1} />
          ))}
        </Section>
      )}
      {byState.pending.length > 0 && (
        <Section title="Aguardando aprovação">
          {byState.pending.map((item) => (
            <PlanoRow key={item.itemKey} item={item} state="pending" />
          ))}
        </Section>
      )}
      {byState.done.length > 0 && (
        <Section title="Concluídos">
          {byState.done.map((item) => (
            <PlanoRow key={item.itemKey} item={item} state="done" />
          ))}
        </Section>
      )}
    </div>
  );
}

function Count({
  label,
  value,
  className = "bg-muted",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md border-2 border-black px-2 py-1.5 text-center ${className}`}
    >
      <p className="text-lg font-black leading-none">{value}</p>
      <p className="mt-0.5 text-[10px] font-bold uppercase">{label}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PlanoRow({
  item,
  rank,
  state = "open",
}: {
  item: PlanItemResolved;
  rank?: number;
  state?: PlanItemState;
}) {
  const label =
    item.kind === "especialidade" ? "Especialidade" : item.bloco.name;
  return (
    <div
      className={`rounded-md border-2 border-black bg-card flex items-stretch shadow-[2px_2px_0px_0px_#000] ${
        state === "done" ? "opacity-70" : ""
      }`}
    >
      <div className="w-9 shrink-0 flex items-center justify-center border-r-2 border-black">
        {state === "open" && <span className="text-sm font-black">{rank}</span>}
        {state === "pending" && <Clock className="size-4 text-amber-600" />}
        {state === "done" && <CheckCircle2 className="size-4 text-green-600" />}
      </div>
      <div
        className="flex-1 min-w-0 px-3 py-2"
        style={{ borderLeft: `3px solid ${item.eixo.color}` }}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: item.eixo.color }}
        >
          {label}
        </span>
        <RowText item={item} done={state === "done"} />
      </div>
    </div>
  );
}

function RowText({ item, done }: { item: PlanItemResolved; done: boolean }) {
  const textClass = `text-sm leading-snug ${
    done ? "line-through text-muted-foreground" : ""
  }`;
  if (item.kind === "action") return <p className={textClass}>{item.text}</p>;
  if (item.kind === "custom") {
    return (
      <p className={textClass}>
        {item.customAction.text}
        <span className="ml-1.5 text-[10px] font-bold uppercase text-muted-foreground">
          · personalizada
        </span>
      </p>
    );
  }
  if (item.kind === "specialty") {
    return (
      <p className={`${textClass} flex items-center gap-1.5`}>
        <Award className="size-3.5 shrink-0 text-muted-foreground" />
        {item.specialtyName}
      </p>
    );
  }
  const { approved, total, unit } = item.progress;
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  return (
    <div>
      <p className={`${textClass} flex items-center gap-1.5`}>
        <Award className="size-3.5 shrink-0 text-muted-foreground" />
        {item.name}
      </p>
      {!done && (
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-muted border border-black/20 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, backgroundColor: item.eixo.color }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {approved}/{total} {unit}
          </span>
        </div>
      )}
    </div>
  );
}
