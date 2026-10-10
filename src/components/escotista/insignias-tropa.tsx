import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { Award, ChevronLeft, Clock } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  SPECIAL_INTEREST_BADGES,
  SPECIAL_INTEREST_BADGE_BY_ID,
  badgeGroupsFor,
} from "@/data/badge-data";
import { RAMO_LABELS } from "@/lib/ramos";
import { BadgeChecklist } from "@/components/progression/badge-checklist";
import {
  AvatarStack,
  ListBox,
  PersonAvatar,
  RowChevron,
  SectionHeading,
  plural,
} from "./especialidades/ui";

/**
 * The escotista's Insígnias tab: tropa KPIs, every insígnia with who
 * conquistou / is em andamento / waits on approval, and — with `badgeId` — that
 * insígnia's roster (closest to earning first) and requirements.
 */
export function InsigniasTropa({
  badgeId,
  onSelect,
}: {
  badgeId?: string;
  onSelect: (badgeId: string | undefined) => void;
}) {
  const { data: summary } = useSuspenseQuery(
    convexQuery(api.badges.getGroupBadgeSummary, {}),
  );
  if (!summary) {
    return (
      <p className="rounded-[10px] border-2 border-dashed border-[#8A887F] p-5 text-center text-sm text-[#4A4A44]">
        Sem acesso aos escoteiros deste grupo.
      </p>
    );
  }
  const activity = new Map(summary.badges.map((b) => [b.badgeId, b]));
  // Insígnias offered in any ramo the visible escoteiros are in.
  const catalog = SPECIAL_INTEREST_BADGES.filter((b) =>
    summary.ramos.some((r) => badgeGroupsFor(b.id, r).length > 0),
  );

  if (badgeId) {
    const badge = SPECIAL_INTEREST_BADGE_BY_ID.get(badgeId);
    if (badge) {
      return (
        <BadgeDetail
          badge={badge}
          entry={activity.get(badgeId)}
          ramos={summary.ramos}
          onBack={() => onSelect(undefined)}
        />
      );
    }
  }

  const withActivity = catalog.filter((b) => activity.has(b.id));
  const untouched = catalog.filter((b) => !activity.has(b.id));

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-3 gap-2">
        <Kpi value={summary.totals.earned} label="Conquistadas" bg="#F4C430" />
        <Kpi value={summary.totals.inProgress} label="Em andamento" bg="#fff" />
        <Kpi value={summary.totals.pending} label="Pendentes" bg="#FEF3C7" />
      </div>
      <p className="mb-3 text-[12px] text-[#8A887F]">
        {plural(summary.escoteiroCount, "escoteiro", "escoteiros")} ·{" "}
        {summary.observedSectionName
          ? `seção observada: ${summary.observedSectionName} · troque no Painel.`
          : "todas as seções · troque no Painel."}
      </p>

      <SectionHeading
        label="Na tropa"
        meta={plural(withActivity.length, "insígnia", "insígnias")}
      />
      {withActivity.length === 0 ? (
        <p className="rounded-[10px] border-2 border-dashed border-[#8A887F] p-5 text-center text-sm text-[#4A4A44]">
          <b className="block text-[15px] text-[#141414]">Nenhuma atividade ainda</b>
          Quando um escoteiro marcar um requisito, a insígnia aparece aqui.
        </p>
      ) : (
        <ListBox>
          {withActivity.map((b) => (
            <BadgeRowLink
              key={b.id}
              name={b.name}
              sub={b.englishName}
              entry={activity.get(b.id)}
              onClick={() => onSelect(b.id)}
            />
          ))}
        </ListBox>
      )}

      {untouched.length > 0 && (
        <>
          <SectionHeading
            label="Catálogo"
            meta={plural(untouched.length, "sem atividade", "sem atividade")}
          />
          <ListBox>
            {untouched.map((b) => (
              <BadgeRowLink
                key={b.id}
                name={b.name}
                sub={b.englishName}
                onClick={() => onSelect(b.id)}
              />
            ))}
          </ListBox>
        </>
      )}
    </div>
  );
}

type Entry = NonNullable<
  FunctionReturnType<typeof api.badges.getGroupBadgeSummary>
>["badges"][number];

function Kpi({ value, label, bg }: { value: number; label: string; bg: string }) {
  return (
    <div
      className="rounded-[10px] border-2 border-[#141414] px-3 py-2.5"
      style={{ background: bg }}
    >
      <p className="text-[26px] font-black leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-extrabold uppercase leading-tight tracking-[0.05em] text-[#4A4A44]">
        {label}
      </p>
    </div>
  );
}

