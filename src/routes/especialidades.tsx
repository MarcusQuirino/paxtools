import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { EscoteiroShell } from "@/components/progression/escoteiro-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Award, Trophy, CheckCircle2, Star } from "lucide-react";
import {
  YOUNGER_SPECIALTIES_BY_EIXO,
  YOUNGER_SPECIALTY_BY_ID,
  type YoungSpecialty,
} from "@/data/specialty-data/younger";
import {
  OLDER_SPECIALTIES_BY_EIXO,
  OLDER_SPECIALTY_BY_ID,
  PROJECT_STEPS,
  PROJECT_STEP_LABELS,
  type OlderSpecialty,
  type ProjectStep as Step,
} from "@/data/specialty-data/older";
import {
  levelThresholds,
  standingsById,
  type EtapaState,
  type OlderStanding,
  type YoungerStanding,
} from "@/lib/especialidade-standing";
import { usePlan } from "@/hooks/use-plan";
import { encodePlanKey } from "@/lib/plan-keys";
import { PlanStar } from "@/components/progression/plan-star";
import { EscotistaFicha } from "@/components/escotista/especialidades/ficha";
import {
  catalogFor,
  ChipRow,
  EixoDot,
  FilterChip,
  matchEntry,
  plural,
  SearchField,
  type CatalogEntry,
  type RamoGroup,
} from "@/components/escotista/especialidades/ui";

// ---------------------------------------------------------------------------
// Deep-link helpers (#44)
// ---------------------------------------------------------------------------

/** Collapsible open-state that opens (and stays openable) when `shouldOpen`. */
function useAutoOpen(shouldOpen: boolean) {
  const [open, setOpen] = useState(shouldOpen);
  useEffect(() => {
    if (shouldOpen) setOpen(true);
  }, [shouldOpen]);
  return [open, setOpen] as const;
}

/**
 * Wire a specialty card as a `?specialty=<slug>` deep-link target: open it and
 * scroll it into view when it becomes the highlighted specialty.
 */
function useDeepLinkHighlight(highlighted: boolean) {
  const [open, setOpen] = useAutoOpen(highlighted);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlighted) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlighted]);
  return { ref, open, setOpen };
}

type EspecialidadesSearch = {
  specialty?: string;
  escoteiroId?: string;
  q?: string;
  f?: string;
};

export const Route = createFileRoute("/especialidades")({
  // Deep-link target (#44): `?specialty=<slug>` highlights and scrolls to a
  // specialty. Bloco cards link here for their alternativeCompletions.
  //
  // Escotista access (#53): `?escoteiroId=<id>` opens a scout's especialidade
  // detail read-only for an escotista with ramo visibility. The bloco "ver"
  // link carries it when rendered inside the impersonation Dashboard.
  //
  // `?q=` / `?f=` drive the escoteiro's search + filter chips: free text over
  // names and item/suggestion text, and "minhas" or an eixoId.
  validateSearch: (search: Record<string, unknown>): EspecialidadesSearch => ({
    specialty:
      typeof search.specialty === "string" ? search.specialty : undefined,
    escoteiroId:
      typeof search.escoteiroId === "string" ? search.escoteiroId : undefined,
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    f: typeof search.f === "string" && search.f ? search.f : undefined,
  }),
  loaderDeps: ({ search: { escoteiroId } }) => ({ escoteiroId }),
  loader: async ({ context, deps }) => {
    if (deps.escoteiroId) {
      const escoteiroId = deps.escoteiroId as Id<"users">;
      await Promise.all([
        context.queryClient.ensureQueryData(
          convexQuery(api.groups.getGroupMembers, {}),
        ),
        context.queryClient.ensureQueryData(
          convexQuery(api.specialties.getEscoteiroEspecialidades, {
            escoteiroId,
          }),
        ),
      ]);
      return;
    }
    await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.specialties.getMyEspecialidades, {}),
      ),
      context.queryClient.ensureQueryData(convexQuery(api.plan.getMyPlan, {})),
    ]);
  },
  component: EspecialidadesPage,
});

