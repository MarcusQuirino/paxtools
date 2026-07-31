/**
 * PROTOTYPE — throwaway. Issue #54: "what should the row hover tint be?"
 * Four variants of the action-row hover/active tint, switchable via `?variant=`,
 * shown across all four eixo palettes + the IRR block. Row markup is a local
 * copy of action-item.tsx / custom-action-input.tsx / recognition-section.tsx so
 * production components stay untouched. Delete with prototype-switcher.tsx.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import { Clock, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PrototypeSwitcher } from "@/components/prototype-switcher";
import { EIXOS_SENIOR } from "@/data/progression-data/senior";
import { getRamoRules } from "@/data/progression-rules";

const VARIANTS = [
  { key: "atual", name: "Hoje (verde global)" },
  { key: "A", name: "color @12% / @22%" },
  { key: "B", name: "colorLight / color @20%" },
  { key: "C", name: "colorLight @60% / opaco" },
];

type Force = "none" | "hover" | "active";
type Tint = {
  className: string;
  style?: CSSProperties;
  hover?: string;
  active?: string;
};

/** The whole point of the prototype: four ways to tint one row. */
function tintFor(variant: string, color: string, colorLight: string): Tint {
  const vars = (hover: string, active: string) => ({
    className: "hover:bg-[var(--rowHover)] active:bg-[var(--rowActive)]",
    style: { "--rowHover": hover, "--rowActive": active } as CSSProperties,
    hover,
    active,
  });

  switch (variant) {
    case "A":
      return vars(`${color}1F`, `${color}38`);
    case "B":
      return vars(colorLight, `${color}33`);
    case "C":
      return vars(`${colorLight}99`, colorLight);
    default:
      return {
        className: "hover:bg-accent/40 active:bg-accent/70",
        hover: "color-mix(in oklab, var(--accent) 40%, transparent)",
        active: "color-mix(in oklab, var(--accent) 70%, transparent)",
      };
  }
}

type RowProps = {
  text: string;
  color: string;
  tint: Tint;
  checked?: boolean;
  pending?: boolean;
  locked?: boolean;
  deletable?: boolean;
  force: Force;
};

function Row({
  text,
  color,
  tint,
  checked,
  pending,
  locked,
  deletable,
  force,
}: RowProps) {
  const forced =
    !locked && force !== "none"
      ? { backgroundColor: force === "hover" ? tint.hover : tint.active }
      : undefined;

  return (
    <label
      className={`flex items-start gap-3 p-3 min-h-[44px] transition-colors group ${
        locked ? "cursor-not-allowed" : `cursor-pointer ${tint.className}`
      }`}
      style={locked ? undefined : { ...tint.style, ...forced }}
    >
      <Checkbox
        checked={checked}
        disabled={locked}
        className="mt-0.5 size-5"
        style={
          checked
            ? {
                backgroundColor: color,
                borderColor: color,
                opacity: pending ? 0.4 : 1,
              }
            : undefined
        }
      />
      <span
        className={`text-sm leading-relaxed flex-1 ${
          checked
            ? pending
              ? "text-muted-foreground/60"
              : "line-through text-muted-foreground"
            : ""
        }`}
      >
        {text}
      </span>
      {pending && <Clock className="size-3.5 text-slate-400 mt-0.5 shrink-0" />}
      {deletable && (
        <span className="text-muted-foreground p-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Trash2 className="size-4" />
        </span>
      )}
    </label>
  );
}

