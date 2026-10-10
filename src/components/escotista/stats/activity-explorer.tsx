import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { getEixosForRamo, type Ramo } from "@/data/progression-data";
import {
  ExpandableText,
  FilterSelect,
  SearchBox,
  normalizeSearch,
  type FilterOption,
} from "./stats-controls";

type ActivityCoverageView = {
  actionId: string;
  blocoId: string;
  eixoId: string;
  eixoName: string;
  type: "fixed" | "variable";
  text: string;
  completedCount: number;
  pendingCount: number;
};

type SortKey = "least" | "most" | "planned" | "pending";
type TypeFilter = "all" | "fixed" | "variable";

const SORTS: FilterOption<SortKey>[] = [
  { value: "least", label: "Menos feitas" },
  { value: "most", label: "Mais feitas" },
  { value: "planned", label: "Mais no plano" },
  { value: "pending", label: "Aguardando aprovação" },
];

const TYPES: FilterOption<TypeFilter>[] = [
  { value: "all", label: "Fixas e variáveis" },
  { value: "fixed", label: "Fixas" },
  { value: "variable", label: "Variáveis" },
];

const PAGE = 10;

/**
 * Every ação of the ramo in one filterable list: how many escoteiros did it,
 * how many await approval and how many have it in their Plano. Sorting by
 * "Menos feitas" is the old Lacunas; "Mais feitas" the old Mais realizadas.
 */
export function ActivityExplorer({
  ramo,
  activities,
  scoutCount,
  plannedByAction,
}: {
  ramo: Ramo;
  activities: ActivityCoverageView[];
  scoutCount: number;
  /** actionId → escoteiros with it in their Plano (any state). */
  plannedByAction: Map<string, number>;
}) {
  const [query, setQuery] = useState("");
  const [eixoFilter, setEixoFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortKey>("least");
  const [limit, setLimit] = useState(PAGE);

  const eixos = useMemo(() => getEixosForRamo(ramo), [ramo]);
  const blocoName = useMemo(
    () =>
      new Map(eixos.flatMap((e) => e.blocos.map((b) => [b.id, b.name] as const))),
    [eixos],
  );
  const eixoColor = useMemo(
    () => new Map(eixos.map((e) => [e.id, e.color] as const)),
    [eixos],
  );
  const eixoOptions: FilterOption<string>[] = [
    { value: "all", label: "Todas as áreas" },
    ...eixos.map((e) => ({ value: e.id, label: e.name, color: e.color })),
  ];

  const rows = useMemo(() => {
    const q = normalizeSearch(query);
    const planned = (a: ActivityCoverageView) => plannedByAction.get(a.actionId) ?? 0;
    const metric: Record<SortKey, (a: ActivityCoverageView) => number> = {
      least: (a) => a.completedCount,
      most: (a) => -a.completedCount,
      planned: (a) => -planned(a),
      pending: (a) => -a.pendingCount,
    };
    return activities
      .filter(
        (a) =>
          (eixoFilter === "all" || a.eixoId === eixoFilter) &&
          (typeFilter === "all" || a.type === typeFilter) &&
          (sort !== "planned" || planned(a) > 0) &&
          (sort !== "pending" || a.pendingCount > 0) &&
          (!q ||
            normalizeSearch(a.text).includes(q) ||
            normalizeSearch(blocoName.get(a.blocoId) ?? "").includes(q)),
      )
      .sort(
        (a, b) =>
          metric[sort](a) - metric[sort](b) || a.actionId.localeCompare(b.actionId),
      );
  }, [activities, query, eixoFilter, typeFilter, sort, plannedByAction, blocoName]);

  const narrowed = query !== "" || eixoFilter !== "all" || typeFilter !== "all";
  const update = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setLimit(PAGE);
  };
  const clear = () => {
    setQuery("");
    setEixoFilter("all");
    setTypeFilter("all");
    setLimit(PAGE);
  };
  const shown = rows.slice(0, limit);

  return (
    <section
      className="space-y-3 rounded-md border-2 border-black bg-card p-4 shadow-[2px_2px_0px_0px_#000]"
      data-testid="stats-explorer"
    >
      <h3 className="text-sm font-black uppercase">Atividades</h3>

      <SearchBox
        value={query}
        onChange={update(setQuery)}
        placeholder="Buscar atividade ou bloco"
        testId="stats-explorer-search"
      />

      <div className="flex flex-wrap gap-1.5" data-testid="stats-explorer-filters">
        <FilterSelect
          label="Ordenar"
          value={sort}
          defaultValue="least"
          options={SORTS}
          onChange={update(setSort)}
          alwaysShowValue
          testId="stats-explorer-sort"
        />
        <FilterSelect
          label="Área"
          value={eixoFilter}
          defaultValue="all"
          options={eixoOptions}
          onChange={update(setEixoFilter)}
          testId="stats-explorer-eixo"
        />
        <FilterSelect
          label="Tipo"
          value={typeFilter}
          defaultValue="all"
          options={TYPES}
          onChange={update(setTypeFilter)}
          testId="stats-explorer-type"
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-b-2 border-black/10 pb-2 text-[11px] font-bold text-muted-foreground">
        <span data-testid="stats-explorer-count">
          {rows.length === activities.length
            ? `${rows.length} atividades`
            : `${rows.length} de ${activities.length} atividades`}
        </span>
        {narrowed && (
          <button
            type="button"
            onClick={clear}
            className="text-primary underline-offset-2 hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Nenhuma atividade neste filtro.
        </p>
      ) : (
        <ul className="divide-y-2 divide-black/5" data-testid="stats-explorer-list">
          {shown.map((a) => (
            <ExplorerRow
              key={a.actionId}
              a={a}
              scoutCount={scoutCount}
              planned={plannedByAction.get(a.actionId) ?? 0}
              bloco={blocoName.get(a.blocoId) ?? a.eixoName}
              color={eixoColor.get(a.eixoId) ?? "#000"}
            />
          ))}
        </ul>
      )}

      {rows.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="w-full rounded-md border-2 border-black bg-white py-2 text-xs font-black uppercase hover:bg-muted"
        >
          Mostrar mais ({rows.length - limit})
        </button>
      )}
    </section>
  );
}