// ---------------------------------------------------------------------------
// Page frame
// ---------------------------------------------------------------------------

function EspecialidadesFrame({ children }: { children: ReactNode }) {
  return <EscoteiroShell title="Especialidades">{children}</EscoteiroShell>;
}

// ---------------------------------------------------------------------------
// Plano stars — the escoteiro's own page provides the plano context.
// ---------------------------------------------------------------------------

type CatalogPlan = {
  plannedIds: Set<string>;
  toggle: (specialtyId: string) => void;
};

const CatalogPlanContext = createContext<CatalogPlan | null>(null);

function CatalogPlanProvider({ children }: { children: ReactNode }) {
  const { plannedKeys, togglePlanned } = usePlan();
  const value = useMemo((): CatalogPlan => {
    const plannedIds = new Set<string>();
    for (const key of plannedKeys) {
      if (key.startsWith("especialidade:")) {
        plannedIds.add(key.slice("especialidade:".length));
      }
    }
    return {
      plannedIds,
      toggle: (specialtyId) =>
        togglePlanned({
          itemKey: encodePlanKey({ kind: "especialidade", specialtyId }),
        }),
    };
  }, [plannedKeys, togglePlanned]);
  return (
    <CatalogPlanContext.Provider value={value}>
      {children}
    </CatalogPlanContext.Provider>
  );
}

/**
 * Card header: the collapsible trigger plus, on the escoteiro's own page, a
 * plano star beside it (a sibling — buttons can't nest).
 */
