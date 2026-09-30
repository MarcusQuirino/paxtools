import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../convex/_generated/api";
import {
  PROJECT_STEPS,
  PROJECT_STEP_LABELS,
  OLDER_SPECIALTY_BY_ID,
  type ProjectStep,
} from "@/data/specialty-data/older";
import {
  BACK_CLASS,
  BackIcon,
  EMERALD,
  AMBER_INK,
  FichaLink,
  LevelPill,
  ListBox,
  ListHeader,
  MiniBar,
  PersonAvatar,
  RowChevron,
  SubBar,
  defaultRamoGroup,
  eixoMeta,
  findCatalogEntry,
  plural,
  type RamoGroup,
} from "@/components/escotista/especialidades/ui";
import {
  PendingRelato,
  Suggestions,
  useStepReview,
} from "@/components/escotista/especialidades/actions";

export const Route = createFileRoute("/escotista/especialidades/$specialtyId")({
  validateSearch: (search: Record<string, unknown>): { grupo?: RamoGroup } => ({
    grupo:
      search.grupo === "younger" || search.grupo === "older"
        ? search.grupo
        : undefined,
  }),
  component: SpecialtyDetail,
});

const GROUP_CRUMB: Record<RamoGroup, string> = {
  younger: "Lobinho e Escoteiro",
  older: "Sênior e Pioneiro",
};