function BadgeRowLink({
  name,
  sub,
  entry,
  onClick,
}: {
  name: string;
  sub: string;
  entry?: Entry;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 border-t-[1.5px] border-[#D9D5C9] px-3 py-2.5 text-left first:border-t-0 hover:bg-black/[0.02]"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[#141414] bg-[#EEE9DC]">
        <Award className="size-4" strokeWidth={2.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold leading-tight">{name}</span>
        <span className="block text-[12px] font-semibold text-[#8A887F]">{sub}</span>
        {entry && (
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-bold text-[#8A887F]">
            {entry.earnedCount > 0 && (
              <b className="text-[#0E6B4E]">
                {entry.earnedCount}{" "}
                {entry.earnedCount === 1 ? "conquistou" : "conquistaram"}
              </b>
            )}
            {entry.inProgressCount > 0 && (
              <span className="text-[#6B4A00]">
                {entry.inProgressCount} em andamento
              </span>
            )}
            {entry.pendingCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full border-[1.5px] border-[#6B4A00] bg-[#FEF3C7] px-1.5 text-[11px] text-[#6B4A00]">
                <Clock className="size-3" /> {entry.pendingCount}
              </span>
            )}
            <AvatarStack
              people={entry.people.slice(0, 4)}
              total={entry.people.length}
            />
          </span>
        )}
      </span>
      <RowChevron />
    </button>
  );
}

function BadgeDetail({
  badge,
  entry,
  ramos,
  onBack,
}: {
  badge: (typeof SPECIAL_INTEREST_BADGES)[number];
  entry?: Entry;
  ramos: (keyof typeof RAMO_LABELS)[];
  onBack: () => void;
}) {
  const shownRamos = ramos.filter((r) => badgeGroupsFor(badge.id, r).length > 0);
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-2 inline-flex min-h-9 items-center gap-1 text-[14px] font-extrabold"
      >
        <ChevronLeft className="size-4" strokeWidth={3} /> Insígnias
      </button>
      <div className="mb-3 rounded-[10px] border-2 border-[#141414] bg-white p-3">
        <p className="text-[18px] font-black leading-tight">{badge.name}</p>
        <p className="text-[12px] font-semibold text-[#8A887F]">{badge.englishName}</p>
        <p className="mt-2 text-[13px] text-[#4A4A44]">{badge.description}</p>
        <p className="mt-1 text-[12px] text-[#8A887F]">
          Sem níveis: conquistada quando todos os grupos de requisitos estão
          cumpridos.
        </p>
      </div>

      <SectionHeading
        label="Escoteiros"
        meta={entry ? "do mais perto ao mais longe" : "nenhum começou"}
      />
      {entry && (
        <ListBox>
          {entry.people.map((p) => (
            <Link
              key={p._id}
              to="/escotista/escoteiro/$escoteiroId"
              params={{ escoteiroId: p._id }}
              className="flex min-h-14 items-center gap-3 border-t-[1.5px] border-[#D9D5C9] px-3 py-2 first:border-t-0 hover:bg-black/[0.02]"
            >
              <PersonAvatar id={p._id} name={p.name} image={p.image} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold leading-tight">
                  {p.name ?? "Sem nome"}
                </span>
                <span className="mt-1 flex h-2 overflow-hidden rounded-full border-2 border-[#141414]">
                  <span
                    className="bg-[#0E6B4E]"
                    style={{ width: `${(100 * p.progress) / p.needed}%` }}
                  />
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5 text-[12px] font-extrabold">
                <span className="text-[#4A4A44]">
                  {p.progress}/{p.needed}
                </span>
                {p.earned ? (
                  <span className="rounded-full bg-[#0E6B4E] px-2 text-[11px] text-white">
                    ✓ Conquistou
                  </span>
                ) : p.pendingCount > 0 ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full border-[1.5px] border-[#6B4A00] bg-[#FEF3C7] px-1.5 text-[11px] text-[#6B4A00]">
                    <Clock className="size-3" /> {p.pendingCount} a aprovar
                  </span>
                ) : null}
              </span>
              <RowChevron />
            </Link>
          ))}
        </ListBox>
      )}

      {shownRamos.map((r) => (
        <div key={r}>
          <SectionHeading label={`Requisitos · Ramo ${RAMO_LABELS[r]}`} />
          <BadgeChecklist
            badgeId={`${badge.id}-${r}`}
            groups={badgeGroupsFor(badge.id, r)}
            standing={undefined}
          />
        </div>
      ))}
    </div>
  );
}