function CardHeader({
  specialtyId,
  name,
  eixoId,
  highlighted,
  children,
}: {
  specialtyId: string;
  name: string;
  eixoId: string;
  highlighted?: boolean;
  children: ReactNode;
}) {
  const plan = useContext(CatalogPlanContext);
  const planned = !!plan?.plannedIds.has(specialtyId);
  return (
    <div
      className={`flex items-center rounded-md border-2 border-black bg-card shadow-[2px_2px_0px_0px_#000] ${
        highlighted ? "ring-2 ring-primary ring-offset-2" : ""
      }`}
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex-1 min-w-0 flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors text-left"
        >
          {children}
        </button>
      </CollapsibleTrigger>
      {plan && (
        <div className="pr-3">
          <PlanStar
            planned={planned}
            onToggle={() => plan.toggle(specialtyId)}
            color={EIXO_LABELS[eixoId]?.color}
            label={
              planned
                ? `Remover ${name} do plano`
                : `Adicionar ${name} ao plano`
            }
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Level badge
// ---------------------------------------------------------------------------

function LevelBadge({ level }: { level: 0 | 1 | 2 }) {
  if (level === 2)
    return (
      <Badge className="gap-1 bg-yellow-400 text-yellow-900 border-2 border-yellow-600 font-bold text-xs px-1.5 py-0.5">
        <Trophy className="size-3" />
        Nível 2
      </Badge>
    );
  if (level === 1)
    return (
      <Badge className="gap-1 bg-blue-100 text-blue-800 border-2 border-blue-400 font-bold text-xs px-1.5 py-0.5">
        <Award className="size-3" />
        Nível 1
      </Badge>
    );
  return null;
}

// ---------------------------------------------------------------------------
// Specialty card (collapsible item checklist)
// ---------------------------------------------------------------------------

function SpecialtyCard({
  specialty,
  standing,
  onToggle,
  isToggling,
  highlighted,
}: {
  specialty: YoungSpecialty;
  standing: YoungerStanding | undefined;
  onToggle: (specialtyId: string, itemIndex: number) => void;
  isToggling: boolean;
  highlighted?: boolean;
}) {
  const { ref, open, setOpen } = useDeepLinkHighlight(!!highlighted);

  const approvedCount = standing?.approvedCount ?? 0;
  const pendingCount = standing?.pendingCount ?? 0;
  const level = standing?.level ?? 0;
  const totalItems = specialty.items.length;
  const thresholds = levelThresholds(totalItems);
  const progressPct = Math.round((approvedCount / totalItems) * 100);

  return (
    <div ref={ref} className="scroll-mt-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader
          specialtyId={specialty.id}
          name={specialty.name}
          eixoId={specialty.eixoId}
          highlighted={highlighted}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-foreground">
                {specialty.name}
              </span>
              {level > 0 && <LevelBadge level={level} />}
              {pendingCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs border-amber-400 text-amber-700 bg-amber-50"
                >
                  {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted border border-black/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {approvedCount}/{totalItems}{" "}
              {approvedCount === 1 ? "item aprovado" : "itens aprovados"}
            </p>
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CardHeader>

        <CollapsibleContent>
          <div className="mt-1 border-2 border-black rounded-md bg-card divide-y-2 divide-black/10">
            {/* Description */}
            <p className="px-4 py-3 text-xs text-muted-foreground leading-relaxed">
              {specialty.description}
            </p>

            {/* Level threshold note */}
            <div className="px-4 py-2 bg-muted/30 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                Nível 1: {thresholds.level1} itens
              </span>
              <span>·</span>
              <span className="font-medium text-foreground">
                Nível 2: {thresholds.level2} itens
              </span>
            </div>

            {/* Items checklist */}
            <div className="divide-y divide-black/10">
              {specialty.items.map((itemText, index) => {
                const status = standing?.items[index]?.status ?? null;
                const isApproved = status === "approved";
                const isPending = status === "pending";

                return (
                  <label
                    key={index}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isApproved
                        ? "bg-green-50/50"
                        : isPending
                          ? "bg-amber-50/50"
                          : "hover:bg-muted/30"
                    } ${isApproved ? "cursor-default" : ""}`}
                  >
                    <Checkbox
                      checked={isApproved || isPending}
                      disabled={isApproved || isToggling}
                      className={
                        isApproved
                          ? "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-700 mt-0.5"
                          : isPending
                            ? "data-[state=checked]:bg-amber-400 data-[state=checked]:border-amber-600 mt-0.5"
                            : "mt-0.5"
                      }
                      onCheckedChange={() => {
                        if (!isApproved) onToggle(specialty.id, index);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm leading-relaxed ${
                          isApproved
                            ? "text-green-800 line-through decoration-green-400"
                            : isPending
                              ? "text-amber-800"
                              : "text-foreground"
                        }`}
                      >
                        <span className="font-bold mr-1">{index + 1}.</span>
                        {itemText}
                      </span>
                      {isPending && (
                        <p className="text-xs text-amber-600 mt-0.5 font-medium">
                          Aguardando aprovação
                        </p>
                      )}
                      {isApproved && (
                        <p className="text-xs text-green-600 mt-0.5 font-medium">
                          Aprovado ✓
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Eixo section (collapsible group of specialties)
// ---------------------------------------------------------------------------

const EIXO_LABELS: Record<string, { name: string; color: string }> = {
  "habilidades-para-a-vida": {
    name: "Habilidades para a Vida",
    color: "#E91E63",
  },
  "meio-ambiente": { name: "Meio Ambiente", color: "#4CAF50" },
  "paz-e-desenvolvimento": { name: "Paz e Desenvolvimento", color: "#2196F3" },
  "saude-e-bem-estar": { name: "Saúde e Bem-estar", color: "#FF9800" },
};

function EixoSection({
  eixoId,
  specialties,
  standings,
  onToggle,
  isToggling,
  highlightId,
}: {
  eixoId: string;
  specialties: YoungSpecialty[];
  standings: Map<string, YoungerStanding>;
  onToggle: (specialtyId: string, itemIndex: number) => void;
  isToggling: boolean;
  highlightId?: string;
}) {
  const [open, setOpen] = useAutoOpen(
    specialties.some((s) => s.id === highlightId),
  );
  const meta = EIXO_LABELS[eixoId] ?? { name: eixoId, color: "#666" };

  const earnedCount = specialties.filter((s) => standings.get(s.id)?.earned).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-3 p-3 rounded-md border-2 border-black bg-card hover:bg-muted/30 transition-colors text-left shadow-[3px_3px_0px_0px_#000]"
        >
          <span
            className="size-3 rounded-full shrink-0"
            style={{ backgroundColor: meta.color }}
          />
          <div className="flex-1">
            <p className="font-bold text-sm text-foreground">{meta.name}</p>
            <p className="text-xs text-muted-foreground">
              {specialties.length} especialidade
              {specialties.length !== 1 ? "s" : ""}
              {earnedCount > 0 &&
                ` · ${earnedCount} conquistada${earnedCount !== 1 ? "s" : ""}`}
            </p>
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-2 pl-3">
          {specialties.map((s) => (
            <SpecialtyCard
              key={s.id}
              specialty={s}
              standing={standings.get(s.id)}
              onToggle={onToggle}
              isToggling={isToggling}
              highlighted={s.id === highlightId}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Search + filter chips — a simpler cut of the escotista catalog's: Todas /
// Minhas (already started) / one chip per eixo.
// ---------------------------------------------------------------------------

function useEspecialidadesFilter(group: RamoGroup, startedIds: Set<string>) {
  const { q, f: filter } = Route.useSearch();
  const plannedIds = useContext(CatalogPlanContext)?.plannedIds;
  const navigate = Route.useNavigate();
  const query = q ?? "";

  const setSearch = (patch: Pick<EspecialidadesSearch, "q" | "f">) =>
    void navigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
    });

  // null when no search/filter is active: the page shows the eixo sections.
  const results = useMemo((): CatalogEntry[] | null => {
    if (!query.trim() && !filter) return null;
    return catalogFor(group).filter(
      (e) =>
        (filter === "minhas"
          ? startedIds.has(e.id)
          : filter === "plano"
            ? !!plannedIds?.has(e.id)
            : !filter || e.eixoId === filter) && matchEntry(e, query).matched,
    );
  }, [group, startedIds, plannedIds, query, filter]);

  return { query, filter, setSearch, results };
}

function EspecialidadesFilterBar({
  query,
  filter,
  setSearch,
}: Pick<
  ReturnType<typeof useEspecialidadesFilter>,
  "query" | "filter" | "setSearch"
>) {
  const toggle = (f: string) =>
    setSearch({ f: filter === f ? undefined : f });
  const hasPlan = useContext(CatalogPlanContext) !== null;
  return (
    <div>
      <SearchField value={query} onChange={(q) => setSearch({ q })} />
      <ChipRow>
        <FilterChip on={!filter} onClick={() => setSearch({ f: undefined })}>
          Todas
        </FilterChip>
        <FilterChip on={filter === "minhas"} onClick={() => toggle("minhas")}>
          Minhas
        </FilterChip>
        {hasPlan && (
          <FilterChip on={filter === "plano"} onClick={() => toggle("plano")}>
            <Star className="size-3" />
            No plano
          </FilterChip>
        )}
        {Object.entries(EIXO_LABELS).map(([id, meta]) => (
          <FilterChip key={id} on={filter === id} onClick={() => toggle(id)}>
            <EixoDot color={meta.color} />
            {meta.name}
          </FilterChip>
        ))}
      </ChipRow>
    </div>
  );
}

function FilterResults({
  count,
  filter,
  children,
}: {
  count: number;
  filter?: string;
  children: ReactNode;
}) {
  if (count === 0) {
    return (
      <p className="rounded-md border-2 border-dashed border-muted-foreground p-5 text-center text-sm text-muted-foreground">
        <b className="block text-[15px] text-foreground">Nada encontrado</b>
        {filter === "minhas"
          ? "Você ainda não começou nenhuma especialidade aqui."
          : filter === "plano"
            ? "Toque na estrela de uma especialidade para colocá-la no seu plano."
            : "Tente outro termo ou limpe o filtro."}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground px-1">
        {plural(count, "especialidade", "especialidades")}
      </p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function EspecialidadesPage() {
  const { specialty: highlightId, escoteiroId: escoteiroIdRaw } =
    Route.useSearch();
  const escoteiroId = escoteiroIdRaw as Id<"users"> | undefined;
  // With an escoteiroId the viewer is an escotista inspecting a scout's
  // detail (#53); without it this is the escoteiro self-service page. The gate
  // requires the matching role so the escotista is no longer bounced.
  const { ready } = useAuthGate(escoteiroId ? "escotista" : "escoteiro");

  if (!ready) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
          <header className="flex items-center justify-between">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="size-8 animate-pulse rounded-full bg-muted" />
          </header>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-md border-2 border-black bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  // Escotista inspecting a scout's especialidade detail (#53): render that
  // scout's data read-only, keyed by the scout's ramo — not the adult's.
  // The actionable ficha (EscotistaFicha): tap marks/unmarks items, pending
  // submissions get Aprovar / Rejeitar, older etapas can be registered on the
  // scout's behalf. Every write re-checks visibilidade de ramo server-side.
  if (escoteiroId) {
    return <EscotistaFicha escoteiroId={escoteiroId} specialtyId={highlightId} />;
  }

  return (
    <CatalogPlanProvider>
      <OwnEspecialidades highlightId={highlightId} />
    </CatalogPlanProvider>
  );
}

/**
 * The escoteiro's own especialidades. The server picks the ramo group from
 * their current ramo; older (sênior + pioneiro) gets the three-etapa project
 * UI, younger the item checklist.
 */
function OwnEspecialidades({ highlightId }: { highlightId?: string }) {
  const { data } = useSuspenseQuery(
    convexQuery(api.specialties.getMyEspecialidades, {}),
  );
  const standings = useMemo(() => standingsById(data.standings), [data.standings]);
  if (data.ramoGroup === "older") {
    return (
      <OlderEspecialidadesView
        standings={standings as Map<string, OlderStanding>}
        highlightId={highlightId}
      />
    );
  }
  return (
    <YoungerEspecialidadesView
      standings={standings as Map<string, YoungerStanding>}
      highlightId={highlightId}
    />
  );
}

function YoungerEspecialidadesView({
  standings,
  highlightId,
}: {
  standings: Map<string, YoungerStanding>;
  highlightId?: string;
}) {
  const toggleItemFn = useConvexMutation(api.specialties.toggleSpecialtyItem);
  const { mutate: toggleItem, isPending: isToggling } = useMutation({
    mutationFn: toggleItemFn,
  });

  const handleToggle = (specialtyId: string, itemIndex: number) =>
    toggleItem({ specialtyId, itemIndex });

  const startedIds = useMemo(() => new Set(standings.keys()), [standings]);
  const { results, ...filterBar } = useEspecialidadesFilter(
    "younger",
    startedIds,
  );

  const eixoIds = Object.keys(YOUNGER_SPECIALTIES_BY_EIXO);

  return (
    <EspecialidadesFrame>
      <EspecialidadesFilterBar {...filterBar} />
      {results ? (
        <FilterResults count={results.length} filter={filterBar.filter}>
          {results.map((e) => (
            <SpecialtyCard
              key={e.id}
              specialty={YOUNGER_SPECIALTY_BY_ID.get(e.id)!}
              standing={standings.get(e.id)}
              onToggle={handleToggle}
              isToggling={isToggling}
              highlighted={e.id === highlightId}
            />
          ))}
        </FilterResults>
      ) : (
      <div className="space-y-2">
        {eixoIds.map((eixoId) => {
          const specialties = YOUNGER_SPECIALTIES_BY_EIXO[eixoId] ?? [];
          return (
            <EixoSection
              key={eixoId}
              eixoId={eixoId}
              specialties={specialties}
              standings={standings}
              onToggle={handleToggle}
              isToggling={isToggling}
              highlightId={highlightId}
            />
          );
        })}
      </div>
      )}
    </EspecialidadesFrame>
  );
}

// ===========================================================================
// Older group (sênior + pioneiro) — three-step project UI
// ===========================================================================

const STEP_ORDER = PROJECT_STEPS;

function stepLabel(step: Step): string {
  return PROJECT_STEP_LABELS[step];
}
function stepOrdinal(step: Step): number {
  return STEP_ORDER.indexOf(step) + 1;
}

function StepCard({
  specialtyId,
  step,
  suggestions,
  etapa,
  onSubmit,
  isSubmitting,
}: {
  specialtyId: string;
  step: Step;
  suggestions: string[];
  etapa: EtapaState | null;
  onSubmit: (specialtyId: string, step: Step, text: string) => void;
  isSubmitting: boolean;
}) {
  const status = etapa?.status ?? null;
  const isApproved = status === "approved";
  const isPending = status === "pending";
  const [text, setText] = useState(etapa?.text ?? "");

  // Keep the local draft in sync when the stored relato changes (e.g. approval).
  useEffect(() => {
    setText(etapa?.text ?? "");
  }, [etapa?.rowId, etapa?.text]);

  const canEdit = !isApproved;
  const dirty = text.trim() !== (etapa?.text ?? "").trim();

  return (
    <div
      className={`rounded-md border-2 border-black p-3 ${
        isApproved ? "bg-green-50/60" : isPending ? "bg-amber-50/60" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-black bg-primary text-[10px] font-black text-primary-foreground">
          {stepOrdinal(step)}
        </span>
        <span className="font-bold text-sm text-foreground">
          {stepLabel(step)}
        </span>
        {isApproved && (
          <Badge className="gap-1 bg-green-600 text-white border-2 border-green-800 text-xs px-1.5 py-0.5">
            <CheckCircle2 className="size-3" />
            Aprovado
          </Badge>
        )}
        {isPending && (
          <Badge
            variant="outline"
            className="text-xs border-amber-400 text-amber-700 bg-amber-50"
          >
            Pendente
          </Badge>
        )}
      </div>

      <>
        {suggestions.length > 0 && (
            <div className="mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                Sugestões
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                {suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="text-xs text-muted-foreground leading-snug"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!canEdit || isSubmitting}
            rows={4}
            placeholder="Escreva seu relato desta etapa..."
            className="w-full rounded-md border-2 border-black bg-background p-2 text-sm resize-y disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          {canEdit && (
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-xs text-muted-foreground">
                {isPending ? "Enviado — aguardando aprovação" : ""}
              </span>
              <Button
                size="sm"
                className="border-black"
                disabled={!text.trim() || isSubmitting || (isPending && !dirty)}
                onClick={() => onSubmit(specialtyId, step, text)}
              >
                {isPending ? "Reenviar" : "Enviar"}
              </Button>
            </div>
          )}
      </>
    </div>
  );
}

function OlderSpecialtyCard({
  specialty,
  standing,
  onSubmit,
  isSubmitting,
  highlighted,
}: {
  specialty: OlderSpecialty;
  standing: OlderStanding | undefined;
  onSubmit: (specialtyId: string, step: Step, text: string) => void;
  isSubmitting: boolean;
  highlighted?: boolean;
}) {
  const { ref, open, setOpen } = useDeepLinkHighlight(!!highlighted);

  const approvedCount = standing?.approvedCount ?? 0;
  const earned = !!standing?.earned;

  const suggestionsFor = (step: Step): string[] =>
    step === "conhecer"
      ? specialty.conhecerSuggestions
      : step === "fazer"
        ? specialty.fazerSuggestions
        : specialty.compartilharSuggestions;

  return (
    <div ref={ref} className="scroll-mt-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader
          specialtyId={specialty.id}
          name={specialty.name}
          eixoId={specialty.eixoId}
          highlighted={highlighted}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-foreground">
                {specialty.name}
              </span>
              {earned && (
                <Badge className="gap-1 bg-yellow-400 text-yellow-900 border-2 border-yellow-600 font-bold text-xs px-1.5 py-0.5">
                  <Trophy className="size-3" />
                  Conquistada
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {approvedCount}/{STEP_ORDER.length} etapas aprovadas
            </p>
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CardHeader>

        <CollapsibleContent>
          <div className="mt-1 space-y-2 pl-3">
            <p className="text-xs text-muted-foreground leading-relaxed px-1">
              {specialty.description}
            </p>
            {STEP_ORDER.map((step) => (
              <StepCard
                key={step}
                specialtyId={specialty.id}
                step={step}
                suggestions={suggestionsFor(step)}
                etapa={standing?.etapas[step] ?? null}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function OlderEixoSection({
  eixoId,
  specialties,
  standings,
  onSubmit,
  isSubmitting,
  highlightId,
}: {
  eixoId: string;
  specialties: OlderSpecialty[];
  standings: Map<string, OlderStanding>;
  onSubmit: (specialtyId: string, step: Step, text: string) => void;
  isSubmitting: boolean;
  highlightId?: string;
}) {
  const [open, setOpen] = useAutoOpen(
    specialties.some((s) => s.id === highlightId),
  );
  const meta = EIXO_LABELS[eixoId] ?? { name: eixoId, color: "#666" };

  const earnedCount = specialties.filter((s) => standings.get(s.id)?.earned).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-3 p-3 rounded-md border-2 border-black bg-card hover:bg-muted/30 transition-colors text-left shadow-[3px_3px_0px_0px_#000]"
        >
          <span
            className="size-3 rounded-full shrink-0"
            style={{ backgroundColor: meta.color }}
          />
          <div className="flex-1">
            <p className="font-bold text-sm text-foreground">{meta.name}</p>
            <p className="text-xs text-muted-foreground">
              {specialties.length} especialidade
              {specialties.length !== 1 ? "s" : ""}
              {earnedCount > 0 &&
                ` · ${earnedCount} conquistada${earnedCount !== 1 ? "s" : ""}`}
            </p>
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-2 pl-3">
          {specialties.map((s) => (
            <OlderSpecialtyCard
              key={s.id}
              specialty={s}
              standing={standings.get(s.id)}
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              highlighted={s.id === highlightId}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function OlderEspecialidadesView({
  standings,
  highlightId,
}: {
  standings: Map<string, OlderStanding>;
  highlightId?: string;
}) {
  // An escoteiro's own submission stays pending, so it never earns the
  // especialidade (that happens when an escotista approves the last of the
  // three etapas) and no level-up toast is expected here.
  const submitStepFn = useConvexMutation(api.specialties.submitSpecialtyStep);
  const { mutate: submitStep, isPending: isSubmitting } = useMutation({
    mutationFn: submitStepFn,
  });

  const handleSubmit = (specialtyId: string, step: Step, text: string) =>
    submitStep({ specialtyId, step, text });

  const startedIds = useMemo(() => new Set(standings.keys()), [standings]);
  const { results, ...filterBar } = useEspecialidadesFilter(
    "older",
    startedIds,
  );

  const eixoIds = Object.keys(OLDER_SPECIALTIES_BY_EIXO);

  return (
    <EspecialidadesFrame>
      <p className="text-xs text-muted-foreground px-1">
        Cada especialidade é um projeto em três etapas: Conhecer, Fazer e
        Compartilhar. Você pode escrever os relatos em qualquer ordem; a
        especialidade é conquistada quando as três etapas forem aprovadas.
      </p>

      <EspecialidadesFilterBar {...filterBar} />
      {results ? (
        <FilterResults count={results.length} filter={filterBar.filter}>
          {results.map((e) => (
            <OlderSpecialtyCard
              key={e.id}
              specialty={OLDER_SPECIALTY_BY_ID.get(e.id)!}
              standing={standings.get(e.id)}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              highlighted={e.id === highlightId}
            />
          ))}
        </FilterResults>
      ) : (
      <div className="space-y-2">
        {eixoIds.map((eixoId) => (
          <OlderEixoSection
            key={eixoId}
            eixoId={eixoId}
            specialties={OLDER_SPECIALTIES_BY_EIXO[eixoId] ?? []}
            standings={standings}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            highlightId={highlightId}
          />
        ))}
      </div>
      )}
    </EspecialidadesFrame>
  );
}