function SpecialtyDetail() {
  const { specialtyId } = Route.useParams();
  const search = Route.useSearch();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  const grupo = search.grupo ?? defaultRamoGroup(user);
  const entry = findCatalogEntry(grupo, specialtyId);
  const { data: roster } = useSuspenseQuery(
    convexQuery(api.specialties.getSpecialtyRoster, {
      specialtyId,
      ramoGroup: grupo,
    }),
  );

  const back = (
    <Link
      to="/escotista/especialidades"
      search={{ grupo }}
      aria-label="Voltar ao catálogo"
      className={BACK_CLASS}
    >
      <BackIcon />
    </Link>
  );

  if (!entry || !roster) {
    return (
      <div className="text-[#141414]">
        <SubBar back={back} crumb="Especialidades" title="Não encontrada" />
        <p className="mt-3 rounded-[10px] border-2 border-dashed border-[#8A887F] p-5 text-center text-sm text-[#4A4A44]">
          Esta especialidade não existe neste catálogo.
        </p>
      </div>
    );
  }

  const eixo = eixoMeta(entry.eixoId);
  const notStarted =
    roster.escoteiroCount - roster.earnedCount - roster.inProgressCount;

  return (
    <div className="text-[#141414]">
      <SubBar
        back={back}
        crumb={`${eixo.name} · ${GROUP_CRUMB[grupo]}`}
        crumbColor={eixo.color}
        title={entry.name}
      />

      <div
        className="mb-4 mt-2 rounded-[10px] border-2 border-[#141414] bg-white p-3.5"
        style={{ borderLeftWidth: 8, borderLeftColor: eixo.color }}
      >
        <p className="text-[14px] leading-[1.45] text-[#4A4A44]">
          {entry.description}
        </p>
        {roster.kind === "younger" && entry.itemCount != null && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-md border-2 border-[#141414] bg-[#E3E8F8] px-2.5 py-2 text-[12px] font-bold text-[#4A4A44]">
              <b className="block text-[14px] text-[#141414]">Nível 1</b>
              {entry.itemCount / 2} de {entry.itemCount} itens
            </div>
            <div className="rounded-md border-2 border-[#141414] bg-[#F4C430] px-2.5 py-2 text-[12px] font-bold text-[#4A4A44]">
              <b className="block text-[14px] text-[#141414]">Nível 2</b>
              {entry.itemCount} de {entry.itemCount} itens
            </div>
          </div>
        )}
        {roster.kind === "older" && (
          <p className="mt-2 text-[13px] leading-snug text-[#4A4A44]">
            Projeto em três etapas — <b>Conhecer → Fazer → Compartilhar</b>.
            Cada etapa é um relato aprovado separadamente, em qualquer ordem; a
            especialidade é conquistada com as três aprovadas.
          </p>
        )}
        <div className="mt-3 flex items-baseline justify-between gap-3 text-[14px] font-extrabold">
          <span className="shrink-0 whitespace-nowrap">
            {roster.observedSectionName ?? "Na tropa"}
          </span>
          <span className="text-right text-[12px] font-bold text-[#8A887F]">
            <b style={{ color: EMERALD }}>{roster.earnedCount}</b>{" "}
            {roster.earnedCount === 1 ? "conquistou" : "conquistaram"} ·{" "}
            <b style={{ color: AMBER_INK }}>{roster.inProgressCount}</b> em
            andamento · {Math.max(0, notStarted)} sem começar
          </span>
        </div>
      </div>

      {roster.kind === "younger" ? (
        <>
          <ListBox className="mb-4">
            <ListHeader
              label="Requisitos"
              meta={`de ${plural(roster.escoteiroCount, "escoteiro", "escoteiros")}`}
              tint={eixo.tint}
            />
            {entry.texts.map((text, i) => {
              const c = roster.items[i] ?? { approvedCount: 0, pendingCount: 0 };
              const hot =
                c.approvedCount > 0 &&
                c.approvedCount >= Math.ceil(roster.escoteiroCount / 3);
              return (
                <div
                  key={i}
                  className="flex min-h-14 items-start gap-2.5 border-t-[1.5px] border-[#D9D5C9] p-3 first-of-type:border-t-0"
                >
                  <span className="grid size-[26px] shrink-0 place-items-center rounded-full border-2 border-[#141414] bg-white text-[12px] font-black">
                    {i + 1}
                  </span>
                  <p className="flex-1 text-[14px] leading-[1.4]">{text}</p>
                  <span className="min-w-[52px] shrink-0 pt-0.5 text-right text-[12px] font-extrabold text-[#8A887F]">
                    <b
                      className="block text-[15px]"
                      style={{ color: hot ? EMERALD : "#141414" }}
                    >
                      {c.approvedCount}
                    </b>
                    têm
                    {c.pendingCount > 0 && (
                      <span className="block" style={{ color: AMBER_INK }}>
                        +{c.pendingCount} aguard.
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </ListBox>

          <ListBox className="mb-2">
            <ListHeader
              label="Quem tem"
              meta={
                roster.people.length > 0
                  ? `${roster.people.length} de ${roster.escoteiroCount} · toque para abrir a ficha`
                  : undefined
              }
            />
            {roster.people.length === 0 && (
              <p className="p-4 text-center text-[14px] text-[#4A4A44]">
                Ninguém começou esta especialidade ainda.
              </p>
            )}
            {roster.people.map((p) => {
              const total = entry.itemCount ?? 1;
              const toNext =
                p.level === 0
                  ? total / 2 - p.approvedCount
                  : p.level === 1
                    ? total - p.approvedCount
                    : 0;
              const status =
                p.pendingCount > 0
                  ? `${p.approvedCount} de ${total} · ${p.pendingCount} aguardando${
                      toNext > 0 && p.level < 2
                        ? ` · falta${toNext === 1 ? "" : "m"} ${toNext} p/ Nível ${p.level + 1}`
                        : ""
                    }`
                  : `${p.approvedCount} de ${total} itens`;
              return (
                <FichaLink
                  key={p._id}
                  escoteiroId={p._id}
                  specialtyId={entry.id}
                  className="flex min-h-[60px] w-full items-center gap-2.5 border-t-[1.5px] border-[#D9D5C9] px-3 py-2.5 text-left hover:bg-black/[0.02]"
                >
                  <PersonAvatar id={p._id} name={p.name} image={p.image} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-extrabold leading-tight">
                      {p.name ?? "Escoteiro"}
                    </span>
                    <span
                      className="mt-0.5 block text-[12px] font-semibold"
                      style={{ color: p.pendingCount > 0 ? AMBER_INK : "#8A887F" }}
                    >
                      {status}
                    </span>
                    {p.level < 2 && (
                      <MiniBar
                        pct={(p.approvedCount / total) * 100}
                        color={p.pendingCount > 0 ? "#F5B300" : EMERALD}
                      />
                    )}
                  </span>
                  <LevelPill level={p.level} />
                  <RowChevron />
                </FichaLink>
              );
            })}
          </ListBox>
          <p className="text-[12px] text-[#8A887F]">
            Mais perto de conquistar primeiro. Cada linha abre a ficha daquele
            escoteiro nesta especialidade.
          </p>
        </>
      ) : (
        <OlderDetail
          specialtyId={entry.id}
          roster={roster}
          stepTint={eixo.tint}
        />
      )}
    </div>
  );
}

type OlderRoster = Extract<
  NonNullable<FunctionReturnType<typeof api.specialties.getSpecialtyRoster>>,
  { kind: "older" }
>;

const STEP_SHORT: Record<ProjectStep, string> = {
  conhecer: "C",
  fazer: "F",
  compartilhar: "Co",
};

function OlderDetail({
  specialtyId,
  roster,
  stepTint,
}: {
  specialtyId: string;
  roster: OlderRoster;
  stepTint: string;
}) {
  const specialty = OLDER_SPECIALTY_BY_ID.get(specialtyId)!;
  const review = useStepReview();
  const suggestions: Record<ProjectStep, string[]> = {
    conhecer: specialty.conhecerSuggestions,
    fazer: specialty.fazerSuggestions,
    compartilhar: specialty.compartilharSuggestions,
  };

  return (
    <>
      {PROJECT_STEPS.map((step, i) => {
        const c = roster.steps[step];
        const pending = roster.pendingReports.filter((r) => r.step === step);
        return (
          <section
            key={step}
            className="mb-3 overflow-hidden rounded-[10px] border-2 border-[#141414] bg-white"
          >
            <div
              className="flex items-center gap-2.5 border-b-2 border-[#141414] px-3 py-2.5"
              style={{ background: stepTint }}
            >
              <span className="grid size-7 place-items-center rounded-full border-2 border-[#141414] bg-[#0E6B4E] text-[13px] font-black text-white">
                {i + 1}
              </span>
              <h3 className="text-[16px] font-black">
                {PROJECT_STEP_LABELS[step]}
              </h3>
              <span className="ml-auto text-[12px] font-extrabold text-[#4A4A44]">
                <b style={{ color: EMERALD }}>{c.approvedCount}</b>{" "}
                {c.approvedCount === 1 ? "aprovado" : "aprovados"}
                {c.pendingCount > 0 && (
                  <span style={{ color: AMBER_INK }}>
                    {" "}
                    · {c.pendingCount}{" "}
                    {c.pendingCount === 1 ? "pendente" : "pendentes"}
                  </span>
                )}
              </span>
            </div>
            <Suggestions items={suggestions[step]} />
            {pending.map((r) => (
              <PendingRelato
                key={r.reportId}
                reportId={r.reportId}
                stepLabel={PROJECT_STEP_LABELS[step]}
                text={r.text}
                who={{ id: r.escoteiroId, name: r.escoteiroName, image: r.escoteiroImage }}
                review={review}
              />
            ))}
          </section>
        );
      })}

      <ListBox className="mb-2">
        <ListHeader
          label="Quem tem"
          meta={
            roster.people.length > 0
              ? `${roster.people.length} de ${roster.escoteiroCount} · toque para abrir a ficha`
              : undefined
          }
        />
        {roster.people.length === 0 && (
          <p className="p-4 text-center text-[14px] text-[#4A4A44]">
            Ninguém começou esta especialidade ainda.
          </p>
        )}
        {roster.people.map((p) => {
          const pendingSteps = PROJECT_STEPS.filter(
            (s) => p.steps[s] === "pending",
          );
          const status = p.earned
            ? "Conquistada · 3 etapas aprovadas"
            : pendingSteps.length > 0
              ? `${pendingSteps.map((s) => PROJECT_STEP_LABELS[s]).join(", ")} aguardando aprovação`
              : `${p.approvedCount} de 3 etapas`;
          return (
            <FichaLink
              key={p._id}
              escoteiroId={p._id}
              specialtyId={specialtyId}
              className="flex min-h-[60px] w-full items-center gap-2.5 border-t-[1.5px] border-[#D9D5C9] px-3 py-2.5 text-left hover:bg-black/[0.02]"
            >
              <PersonAvatar id={p._id} name={p.name} image={p.image} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold leading-tight">
                  {p.name ?? "Escoteiro"}
                </span>
                <span
                  className="mt-0.5 block text-[12px] font-semibold"
                  style={{
                    color: pendingSteps.length > 0 && !p.earned ? AMBER_INK : "#8A887F",
                  }}
                >
                  {status}
                </span>
              </span>
              <span className="flex shrink-0 gap-1" aria-hidden>
                {PROJECT_STEPS.map((s) => (
                  <span
                    key={s}
                    className={`inline-flex items-center rounded-full border-2 border-[#141414] px-[7px] py-0.5 text-[11px] font-black ${
                      p.steps[s] === "approved"
                        ? "bg-[#0E6B4E] text-white"
                        : p.steps[s] === "pending"
                          ? "bg-[#F5B300]"
                          : "bg-white"
                    }`}
                  >
                    {STEP_SHORT[s]}
                  </span>
                ))}
              </span>
              <RowChevron />
            </FichaLink>
          );
        })}
      </ListBox>
      <p className="text-[12px] text-[#8A887F]">
        Cada etapa é um relato do jovem; aprove ou rejeite aqui ou na ficha do
        escoteiro, que mostra os três relatos completos.
      </p>
    </>
  );
}
