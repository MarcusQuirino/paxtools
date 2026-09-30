import type { AlternativeCompletion } from "@/data/types";
import { Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PlanStar } from "./plan-star";
import { Note } from "@/components/ui/section";
import { encodePlanKey } from "@/lib/plan-keys";
import { isSpecialtyEarned, toCanonicalSpecialtyId } from "@/lib/completion-logic";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * "ou conclua com uma especialidade" (Design A frame 2): the especialidades /
 * insígnias a bloco can be completed with, as 44px chips. Especialidade chips
 * open that especialidade on /especialidades (earned = emerald tint + check —
 * earned only via its items since #47); each chip carries its own plan star
 * as a sibling button (never nested in the link).
 */
type SpecialtySectionProps = {
  blocoId: string;
  alternatives: AlternativeCompletion[];
  /** Canonical ids of specialties earned via items (#44). */
  earnedSpecialtyIds?: Set<string>;
  plannedKeys?: Set<string>;
  onTogglePlanned?: (itemKey: string) => void;
  /** Impersonation (#53): the link carries the scout so the escotista lands on their ficha. */
  escoteiroId?: Id<"users">;
};

const CHIP =
  "inline-flex min-h-12 items-stretch overflow-hidden rounded-full border-2 border-[#141414] text-[14px] font-bold";

export function SpecialtySection({
  blocoId,
  alternatives,
  earnedSpecialtyIds,
  plannedKeys,
  onTogglePlanned,
  escoteiroId,
}: SpecialtySectionProps) {
  const visible = alternatives.filter((alt) => alt.items.length > 0);
  if (visible.length === 0) return null;
  const earned = earnedSpecialtyIds ?? new Set<string>();

  return (
    <section data-testid="bloco-alternatives">
      <div className="mb-2.5 flex items-center gap-2.5 text-[12px] font-black uppercase tracking-[0.1em] text-[#8A887F] before:flex-1 before:border-t-2 before:border-[#D9D5C9] before:content-[''] after:flex-1 after:border-t-2 after:border-[#D9D5C9] after:content-['']">
        ou conclua com {visible.length === 1 && visible[0]!.type === "insignia" ? "uma insígnia" : "uma especialidade"}
      </div>
      {visible.map((alt) => (
        <div key={alt.type} className="mb-2">
          {visible.length > 1 && (
            <p className="mb-1.5 text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#4A4A44]">
              {alt.type === "especialidade" ? "Especialidades" : "Insígnias"}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {alt.items.map((item) => {
              const planKey = encodePlanKey({ kind: "specialty", blocoId, specialtyName: item });
              const isEsp = alt.type === "especialidade";
              const won = isEsp && isSpecialtyEarned(item, earned);
              const label = (
                <>
                  {won && <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden />}
                  {item}
                  {won && <span className="sr-only"> (conquistada)</span>}
                </>
              );
              return (
                <span
                  key={item}
                  className={cn(CHIP, won ? "bg-[#DDF3E8]" : "bg-white")}
                  data-testid={`alt-chip-${toCanonicalSpecialtyId(item)}`}
                >
                  {isEsp ? (
                    <Link
                      to="/especialidades"
                      search={{
                        specialty: toCanonicalSpecialtyId(item),
                        ...(escoteiroId ? { escoteiroId } : {}),
                      }}
                      aria-label={`ver ${item}`}
                      className={cn(
                        "flex items-center gap-1.5 pl-3.5 hover:bg-black/[0.04]",
                        onTogglePlanned ? "pr-1" : "pr-3.5",
                      )}
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className={cn("flex items-center pl-3.5", onTogglePlanned ? "pr-1" : "pr-3.5")}>
                      {label}
                    </span>
                  )}
                  {onTogglePlanned && (
                    <PlanStar
                      planned={!!plannedKeys?.has(planKey)}
                      onToggle={() => onTogglePlanned(planKey)}
                      label={
                        plannedKeys?.has(planKey)
                          ? `Remover ${item} do plano`
                          : `Adicionar ${item} ao plano`
                      }
                      className="my-0 h-auto rounded-none border-l-2 border-[#141414]"
                    />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      ))}
      {visible.some((alt) => alt.type === "especialidade") && (
        <Note className="mt-1">
          Uma especialidade no Nível 1 conclui este bloco assim que um escotista aprovar os itens.
        </Note>
      )}
    </section>
  );
}
