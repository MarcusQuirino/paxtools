import type { Bloco, CustomAction } from "@/data/types";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ActionChecklist } from "./action-checklist";
import { SpecialtySection } from "./specialty-section";
import { getBlocoProgress } from "@/lib/completion-logic";
import { Check } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

type BlocoCardProps = {
  bloco: Bloco;
  completedActionIds: Set<string>;
  customActions: CustomAction[];
  completedSpecialties: { blocoId: string; specialtyName: string }[];
  color: string;
  colorLight: string;
  onToggleAction: (actionId: string) => void;
  onToggleSpecialty: (blocoId: string, specialtyName: string) => void;
  onAddCustom: (blocoId: string, text: string) => void;
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
};

export function BlocoCard({
  bloco,
  completedActionIds,
  customActions,
  completedSpecialties,
  color,
  colorLight,
  onToggleAction,
  onToggleSpecialty,
  onAddCustom,
  onToggleCustom,
  onDeleteCustom,
}: BlocoCardProps) {
  const customCompleted = customActions.filter(
    (c) => c.blocoId === bloco.id && c.completed,
  ).length;
  const hasSpecialty = completedSpecialties.some(
    (s) => s.blocoId === bloco.id,
  );
  const progress = getBlocoProgress(
    bloco,
    completedActionIds,
    customCompleted,
    hasSpecialty,
  );

  const totalActions = bloco.fixedActions.length + bloco.variableRequired;
  const variableCredit = hasSpecialty
    ? bloco.variableRequired
    : Math.min(progress.variableDone, bloco.variableRequired);
  const totalDone = Math.min(progress.fixedDone + variableCredit, totalActions);
  const percent = totalActions > 0 ? (totalDone / totalActions) * 100 : 0;

  return (
    <AccordionItem value={bloco.id}>
      <AccordionTrigger className="px-3 hover:no-underline gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{bloco.name}</span>
            {progress.isComplete ? (
              <Badge
                className="text-[10px] px-1.5 py-0"
                style={{ backgroundColor: color }}
              >
                <Check className="size-3 mr-0.5" />
                Completo
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {totalDone}/{totalActions}
              </Badge>
            )}
          </div>
          <Progress
            value={percent}
            className="mt-2 h-1.5"
            indicatorColor={color}
          />
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-3">
        <p className="text-xs text-muted-foreground italic mb-4">
          {bloco.objective}
        </p>
        <ActionChecklist
          bloco={bloco}
          completedActionIds={completedActionIds}
          customActions={customActions}
          hasSpecialtyAlternative={hasSpecialty}
          color={color}
          colorLight={colorLight}
          onToggleAction={onToggleAction}
          onAddCustom={onAddCustom}
          onToggleCustom={onToggleCustom}
          onDeleteCustom={onDeleteCustom}
        />
        <SpecialtySection
          blocoId={bloco.id}
          alternatives={bloco.alternativeCompletions}
          completedSpecialties={completedSpecialties}
          onToggle={onToggleSpecialty}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
