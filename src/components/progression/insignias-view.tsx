import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { Award, ChevronDown, CheckCircle2, Clock } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import {
  SPECIAL_INTEREST_BADGES,
  badgeGroupsFor,
  type SpecialInterestBadge,
} from "@/data/badge-data";
import type { BadgeStanding } from "@/lib/badge-standing";
import { notifyLevelUps } from "@/lib/level-up-toast";
import { useProgression } from "@/hooks/use-progression";
import { RAMO_LABELS } from "@/lib/ramos";
import { BadgeChecklist, badgeNeeded } from "./badge-checklist";

type Filter = "todas" | "andamento" | "conquistadas";

/**
 * The escoteiro's insígnias de interesse especial for their current ramo: each
 * with progress toward earning it, and its requirement checklist on tap.
 */
export function InsigniasView() {
  const progression = useProgression();
  const [filter, setFilter] = useState<Filter>("todas");
  const [open, setOpen] = useState<string | null>(null);

  const toggleFn = useConvexMutation(api.progression.toggleBadgeRequirement);
  const { mutate: toggle } = useMutation({
    mutationFn: toggleFn,
    onSuccess: notifyLevelUps,
  });

  const badges = SPECIAL_INTEREST_BADGES.filter((b) =>
    progression.badges.has(b.id),
  );
  const started = (s: BadgeStanding | undefined) =>
    !!s && (s.approvedCount > 0 || s.pendingCount > 0);
  const earnedCount = badges.filter((b) => progression.badges.get(b.id)?.earned).length;
  const visible = badges.filter((b) => {
    const s = progression.badges.get(b.id);
    if (filter === "conquistadas") return !!s?.earned;
    if (filter === "andamento") return started(s) && !s?.earned;
    return true;
  });

  const chips: [Filter, string][] = [
    ["todas", "Todas"],
    ["andamento", "Em andamento"],
    ["conquistadas", `Conquistadas · ${earnedCount}`],
  ];

  return (
    <div>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {chips.map(([f, label]) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-9 shrink-0 rounded-full border-2 border-[#141414] px-3 text-[13px] font-extrabold ${
              filter === f ? "bg-[#141414] text-white" : "bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mb-2 flex items-baseline justify-between px-0.5 text-[12px] font-black uppercase tracking-[0.08em]">
        Ramo {RAMO_LABELS[progression.ramo ?? "escoteiro"]}
        <span className="font-bold normal-case tracking-normal text-[#8A887F]">
          {visible.length} {visible.length === 1 ? "insígnia" : "insígnias"}
        </span>
      </p>

      {visible.length === 0 ? (
        <p className="rounded-[10px] border-2 border-dashed border-[#8A887F] p-5 text-center text-sm text-[#4A4A44]">
          Nenhuma insígnia aqui ainda.
        </p>
      ) : (
        <div className="space-y-2.5">
          {visible.map((badge) => (
            <InsigniaCard
              key={badge.id}
              badge={badge}
              ramo={progression.ramo}
              standing={progression.badges.get(badge.id)}
              open={open === badge.id}
              onOpen={() => setOpen(open === badge.id ? null : badge.id)}
              onToggle={(badgeId, requirementIndex) =>
                toggle({ badgeId, requirementIndex })
              }
            />
          ))}
        </div>
      )}
      <p className="mt-3 text-center text-[12px] text-[#8A887F]">
        Uma insígnia conquistada substitui as ações variáveis dos blocos que a
        citam.
      </p>
    </div>
  );
}

function InsigniaCard({
  badge,
  ramo,
  standing,
  open,
  onOpen,
  onToggle,
}: {
  badge: SpecialInterestBadge;
  ramo: Parameters<typeof badgeGroupsFor>[1];
  standing: BadgeStanding | undefined;
  open: boolean;
  onOpen: () => void;
  onToggle: (badgeId: string, requirementIndex: number) => void;
}) {
  const groups = badgeGroupsFor(badge.id, ramo);
  const needed = badgeNeeded(groups, standing);
  const progress = standing?.progress ?? 0;
  const pending = standing?.pendingCount ?? 0;
  const earned = !!standing?.earned;

  return (
    <div className="overflow-hidden rounded-[10px] border-2 border-[#141414] bg-white">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        aria-label={`insígnia ${badge.name}`}
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
      >
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full border-2 border-[#141414] ${earned ? "bg-[#F4C430]" : "bg-[#EEE9DC]"}`}
        >
          <Award className="size-5" strokeWidth={2.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold leading-tight">
            {badge.name}
          </span>
          <span className="block text-[12px] font-semibold text-[#8A887F]">
            {badge.englishName}
          </span>
          <span className="mt-1.5 flex h-2 overflow-hidden rounded-full border-2 border-[#141414]">
            <span
              className="bg-[#0E6B4E]"
              style={{ width: `${(100 * progress) / needed}%` }}
            />
            <span
              className="bg-[#0E6B4E]/35"
              style={{ width: `${(100 * Math.min(pending, needed - progress)) / needed}%` }}
            />
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[13px] font-extrabold text-[#4A4A44]">
            {progress}/{needed}
          </span>
          {earned ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#0E6B4E] px-2 py-0.5 text-[11px] font-extrabold text-white">
              <CheckCircle2 className="size-3" /> Conquistada
            </span>
          ) : pending > 0 ? (
            <span className="inline-flex items-center gap-0.5 rounded-full border-[1.5px] border-[#6B4A00] bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-extrabold text-[#6B4A00]">
              <Clock className="size-3" /> {pending} pendente{pending > 1 ? "s" : ""}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t-2 border-[#141414] bg-[#FCFBF7] p-3">
          <p className="mb-3 text-[13px] text-[#4A4A44]">{badge.description}</p>
          <BadgeChecklist
            badgeId={badge.id}
            groups={groups}
            standing={standing}
            onToggle={onToggle}
            color="#0E6B4E"
            lockApproved
          />
        </div>
      )}
    </div>
  );
}
