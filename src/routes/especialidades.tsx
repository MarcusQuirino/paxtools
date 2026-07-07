import { useEffect, useMemo, useRef, useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { AuthButton } from "@/components/auth/auth-button";
import { PlanNav } from "@/components/progression/plan-nav";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Award, Trophy, CheckCircle2 } from "lucide-react";
import {
  YOUNGER_SPECIALTIES_BY_EIXO,
  type YoungSpecialty,
} from "@/data/specialty-data/younger";
import {
  OLDER_SPECIALTIES_BY_EIXO,
  PROJECT_STEPS,
  PROJECT_STEP_LABELS,
  type OlderSpecialty,
  type ProjectStep as Step,
} from "@/data/specialty-data/older";
import { getSpecialtyLevel } from "@/lib/completion-logic";

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

export const Route = createFileRoute("/especialidades")({
  // Deep-link target (#44): `?specialty=<slug>` highlights and scrolls to a
  // specialty. Bloco cards link here for their alternativeCompletions.
  //
  // Escotista access (#53): `?escoteiroId=<id>` opens a scout's especialidade
  // detail read-only for an escotista with ramo visibility. The bloco "ver"
  // link carries it when rendered inside the impersonation Dashboard.
  validateSearch: (
    search: Record<string, unknown>,
  ): { specialty?: string; escoteiroId?: string } => ({
    specialty:
      typeof search.specialty === "string" ? search.specialty : undefined,
    escoteiroId:
      typeof search.escoteiroId === "string" ? search.escoteiroId : undefined,
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
          convexQuery(api.specialties.getSpecialtyItemsForEscoteiro, {
            escoteiroId,
          }),
        ),
        context.queryClient.ensureQueryData(
          convexQuery(api.specialties.getSpecialtyReportsForEscoteiro, {
            escoteiroId,
          }),
        ),
      ]);
      return;
    }
    await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.specialties.getMySpecialtyItems, {}),
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.specialties.getMySpecialtyReports, {}),
      ),
    ]);
  },
  component: EspecialidadesPage,
});

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

type ItemRow = Doc<"specialtyItemCompletions">;

