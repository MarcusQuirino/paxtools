import { useMemo } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { formatGroupIdentity } from "@/lib/group-identity";
import {
  AvatarStack,
  ChipRow,
  defaultRamoGroup,
  EixoDot,
  EIXOS,
  FilterChip,
  ListBox,
  RAMO_GROUP_LABEL,
  RowChevron,
  SearchField,
  SectionHeading,
  catalogFor,
  eixoMeta,
  matchEntry,
  plural,
  type CatalogEntry,
  type RamoGroup,
} from "@/components/escotista/especialidades/ui";

type CatalogSearch = {
  grupo?: RamoGroup;
  /** Free-text search over names and item/suggestion text. */
  q?: string;
  /** "ativas" (com atividade na tropa) or an eixoId. */
  f?: string;
};

export const Route = createFileRoute("/escotista/especialidades/")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    grupo:
      search.grupo === "younger" || search.grupo === "older"
        ? search.grupo
        : undefined,
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    f: typeof search.f === "string" && search.f ? search.f : undefined,
  }),
  component: EspecialidadesCatalog,
});

type SummaryEntry = {
  specialtyId: string;
  earnedCount: number;
  inProgressCount: number;
  pendingCount: number;
  avatars: { _id: string; name: string | null; image: string | null }[];
};

/** How many of the "Na tropa" rows show before "Ver as N com atividade". */
const NA_TROPA_PREVIEW = 4;

