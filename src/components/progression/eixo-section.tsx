import type { Eixo, CustomAction, CompletionStatus } from "@/data/types";
import { Accordion } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { BlocoCard } from "./bloco-card";
import type { Id } from "../../../convex/_generated/dataModel";

type EixoSectionProps = {
  eixo: Eixo;
  approvedActionIds: Set<string>;
  pendingActionIds: Set<string>;
  actionStatusMap: Map<string, CompletionStatus>;
  completedBlockIds: Set<string>;
  pendingBlockIds: Set<string>;
  customActions: CustomAction[];
  completedSpecialties: {
    blocoId: string;
    specialtyName: string;
    status: CompletionStatus;
  }[];
  onToggleAction: (actionId: string) => void;
  onToggleSpecialty: (blocoId: string, specialtyName: string) => void;
  onAddCustom: (blocoId: string, text: string) => void;
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
};

export function EixoSection({
  eixo,
  approvedActionIds,
  pendingActionIds,
  actionStatusMap,
  completedBlockIds,
  pendingBlockIds,
  customActions,
  completedSpecialties,
  onToggleAction,
  onToggleSpecialty,
  onAddCustom,
  onToggleCustom,
  onDeleteCustom,
}: EixoSectionProps) {
  const approvedInEixo = eixo.blocos.filter((b) =>
    completedBlockIds.has(b.id),
  ).length;
  const pendingInEixo = eixo.blocos.filter((b) =>
    pendingBlockIds.has(b.id),
  ).length;
  const total = eixo.blocos.length;

  const approvedPercent = (approvedInEixo / total) * 100;
  const pendingPercent = (pendingInEixo / total) * 100;

  return (
    <section className="rounded-xl overflow-hidden border bg-card shadow-sm">
      <div
        className="px-4 py-3 text-white"
        style={{ backgroundColor: eixo.color }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">{eixo.name}</h2>
          <span className="text-xs opacity-90">
            {approvedInEixo}/{total} blocos
            {pendingInEixo > 0 && ` (+${pendingInEixo} pendente${pendingInEixo > 1 ? "s" : ""})`}
          </span>
        </div>
        <Progress
          value={approvedPercent}
          pendingValue={pendingPercent}
          className="mt-2 h-1.5 bg-white/30 [&>[data-slot=progress-indicator]]:bg-white [&>[data-slot=progress-indicator-pending]]:bg-white"
        />
      </div>

      <Accordion type="single" collapsible>
        {eixo.blocos.map((bloco) => (
          <BlocoCard
            key={bloco.id}
            bloco={bloco}
            approvedActionIds={approvedActionIds}
            pendingActionIds={pendingActionIds}
            actionStatusMap={actionStatusMap}
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
