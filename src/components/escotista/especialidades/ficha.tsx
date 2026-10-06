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
import { useMemo, useState } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Check, Clock, Search } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  OLDER_SPECIALTY_BY_ID,
  PROJECT_STEPS,
  PROJECT_STEP_LABELS,
  type ProjectStep,
} from "@/data/specialty-data/older";
import {
  emptyStanding,
  levelThresholds,
  standingsById,
  type EtapaState,
  type ItemState,
  type OlderStanding,
  type Standing,
  type YoungerStanding,
} from "@/lib/especialidade-standing";
import {
  AMBER_INK,
  BACK_CLASS,
  BackIcon,
  EMERALD,
  FichaLink,
  LevelPill,
  ListBox,
  ListHeader,
  RowChevron,
  SectionHeading,
  SubBar,
  catalogFor,
  eixoMeta,
  findCatalogEntry,
  matchEntry,
  ramoGroupOf,
  type CatalogEntry,
  type RamoGroup,
} from "./ui";
import {
  PendingRelato,
  SmallButton,
  Suggestions,
  useItemReview,
  useRegisterStep,
  useStepReview,
} from "./actions";

const RAMO_LABEL: Record<string, string> = {
  lobinho: "Lobinho",
  escoteiro: "Escoteiro",
  senior: "Sênior",
  pioneiro: "Pioneiro",
};

function shortDate(ts: number | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  const days = Math.floor(
    (new Date(today.toDateString()).getTime() -
      new Date(d.toDateString()).getTime()) /
      86_400_000,
  );
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  return d
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    .replace(" de ", " ")
    .replace(".", "");
}

function firstName(name: string | null | undefined): string {
  return (name ?? "o escoteiro").trim().split(/\s+/)[0] ?? "o escoteiro";
}

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
  // Null when the escoteiro is outside the viewer's visibilidade de ramo.
  const { data: record } = useSuspenseQuery(
    convexQuery(api.specialties.getEscoteiroEspecialidades, { escoteiroId }),
  );
  const standings = useMemo(
    () => standingsById<Standing>(record?.standings ?? []),
    [record],
  );
  const approverNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of members) if (x.name) m.set(x._id, x.name);
    return m;
  }, [members]);

  const router = useRouter();
  const navigate = useNavigate();
  const group = record?.ramoGroup ?? ramoGroupOf(escoteiro?.ramo);
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
  const back = (
    <button
      type="button"
      onClick={goBack}
      aria-label="Voltar"
      className={BACK_CLASS}
    >
      <BackIcon />
    </button>
  );

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background text-[#141414]">
      <div className="mx-auto max-w-lg px-4 py-4 pb-20">{children}</div>
    </div>
  );

  if (!escoteiro) {
    return shell(
      <>
        <SubBar back={back} crumb="Especialidades" title="Escoteiro" />
        <p className="mt-3 rounded-[10px] border-2 border-dashed border-[#8A887F] p-5 text-center text-sm text-[#4A4A44]">
          Escoteiro não encontrado ou fora dos ramos que você acompanha.
        </p>
      </>,
    );
  }

  const crumb = [escoteiro.name ?? "Escoteiro", RAMO_LABEL[escoteiro.ramo ?? ""]]
    .filter(Boolean)
    .join(" · ");

  return shell(
    group === "younger" ? (
      <YoungerFicha
        escoteiro={escoteiro}
        standings={standings as Map<string, YoungerStanding>}
        entry={entry}
        back={back}
        crumb={crumb}
        approverNames={approverNames}
      />
    ) : (
      <OlderFicha
        escoteiro={escoteiro}
        standings={standings as Map<string, OlderStanding>}
        entry={entry}
        back={back}
        crumb={crumb}
        approverNames={approverNames}
      />
    ),
  );
}

type Member = { _id: Id<"users">; name?: string | null; ramo?: string | null };

// ---------------------------------------------------------------------------
// Younger
// ---------------------------------------------------------------------------

