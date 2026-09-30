/**
 * The escotista's per-escoteiro especialidade ficha — `/especialidades?
 * escoteiroId=…&specialty=…`. Actionable (not read-only since the escotista
 * Especialidades tab):
 *
 * - Younger: tap an open item → approved on the spot (approver + time); tap an
 *   approved item → unmarked. A submitted (pending) item shows Aprovar /
 *   Rejeitar inline. Same semantics as ações: a misclick is fixed by tapping
 *   again, and an unmark that drops a level simply drops it.
 * - Older: each etapa's relato; pending → Aprovar / Rejeitar; an etapa with no
 *   relato can be registered by the escotista on the scout's behalf.
 *
 * Every write goes through a mutation that re-checks visibilidade de ramo.
 */
import { useMemo, useState, type ReactNode } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import {
  OLDER_SPECIALTY_BY_ID,
  PROJECT_STEPS,
  PROJECT_STEP_LABELS,
  type ProjectStep,
} from "@/data/specialty-data/older";
import { eixoMeta } from "@/data/eixo-colors";
import { getSpecialtyLevel } from "@/lib/completion-logic";
import { EMERALD } from "@/lib/design-tokens";
import { RAMO_LABELS, type Ramo } from "@/lib/ramos";
import {
  catalogFor,
  filterCatalog,
  findCatalogEntry,
  ramoGroupOf,
  type CatalogEntry,
  type RamoGroup,
} from "@/lib/specialty-catalog";
import { AppShell } from "@/components/layout/app-shell";
import { BackButton, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { HardButton } from "@/components/ui/hard-button";
import { DashedRowButton, ListRow, RowChevron } from "@/components/ui/list-row";
import { SearchInput } from "@/components/ui/search-input";
import { Card, ListBox, ListHeader, Note, SectionHeading } from "@/components/ui/section";
import { LevelPill, Pill, StatusPill } from "@/components/ui/status-pill";
import {
  ItemProgressHead,
  SpecialtyItemRow,
  StepHeader,
  firstName,
  shortDate,
} from "@/components/especialidades/pieces";
import {
  PendingRelato,
  Suggestions,
  useItemReview,
  useRegisterStep,
  useStepReview,
} from "./actions";

export function EscotistaFicha({
  escoteiroId,
  specialtyId,
}: {
  escoteiroId: Id<"users">;
  specialtyId?: string;
}) {
  const { data: members } = useSuspenseQuery(
    convexQuery(api.groups.getGroupMembers, {}),
  );
  const escoteiro = members.find(
    (m) => m._id === escoteiroId && m.role === "escoteiro",
  );
  const approverNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of members) if (x.name) m.set(x._id, x.name);
    return m;
  }, [members]);

  const router = useRouter();
  const navigate = useNavigate();
  const group = ramoGroupOf(escoteiro?.ramo);
  const entry = specialtyId ? findCatalogEntry(group, specialtyId) : undefined;

  const goBack = () => {
    if (router.history.canGoBack()) router.history.back();
    else if (entry)
      void navigate({
        to: "/escotista/especialidades/$specialtyId",
        params: { specialtyId: entry.id },
        search: { grupo: group },
      });
    else void navigate({ to: "/escotista/especialidades" });
  };
  const back = <BackButton onClick={goBack} />;

  if (!escoteiro) {
    return (
      <AppShell header={<PageHeader back={back} eyebrow="Especialidades" title="Escoteiro" />}>
        <EmptyState>Escoteiro não encontrado ou fora dos ramos que você acompanha.</EmptyState>
      </AppShell>
    );
  }

  const crumb = [
    escoteiro.name ?? "Escoteiro",
    escoteiro.ramo ? RAMO_LABELS[escoteiro.ramo as Ramo] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const common = { escoteiro, entry, back, crumb, approverNames };
  return group === "younger" ? <YoungerFicha {...common} /> : <OlderFicha {...common} />;
}

type Member = { _id: Id<"users">; name?: string | null; ramo?: string | null };

type FichaProps = {
  escoteiro: Member;
  entry: CatalogEntry | undefined;
  back: ReactNode;
  crumb: string;
  approverNames: Map<string, string>;
};

// ---------------------------------------------------------------------------
// Younger
// ---------------------------------------------------------------------------

