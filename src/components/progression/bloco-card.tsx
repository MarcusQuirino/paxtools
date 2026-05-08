import type { Bloco, CustomAction, CompletionStatus } from "@/data/types";
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
import { Check, Clock } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

type BlocoCardProps = {
  bloco: Bloco;
  approvedActionIds: Set<string>;
  pendingActionIds: Set<string>;
  actionStatusMap: Map<string, CompletionStatus>;
  customActions: CustomAction[];
  completedSpecialties: {
    blocoId: string;
    specialtyName: string;
    status: CompletionStatus;
  }[];
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
  approvedActionIds,
  pendingActionIds,
  actionStatusMap,
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
  const approvedCustomCompleted = customActions.filter(
    (c) => c.blocoId === bloco.id && c.completed && c.status !== "pending",
  ).length;
  const pendingCustomCompleted = customActions.filter(
    (c) => c.blocoId === bloco.id && c.completed && c.status === "pending",
  ).length;
  const hasApprovedSpecialty = completedSpecialties.some(
    (s) => s.blocoId === bloco.id && s.status !== "pending",
  );
  const hasPendingSpecialty = completedSpecialties.some(
    (s) => s.blocoId === bloco.id && s.status === "pending",
  );

  const progress = getBlocoProgress(
    bloco,
    approvedActionIds,
    pendingActionIds,
    approvedCustomCompleted,
    pendingCustomCompleted,
    hasApprovedSpecialty,
    hasPendingSpecialty,
  );

  const totalActions = bloco.fixedActions.length + bloco.variableRequired;

  const approvedVariableCredit = hasApprovedSpecialty
    ? bloco.variableRequired
    : Math.min(progress.variableDone, bloco.variableRequired);
  const approvedDone = Math.min(
    progress.fixedDone + approvedVariableCredit,
    totalActions,
  );
  const approvedPercent =
    totalActions > 0 ? (approvedDone / totalActions) * 100 : 0;

  const pendingVariableCredit =
    hasApprovedSpecialty || hasPendingSpecialty
      ? bloco.variableRequired - approvedVariableCredit
      : Math.min(
          progress.variablePending,
          bloco.variableRequired - approvedVariableCredit,
        );
  const pendingDone = Math.min(
    progress.fixedPending + Math.max(0, pendingVariableCredit),
    totalActions - approvedDone,
  );
  const pendingPercent =
    totalActions > 0 ? (pendingDone / totalActions) * 100 : 0;

  // For the checklist, combine both sets so checked items show
  const allCompletedActionIds = new Set([
    ...approvedActionIds,
    ...pendingActionIds,
  ]);

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
            ) : progress.isPendingComplete && !progress.isComplete ? (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 text-slate-600 border-slate-300"
              >
                <Clock className="size-3 mr-0.5" />
                Pendente
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {approvedDone}/{totalActions}
              </Badge>
            )}
          </div>
          <Progress
            value={approvedPercent}
            pendingValue={pendingPercent}
            className="mt-2 h-1.5"
            indicatorColor={color}
            pendingColor={color}
          />
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-3">
        <p className="text-xs text-muted-foreground italic mb-4">
          {bloco.objective}
        </p>
        <ActionChecklist
          bloco={bloco}
          completedActionIds={allCompletedActionIds}
          actionStatusMap={actionStatusMap}
          customActions={customActions}
          hasSpecialtyAlternative={hasApprovedSpecialty || hasPendingSpecialty}
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
