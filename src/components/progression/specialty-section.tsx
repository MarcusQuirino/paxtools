import type { AlternativeCompletion, CompletionStatus } from "@/data/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, Clock } from "lucide-react";
import { PlanStar } from "./plan-star";
import { encodePlanKey } from "@/lib/plan-keys";

type SpecialtySectionProps = {
  blocoId: string;
  alternatives: AlternativeCompletion[];
  completedSpecialties: {
    blocoId: string;
    specialtyName: string;
    status: CompletionStatus;
  }[];
  onToggle: (blocoId: string, specialtyName: string) => void;
  plannedKeys?: Set<string>;
  onTogglePlanned?: (itemKey: string) => void;
  planOnly?: boolean;
  lockApproved?: boolean;
};

export function SpecialtySection({
  blocoId,
  alternatives,
  completedSpecialties,
  onToggle,
  plannedKeys,
  onTogglePlanned,
  planOnly,
  lockApproved,
}: SpecialtySectionProps) {
  if (alternatives.length === 0) return null;

  const getStatus = (name: string) =>
    completedSpecialties.find(
      (s) => s.blocoId === blocoId && s.specialtyName === name,
    );

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
        <div key={alt.type} className="border-2 border-black p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <Award className="size-3.5" />
            {alt.type === "especialidade" ? "Especialidades" : "Insígnias"}
          </div>
          {alt.items.map((item) => {
            const completion = getStatus(item);
            const isChecked = !!completion;
            const isPending = completion?.status === "pending";
            const isLocked =
              lockApproved && isChecked && completion?.status === "approved";
            const planKey = encodePlanKey({
              kind: "specialty",
              blocoId,
              specialtyName: item,
            });
            return (
              <label
                key={item}
                className={`flex items-center gap-3 min-h-[44px] px-1 transition-colors ${
                  isLocked ? "cursor-not-allowed" : "cursor-pointer hover:bg-muted"
                }`}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => onToggle(blocoId, item)}
                  disabled={isLocked}
                  className="size-5"
                  style={
                    isChecked
                      ? { opacity: isPending ? 0.4 : 1 }
                      : undefined
                  }
                />
                <span
                  className={`text-sm flex-1 ${
                    isChecked
                      ? isPending
                        ? "text-muted-foreground/60"
                        : ""
                      : ""
                  }`}
                >
                  {item}
                </span>
                {isPending && (
                  <Clock className="size-3.5 text-slate-400 shrink-0" />
                )}
                {onTogglePlanned && (
                  <PlanStar
                    planned={!!plannedKeys?.has(planKey)}
                    onToggle={() => onTogglePlanned(planKey)}
                  />
                )}
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}