function SpecialtyCard({
  specialty,
  items,
  onToggle,
  isToggling,
  highlighted,
  readOnly,
}: {
  specialty: YoungSpecialty;
  items: ItemRow[];
  onToggle: (specialtyId: string, itemIndex: number) => void;
  isToggling: boolean;
  highlighted?: boolean;
  /** Escotista read-only mode (#53): disable every checkbox. */
  readOnly?: boolean;
}) {
  const { ref, open, setOpen } = useDeepLinkHighlight(!!highlighted);

  const itemsByIndex = useMemo(() => {
    const m = new Map<number, ItemRow>();
    for (const item of items) {
      m.set(item.itemIndex, item);
    }
    return m;
  }, [items]);

  const approvedCount = useMemo(
    () => items.filter((i) => i.status === "approved" || !i.status).length,
    [items],
  );
  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "pending").length,
    [items],
  );
  const level = getSpecialtyLevel(approvedCount, specialty.items.length) as
    | 0
    | 1
    | 2;
  const totalItems = specialty.items.length;
  const progressPct = Math.round((approvedCount / totalItems) * 100);

  return (
    <div ref={ref} className="scroll-mt-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={`w-full flex items-center gap-3 p-3 rounded-md border-2 border-black bg-card hover:bg-muted/50 transition-colors text-left shadow-[2px_2px_0px_0px_#000] ${
              highlighted ? "ring-2 ring-primary ring-offset-2" : ""
            }`}
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
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-1 border-2 border-black rounded-md bg-card shadow-[2px_2px_0px_0px_#000] divide-y-2 divide-black/10">
            {/* Description */}
            <p className="px-4 py-3 text-xs text-muted-foreground leading-relaxed">
              {specialty.description}
            </p>

            {/* Level threshold note */}
            <div className="px-4 py-2 bg-muted/30 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                Nível 1: {totalItems / 2} itens
              </span>
              <span>·</span>
              <span className="font-medium text-foreground">
                Nível 2: {totalItems} itens
              </span>
            </div>

            {/* Items checklist */}
            <div className="divide-y divide-black/10">
              {specialty.items.map((itemText, index) => {
                const row = itemsByIndex.get(index);
                const status = row?.status ?? null;
                const isApproved = status === "approved" || (!status && !!row);
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
                      disabled={readOnly || isApproved || isToggling}
                      className={
                        isApproved
                          ? "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-700 mt-0.5"
                          : isPending
                            ? "data-[state=checked]:bg-amber-400 data-[state=checked]:border-amber-600 mt-0.5"
                            : "mt-0.5"
                      }
                      onCheckedChange={() => {
                        if (!isApproved && !readOnly) {
                          onToggle(specialty.id, index);
                        }
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
  itemsBySpecialty,
  onToggle,
  isToggling,
  highlightId,
  readOnly,
}: {
  eixoId: string;
  specialties: YoungSpecialty[];
  itemsBySpecialty: Map<string, ItemRow[]>;
  onToggle: (specialtyId: string, itemIndex: number) => void;
  isToggling: boolean;
  highlightId?: string;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useAutoOpen(
    specialties.some((s) => s.id === highlightId),
  );
  const meta = EIXO_LABELS[eixoId] ?? { name: eixoId, color: "#666" };

  // Count specialties with at least level 1
  const earnedCount = specialties.filter((s) => {
    const items = itemsBySpecialty.get(s.id) ?? [];
    const approved = items.filter(
      (i) => i.status === "approved" || !i.status,
    ).length;
    return getSpecialtyLevel(approved, s.items.length) >= 1;
  }).length;

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
              items={itemsBySpecialty.get(s.id) ?? []}
              onToggle={onToggle}
              isToggling={isToggling}
              highlighted={s.id === highlightId}
              readOnly={readOnly}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
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
  const { ready, user } = useAuthGate(escoteiroId ? "escotista" : "escoteiro");

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
  if (escoteiroId) {
    return (
      <EscotistaEspecialidadesContent
        escoteiroId={escoteiroId}
        highlightId={highlightId}
      />
    );
  }

  const ramo = user?.ramo;

  // Older group (sênior + pioneiro): project-step UI. Younger: item checklist.
  if (ramo === "senior" || ramo === "pioneiro") {
    return <OlderEspecialidadesContent highlightId={highlightId} />;
  }

  return <YoungerEspecialidadesContent highlightId={highlightId} />;
}

/**
 * Escotista read-only view of a scout's especialidades (#53). The scout's ramo
 * (resolved via the visibility-scoped getGroupMembers) decides younger vs older
 * UI. Data comes from the visibility-checked per-escoteiro queries; the backend
 * returns [] when the viewer lacks ramo visibility, so no data can leak here.
 */
function EscotistaEspecialidadesContent({
  escoteiroId,
  highlightId,
}: {
  escoteiroId: Id<"users">;
  highlightId?: string;
}) {
  const { data: members } = useSuspenseQuery(
    convexQuery(api.groups.getGroupMembers, {}),
  );
  const ramo = members.find((m) => m._id === escoteiroId)?.ramo;

  if (ramo === "senior" || ramo === "pioneiro") {
    return (
      <OlderEscoteiroContent
        highlightId={highlightId}
        escoteiroId={escoteiroId}
      />
    );
  }

  return (
    <YoungerEscoteiroContent
      highlightId={highlightId}
      escoteiroId={escoteiroId}
    />
  );
}

// Self-service fetcher: the escoteiro's own items (editable).
function YoungerEspecialidadesContent({
  highlightId,
}: {
  highlightId?: string;
}) {
  const { data: myItems } = useSuspenseQuery(
    convexQuery(api.specialties.getMySpecialtyItems, {}),
  );
  return (
    <YoungerEspecialidadesView items={myItems} highlightId={highlightId} />
  );
}

// Escotista fetcher (#53): a scout's items via the visibility-checked query,
// rendered read-only.
function YoungerEscoteiroContent({
  highlightId,
  escoteiroId,
}: {
  highlightId?: string;
  escoteiroId: Id<"users">;
}) {
  const { data: items } = useSuspenseQuery(
    convexQuery(api.specialties.getSpecialtyItemsForEscoteiro, { escoteiroId }),
  );
  return (
    <YoungerEspecialidadesView items={items} highlightId={highlightId} readOnly />
  );
}

function YoungerEspecialidadesView({
  items: myItems,
  highlightId,
  readOnly,
}: {
  items: Doc<"specialtyItemCompletions">[];
  highlightId?: string;
  /** Escotista read-only mode (#53): disable self-service controls. */
  readOnly?: boolean;
}) {
  const toggleItemFn = useConvexMutation(api.specialties.toggleSpecialtyItem);
  const { mutate: toggleItem, isPending: isToggling } = useMutation({
    mutationFn: toggleItemFn,
  });

  // Build a map: specialtyId → items[]
  const itemsBySpecialty = useMemo(() => {
    const m = new Map<string, Doc<"specialtyItemCompletions">[]>();
    for (const item of myItems) {
      if (item.ramoGroup !== "younger") continue;
      const arr = m.get(item.specialtyId) ?? [];
      arr.push(item);
      m.set(item.specialtyId, arr);
    }
    return m;
  }, [myItems]);

  // In escotista read-only mode, self-service toggling must not fire as the
  // adult — the controls are disabled and the handler is a no-op (#53).
  const handleToggle = (specialtyId: string, itemIndex: number) => {
    if (readOnly) return;
    toggleItem({ specialtyId, itemIndex });
  };

  const eixoIds = Object.keys(YOUNGER_SPECIALTIES_BY_EIXO);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-black uppercase text-foreground">
            Especialidades
          </h1>
          <AuthButton />
        </header>

        <PlanNav />

        <div className="space-y-2">
          {eixoIds.map((eixoId) => {
            const specialties = YOUNGER_SPECIALTIES_BY_EIXO[eixoId] ?? [];
            return (
              <EixoSection
                key={eixoId}
                eixoId={eixoId}
                specialties={specialties}
                itemsBySpecialty={itemsBySpecialty}
                onToggle={handleToggle}
                isToggling={isToggling}
                highlightId={highlightId}
                readOnly={readOnly}
              />
            );
          })}
        </div>

        <Footer />
      </div>
    </div>
  );
}

// ===========================================================================
// Older group (sênior + pioneiro) — three-step project UI
// ===========================================================================

type ReportRow = Doc<"specialtyProjectReports">;

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
  row,
  onSubmit,
  isSubmitting,
  readOnly,
}: {
  specialtyId: string;
  step: Step;
  suggestions: string[];
  row: ReportRow | undefined;
  onSubmit: (specialtyId: string, step: Step, text: string) => void;
  isSubmitting: boolean;
  /** Escotista read-only mode (#53): lock the textarea, hide the submit. */
  readOnly?: boolean;
}) {
  const status = row?.status ?? null;
  const isApproved = status === "approved";
  const isPending = status === "pending";
  const [text, setText] = useState(row?.text ?? "");

  // Keep the local draft in sync when the stored row changes (e.g. approval).
  useEffect(() => {
    setText(row?.text ?? "");
  }, [row?._id, row?.text]);

  const canEdit = !isApproved && !readOnly;
  const dirty = text.trim() !== (row?.text ?? "").trim();

  return (
    <div
      className={`rounded-md border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000] ${
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
  reports,
  onSubmit,
  isSubmitting,
  highlighted,
  readOnly,
}: {
  specialty: OlderSpecialty;
  reports: Map<Step, ReportRow>;
  onSubmit: (specialtyId: string, step: Step, text: string) => void;
  isSubmitting: boolean;
  highlighted?: boolean;
  readOnly?: boolean;
}) {
  const { ref, open, setOpen } = useDeepLinkHighlight(!!highlighted);

  const approvedCount = STEP_ORDER.filter(
    (s) => reports.get(s)?.status === "approved",
  ).length;
  // Earned only once all three steps are approved (ADR 0002).
  const earned = approvedCount === 3;

  const suggestionsFor = (step: Step): string[] =>
    step === "conhecer"
      ? specialty.conhecerSuggestions
      : step === "fazer"
        ? specialty.fazerSuggestions
        : specialty.compartilharSuggestions;

  return (
    <div ref={ref} className="scroll-mt-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={`w-full flex items-center gap-3 p-3 rounded-md border-2 border-black bg-card hover:bg-muted/50 transition-colors text-left shadow-[2px_2px_0px_0px_#000] ${
              highlighted ? "ring-2 ring-primary ring-offset-2" : ""
            }`}
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
                {approvedCount}/3 etapas aprovadas
              </p>
            </div>
            <ChevronDown
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </CollapsibleTrigger>

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
                row={reports.get(step)}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
                readOnly={readOnly}
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
  reportsBySpecialty,
  onSubmit,
  isSubmitting,
  highlightId,
  readOnly,
}: {
  eixoId: string;
  specialties: OlderSpecialty[];
  reportsBySpecialty: Map<string, Map<Step, ReportRow>>;
  onSubmit: (specialtyId: string, step: Step, text: string) => void;
  isSubmitting: boolean;
  highlightId?: string;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useAutoOpen(
    specialties.some((s) => s.id === highlightId),
  );
  const meta = EIXO_LABELS[eixoId] ?? { name: eixoId, color: "#666" };

  // Earned = all three steps approved (ADR 0002).
  const earnedCount = specialties.filter((s) => {
    const reports = reportsBySpecialty.get(s.id);
    return STEP_ORDER.every((step) => reports?.get(step)?.status === "approved");
  }).length;

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
              reports={reportsBySpecialty.get(s.id) ?? new Map()}
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              highlighted={s.id === highlightId}
              readOnly={readOnly}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Self-service fetcher: the escoteiro's own reports (editable).
function OlderEspecialidadesContent({ highlightId }: { highlightId?: string }) {
  const { data: myReports } = useSuspenseQuery(
    convexQuery(api.specialties.getMySpecialtyReports, {}),
  );
  return (
    <OlderEspecialidadesView reports={myReports} highlightId={highlightId} />
  );
}

// Escotista fetcher (#53): a scout's reports via the visibility-checked query,
// rendered read-only.
function OlderEscoteiroContent({
  highlightId,
  escoteiroId,
}: {
  highlightId?: string;
  escoteiroId: Id<"users">;
}) {
  const { data: reports } = useSuspenseQuery(
    convexQuery(api.specialties.getSpecialtyReportsForEscoteiro, {
      escoteiroId,
    }),
  );
  return (
    <OlderEspecialidadesView
      reports={reports}
      highlightId={highlightId}
      readOnly
    />
  );
}

function OlderEspecialidadesView({
  reports: myReports,
  highlightId,
  readOnly,
}: {
  reports: Doc<"specialtyProjectReports">[];
  highlightId?: string;
  /** Escotista read-only mode (#53): disable self-service controls. */
  readOnly?: boolean;
}) {
  // Submitting a step never earns the specialty (that happens on escotista
  // approval of the compartilhar step), so no level-up toast is expected here.
  const submitStepFn = useConvexMutation(api.specialties.submitSpecialtyStep);
  const { mutate: submitStep, isPending: isSubmitting } = useMutation({
    mutationFn: submitStepFn,
  });

  // specialtyId → (step → row), older ramoGroup only.
  const reportsBySpecialty = useMemo(() => {
    const m = new Map<string, Map<Step, ReportRow>>();
    for (const row of myReports) {
      if (row.ramoGroup !== "older") continue;
      const inner = m.get(row.specialtyId) ?? new Map<Step, ReportRow>();
      inner.set(row.step as Step, row);
      m.set(row.specialtyId, inner);
    }
    return m;
  }, [myReports]);

  // In escotista read-only mode, submitting as the scout must not fire as the
  // adult — the textareas are disabled and the handler is a no-op (#53).
  const handleSubmit = (specialtyId: string, step: Step, text: string) => {
    if (readOnly) return;
    submitStep({ specialtyId, step, text });
  };

  const eixoIds = Object.keys(OLDER_SPECIALTIES_BY_EIXO);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-black uppercase text-foreground">
            Especialidades
          </h1>
          <AuthButton />
        </header>

        <PlanNav />

        <p className="text-xs text-muted-foreground px-1">
          Cada especialidade é um projeto em três etapas: Conhecer, Fazer e
          Compartilhar. Você pode escrever os relatos em qualquer ordem; a
          especialidade é conquistada quando as três etapas forem aprovadas.
        </p>

        <div className="space-y-2">
          {eixoIds.map((eixoId) => (
            <OlderEixoSection
              key={eixoId}
              eixoId={eixoId}
              specialties={OLDER_SPECIALTIES_BY_EIXO[eixoId] ?? []}
              reportsBySpecialty={reportsBySpecialty}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              highlightId={highlightId}
              readOnly={readOnly}
            />
          ))}
        </div>

        <Footer />
      </div>
    </div>
  );
}
