import type { AlternativeCompletion } from "@/data/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Award } from "lucide-react";

type SpecialtySectionProps = {
  blocoId: string;
  alternatives: AlternativeCompletion[];
  completedSpecialties: { blocoId: string; specialtyName: string }[];
  onToggle: (blocoId: string, specialtyName: string) => void;
};

export function SpecialtySection({
  blocoId,
  alternatives,
  completedSpecialties,
  onToggle,
}: SpecialtySectionProps) {
  if (alternatives.length === 0) return null;

  const isCompleted = (name: string) =>
    completedSpecialties.some(
      (s) => s.blocoId === blocoId && s.specialtyName === name,
    );

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wider px-3 mb-2">
        <div className="flex-1 border-t" />
        <span>ou</span>
        <div className="flex-1 border-t" />
      </div>

      {alternatives.map((alt) => (
        <div
          key={alt.type}
          className="border rounded-md p-3 space-y-2"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <Award className="size-3.5" />
            {alt.type === "especialidade" ? "Especialidades" : "Insígnias"}
          </div>
          {alt.items.map((item) => (
            <label
              key={item}
              className="flex items-center gap-3 min-h-[44px] cursor-pointer px-1"
            >
              <Checkbox
                checked={isCompleted(item)}
                onCheckedChange={() => onToggle(blocoId, item)}
                className="size-5"
              />
              <span className="text-sm">{item}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
