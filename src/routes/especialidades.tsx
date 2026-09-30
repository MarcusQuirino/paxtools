import { useEffect, useMemo, useState, type ReactNode } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { EIXO_COLORS, eixoMeta } from "@/data/eixo-colors";
import {
  OLDER_SPECIALTY_BY_ID,
  PROJECT_STEPS,
  PROJECT_STEP_LABELS,
  type ProjectStep,
} from "@/data/specialty-data/older";
import { getSpecialtyLevel } from "@/lib/completion-logic";
import { AMBER } from "@/lib/design-tokens";
import {
  catalogFor,
  filterCatalog,
  findCatalogEntry,
  isListing,
  plural,
  type CatalogEntry,
  type RamoGroup,
} from "@/lib/specialty-catalog";
import { AppShellSkeleton } from "@/components/layout/app-shell";
import { BackButton, PageHeader } from "@/components/layout/page-header";
import { EscoteiroShell } from "@/components/progression/escoteiro-shell";
import { EscotistaFicha } from "@/components/escotista/especialidades/ficha";
import {
  ItemProgressHead,
  SpecialtyItemRow,
  StepHeader,
  Suggestions,
} from "@/components/especialidades/pieces";
import { EmptyState } from "@/components/ui/empty-state";
import { EixoFilterChips } from "@/components/ui/filter-chips";
import { HardButton } from "@/components/ui/hard-button";
import { KpiGrid, KpiTile } from "@/components/ui/kpi-tile";
import { ListRow, RowSnippet } from "@/components/ui/list-row";
import { MiniBar } from "@/components/ui/progress-ring";
import { SearchInput } from "@/components/ui/search-input";
import { Card, ListBox, ListHeader, Note, SectionHeading } from "@/components/ui/section";
import { LevelPill, Pill, StatusPill, StatusText } from "@/components/ui/status-pill";

type EspSearch = {
  /** Deep link / pushed detail: the open especialidade. */
  specialty?: string;
  /** Escotista access (#53): the scout whose ficha is shown. */
  escoteiroId?: string;
  /** Hub search text. */
  q?: string;
  /** Hub eixo filter. */
  f?: string;
};

export const Route = createFileRoute("/especialidades")({
  // `?specialty=<slug>` opens that especialidade as its own screen (#44 deep
  // link from bloco cards). `?escoteiroId=<id>` is the escotista's actionable
  // ficha of a scout (#53).
  validateSearch: (search: Record<string, unknown>): EspSearch => ({
    specialty: typeof search.specialty === "string" ? search.specialty : undefined,
    escoteiroId: typeof search.escoteiroId === "string" ? search.escoteiroId : undefined,
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    f: typeof search.f === "string" && search.f ? search.f : undefined,
  }),
  loaderDeps: ({ search: { escoteiroId } }) => ({ escoteiroId }),
  loader: async ({ context, deps }) => {
    if (deps.escoteiroId) {
      const escoteiroId = deps.escoteiroId as Id<"users">;
      await Promise.all([
        context.queryClient.ensureQueryData(convexQuery(api.groups.getGroupMembers, {})),
        context.queryClient.ensureQueryData(
          convexQuery(api.specialties.getSpecialtyItemsForEscoteiro, { escoteiroId }),
        ),
        context.queryClient.ensureQueryData(
          convexQuery(api.specialties.getSpecialtyReportsForEscoteiro, { escoteiroId }),
        ),
      ]);
      return;
    }
    await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.specialties.getMySpecialtyItems, {})),
      context.queryClient.ensureQueryData(convexQuery(api.specialties.getMySpecialtyReports, {})),
    ]);
  },
  component: EspecialidadesPage,
});

function EspecialidadesPage() {
  const { specialty, escoteiroId: escoteiroIdRaw } = Route.useSearch();
  const escoteiroId = escoteiroIdRaw as Id<"users"> | undefined;
  // With an escoteiroId the viewer is an escotista inspecting a scout's
  // ficha (#53); without it this is the escoteiro self-service tab.
  const { ready, user } = useAuthGate(escoteiroId ? "escotista" : "escoteiro");

  if (!ready) return <AppShellSkeleton rows={3} />;

  if (escoteiroId) {
    return <EscotistaFicha escoteiroId={escoteiroId} specialtyId={specialty} />;
  }

  const ramo = user?.ramo;
  if (ramo === "senior" || ramo === "pioneiro") return <OlderEspecialidades />;
  return <YoungerEspecialidades />;
}

