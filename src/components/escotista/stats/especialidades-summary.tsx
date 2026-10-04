import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { api } from "../../../../convex/_generated/api";
import {
  EixoDot,
  FichaLink,
  RAMO_GROUP_LABEL,
  RowChevron,
  eixoMeta,
  findCatalogEntry,
  plural,
  type RamoGroup,
} from "@/components/escotista/especialidades/ui";

type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";

const ROW_CLASS =
  "flex min-h-11 items-center gap-2 rounded-md px-1 text-xs hover:bg-muted/60";

/**
 * Especialidades on the Stats page: the cohort's KPIs, what awaits approval,
 * the most conquered, plano demand and the blocos earned through one. Every
 * row links into the Especialidades tab (detail) or the escoteiro's ficha.
 */
export function EspecialidadesSummary({ ramo }: { ramo: Ramo }) {
  const { data } = useSuspenseQuery(
    convexQuery(api.stats.getRamoSpecialties, { ramo }),
  );
  const group: RamoGroup = data.ramoGroup;
  const { totals } = data;
  const name = (id: string) => findCatalogEntry(group, id)?.name ?? id;
  const empty = totals.earned === 0 && totals.inProgress === 0 && data.demand.length === 0;

  return (
    <section
      className="space-y-4 rounded-md border-2 border-black bg-card p-4 shadow-[2px_2px_0px_0px_#000]"
      data-testid="stats-especialidades"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-black uppercase">Especialidades</h3>
        <Link
          to="/escotista/especialidades"
          search={{ grupo: group }}
          className="text-xs font-bold text-primary underline-offset-2 hover:underline"
        >
          Ver catálogo
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2" data-testid="stats-esp-kpis">
        <Kpi label="Conquistadas" value={totals.earned} testId="stats-esp-earned" />
        {group === "younger" ? (
          <Kpi label="Nível 2" value={totals.level2} testId="stats-esp-level2" />
        ) : (
          <Kpi label="Em andamento" value={totals.inProgress} testId="stats-esp-in-progress" />
        )}
        <Kpi
          label="Aguardando"
          value={totals.pending}
          tone={totals.pending > 0 ? "amber" : undefined}
          testId="stats-esp-pending"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {plural(totals.distinctEarned, "especialidade diferente conquistada", "especialidades diferentes conquistadas")}
        {totals.scoutsWithNone > 0 &&
          ` · ${plural(totals.scoutsWithNone, "escoteiro ainda não começou", "escoteiros ainda não começaram")}`}
        {group === "younger" && totals.inProgress > 0 && ` · ${totals.inProgress} em andamento`}
        {` · catálogo ${RAMO_GROUP_LABEL[group]}`}
      </p>

      {empty ? (
        <p className="text-xs text-muted-foreground" data-testid="stats-esp-empty">
          Nenhuma especialidade iniciada neste ramo ainda.
        </p>
      ) : (
        <>
          {data.pending.length > 0 && (
            <Block title="Aguardando aprovação" testId="stats-esp-pending-list">
              {data.pending.map((p) => (
                <li key={`${p.escoteiroId}:${p.specialtyId}`}>
                  <FichaLink escoteiroId={p.escoteiroId} specialtyId={p.specialtyId} className={ROW_CLASS}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{p.escoteiroName ?? "Sem nome"}</span>
                      <span className="block truncate text-muted-foreground">{name(p.specialtyId)}</span>
                    </span>
                    <span className="shrink-0 rounded-full border-2 border-black bg-amber-100 px-2 font-bold text-amber-800">
                      {p.count}
                    </span>
                    <RowChevron />
                  </FichaLink>
                </li>
              ))}
            </Block>
          )}

          {data.topEarned.length > 0 && (
            <Block title="Mais conquistadas" testId="stats-esp-top">
              {data.topEarned.map((s) => (
                <li key={s.specialtyId}>
                  <SpecialtyRow group={group} specialtyId={s.specialtyId} eixoId={s.eixoId} name={name(s.specialtyId)}>
                    {s.earnedCount}/{data.scoutCount}
                  </SpecialtyRow>
                </li>
              ))}
            </Block>
          )}

          {data.demand.length > 0 && (
            <Block title="No plano dos escoteiros" testId="stats-esp-demand">
              {data.demand.map((d) => (
                <li key={d.specialtyId}>
                  <SpecialtyRow group={group} specialtyId={d.specialtyId} eixoId={d.eixoId} name={name(d.specialtyId)}>
                    {plural(d.starredCount, "quer", "querem")}
                    {d.startedCount > 0 && ` · ${d.startedCount} já ${d.startedCount === 1 ? "começou" : "começaram"}`}
                  </SpecialtyRow>
                </li>
              ))}
            </Block>
          )}

          {data.blocosViaEspecialidade.length > 0 && (
            <Block title="Blocos concluídos via especialidade" testId="stats-esp-blocos">
              {data.blocosViaEspecialidade.slice(0, 5).map((b) => (
                <li key={b.blocoId} className="flex min-h-9 items-center gap-2 px-1 text-xs">
                  <EixoDot color={eixoMeta(b.eixoId).color} />
                  <span className="min-w-0 flex-1 truncate font-medium">{b.blocoName}</span>
                  <span className="shrink-0 font-bold text-muted-foreground">
                    {plural(b.scoutCount, "escoteiro", "escoteiros")}
                  </span>
                </li>
              ))}
            </Block>
          )}
        </>
      )}
    </section>
  );
}

function Kpi({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: number;
  tone?: "amber";
  testId: string;
}) {
  return (
    <div
      className={`rounded-md border-2 border-black p-2 text-center ${tone === "amber" ? "bg-amber-100" : "bg-muted/40"}`}
      data-testid={testId}
    >
      <p className="text-xl font-black">{value}</p>
      <p className="text-xs font-bold leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

function Block({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1" data-testid={testId}>
      <h4 className="text-xs font-black uppercase text-muted-foreground">{title}</h4>
      <ul>{children}</ul>
    </div>
  );
}

function SpecialtyRow({
  group,
  specialtyId,
  eixoId,
  name,
  children,
}: {
  group: RamoGroup;
  specialtyId: string;
  eixoId: string;
  name: string;
  children: ReactNode;
}) {
  return (
    <Link
      to="/escotista/especialidades/$specialtyId"
      params={{ specialtyId }}
      search={{ grupo: group }}
      className={ROW_CLASS}
    >
      <EixoDot color={eixoMeta(eixoId).color} />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      <span className="shrink-0 font-bold text-muted-foreground">{children}</span>
      <RowChevron />
    </Link>
  );
}
