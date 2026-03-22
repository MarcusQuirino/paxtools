import type { Eixo, CustomAction } from "@/data/types";
import { Accordion } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { BlocoCard } from "./bloco-card";
import type { Id } from "../../../convex/_generated/dataModel";

type EixoSectionProps = {
  eixo: Eixo;
  completedActionIds: Set<string>;
  completedBlockIds: Set<string>;
  customActions: CustomAction[];
  completedSpecialties: { blocoId: string; specialtyName: string }[];
  onToggleAction: (actionId: string) => void;
  onToggleSpecialty: (blocoId: string, specialtyName: string) => void;
  onAddCustom: (blocoId: string, text: string) => void;
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
};

export function EixoSection({
  eixo,
  completedActionIds,
  completedBlockIds,
  customActions,
  completedSpecialties,
  onToggleAction,
  onToggleSpecialty,
  onAddCustom,
  onToggleCustom,
  onDeleteCustom,
}: EixoSectionProps) {
  const completedInEixo = eixo.blocos.filter((b) =>
    completedBlockIds.has(b.id),
  ).length;
  const percent = (completedInEixo / eixo.blocos.length) * 100;

  return (
    <section className="rounded-xl overflow-hidden border bg-card shadow-sm">
      <div
        className="px-4 py-3 text-white"
        style={{ backgroundColor: eixo.color }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">{eixo.name}</h2>
          <span className="text-xs opacity-90">
            {completedInEixo}/{eixo.blocos.length} blocos
          </span>
        </div>
        <Progress
          value={percent}
          className="mt-2 h-1.5 bg-white/30 [&>[data-slot=progress-indicator]]:bg-white"
        />
      </div>

      <Accordion type="single" collapsible>
        {eixo.blocos.map((bloco) => (
          <BlocoCard
            key={bloco.id}
            bloco={bloco}
            completedActionIds={completedActionIds}
            customActions={customActions}
            completedSpecialties={completedSpecialties}
            color={eixo.color}
            colorLight={eixo.colorLight}
            onToggleAction={onToggleAction}
            onToggleSpecialty={onToggleSpecialty}
            onAddCustom={onAddCustom}
            onToggleCustom={onToggleCustom}
            onDeleteCustom={onDeleteCustom}
          />
        ))}
      </Accordion>
    </section>
  );
}
