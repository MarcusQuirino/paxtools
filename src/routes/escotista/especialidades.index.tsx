import { useMemo } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { EIXO_COLORS, eixoMeta } from "@/data/eixo-colors";
import {
  catalogFor,
  filterCatalog,
  isListing,
  plural,
  type CatalogEntry,
  type RamoGroup,
} from "@/lib/specialty-catalog";
import { EmptyState } from "@/components/ui/empty-state";
import { EixoFilterChips, FilterChip } from "@/components/ui/filter-chips";
import { KpiGrid, KpiTile } from "@/components/ui/kpi-tile";
import { DashedRowButton, ListRow, RowChevron, RowSnippet } from "@/components/ui/list-row";
import { AvatarStack } from "@/components/ui/person-avatar";
import { SearchInput } from "@/components/ui/search-input";
import { ListBox, Note, SectionHeading } from "@/components/ui/section";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  RAMO_GROUP_LABEL,
  defaultRamoGroup,
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
  const listing = isListing(query, filter);
  const eixoFilter = filter && filter !== "ativas" ? filter : null;

  const results = useMemo(() => {
    if (!listing) return [];
    const pool: CatalogEntry[] =
      filter === "ativas"
        ? (summary?.specialties ?? [])
            .map((s) => byId.get(s.specialtyId))
            .filter((e): e is CatalogEntry => !!e)
        : catalog;
    return filterCatalog(pool, { query, eixoId: eixoFilter });
  }, [listing, catalog, filter, eixoFilter, summary, byId, query]);

  const withActivity = (summary?.specialties ?? []).filter((s) =>
    byId.has(s.specialtyId),
  );

  return (
    <div>
      {summary && summary.ramoGroups.length > 1 && (
        <SegmentedControl
          ariaLabel="Catálogo"
          size="sm"
          className="mb-3"
          value={grupo}
          onChange={(g) => setSearch({ grupo: g, f: undefined })}
          options={summary.ramoGroups.map((g) => ({ value: g, label: RAMO_GROUP_LABEL[g] }))}
        />
      )}

      <SearchInput
        className="mb-2.5"
        value={query}
        onChange={(q) => setSearch({ q: q || undefined })}
        placeholder="Buscar por nome ou requisito"
        testId="catalog-search"
      />

      <EixoFilterChips
        className="mb-3"
        value={eixoFilter}
        onChange={(id) => setSearch({ f: id ?? undefined })}
        before={
          <FilterChip
            on={filter === "ativas"}
            onClick={() => setSearch({ f: filter === "ativas" ? undefined : "ativas" })}
            testId="chip-ativas"
          >
            <Users className="size-4" strokeWidth={2.5} />
            Com atividade na tropa
          </FilterChip>
        }
      />

      {!summary ? (
        <EmptyState>Sem acesso aos escoteiros deste grupo.</EmptyState>
      ) : listing ? (
        <>
          <SectionHeading
            className="mt-1"
            label={
              filter === "ativas"
                ? "Com atividade"
                : eixoFilter
                  ? eixoMeta(eixoFilter).name
                  : "Resultados"
            }
            meta={plural(results.length, "especialidade", "especialidades")}
          />
          {results.length === 0 ? (
            <EmptyState title="Nada encontrado">Tente outro termo ou limpe o filtro.</EmptyState>
          ) : (
            <ListBox testId="catalog-results">
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
          <KpiGrid className="mb-1.5">
            <KpiTile tone="gold" value={summary.totals.earned} label="Conquistadas na tropa" />
            <KpiTile value={summary.totals.inProgress} label="Em andamento" />
          </KpiGrid>
          <Note className="mb-3 mt-0">
            {plural(summary.escoteiroCount, "escoteiro", "escoteiros")} ·{" "}
            {summary.observedSectionName
              ? `seção observada: ${summary.observedSectionName} · troque no Painel.`
              : "todas as seções · troque no Painel."}
          </Note>

          <SectionHeading
            label="Na tropa"
            meta={plural(withActivity.length, "especialidade", "especialidades")}
          />
          {withActivity.length === 0 ? (
            <EmptyState title="Nenhuma atividade ainda">
              Quando um escoteiro marcar ou tiver itens aprovados, a especialidade aparece aqui.
            </EmptyState>
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
                <DashedRowButton onClick={() => setSearch({ f: "ativas" })}>
                  Ver as {withActivity.length} com atividade
                  <span className="ml-auto">
                    <RowChevron />
                  </span>
                </DashedRowButton>
              )}
            </>
          )}

          <SectionHeading label="Catálogo" meta={`${catalog.length} · por eixo`} />
          <ListBox>
            {EIXO_COLORS.map((e) => {
              const inEixo = catalog.filter((c) => c.eixoId === e.id);
              if (inEixo.length === 0) return null;
              const active = inEixo.filter((c) => activity.has(c.id)).length;
              return (
                <ListRow
                  key={e.id}
                  tall
                  bar={e.color}
                  title={e.name}
                  subtitle={`${plural(inEixo.length, "especialidade", "especialidades")}${
                    active > 0 ? ` · ${active} com atividade` : ""
                  }`}
                  chevron
                  onClick={() => setSearch({ f: e.id })}
                />
              );
            })}
          </ListBox>
          <Note>
            A busca cobre o nome <i>e</i> o texto dos{" "}
            {grupo === "younger" ? "itens" : "sugestões das etapas"} — os resultados mostram o
            trecho que casou.
          </Note>
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
    <ListRow
      tall
      bar={eixo.color}
      title={entry.name}
      subtitle={`${entry.itemCount != null ? `${entry.itemCount} itens` : "3 etapas"} · ${eixo.name}`}
      extra={
        <>
          {snippet && <RowSnippet>{snippet}</RowSnippet>}
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
                <span className="text-[#6B4A00]">{activity.inProgressCount} em andamento</span>
              )}
              <AvatarStack people={activity.avatars} total={total} />
            </span>
          )}
        </>
      }
      chevron
      link={
        <Link
          to="/escotista/especialidades/$specialtyId"
          params={{ specialtyId: entry.id }}
          search={{ grupo }}
        />
      }
    />
  );
}