// ---------------------------------------------------------------------------
// Shared hub (both ramo groups): KPIs · search · eixo chips · Em andamento ·
// Conquistadas · Explorar por eixo — mockup A frame 4.
// ---------------------------------------------------------------------------

/** What the hub needs to know about one especialidade's progress. */
type Progress = {
  /** Started: any approved or pending item / etapa. */
  started: boolean;
  /** Younger: item level. Older: 0, or 2 when all three etapas are approved. */
  level: 0 | 1 | 2;
  /** Fully done (younger level 2 / older all three etapas). */
  complete: boolean;
  pct: number;
  /** "6 de 8 itens · 1 aguardando" */
  text: string;
  pending: boolean;
};

function useHubNav() {
  const navigate = Route.useNavigate();
  const router = useRouter();
  const set = (patch: Partial<EspSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const open = (specialty: string) =>
    void navigate({ search: (prev) => ({ ...prev, specialty }) });
  const back = () => {
    if (router.history.canGoBack()) router.history.back();
    else void navigate({ search: (prev) => ({ ...prev, specialty: undefined }), replace: true });
  };
  return { set, open, back };
}

function Hub({
  group,
  progressOf,
}: {
  group: RamoGroup;
  progressOf: (e: CatalogEntry) => Progress;
}) {
  const { q = "", f } = Route.useSearch();
  const { set, open } = useHubNav();
  const catalog = catalogFor(group);
  const listing = isListing(q, f);
  const eixoFilter = f ?? null;

  const results = useMemo(
    () => (listing ? filterCatalog(catalog, { query: q, eixoId: eixoFilter }) : []),
    [listing, catalog, q, eixoFilter],
  );

  const withProgress = useMemo(
    () => catalog.map((e) => ({ entry: e, p: progressOf(e) })).filter((x) => x.p.started),
    [catalog, progressOf],
  );
  const inProgress = withProgress.filter((x) => !x.p.complete);
  const earned = withProgress.filter((x) => x.p.level >= 1);

  const row = (entry: CatalogEntry, p: Progress, snippet?: string | null) => {
    const eixo = eixoMeta(entry.eixoId);
    return (
      <ListRow
        key={entry.id}
        tall
        bar={eixo.color}
        title={entry.name}
        subtitle={
          p.started
            ? p.text
            : `${entry.itemCount != null ? `${entry.itemCount} itens` : "3 etapas"} · ${eixo.name}`
        }
        subtitleTone={p.pending ? "pending" : "muted"}
        extra={
          <>
            {snippet && <RowSnippet>{snippet}</RowSnippet>}
            {p.started && !p.complete && (
              <MiniBar pct={p.pct} color={p.pending ? AMBER : eixo.color} />
            )}
          </>
        }
        trailing={
          group === "older" && p.complete ? <Pill tone="gold">Conquistada</Pill> : <LevelPill level={p.level} />
        }
        chevron
        onClick={() => open(entry.id)}
        testId={`esp-row-${entry.id}`}
      />
    );
  };

  return (
    <EscoteiroShell title="Especialidades">
      <div>
        <KpiGrid className="mb-3">
          <KpiTile tone="gold" value={earned.length} label="Conquistadas" testId="kpi-conquistadas" />
          <KpiTile value={inProgress.length} label="Em andamento" testId="kpi-andamento" />
        </KpiGrid>

        <SearchInput
          className="mb-2.5"
          value={q}
          onChange={(next) => set({ q: next || undefined })}
          placeholder="Buscar por nome ou requisito"
          testId="esp-search"
        />
        <EixoFilterChips
          className="mb-1"
          value={eixoFilter}
          onChange={(id) => set({ f: id ?? undefined })}
        />

        {listing ? (
          <>
            <SectionHeading
              label={eixoFilter ? eixoMeta(eixoFilter).name : "Resultados"}
              meta={plural(results.length, "especialidade", "especialidades")}
            />
            {results.length === 0 ? (
              <EmptyState title="Nada encontrado">Tente outro termo ou limpe o filtro.</EmptyState>
            ) : (
              <ListBox testId="esp-results">
                {results.map(({ entry, snippet }) => row(entry, progressOf(entry), snippet))}
              </ListBox>
            )}
            <Note>
              A busca cobre o nome <i>e</i> o texto dos{" "}
              {group === "younger" ? "itens" : "sugestões das etapas"} — os resultados mostram o
              trecho que casou.
            </Note>
          </>
        ) : (
          <>
            <SectionHeading
              label="Em andamento"
              meta={inProgress.length > 0 ? inProgress.length : undefined}
            />
            {inProgress.length === 0 ? (
              <EmptyState title="Nenhuma em andamento">
                Busque acima ou explore por eixo para começar uma especialidade.
              </EmptyState>
            ) : (
              <ListBox testId="esp-andamento">
                {inProgress.map((x) => row(x.entry, x.p))}
              </ListBox>
            )}

            {earned.length > 0 && (
              <>
                <SectionHeading label="Conquistadas" meta={earned.length} />
                <ListBox testId="esp-conquistadas">{earned.map((x) => row(x.entry, x.p))}</ListBox>
              </>
            )}

            <SectionHeading label="Explorar" meta="por eixo" />
            <ListBox testId="esp-explorar">
              {EIXO_COLORS.map((e) => {
                const inEixo = catalog.filter((c) => c.eixoId === e.id);
                if (inEixo.length === 0) return null;
                const won = inEixo.filter((c) => progressOf(c).level >= 1).length;
                return (
                  <ListRow
                    key={e.id}
                    tall
                    bar={e.color}
                    title={e.name}
                    subtitle={`${plural(inEixo.length, "especialidade", "especialidades")}${
                      won > 0 ? ` · ${plural(won, "conquistada", "conquistadas")}` : ""
                    }`}
                    chevron
                    onClick={() => set({ f: e.id })}
                  />
                );
              })}
            </ListBox>
          </>
        )}
      </div>
    </EscoteiroShell>
  );
}

/** Pushed detail screen chrome: back + eixo crumb + 22px title, inside the tab shell. */
function DetailShell({ entry, children }: { entry: CatalogEntry; children: ReactNode }) {
  const { back } = useHubNav();
  const eixo = eixoMeta(entry.eixoId);
  return (
    <EscoteiroShell
      title={entry.name}
      header={
        <PageHeader
          back={<BackButton onClick={back} />}
          eyebrow={eixo.name}
          crumbColor={eixo.color}
          title={entry.name}
        />
      }
    >
      {children}
    </EscoteiroShell>
  );
}

function NotFound() {
  const { back } = useHubNav();
  return (
    <EscoteiroShell
      title="Especialidades"
      header={<PageHeader back={<BackButton onClick={back} />} eyebrow="Especialidades" title="Não encontrada" />}
    >
      <EmptyState>Esta especialidade não existe no catálogo do seu ramo.</EmptyState>
    </EscoteiroShell>
  );
}

// ---------------------------------------------------------------------------
// Younger (lobinho / escoteiro): numbered item checklist
// ---------------------------------------------------------------------------

type ItemRow = Doc<"specialtyItemCompletions">;

function YoungerEspecialidades() {
  const { specialty } = Route.useSearch();
  const { data: myItems } = useSuspenseQuery(convexQuery(api.specialties.getMySpecialtyItems, {}));

  const itemsBySpecialty = useMemo(() => {
    const m = new Map<string, ItemRow[]>();
    for (const item of myItems) {
      if (item.ramoGroup !== "younger") continue;
      const arr = m.get(item.specialtyId) ?? [];
      arr.push(item);
      m.set(item.specialtyId, arr);
    }
    return m;
  }, [myItems]);

  const progressOf = useMemo(
    () =>
      (e: CatalogEntry): Progress => {
        const own = itemsBySpecialty.get(e.id) ?? [];
        const approved = own.filter((i) => i.status === "approved" || !i.status).length;
        const pending = own.filter((i) => i.status === "pending").length;
        const total = e.itemCount ?? e.texts.length;
        const level = getSpecialtyLevel(approved, total) as 0 | 1 | 2;
        return {
          started: own.length > 0,
          level,
          complete: level === 2,
          pct: (approved / total) * 100,
          text: `${approved} de ${total} itens${pending ? ` · ${plural(pending, "aguardando", "aguardando")}` : ""}`,
          pending: pending > 0,
        };
      },
    [itemsBySpecialty],
  );

  if (!specialty) return <Hub group="younger" progressOf={progressOf} />;
  const entry = findCatalogEntry("younger", specialty);
  if (!entry) return <NotFound />;
  return <YoungerDetail entry={entry} items={itemsBySpecialty.get(entry.id) ?? []} />;
}

function YoungerDetail({ entry, items }: { entry: CatalogEntry; items: ItemRow[] }) {
  const toggleItemFn = useConvexMutation(api.specialties.toggleSpecialtyItem);
  const { mutate: toggleItem, isPending: isToggling } = useMutation({ mutationFn: toggleItemFn });

  const eixo = eixoMeta(entry.eixoId);
  const total = entry.itemCount ?? entry.texts.length;
  const byIndex = new Map(items.map((r) => [r.itemIndex, r]));
  const approved = items.filter((i) => i.status === "approved" || !i.status).length;
  const pending = items.filter((i) => i.status === "pending").length;
  const level = getSpecialtyLevel(approved, total) as 0 | 1 | 2;

  return (
    <DetailShell entry={entry}>
      <div>
        <ItemProgressHead
          color={eixo.color}
          total={total}
          approved={approved}
          pending={pending}
          level={level}
          description={entry.description}
          testId="esp-detail-head"
        />
        <ListBox className="mb-2">
          <ListHeader
            label="Itens"
            meta={pending > 0 ? `${pending} aguardando` : "toque para enviar"}
            tint={eixo.tint}
          />
          {entry.texts.map((text, index) => {
            const row = byIndex.get(index);
            const state: "open" | "pending" | "approved" = !row
              ? "open"
              : row.status === "pending"
                ? "pending"
                : "approved";
            return (
              <SpecialtyItemRow
                key={index}
                index={index}
                text={text}
                state={state}
                // Approved items are locked for the escoteiro; pending can be
                // withdrawn by tapping again.
                disabled={state === "approved"}
                busy={isToggling}
                onToggle={() =>
                  state !== "approved" && toggleItem({ specialtyId: entry.id, itemIndex: index })
                }
                ariaLabel={
                  state === "approved"
                    ? `Item ${index + 1} aprovado`
                    : state === "pending"
                      ? `Desfazer envio do item ${index + 1}`
                      : `Enviar item ${index + 1} para aprovação`
                }
              />
            );
          })}
        </ListBox>
        <Note>
          Toque em um item para enviá-lo à aprovação de um escotista; toque de novo para desfazer
          enquanto estiver aguardando.
        </Note>
      </div>
    </DetailShell>
  );
}

// ---------------------------------------------------------------------------
// Older (sênior / pioneiro): three-etapa project
// ---------------------------------------------------------------------------

type ReportRow = Doc<"specialtyProjectReports">;

const OLDER_INTRO =
  "Cada especialidade é um projeto em três etapas: Conhecer, Fazer e Compartilhar. Você pode escrever os relatos em qualquer ordem; a especialidade é conquistada quando as três etapas forem aprovadas.";

function OlderEspecialidades() {
  const { specialty } = Route.useSearch();
  const { data: myReports } = useSuspenseQuery(
    convexQuery(api.specialties.getMySpecialtyReports, {}),
  );

  // specialtyId → (step → row), older ramoGroup only.
  const reportsBySpecialty = useMemo(() => {
    const m = new Map<string, Map<ProjectStep, ReportRow>>();
    for (const row of myReports) {
      if (row.ramoGroup !== "older") continue;
      const inner = m.get(row.specialtyId) ?? new Map<ProjectStep, ReportRow>();
      inner.set(row.step as ProjectStep, row);
      m.set(row.specialtyId, inner);
    }
    return m;
  }, [myReports]);

  const progressOf = useMemo(
    () =>
      (e: CatalogEntry): Progress => {
        const steps = reportsBySpecialty.get(e.id);
        const approved = PROJECT_STEPS.filter((s) => steps?.get(s)?.status === "approved");
        const pendingSteps = PROJECT_STEPS.filter((s) => steps?.get(s)?.status === "pending");
        const complete = approved.length === 3;
        return {
          started: !!steps && steps.size > 0,
          level: complete ? 2 : 0,
          complete,
          pct: (approved.length / 3) * 100,
          text: complete
            ? "Conquistada · 3 etapas aprovadas"
            : `${approved.length} de 3 etapas${
                pendingSteps.length
                  ? ` · ${pendingSteps.map((s) => PROJECT_STEP_LABELS[s]).join(", ")} aguardando`
                  : ""
              }`,
          pending: pendingSteps.length > 0 && !complete,
        };
      },
    [reportsBySpecialty],
  );

  if (!specialty) return <Hub group="older" progressOf={progressOf} />;
  const entry = findCatalogEntry("older", specialty);
  if (!entry) return <NotFound />;
  return (
    <OlderDetail entry={entry} reports={reportsBySpecialty.get(entry.id) ?? new Map()} progress={progressOf(entry)} />
  );
}

function OlderDetail({
  entry,
  reports,
  progress,
}: {
  entry: CatalogEntry;
  reports: Map<ProjectStep, ReportRow>;
  progress: Progress;
}) {
  // Submitting a step never earns the specialty (that happens on escotista
  // approval of the compartilhar step), so no level-up toast is expected here.
  const submitStepFn = useConvexMutation(api.specialties.submitSpecialtyStep);
  const { mutate: submitStep, isPending: isSubmitting } = useMutation({ mutationFn: submitStepFn });

  const specialty = OLDER_SPECIALTY_BY_ID.get(entry.id)!;
  const eixo = eixoMeta(entry.eixoId);
  const suggestions: Record<ProjectStep, string[]> = {
    conhecer: specialty.conhecerSuggestions,
    fazer: specialty.fazerSuggestions,
    compartilhar: specialty.compartilharSuggestions,
  };

  return (
    <DetailShell entry={entry}>
      <div>
        <Card accent={eixo.color} className="mb-3 mt-2" testId="esp-detail-head">
          <p className="text-[14px] leading-[1.45] text-[#4A4A44]">{entry.description}</p>
          <div className="mt-3 flex items-center justify-between gap-3 text-[14px] font-extrabold">
            <span data-testid="esp-older-status">{progress.text}</span>
            {progress.complete && <Pill tone="gold">Conquistada</Pill>}
          </div>
        </Card>
        <Note className="mb-3 mt-0">{OLDER_INTRO}</Note>

        {PROJECT_STEPS.map((step, i) => (
          <StepCard
            key={step}
            ordinal={i + 1}
            step={step}
            tint={eixo.tint}
            suggestions={suggestions[step]}
            row={reports.get(step)}
            onSubmit={(text) => submitStep({ specialtyId: entry.id, step, text })}
            isSubmitting={isSubmitting}
          />
        ))}
      </div>
    </DetailShell>
  );
}

function StepCard({
  ordinal,
  step,
  tint,
  suggestions,
  row,
  onSubmit,
  isSubmitting,
}: {
  ordinal: number;
  step: ProjectStep;
  tint: string;
  suggestions: string[];
  row: ReportRow | undefined;
  onSubmit: (text: string) => void;
  isSubmitting: boolean;
}) {
  const label = PROJECT_STEP_LABELS[step];
  const state = !row ? "open" : row.status === "approved" ? "approved" : "pending";
  const [text, setText] = useState(row?.text ?? "");
  const [expanded, setExpanded] = useState(false);

  // Keep the local draft in sync when the stored row changes (e.g. approval).
  useEffect(() => {
    setText(row?.text ?? "");
  }, [row?._id, row?.text]);

  const canEdit = state !== "approved";
  const dirty = text.trim() !== (row?.text ?? "").trim();

  return (
    <section data-testid={`ficha-step-${step}`} data-state={state}>
      <ListBox className="mb-3">
        <StepHeader
          ordinal={ordinal}
          label={label}
          tint={tint}
          right={
            state !== "open" ? (
              <StatusPill state={state}>{state === "approved" ? "Aprovado" : "Pendente"}</StatusPill>
            ) : undefined
          }
        />
        <Suggestions items={suggestions} />

        {state === "approved" && row ? (
          <div className="border-t-2 border-[#D9D5C9] px-3 py-2.5">
            <p
              className={`whitespace-pre-line border-l-[3px] border-[#D9D5C9] pl-2.5 text-[13px] leading-snug text-[#4A4A44] ${
                expanded ? "" : "line-clamp-3"
              }`}
            >
              {row.text}
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <StatusText state="approved" className="mt-0" />
              <HardButton size="sm" tone="ghost" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Recolher" : "Ler relato"}
              </HardButton>
            </div>
          </div>
        ) : (
          <div className="border-t-2 border-dashed border-[#D9D5C9] px-3 py-2.5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!canEdit || isSubmitting}
              rows={4}
              aria-label={`Relato da etapa ${label}`}
              placeholder="Escreva seu relato desta etapa..."
              className="w-full resize-y rounded-md border-2 border-[#141414] bg-white p-2 text-[15px] outline-none focus:ring-2 focus:ring-[#0E6B4E]/40 disabled:opacity-70"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <StatusText state={state === "pending" ? "pending" : "open"} className="mt-0">
                {state === "pending" ? "Enviado — aguardando aprovação" : undefined}
              </StatusText>
              <HardButton
                size="sm"
                disabled={!text.trim() || isSubmitting || (state === "pending" && !dirty)}
                onClick={() => onSubmit(text)}
              >
                {state === "pending" ? "Reenviar" : "Enviar"}
              </HardButton>
            </div>
          </div>
        )}
      </ListBox>
    </section>
  );
}