function ExplorerRow({
  a,
  scoutCount,
  planned,
  bloco,
  color,
}: {
  a: ActivityCoverageView;
  scoutCount: number;
  planned: number;
  bloco: string;
  color: string;
}) {
  const pct = (n: number) => (scoutCount === 0 ? 0 : Math.min(100, (n / scoutCount) * 100));
  return (
    <li className="flex gap-3 py-2.5">
      <span className="w-1 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
          {bloco}
          <span className="text-muted-foreground"> · {a.type === "fixed" ? "Fixa" : "Variável"}</span>
        </p>
        <ExpandableText className="text-[13px] font-medium leading-snug">{a.text}</ExpandableText>
        <div className="flex items-center gap-2 pt-0.5">
          <div
            className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-black/10"
            role="meter"
            aria-valuenow={Math.round(pct(a.completedCount))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${a.text}: ${a.completedCount}/${scoutCount}`}
          >
            <div className="h-full bg-primary" style={{ width: `${pct(a.completedCount)}%` }} />
            <div className="h-full bg-amber-400" style={{ width: `${pct(a.pendingCount)}%` }} />
          </div>
          <span className="shrink-0 text-[11px] font-black tabular-nums">
            {a.completedCount}/{scoutCount}
          </span>
        </div>
        {(a.pendingCount > 0 || planned > 0) && (
          <div className="flex gap-1.5 pt-0.5">
            {a.pendingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                {a.pendingCount} aguardando
              </span>
            )}
            {planned > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold">
                <Star className="size-3 fill-yellow-400 text-black" />
                {planned} no plano
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
