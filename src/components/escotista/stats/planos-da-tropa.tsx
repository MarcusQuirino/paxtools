import { useMemo, useState } from "react";
import { Award, ListChecks, Star } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../../convex/_generated/api";
import { getEixosForRamo, type Ramo } from "@/data/progression-data";
import { buildCatalogIndex } from "@/lib/plan-view";
import { eixoMeta, findCatalogEntry } from "@/components/escotista/especialidades/ui";
import { ramoGroupForRamo } from "@/lib/especialidade-standing";
import { ExpandableText, SearchBox, normalizeSearch } from "./stats-controls";

type Demand = FunctionReturnType<typeof api.stats.getRamoPlanDemand>;
type DemandItem = Demand["items"][number];
type Tab = "action" | "especialidade";

const PAGE = 6;
const MAX_NAMES = 6;

type Row = {
  id: string;
  title: string;
  kicker: string;
  color: string;
  item: DemandItem;
};

/**
 * Plano demand for the ramo: what many escoteiros want to do next, and who —
 * the overlap that suggests a group activity, or escoteiros to pair up.
 * Ações and especialidades are separate lists: especialidades are planned
 * far less and would drown in the ações.
 */
export function PlanosDaTropa({ ramo, demand }: { ramo: Ramo; demand: Demand }) {
  const [tab, setTab] = useState<Tab>("action");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const rowsByTab = useMemo(() => {
    const catalog = buildCatalogIndex(getEixosForRamo(ramo));
    const group = ramoGroupForRamo(ramo);
    const out: Record<Tab, Row[]> = { action: [], especialidade: [] };
    for (const item of demand.items) {
      if (item.wanting.length === 0) continue;
      if (item.kind === "action") {
        const hit = catalog.actionsById.get(item.actionId);
        out.action.push({
          id: item.actionId,
          title: hit?.text ?? item.actionId,
          kicker: hit?.bloco.name ?? "",
          color: hit?.eixo.color ?? "#000",
          item,
        });
      } else {
        const entry = findCatalogEntry(group, item.specialtyId);
        const eixo = eixoMeta(entry?.eixoId ?? "");
        out.especialidade.push({
          id: item.specialtyId,
          title: entry?.name ?? item.specialtyId,
          kicker: eixo.name,
          color: eixo.color,
          item,
        });
      }
    }
    return out;
  }, [demand, ramo]);

  const all = rowsByTab[tab];
  const q = normalizeSearch(query);
  const rows = q
    ? all.filter(
        (r) =>
          normalizeSearch(r.title).includes(q) ||
          normalizeSearch(r.kicker).includes(q) ||
          r.item.wanting.some((w) => normalizeSearch(w.name ?? "").includes(q)),
      )
    : all;
  const shown = rows.slice(0, limit);
  const shared = (t: Tab) => rowsByTab[t].filter((r) => r.item.wanting.length >= 2).length;

  const switchTab = (t: Tab) => {
    setTab(t);
    setQuery("");
    setLimit(PAGE);
  };

  return (
    <section
      className="space-y-3 rounded-md border-2 border-black bg-card p-4 shadow-[2px_2px_0px_0px_#000]"
      data-testid="stats-planos"
    >
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-black uppercase">
          <Star className="size-4 fill-yellow-400 text-black" />
          Planos da tropa
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          <b className="text-foreground">
            {demand.scoutsWithPlan} de {demand.scoutCount}
          </b>{" "}
          escoteiros têm plano. Veja o que vários querem fazer — para uma
          atividade em grupo ou para juntar quem quer a mesma coisa.
        </p>
      </div>

      <div
        className="grid grid-cols-2 gap-1 rounded-md border-2 border-black bg-muted p-1"
        role="tablist"
        aria-label="Tipo de item"
      >
        <TabButton
          active={tab === "action"}
          onClick={() => switchTab("action")}
          icon={<ListChecks className="size-4" />}
          label="Ações"
          count={rowsByTab.action.length}
          testId="stats-planos-tab-acoes"
        />
        <TabButton
          active={tab === "especialidade"}
          onClick={() => switchTab("especialidade")}
          icon={<Award className="size-4" />}
          label="Especialidades"
          count={rowsByTab.especialidade.length}
          testId="stats-planos-tab-especialidades"
        />
      </div>

      {all.length > 0 && (
        <SearchBox
          value={query}
          onChange={(v) => {
            setQuery(v);
            setLimit(PAGE);
          }}
          placeholder={
            tab === "action" ? "Buscar ação, bloco ou escoteiro" : "Buscar especialidade ou escoteiro"
          }
          testId="stats-planos-search"
        />
      )}

      {all.length > 0 && (
        <p className="border-b-2 border-black/10 pb-2 text-[11px] font-bold text-muted-foreground">
          {q
            ? `${rows.length} de ${all.length}`
            : `${all.length} ${tab === "action" ? (all.length === 1 ? "ação" : "ações") : all.length === 1 ? "especialidade" : "especialidades"}`}
          {!q && shared(tab) > 0 && ` · ${shared(tab)} em comum`}
        </p>
      )}

      {all.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground" data-testid="stats-planos-empty">
          {tab === "action"
            ? "Nenhuma ação a fazer nos planos deste ramo."
            : "Nenhuma especialidade a fazer nos planos deste ramo."}
        </p>
      ) : shown.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">Nada encontrado.</p>
      ) : (
        <ol className="divide-y-2 divide-black/5" data-testid="stats-planos-list">
          {shown.map((r) => (
            <DemandRow key={r.id} row={r} scoutCount={demand.scoutCount} />
          ))}
        </ol>
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

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      data-testid={testId}
      className={`flex h-9 items-center justify-center gap-1.5 rounded-md text-xs font-bold transition-all ${
        active
          ? "border-2 border-black bg-primary text-white shadow-[2px_2px_0px_0px_#000]"
          : "border-2 border-transparent text-foreground hover:bg-white/60"
      }`}
    >
      {icon}
      {label}
      <span
        className={`rounded-full px-1.5 text-[10px] font-black ${
          active ? "bg-white text-primary" : "bg-black/10"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function DemandRow({ row, scoutCount }: { row: Row; scoutCount: number }) {
  const { item } = row;
  const n = item.wanting.length;
  const extra = n - MAX_NAMES;
  const others = [
    item.doneCount > 0 && `${item.doneCount} já ${item.doneCount === 1 ? "fez" : "fizeram"}`,
    item.pendingCount > 0 && `${item.pendingCount} aguardando`,
  ].filter(Boolean);
  return (
    <li className="flex gap-3 py-3">
      <span className="w-1 shrink-0 rounded-full" style={{ background: row.color }} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[10px] font-bold uppercase tracking-wide"
              style={{ color: row.color }}
            >
              {row.kicker}
            </p>
            <ExpandableText className="text-[13px] font-medium leading-snug">
              {row.title}
            </ExpandableText>
          </div>
          <div
            className="shrink-0 rounded-md border-2 border-black bg-yellow-300 px-2 py-1 text-center leading-none"
            title={`${n} de ${scoutCount}`}
          >
            <p className="text-base font-black tabular-nums">{n}</p>
            <p className="text-[9px] font-bold uppercase">{n === 1 ? "quer" : "querem"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {item.wanting.slice(0, MAX_NAMES).map((w) => (
            <span
              key={w.scoutId}
              className="rounded-full border border-black/30 bg-white px-2 py-0.5 text-[11px] font-semibold"
            >
              {w.name ?? "Sem nome"}
            </span>
          ))}
          {extra > 0 && (
            <span className="text-[11px] font-bold text-muted-foreground">+{extra}</span>
          )}
        </div>
        {others.length > 0 && (
          <p className="text-[10px] font-medium text-muted-foreground">{others.join(" · ")}</p>
        )}
      </div>
    </li>
  );
}