function EspecialidadesCatalog() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  const { data: myGroup } = useSuspenseQuery(
    convexQuery(api.groups.getMyGroup, {}),
  );
  const grupo = search.grupo ?? defaultRamoGroup(user);
  const { data: summary } = useSuspenseQuery(
    convexQuery(api.specialties.getGroupSpecialtySummary, { ramoGroup: grupo }),
  );

  const setSearch = (patch: Partial<CatalogSearch>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
    });

  const activity = useMemo(() => {
    const m = new Map<string, SummaryEntry>();
    for (const s of summary?.specialties ?? []) m.set(s.specialtyId, s);
    return m;
  }, [summary]);

  const catalog = catalogFor(grupo);
  const byId = useMemo(
    () => new Map(catalog.map((e) => [e.id, e] as const)),
    [catalog],
  );

  const query = search.q ?? "";
  const filter = search.f;
  const listing = !!query.trim() || !!filter;

  const results = useMemo(() => {
    if (!listing) return [];
    let pool: CatalogEntry[] = catalog;
    if (filter === "ativas") {
      pool = (summary?.specialties ?? [])
        .map((s) => byId.get(s.specialtyId))
        .filter((e): e is CatalogEntry => !!e);
    } else if (filter) {
      pool = pool.filter((e) => e.eixoId === filter);
    }
    return pool.flatMap((entry) => {
      const m = matchEntry(entry, query);
      return m.matched ? [{ entry, snippet: m.snippet }] : [];
    });
  }, [listing, catalog, filter, summary, byId, query]);

  const withActivity = (summary?.specialties ?? []).filter((s) =>
    byId.has(s.specialtyId),
  );
  const identity = formatGroupIdentity(myGroup?.number, myGroup?.regiao);
  const eyebrow = [
    summary?.observedSectionName ?? myGroup?.name ?? null,
    identity,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="text-[#141414]">
      <header className="mb-3">
        {eyebrow && (
          <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8A887F]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[28px] font-black leading-[1.05] tracking-[-0.02em]">
          Especialidades
        </h1>
      </header>

      {summary && summary.ramoGroups.length > 1 && (
        <div
          role="tablist"
          aria-label="Catálogo"
          className="mb-3 flex gap-1 rounded-[10px] border-2 border-[#141414] bg-[#EEE9DC] p-1"
        >
          {summary.ramoGroups.map((g) => {
            const on = g === grupo;
            return (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setSearch({ grupo: g, f: undefined })}
                className={`min-h-11 flex-1 rounded-md border-2 px-2 text-[13px] font-extrabold ${
                  on
                    ? "border-[#141414] bg-white shadow-[2px_2px_0_#141414]"
                    : "border-transparent text-[#4A4A44]"
                }`}
              >
                {RAMO_GROUP_LABEL[g]}
              </button>
            );
          })}
        </div>
      )}

      <SearchField value={query} onChange={(q) => setSearch({ q })} />

      <ChipRow>
        <FilterChip on={!filter} onClick={() => setSearch({ f: undefined })}>
          Todas
        </FilterChip>
        <FilterChip
          on={filter === "ativas"}
          onClick={() => setSearch({ f: filter === "ativas" ? undefined : "ativas" })}
        >
          <Users className="size-4" strokeWidth={2.5} />
          Com atividade na tropa
        </FilterChip>
        {EIXOS.map((e) => (
          <FilterChip
            key={e.id}
            on={filter === e.id}
            onClick={() => setSearch({ f: filter === e.id ? undefined : e.id })}
          >
            <EixoDot color={e.color} />
            {e.name}
          </FilterChip>
        ))}
      </ChipRow>

      {!summary ? (
        <p className="rounded-[10px] border-2 border-dashed border-[#8A887F] p-5 text-center text-sm text-[#4A4A44]">
          Sem acesso aos escoteiros deste grupo.
        </p>
      ) : listing ? (
        <>
          <SectionHeading
            label={
              filter === "ativas"
                ? "Com atividade"
                : filter
                  ? eixoMeta(filter).name
                  : "Resultados"
            }
            meta={plural(results.length, "especialidade", "especialidades")}
          />
          {results.length === 0 ? (
            <p className="rounded-[10px] border-2 border-dashed border-[#8A887F] p-5 text-center text-sm text-[#4A4A44]">
              <b className="block text-[15px] text-[#141414]">Nada encontrado</b>
              Tente outro termo ou limpe o filtro.
            </p>
          ) : (
            <ListBox>
              {results.map(({ entry, snippet }) => (
                <SpecialtyRow
                  key={entry.id}
                  entry={entry}
                  grupo={grupo}
                  activity={activity.get(entry.id)}
                  snippet={snippet}
                />
              ))}
            </ListBox>
          )}
        </>
      ) : (
        <>
          <div className="mb-1.5 grid grid-cols-2 gap-2">
            <div className="rounded-[10px] border-2 border-[#141414] bg-[#F4C430] px-3 py-2.5">
              <p className="text-[26px] font-black leading-none">
                {summary.totals.earned}
              </p>
              <p className="mt-1 text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#4A4A44]">
                Conquistadas na tropa
              </p>
            </div>
            <div className="rounded-[10px] border-2 border-[#141414] bg-white px-3 py-2.5">
              <p className="text-[26px] font-black leading-none">
                {summary.totals.inProgress}
              </p>
              <p className="mt-1 text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#4A4A44]">
                Em andamento
              </p>
            </div>
          </div>
          <p className="mb-3 text-[12px] text-[#8A887F]">
            {plural(summary.escoteiroCount, "escoteiro", "escoteiros")} ·{" "}
            {summary.observedSectionName
              ? `seção observada: ${summary.observedSectionName} · troque no Painel.`
              : "todas as seções · troque no Painel."}
          </p>

          <SectionHeading
            label="Na tropa"
            meta={plural(withActivity.length, "especialidade", "especialidades")}
          />
          {withActivity.length === 0 ? (
            <p className="rounded-[10px] border-2 border-dashed border-[#8A887F] p-5 text-center text-sm text-[#4A4A44]">
              <b className="block text-[15px] text-[#141414]">
                Nenhuma atividade ainda
              </b>
              Quando um escoteiro marcar ou tiver itens aprovados, a
              especialidade aparece aqui.
            </p>
          ) : (
            <>
              <ListBox>
                {withActivity.slice(0, NA_TROPA_PREVIEW).map((s) => (
                  <SpecialtyRow
                    key={s.specialtyId}
                    entry={byId.get(s.specialtyId)!}
                    grupo={grupo}
                    activity={s}
                  />
                ))}
              </ListBox>
              {withActivity.length > NA_TROPA_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setSearch({ f: "ativas" })}
                  className="mt-2 flex min-h-[52px] w-full items-center gap-3 rounded-[10px] border-2 border-dashed border-[#D9D5C9] px-3 text-left text-[15px] font-extrabold text-[#0E6B4E]"
                >
                  Ver as {withActivity.length} com atividade
                  <span className="ml-auto">
                    <RowChevron />
                  </span>
                </button>
              )}
            </>
          )}

          <SectionHeading
            label="Catálogo"
            meta={`${catalog.length} · por eixo`}
          />
          <ListBox>
            {EIXOS.map((e) => {
              const inEixo = catalog.filter((c) => c.eixoId === e.id);
              if (inEixo.length === 0) return null;
              const active = inEixo.filter((c) => activity.has(c.id)).length;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setSearch({ f: e.id })}
                  className="flex min-h-16 w-full items-center gap-3 border-t-[1.5px] border-[#D9D5C9] py-2.5 pr-3 text-left first:border-t-0"
                >
                  <span
                    className="w-2 self-stretch"
                    style={{ background: e.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-extrabold leading-tight">
                      {e.name}
                    </span>
                    <span className="mt-0.5 block text-[12px] font-semibold text-[#8A887F]">
                      {plural(inEixo.length, "especialidade", "especialidades")}
                      {active > 0 && ` · ${active} com atividade`}
                    </span>
                  </span>
                  <RowChevron />
                </button>
              );
            })}
          </ListBox>
          <p className="mt-2 text-[12px] text-[#8A887F]">
            A busca cobre o nome <i>e</i> o texto dos{" "}
            {grupo === "younger" ? "itens" : "sugestões das etapas"} — os
            resultados mostram o trecho que casou.
          </p>
        </>
      )}
    </div>
  );
}