function YoungerFicha({ escoteiro, entry, back, crumb, approverNames }: FichaProps) {
  const { data: rows } = useSuspenseQuery(
    convexQuery(api.specialties.getSpecialtyItemsForEscoteiro, {
      escoteiroId: escoteiro._id,
    }),
  );
  const bySpecialty = useMemo(() => {
    const m = new Map<string, Doc<"specialtyItemCompletions">[]>();
    for (const r of rows) {
      if (r.ramoGroup !== "younger") continue;
      const arr = m.get(r.specialtyId) ?? [];
      arr.push(r);
      m.set(r.specialtyId, arr);
    }
    return m;
  }, [rows]);

  const progressOf = (e: CatalogEntry) => {
    const own = bySpecialty.get(e.id) ?? [];
    const approved = own.filter((r) => r.status !== "pending").length;
    const pending = own.filter((r) => r.status === "pending").length;
    return {
      approved,
      pending,
      level: getSpecialtyLevel(approved, e.itemCount ?? 0) as 0 | 1 | 2,
    };
  };
  const statusOf: StatusOf = (e) => {
    const p = progressOf(e);
    return {
      text: `${p.approved} de ${e.itemCount} itens${p.pending ? ` · ${p.pending} aguardando` : ""}`,
      level: p.level,
      pending: p.pending > 0,
    };
  };

  const others = catalogFor("younger").filter(
    (e) => e.id !== entry?.id && bySpecialty.has(e.id),
  );

  if (!entry) {
    return (
      <Hub escoteiro={escoteiro} group="younger" back={back} crumb={crumb} active={others} statusOf={statusOf} />
    );
  }

  const eixo = eixoMeta(entry.eixoId);
  const total = entry.itemCount ?? entry.texts.length;
  const own = bySpecialty.get(entry.id) ?? [];
  const byIndex = new Map(own.map((r) => [r.itemIndex, r]));
  const { approved, pending, level } = progressOf(entry);
  const name = firstName(escoteiro.name);

  return (
    <AppShell header={<PageHeader back={back} eyebrow={crumb} title={entry.name} />}>
      <div>
        <ItemProgressHead
          color={eixo.color}
          total={total}
          approved={approved}
          pending={pending}
          level={level}
        />
        <Note className="mb-3 mt-0">
          Você edita como escotista: tocar um item aberto marca{" "}
          <b className="text-[#4A4A44]">aprovado na hora</b>; tocar de novo desmarca. Itens
          enviados por {name} aparecem em amarelo com Aprovar / Rejeitar.
        </Note>

        <ListBox className="mb-4">
          <ListHeader label="Itens" meta="toque para marcar" tint={eixo.tint} />
          {entry.texts.map((text, i) => (
            <ItemRow
              key={i}
              index={i}
              text={text}
              row={byIndex.get(i)}
              escoteiroId={escoteiro._id}
              specialtyId={entry.id}
              escoteiroName={name}
              approverNames={approverNames}
            />
          ))}
        </ListBox>

        <OthersList escoteiro={escoteiro} entries={others} statusOf={statusOf} />
      </div>
    </AppShell>
  );
}