function YoungerFicha({
  escoteiro,
  standings,
  entry,
  back,
  crumb,
  approverNames,
}: {
  escoteiro: Member;
  standings: Map<string, YoungerStanding>;
  entry: CatalogEntry | undefined;
  back: React.ReactNode;
  crumb: string;
  approverNames: Map<string, string>;
}) {
  const statusOf = (e: CatalogEntry) => {
    const st = standings.get(e.id);
    const approved = st?.approvedCount ?? 0;
    const pending = st?.pendingCount ?? 0;
    return {
      text: `${approved} de ${e.itemCount} itens${pending ? ` · ${pending} aguardando` : ""}`,
      level: st?.level ?? 0,
      pending: pending > 0,
    };
  };

  const others = catalogFor("younger").filter(
    (e) => e.id !== entry?.id && standings.has(e.id),
  );

  if (!entry) {
    return (
      <Hub
        escoteiro={escoteiro}
        group="younger"
        back={back}
        crumb={crumb}
        active={others}
        statusOf={statusOf}
      />
    );
  }

  const eixo = eixoMeta(entry.eixoId);
  const standing =
    standings.get(entry.id) ??
    (emptyStanding("younger", entry.id) as YoungerStanding);
  const { total, approvedCount: approved, pendingCount: pending, level } = standing;
  const thresholds = levelThresholds(total);
  const name = firstName(escoteiro.name);

  return (
    <>
      <SubBar back={back} crumb={crumb} title={entry.name} />
      <div
        className="mb-3 mt-2 rounded-[10px] border-2 border-[#141414] bg-white p-3.5"
        style={{ borderLeftWidth: 8, borderLeftColor: eixo.color }}
      >
        <div className="flex items-baseline justify-between gap-3 text-[14px] font-extrabold">
          <span>
            <span data-testid="ficha-approved-count">{approved}</span> de {total}{" "}
            itens
          </span>
          <span
            className="text-[12px] font-bold"
            style={{ color: pending ? AMBER_INK : "#8A887F" }}
          >
            {pending
              ? `${pending} aguardando aprovação`
              : "nada aguardando"}
          </span>
        </div>
        <div className="relative mt-1.5 h-3 overflow-hidden rounded-md border-2 border-[#141414] bg-[#EEE9DC]">
          <span
            className="absolute inset-y-0 left-0"
            style={{
              width: `${((approved + pending) / total) * 100}%`,
              background:
                "repeating-linear-gradient(45deg,#F5B300 0 4px,#fff 4px 8px)",
            }}
          />
          <span
            className="absolute inset-y-0 left-0"
            style={{ width: `${(approved / total) * 100}%`, background: eixo.color }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <LevelBox
            label="Nível 1"
            reached={level >= 1}
            missing={thresholds.level1 - approved}
            bg="#E3E8F8"
          />
          <LevelBox
            label="Nível 2"
            reached={level >= 2}
            missing={thresholds.level2 - approved}
            bg="#F4C430"
          />
        </div>
      </div>
      <p className="mb-3 text-[12px] text-[#8A887F]">
        Você edita como escotista: tocar um item aberto marca{" "}
        <b className="text-[#4A4A44]">aprovado na hora</b>; tocar de novo
        desmarca. Itens enviados por {name} aparecem em amarelo com Aprovar /
        Rejeitar.
      </p>

      <ListBox className="mb-4">
        <ListHeader label="Itens" meta="toque para marcar" tint={eixo.tint} />
        {entry.texts.map((text, i) => (
          <ItemRow
            key={i}
            index={i}
            text={text}
            state={standing.items[i] ?? null}
            escoteiroId={escoteiro._id}
            specialtyId={entry.id}
            escoteiroName={name}
            approverNames={approverNames}
          />
        ))}
      </ListBox>

      <OthersList escoteiro={escoteiro} entries={others} statusOf={statusOf} />
    </>
  );
}

function LevelBox({
  label,
  reached,
  missing,
  bg,
}: {
  label: string;
  reached: boolean;
  missing: number;
  bg: string;
}) {
  return (
    <div
      className="rounded-md border-2 border-[#141414] px-2.5 py-2 text-[12px] font-bold text-[#4A4A44]"
      style={{ background: reached ? bg : "#fff" }}
    >
      <b className="block text-[14px] text-[#141414]">{label}</b>
      {reached
        ? "conquistado"
        : missing === 1
          ? "falta 1 item"
          : `faltam ${missing} itens`}
    </div>
  );
}

function ItemRow({
  index,
  text,
  state: item,
  escoteiroId,
  specialtyId,
  escoteiroName,
  approverNames,
}: {
  index: number;
  text: string;
  state: ItemState | null;
  escoteiroId: Id<"users">;
  specialtyId: string;
  escoteiroName: string;
  approverNames: Map<string, string>;
}) {
  const review = useItemReview();
  const state: "open" | "approved" | "pending" = item?.status ?? "open";
  const busy = review.pendingItemIndex === index || review.rejecting;

  const toggle = () => {
    if (state === "pending" || busy) return;
    review.setApproved({
      escoteiroId,
      specialtyId,
      itemIndex: index,
      approved: state === "open",
    });
  };

  const approver = item?.approvedBy ? approverNames.get(item.approvedBy) : undefined;
  const status =
    state === "approved"
      ? ["Aprovado", approver, shortDate(item?.approvedAt ?? item?.completedAt)]
          .filter(Boolean)
          .join(" · ")
      : state === "pending"
        ? `Enviado por ${escoteiroName} · ${shortDate(item?.completedAt)}`
        : null;

  return (
    <div
      data-testid={`ficha-item-${index}`}
      data-state={state}
      className={`flex min-h-14 items-start gap-3 border-t-[1.5px] border-[#D9D5C9] py-3 pl-3 pr-1 first-of-type:border-t-0 ${
        busy ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={state === "pending" || busy}
        aria-pressed={state === "approved"}
        aria-label={
          state === "approved"
            ? `Desmarcar item ${index + 1}`
            : state === "pending"
              ? `Item ${index + 1} aguardando aprovação`
              : `Marcar item ${index + 1} como aprovado`
        }
        className="-my-2.5 -ml-2.5 grid size-12 shrink-0 place-items-center rounded-md"
      >
        <span
          className={`grid size-7 place-items-center rounded-[7px] border-2 border-[#141414] ${
            state === "approved"
              ? "bg-[#0E6B4E] text-white shadow-[2px_2px_0_#141414]"
              : state === "pending"
                ? "bg-[#F5B300] text-[#141414] shadow-[2px_2px_0_#141414]"
                : "bg-white"
          }`}
        >
          {state === "approved" && <Check className="size-[18px]" strokeWidth={3} />}
          {state === "pending" && <Clock className="size-[18px]" strokeWidth={3} />}
        </span>
      </button>
      <div className="min-w-0 flex-1 pt-0.5 text-[15px] leading-[1.4]">
        <span
          className={
            state === "approved"
              ? "text-[#8A887F] line-through decoration-[#0E6B4E]"
              : ""
          }
        >
          <b className="text-[#141414]">{index + 1}.</b> {text}
        </span>
        {status && (
          <span
            className="mt-0.5 block text-[12px] font-extrabold"
            style={{ color: state === "approved" ? EMERALD : AMBER_INK }}
          >
            {status}
          </span>
        )}
        {state === "pending" && item && (
          <span className="mt-2 flex gap-1.5">
            <SmallButton
              kind="primary"
              disabled={busy}
              onClick={() =>
                review.setApproved({
                  escoteiroId,
                  specialtyId,
                  itemIndex: index,
                  approved: true,
                })
              }
            >
              Aprovar
            </SmallButton>
            <SmallButton
              kind="ghost"
              disabled={busy}
              onClick={() => review.reject(item.rowId)}
            >
              Rejeitar
            </SmallButton>
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Older (sênior / pioneiro)
// ---------------------------------------------------------------------------

function OlderFicha({
  escoteiro,
  standings,
  entry,
  back,
  crumb,
  approverNames,
}: {
  escoteiro: Member;
  standings: Map<string, OlderStanding>;
  entry: CatalogEntry | undefined;
  back: React.ReactNode;
  crumb: string;
  approverNames: Map<string, string>;
}) {
  const review = useStepReview();

  const statusOf = (e: CatalogEntry) => {
    const st = standings.get(e.id);
    const approved = st?.approvedCount ?? 0;
    const pending = st?.pendingCount ?? 0;
    const total = PROJECT_STEPS.length;
    return {
      text: st?.earned
        ? `Conquistada · ${total} etapas aprovadas`
        : `${approved} de ${total} etapas${pending ? ` · ${pending} aguardando` : ""}`,
      level: 0 as const,
      pending: pending > 0,
      earned: !!st?.earned,
    };
  };
  const others = catalogFor("older").filter(
    (e) => e.id !== entry?.id && standings.has(e.id),
  );

  if (!entry) {
    return (
      <Hub
        escoteiro={escoteiro}
        group="older"
        back={back}
        crumb={crumb}
        active={others}
        statusOf={statusOf}
      />
    );
  }

  const specialty = OLDER_SPECIALTY_BY_ID.get(entry.id)!;
  const eixo = eixoMeta(entry.eixoId);
  const etapas = standings.get(entry.id)?.etapas;
  const status = statusOf(entry);
  const suggestions: Record<ProjectStep, string[]> = {
    conhecer: specialty.conhecerSuggestions,
    fazer: specialty.fazerSuggestions,
    compartilhar: specialty.compartilharSuggestions,
  };

  return (
    <>
      <SubBar back={back} crumb={crumb} title={entry.name} />
      <div
        className="mb-3 mt-2 rounded-[10px] border-2 border-[#141414] bg-white p-3.5"
        style={{ borderLeftWidth: 8, borderLeftColor: eixo.color }}
      >
        <p className="text-[14px] leading-[1.45] text-[#4A4A44]">
          {entry.description}
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 text-[14px] font-extrabold">
          <span>{status.text}</span>
          {status.earned && (
            <span className="rounded-full border-2 border-[#141414] bg-[#F4C430] px-2 py-0.5 text-[11px] font-extrabold uppercase">
              Conquistada
            </span>
          )}
        </div>
      </div>
      <p className="mb-3 text-[12px] text-[#8A887F]">
        Relatos enviados por {firstName(escoteiro.name)} aparecem com Aprovar /
        Rejeitar. Uma etapa sem relato pode ser registrada por você — ela entra
        já aprovada.
      </p>

      {PROJECT_STEPS.map((step, i) => (
        <StepCard
          key={step}
          ordinal={i + 1}
          step={step}
          tint={eixo.tint}
          suggestions={suggestions[step]}
          etapa={etapas?.[step] ?? null}
          escoteiroId={escoteiro._id}
          specialtyId={entry.id}
          approverNames={approverNames}
          review={review}
        />
      ))}

      <OthersList escoteiro={escoteiro} entries={others} statusOf={statusOf} />
    </>
  );
}

function StepCard({
  ordinal,
  step,
  tint,
  suggestions,
  etapa,
  escoteiroId,
  specialtyId,
  approverNames,
  review,
}: {
  ordinal: number;
  step: ProjectStep;
  tint: string;
  suggestions: string[];
  etapa: EtapaState | null;
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
  const state = etapa?.status ?? "open";

  return (
    <section
      data-testid={`ficha-step-${step}`}
      data-state={state}
      className="mb-3 overflow-hidden rounded-[10px] border-2 border-[#141414] bg-white"
    >
      <div
        className="flex items-center gap-2.5 border-b-2 border-[#141414] px-3 py-2.5"
        style={{ background: tint }}
      >
        <span className="grid size-7 place-items-center rounded-full border-2 border-[#141414] bg-[#0E6B4E] text-[13px] font-black text-white">
          {ordinal}
        </span>
        <h3 className="text-[16px] font-black">{label}</h3>
        {state !== "open" && (
          <span
            className={`ml-auto inline-flex items-center gap-1 rounded-full border-2 border-[#141414] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
              state === "approved" ? "bg-[#0E6B4E] text-white" : "bg-[#F5B300]"
            }`}
          >
            {state === "approved" ? (
              <Check className="size-3" strokeWidth={3} />
            ) : (
              <Clock className="size-3" strokeWidth={3} />
            )}
            {state === "approved" ? "Aprovado" : "Pendente"}
          </span>
        )}
      </div>
      <Suggestions items={suggestions} />

      {state === "pending" && etapa && (
        <PendingRelato
          reportId={etapa.rowId}
          stepLabel={label}
          text={etapa.text}
          review={review}
        />
      )}

      {state === "approved" && etapa && (
        <div className="border-t-2 border-[#D9D5C9] px-3 py-2.5">
          <p
            className={`whitespace-pre-line border-l-[3px] border-[#D9D5C9] pl-2.5 text-[13px] leading-snug text-[#4A4A44] ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {etapa.text}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-[12px] font-extrabold" style={{ color: EMERALD }}>
              {[
                "Aprovado",
                etapa.approvedBy ? approverNames.get(etapa.approvedBy) : undefined,
                shortDate(etapa.approvedAt ?? etapa.completedAt),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="min-h-11 px-1 text-[13px] font-extrabold text-[#0E6B4E]"
            >
              {expanded ? "Recolher" : "Ler relato"}
            </button>
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
                <SmallButton
                  kind="primary"
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
                </SmallButton>
                <SmallButton
                  kind="ghost"
                  onClick={() => {
                    setWriting(false);
                    setText("");
                  }}
                >
                  Cancelar
                </SmallButton>
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
          <SectionHeading
            label={`Outras especialidades de ${firstName(escoteiro.name)}`}
          />
          <EntryList escoteiroId={escoteiro._id} entries={entries} statusOf={statusOf} />
        </>
      )}
      <Link
        to="/especialidades"
        search={{ escoteiroId: escoteiro._id }}
        className="mt-3 flex min-h-[52px] w-full items-center gap-3 rounded-[10px] border-2 border-dashed border-[#D9D5C9] px-3 text-[15px] font-extrabold text-[#0E6B4E]"
      >
        Abrir outra especialidade de {firstName(escoteiro.name)}
        <span className="ml-auto">
          <RowChevron />
        </span>
      </Link>
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
        const eixo = eixoMeta(e.eixoId);
        return (
          <FichaLink
            key={e.id}
            escoteiroId={escoteiroId}
            specialtyId={e.id}
            className="flex min-h-16 w-full items-center gap-3 border-t-[1.5px] border-[#D9D5C9] py-2.5 pr-3 text-left first:border-t-0 hover:bg-black/[0.02]"
          >
            <span className="w-2 self-stretch" style={{ background: eixo.color }} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-extrabold leading-tight">
                {e.name}
              </span>
              <span
                className="mt-0.5 block text-[12px] font-semibold"
                style={{ color: s.pending ? AMBER_INK : "#8A887F" }}
              >
                {s.text}
              </span>
            </span>
            <LevelPill level={s.level} />
            <RowChevron />
          </FichaLink>
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
  back: React.ReactNode;
  crumb: string;
  active: CatalogEntry[];
  statusOf: StatusOf;
}) {
  const [query, setQuery] = useState("");
  const results = query.trim()
    ? catalogFor(group).filter((e) => matchEntry(e, query).matched)
    : [];
  return (
    <>
      <SubBar back={back} crumb={crumb} title="Especialidades" />
      <SectionHeading label="Com atividade" meta={active.length || undefined} />
      {active.length === 0 ? (
        <p className="rounded-[10px] border-2 border-dashed border-[#8A887F] p-4 text-center text-sm text-[#4A4A44]">
          {firstName(escoteiro.name)} ainda não começou nenhuma especialidade.
        </p>
      ) : (
        <EntryList escoteiroId={escoteiro._id} entries={active} statusOf={statusOf} />
      )}
      <SectionHeading label="Abrir outra" />
      <label className="mb-2.5 flex min-h-12 items-center gap-2.5 rounded-[10px] border-2 border-[#141414] bg-white px-3">
        <Search className="size-[22px] shrink-0 text-[#8A887F]" strokeWidth={2.5} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou requisito"
          aria-label="Buscar especialidade"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#8A887F]"
        />
      </label>
      {results.length > 0 && (
        <EntryList escoteiroId={escoteiro._id} entries={results} statusOf={statusOf} />
      )}
    </>
  );
}