function EixoBlock({
  eixo,
  variant,
  force,
}: {
  eixo: (typeof EIXOS_SENIOR)[number];
  variant: string;
  force: Force;
}) {
  const { color, colorLight } = eixo;
  const tint = tintFor(variant, color, colorLight);
  const bloco = eixo.blocos[0]!;

  return (
    <section className="rounded-md overflow-hidden border-2 border-black bg-card shadow-[4px_4px_0px_0px_#065f46]">
      <div
        className="px-4 py-3 text-white border-b-2 border-black"
        style={{ backgroundColor: color }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-black text-base uppercase tracking-tight">
            {eixo.name}
          </h2>
          <span className="text-xs font-bold opacity-90">1/6 blocos</span>
        </div>
        <Progress
          value={20}
          className="mt-2 border-white/60 bg-white/20 [&>[data-slot=progress-indicator]]:bg-white"
        />
      </div>

      <div className="px-3 py-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{bloco.name}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            2/5
          </Badge>
        </div>

        <div>
          <div
            className="text-xs font-black uppercase tracking-widest px-3 py-2 rounded-t-md text-white border-2 border-black"
            style={{ backgroundColor: color }}
          >
            Ações Fixas
          </div>
          <div className="border-2 border-t-0 border-black rounded-b-md divide-y-2 divide-black/20">
            {bloco.fixedActions.slice(0, 2).map((a) => (
              <Row key={a.id} text={a.text} color={color} tint={tint} force={force} />
            ))}
            <Row
              text={bloco.fixedActions[2]?.text ?? "Ação aprovada (bloqueada)"}
              color={color}
              tint={tint}
              force={force}
              checked
              locked
            />
          </div>
        </div>

        <div>
          <div
            className="text-xs font-black uppercase tracking-widest px-3 py-2 rounded-t-md flex items-center justify-between border-2 border-black"
            style={{ backgroundColor: colorLight, color }}
          >
            <span>Ações Variáveis</span>
            <span className="text-xs font-bold">1/3 necessárias</span>
          </div>
          <div className="border-2 border-t-0 border-black rounded-b-md divide-y-2 divide-black/20">
            {bloco.variableActions.slice(0, 2).map((a) => (
              <Row key={a.id} text={a.text} color={color} tint={tint} force={force} />
            ))}
            <Row
              text={bloco.variableActions[2]?.text ?? "Ação pendente"}
              color={color}
              tint={tint}
              force={force}
              checked
              pending
            />
            <Row
              text="Ação personalizada do jovem"
              color={color}
              tint={tint}
              force={force}
              deletable
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function IrrBlock({ variant, force }: { variant: string; force: Force }) {
  const { irr } = getRamoRules("senior");
  const tint = tintFor(variant, irr.color, irr.colorLight);

  return (
    <section className="rounded-md overflow-hidden border-2 border-black bg-card shadow-[4px_4px_0px_0px_#065f46]">
      <div
        className="px-4 py-3 text-white border-b-2 border-black"
        style={{ backgroundColor: irr.color }}
      >
        <h2 className="font-black text-base uppercase tracking-tight">
          {irr.name} (IRR)
        </h2>
      </div>
      <div className="divide-y-2 divide-black/20">
        {irr.items.slice(0, 4).map((item, i) => (
          <Row
            key={item.id}
            text={item.text}
            color={irr.color}
            tint={tint}
            force={force}
            checked={i === 0}
            locked={i === 0}
          />
        ))}
      </div>
    </section>
  );
}

function PrototypeTint() {
  const { variant } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [force, setForce] = useState<Force>("none");

  return (
    <div className="min-h-screen bg-background p-4 pb-28">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-md border-2 border-black bg-yellow-100 p-3 text-xs font-bold space-y-2">
          <p>
            PROTÓTIPO — #54. Passe o mouse (e segure o clique) nas linhas.
            Variante: <code>{variant}</code>. Setas ←/→ trocam.
          </p>
          <div className="flex gap-1">
            {(["none", "hover", "active"] as Force[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setForce(f)}
                className={`rounded-md border-2 border-black px-2 py-1 text-[11px] uppercase ${
                  force === f ? "bg-black text-white" : "bg-white"
                }`}
              >
                {f === "none" ? "normal" : `forçar ${f}`}
              </button>
            ))}
          </div>
        </div>
        {EIXOS_SENIOR.map((eixo) => (
          <EixoBlock
            key={eixo.id}
            eixo={eixo}
            variant={variant}
            force={force}
          />
        ))}
        <IrrBlock variant={variant} force={force} />
      </div>
      <PrototypeSwitcher
        variants={VARIANTS}
        current={variant}
        onChange={(key) =>
          navigate({ search: { variant: key }, replace: true })
        }
      />
    </div>
  );
}

export const Route = createFileRoute("/prototype-tint")({
  validateSearch: (search: Record<string, unknown>) => ({
    variant:
      typeof search.variant === "string" && VARIANTS.some((v) => v.key === search.variant)
        ? search.variant
        : "atual",
  }),
  component: PrototypeTint,
});
