import { useState } from "react";
import type { RequirementGroup } from "@/data/badge-data";
import type { AlternativeCompletion } from "@/data/types";
import type { Ramo } from "@/data/progression-data";
import { badgeGroupsFor } from "@/data/badge-data";
import type { BadgeStanding } from "@/lib/badge-standing";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, ArrowRight, ChevronDown } from "lucide-react";
import { BadgeChecklist, badgeNeeded } from "./badge-checklist";
import { Link } from "@tanstack/react-router";
import { PlanStar } from "./plan-star";
import { encodePlanKey } from "@/lib/plan-keys";
import {
  isSpecialtyEarned,
  toCanonicalSpecialtyId,
  toSpecialtySlug,
} from "@/lib/completion-logic";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * The especialidades/insígnias a bloco can be completed with, listed as a
 * read-only "ou" alternative. Since #47 a box is checked only when the
 * especialidade is earned via its items/steps — the legacy manual toggle is
 * gone, so the escoteiro marks work on /especialidades (the "ver" link).
 *
 * Insígnias de interesse especial are tracked right here: tapping one opens
 * its requirements as a checklist, grouped like the official list. No levels —
 * the box checks (and the bloco's variable section is satisfied) once every
 * group is satisfied; a group may ask for only some of its items.
 */
type SpecialtySectionProps = {
  blocoId: string;
  alternatives: AlternativeCompletion[];
  /** Canonical ids of specialties earned via items (#44) — those boxes render checked. */
  earnedSpecialtyIds?: Set<string>;
  plannedKeys?: Set<string>;
  onTogglePlanned?: (itemKey: string) => void;
  planOnly?: boolean;
  /**
   * Target scout when rendered in the escotista impersonation Dashboard (#53):
   * the "ver" deep-link carries it so /especialidades opens the scout's detail
   * instead of bouncing the escotista.
   */
  escoteiroId?: Id<"users">;
  /** The escoteiro's ramo — insígnia requirements differ per ramo. */
  ramo?: Ramo | null;
  /** badgeId → standing (progression state). */
  badges?: Map<string, BadgeStanding>;
  onToggleBadgeRequirement?: (badgeId: string, requirementIndex: number) => void;
  color?: string;
  lockApproved?: boolean;
};

export function SpecialtySection({
  blocoId,
  alternatives,
  earnedSpecialtyIds,
  plannedKeys,
  onTogglePlanned,
  planOnly,
  escoteiroId,
  ramo,
  badges,
  onToggleBadgeRequirement,
  color,
  lockApproved,
}: SpecialtySectionProps) {
  if (alternatives.length === 0) return null;

  const earned = earnedSpecialtyIds ?? new Set<string>();

  const isPlanned = (name: string) =>
    !planOnly ||
    !!plannedKeys?.has(
      encodePlanKey({ kind: "specialty", blocoId, specialtyName: name }),
    );

  const visibleAlternatives = alternatives
    .map((alt) => ({ ...alt, items: alt.items.filter(isPlanned) }))
    .filter((alt) => alt.items.length > 0);

  if (visibleAlternatives.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider px-3 mb-2">
        <div className="flex-1 border-t" />
        <span>ou</span>
        <div className="flex-1 border-t" />
      </div>

      {visibleAlternatives.map((alt) => (
        <div key={alt.type} className="border rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <Award className="size-3.5" />
            {alt.type === "especialidade" ? "Especialidades" : "Insígnias"}
          </div>
          {alt.items.map((item) => {
            const planKey = encodePlanKey({
              kind: "specialty",
              blocoId,
              specialtyName: item,
            });
            const badgeId = toSpecialtySlug(item);
            const groups =
              alt.type === "insignia" ? badgeGroupsFor(badgeId, ramo) : [];
            if (groups.length > 0) {
              return (
                <BadgeRow
                  key={item}
                  name={item}
                  badgeId={badgeId}
                  groups={groups}
                  standing={badges?.get(badgeId)}
                  onToggle={onToggleBadgeRequirement}
                  color={color}
                  lockApproved={lockApproved}
                  planStar={
                    onTogglePlanned && (
                      <PlanStar
                        planned={!!plannedKeys?.has(planKey)}
                        onToggle={() => onTogglePlanned(planKey)}
                      />
                    )
                  }
                />
              );
            }
            return (
              <div
                key={item}
                className="flex items-center gap-3 min-h-[44px] px-1"
              >
                {/* An insígnia without requirements in our catalog can't be
                    tracked, so only especialidades get a (read-only) box. */}
                {alt.type === "especialidade" && (
                  <Checkbox
                    checked={isSpecialtyEarned(item, earned)}
                    disabled
                    className="size-5"
                  />
                )}
                <span className="text-sm flex-1">{item}</span>
                {alt.type === "especialidade" && (
                  <Link
                    to="/especialidades"
                    search={{
                      specialty: toCanonicalSpecialtyId(item),
                      ...(escoteiroId ? { escoteiroId } : {}),
                    }}
                    // A bloco lists several "ver" links; name each one so it is
                    // distinguishable to assistive tech (and to tests).
                    aria-label={`ver ${item}`}
                    className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    ver
                    <ArrowRight className="size-3" />
                  </Link>
                )}
                {onTogglePlanned && (
                  <PlanStar
                    planned={!!plannedKeys?.has(planKey)}
                    onToggle={() => onTogglePlanned(planKey)}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * One insígnia de interesse especial: an earned box (read-only — it checks when
 * every group is satisfied), its progress, and a toggle that opens the
 * requirement checklist.
 */
function BadgeRow({
  name,
  badgeId,
  groups,
  standing,
  onToggle,
  color,
  lockApproved,
  planStar,
}: {
  name: string;
  badgeId: string;
  groups: RequirementGroup[];
  standing: BadgeStanding | undefined;
  onToggle?: (badgeId: string, requirementIndex: number) => void;
  color?: string;
  lockApproved?: boolean;
  planStar?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pending = standing?.pendingCount ?? 0;

  return (
    <div className="rounded-md">
      <div className="flex items-center gap-3 min-h-[44px] px-1">
        <Checkbox
          checked={!!standing?.earned}
          disabled
          aria-label={`${name} conquistada`}
          className="size-5"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`requisitos ${name}`}
          className="flex flex-1 items-center gap-2 text-left text-sm"
        >
          <span className="flex-1">{name}</span>
          <span className="text-xs font-semibold text-muted-foreground shrink-0">
            {standing?.progress ?? 0}/{badgeNeeded(groups, standing)}
            {pending > 0 && ` (+${pending})`}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {planStar}
      </div>
      {open && (
        <div className="ml-2 mt-1">
          <BadgeChecklist
            badgeId={badgeId}
            groups={groups}
            standing={standing}
            onToggle={onToggle}
            color={color}
            lockApproved={lockApproved}
          />
        </div>
      )}
    </div>
  );
}
