import type { AlternativeCompletion } from "@/data/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PlanStar } from "./plan-star";
import { encodePlanKey } from "@/lib/plan-keys";
import { isSpecialtyEarned, toCanonicalSpecialtyId } from "@/lib/completion-logic";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * The especialidades/insígnias a bloco can be completed with, listed as a
 * read-only "ou" alternative. Since #47 a box is checked only when the
 * especialidade is earned via its items/steps — the legacy manual toggle is
 * gone, so the escoteiro marks work on /especialidades (the "ver" link).
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
};

export function SpecialtySection({
  blocoId,
  alternatives,
  earnedSpecialtyIds,
  plannedKeys,
  onTogglePlanned,
  planOnly,
  escoteiroId,
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
            return (
              <div
                key={item}
                className="flex items-center gap-3 min-h-[44px] px-1"
              >
                {/* Insígnias have no catalog and are not tracked (#47), so only
                    especialidades get a (read-only) earned box. */}
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