function SpecialtyRow({
  entry,
  grupo,
  activity,
  snippet,
}: {
  entry: CatalogEntry;
  grupo: RamoGroup;
  activity?: SummaryEntry;
  snippet?: string | null;
}) {
  const eixo = eixoMeta(entry.eixoId);
  const total = activity ? activity.earnedCount + activity.inProgressCount : 0;
  return (
    <Link
      to="/escotista/especialidades/$specialtyId"
      params={{ specialtyId: entry.id }}
      search={{ grupo }}
      className="flex min-h-16 w-full items-center gap-3 border-t-[1.5px] border-[#D9D5C9] py-2.5 pr-3 text-left first:border-t-0 hover:bg-black/[0.02]"
    >
      <span className="w-2 self-stretch" style={{ background: eixo.color }} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold leading-tight">
          {entry.name}
        </span>
        <span className="mt-0.5 block text-[12px] font-semibold text-[#8A887F]">
          {entry.itemCount != null
            ? `${entry.itemCount} itens`
            : "3 etapas"}{" "}
          · {eixo.name}
        </span>
        {snippet && (
          <span className="mt-1 line-clamp-2 block border-l-[3px] border-[#D9D5C9] pl-2 text-[12px] text-[#4A4A44]">
            {snippet}
          </span>
        )}
        {activity && total > 0 && (
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-bold text-[#8A887F]">
            {activity.earnedCount > 0 && (
              <b className="text-[#0E6B4E]">
                {activity.earnedCount}{" "}
                {activity.earnedCount === 1 ? "conquistou" : "conquistaram"}
              </b>
            )}
            {activity.earnedCount > 0 && activity.inProgressCount > 0 && "·"}
            {activity.inProgressCount > 0 && (
              <span className="text-[#6B4A00]">
                {activity.inProgressCount} em andamento
              </span>
            )}
            <AvatarStack people={activity.avatars} total={total} />
          </span>
        )}
      </span>
      <RowChevron />
    </Link>
  );
}