function ItemRow({
  index,
  text,
  row,
  escoteiroId,
  specialtyId,
  escoteiroName,
  approverNames,
}: {
  index: number;
  text: string;
  row: Doc<"specialtyItemCompletions"> | undefined;
  escoteiroId: Id<"users">;
  specialtyId: string;
  escoteiroName: string;
  approverNames: Map<string, string>;
}) {
  const review = useItemReview();
  const state: "open" | "approved" | "pending" = !row
    ? "open"
    : row.status === "pending"
      ? "pending"
      : "approved";
  const busy = review.pendingItemIndex === index || review.rejecting;

  const toggle = () => {
    if (state === "pending" || busy) return;
    review.setApproved({ escoteiroId, specialtyId, itemIndex: index, approved: state === "open" });
  };

  const approver = row?.approvedBy ? approverNames.get(row.approvedBy) : undefined;
  const status =
    state === "approved"
      ? ["Aprovado", approver, shortDate(row?.approvedAt ?? row?.completedAt)]
          .filter(Boolean)
          .join(" · ")
      : state === "pending"
        ? `Enviado por ${escoteiroName} · ${shortDate(row?.completedAt)}`
        : undefined;

  return (
    <SpecialtyItemRow
      index={index}
      text={text}
      state={state}
      onToggle={toggle}
      disabled={state === "pending"}
      busy={busy}
      status={status}
      ariaLabel={
        state === "approved"
          ? `Desmarcar item ${index + 1}`
          : state === "pending"
            ? `Item ${index + 1} aguardando aprovação`
            : `Marcar item ${index + 1} como aprovado`
      }
      actions={
        state === "pending" && row ? (
          <>
            <HardButton
              size="sm"
              disabled={busy}
              onClick={() =>
                review.setApproved({ escoteiroId, specialtyId, itemIndex: index, approved: true })
              }
            >
              Aprovar
            </HardButton>
            <HardButton size="sm" tone="paper" disabled={busy} onClick={() => review.reject(row._id)}>
              Rejeitar
            </HardButton>
          </>
        ) : undefined
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Older (sênior / pioneiro)
// ---------------------------------------------------------------------------

function OlderFicha({ escoteiro, entry, back, crumb, approverNames }: FichaProps) {
  const { data: rows } = useSuspenseQuery(
    convexQuery(api.specialties.getSpecialtyReportsForEscoteiro, {
      escoteiroId: escoteiro._id,
    }),
  );
  const bySpecialty = useMemo(() => {
    const m = new Map<string, Map<ProjectStep, Doc<"specialtyProjectReports">>>();
    for (const r of rows) {
      if (r.ramoGroup !== "older") continue;
      const inner = m.get(r.specialtyId) ?? new Map();
      inner.set(r.step, r);
      m.set(r.specialtyId, inner);
    }
    return m;
  }, [rows]);
  const review = useStepReview();

  const statusOf = (e: CatalogEntry) => {
    const steps = bySpecialty.get(e.id);
    const approved = PROJECT_STEPS.filter((s) => steps?.get(s)?.status === "approved").length;
    const pending = PROJECT_STEPS.filter((s) => steps?.get(s)?.status === "pending").length;
    return {
      text:
        approved === 3
          ? "Conquistada · 3 etapas aprovadas"
          : `${approved} de 3 etapas${pending ? ` · ${pending} aguardando` : ""}`,
      level: 0 as const,
      pending: pending > 0,
      earned: approved === 3,
    };
  };
  const others = catalogFor("older").filter((e) => e.id !== entry?.id && bySpecialty.has(e.id));

  if (!entry) {
    return (
      <Hub escoteiro={escoteiro} group="older" back={back} crumb={crumb} active={others} statusOf={statusOf} />
    );
  }

  const specialty = OLDER_SPECIALTY_BY_ID.get(entry.id)!;
  const eixo = eixoMeta(entry.eixoId);
  const steps = bySpecialty.get(entry.id) ?? new Map();
  const status = statusOf(entry);
  const suggestions: Record<ProjectStep, string[]> = {
    conhecer: specialty.conhecerSuggestions,
    fazer: specialty.fazerSuggestions,
    compartilhar: specialty.compartilharSuggestions,
  };

  return (
    <AppShell header={<PageHeader back={back} eyebrow={crumb} title={entry.name} />}>
      <div>
        <Card accent={eixo.color} className="mb-3 mt-2">
          <p className="text-[14px] leading-[1.45] text-[#4A4A44]">{entry.description}</p>
          <div className="mt-3 flex items-center justify-between gap-3 text-[14px] font-extrabold">
            <span>{status.text}</span>
            {status.earned && <Pill tone="gold">Conquistada</Pill>}
          </div>
        </Card>
        <Note className="mb-3 mt-0">
          Relatos enviados por {firstName(escoteiro.name)} aparecem com Aprovar / Rejeitar. Uma
          etapa sem relato pode ser registrada por você — ela entra já aprovada.
        </Note>

        {PROJECT_STEPS.map((step, i) => (
          <StepCard
            key={step}
            ordinal={i + 1}
            step={step}
            tint={eixo.tint}
            suggestions={suggestions[step]}
            row={steps.get(step)}
            escoteiroId={escoteiro._id}
            specialtyId={entry.id}
            approverNames={approverNames}
            review={review}
          />
        ))}

        <OthersList escoteiro={escoteiro} entries={others} statusOf={statusOf} />
      </div>
    </AppShell>
  );
}

function StepCard({
  ordinal,
  step,
  tint,
  suggestions,
  row,
  escoteiroId,
  specialtyId,
  approverNames,
  review,
}: {
  ordinal: number;
  step: ProjectStep;
  tint: string;
  suggestions: string[];
  row: Doc<"specialtyProjectReports"> | undefined;
  escoteiroId: Id<"users">;
  specialtyId: string;
  approverNames: Map<string, string>;
  review: ReturnType<typeof useStepReview>;
}) {
  const label = PROJECT_STEP_LABELS[step];
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const register = useRegisterStep();
  const state = !row ? "open" : row.status === "approved" ? "approved" : "pending";

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

        {state === "pending" && row && (
          <PendingRelato reportId={row._id} stepLabel={label} text={row.text} review={review} />
        )}

        {state === "approved" && row && (
          <div className="border-t-2 border-[#D9D5C9] px-3 py-2.5">
            <p
              className={`whitespace-pre-line border-l-[3px] border-[#D9D5C9] pl-2.5 text-[13px] leading-snug text-[#4A4A44] ${
                expanded ? "" : "line-clamp-3"
              }`}
            >
              {row.text}
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-[12px] font-extrabold" style={{ color: EMERALD }}>
                {[
                  "Aprovado",
                  row.approvedBy ? approverNames.get(row.approvedBy) : undefined,
                  shortDate(row.approvedAt ?? row.completedAt),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <HardButton size="sm" tone="ghost" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Recolher" : "Ler relato"}
              </HardButton>
            </div>
          </div>
        )}

        {state === "open" && (
          <div className="border-t-2 border-dashed border-[#D9D5C9] px-3 py-2.5">
            {writing ? (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  autoFocus
                  aria-label={`Relato da etapa ${label}`}
                  placeholder={`O que foi feito na etapa ${label}?`}
                  className="w-full resize-y rounded-md border-2 border-[#141414] bg-white p-2 text-[15px] outline-none focus:ring-2 focus:ring-[#0E6B4E]/40"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <HardButton
                    size="sm"
                    disabled={!text.trim() || register.isPending}
                    onClick={() =>
                      register.mutate(
                        { specialtyId, step, text, targetUserId: escoteiroId },
                        {
                          onSuccess: () => {
                            setWriting(false);
                            setText("");
                          },
                        },
                      )
                    }
                  >
                    Registrar como aprovada
                  </HardButton>
                  <HardButton
                    size="sm"
                    tone="paper"
                    onClick={() => {
                      setWriting(false);
                      setText("");
                    }}
                  >
                    Cancelar
                  </HardButton>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setWriting(true)}
                className="flex min-h-11 w-full items-center text-left text-[15px] font-extrabold text-[#0E6B4E]"
              >
                + Registrar {label} pelo escoteiro
              </button>
            )}
          </div>
        )}
      </ListBox>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared: other especialidades + hub
// ---------------------------------------------------------------------------

type StatusOf = (e: CatalogEntry) => {
  text: string;
  level: 0 | 1 | 2;
  pending: boolean;
};

function OthersList({
  escoteiro,
  entries,
  statusOf,
}: {
  escoteiro: Member;
  entries: CatalogEntry[];
  statusOf: StatusOf;
}) {
  return (
    <>
      {entries.length > 0 && (
        <>
          <SectionHeading label={`Outras especialidades de ${firstName(escoteiro.name)}`} />
          <EntryList escoteiroId={escoteiro._id} entries={entries} statusOf={statusOf} />
        </>
      )}
      <DashedRowButton
        className="mt-3"
        link={<Link to="/especialidades" search={{ escoteiroId: escoteiro._id }} />}
      >
        Abrir outra especialidade de {firstName(escoteiro.name)}
        <span className="ml-auto">
          <RowChevron />
        </span>
      </DashedRowButton>
    </>
  );
}

function EntryList({
  escoteiroId,
  entries,
  statusOf,
}: {
  escoteiroId: Id<"users">;
  entries: CatalogEntry[];
  statusOf: StatusOf;
}) {
  return (
    <ListBox>
      {entries.map((e) => {
        const s = statusOf(e);
        return (
          <ListRow
            key={e.id}
            tall
            bar={eixoMeta(e.eixoId).color}
            title={e.name}
            subtitle={s.text}
            subtitleTone={s.pending ? "pending" : "muted"}
            trailing={<LevelPill level={s.level} />}
            chevron
            link={<Link to="/especialidades" search={{ escoteiroId, specialty: e.id }} />}
          />
        );
      })}
    </ListBox>
  );
}

/** No specialty chosen: this escoteiro's especialidades + search the catalog. */
function Hub({
  escoteiro,
  group,
  back,
  crumb,
  active,
  statusOf,
}: {
  escoteiro: Member;
  group: RamoGroup;
  back: ReactNode;
  crumb: string;
  active: CatalogEntry[];
  statusOf: StatusOf;
}) {
  const [query, setQuery] = useState("");
  const results = query.trim()
    ? filterCatalog(catalogFor(group), { query }).map((r) => r.entry)
    : [];
  return (
    <AppShell header={<PageHeader back={back} eyebrow={crumb} title="Especialidades" />}>
      <div>
        <SectionHeading className="mt-1" label="Com atividade" meta={active.length || undefined} />
        {active.length === 0 ? (
          <EmptyState>{firstName(escoteiro.name)} ainda não começou nenhuma especialidade.</EmptyState>
        ) : (
          <EntryList escoteiroId={escoteiro._id} entries={active} statusOf={statusOf} />
        )}
        <SectionHeading label="Abrir outra" />
        <SearchInput
          className="mb-2.5"
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nome ou requisito"
          ariaLabel="Buscar especialidade"
        />
        {results.length > 0 && (
          <EntryList escoteiroId={escoteiro._id} entries={results} statusOf={statusOf} />
        )}
      </div>
    </AppShell>
  );
}
