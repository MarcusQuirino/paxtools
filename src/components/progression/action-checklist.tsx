import type { Bloco, CustomAction, CompletionStatus } from "@/data/types";
import { ActionItem } from "./action-item";
import { CustomActionInput } from "./custom-action-input";
import type { Id } from "../../../convex/_generated/dataModel";
import { encodePlanKey } from "@/lib/plan-keys";

type ActionChecklistProps = {
  bloco: Bloco;
  completedActionIds: Set<string>;
  actionStatusMap: Map<string, CompletionStatus>;
  customActions: CustomAction[];
  hasSpecialtyAlternative: boolean;
  color: string;
  colorLight: string;
  onToggleAction: (actionId: string) => void;
  onAddCustom: (blocoId: string, text: string) => void;
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
  plannedKeys?: Set<string>;
  onTogglePlanned?: (itemKey: string) => void;
};

export function ActionChecklist({
  bloco,
  completedActionIds,
  actionStatusMap,
  customActions,
  hasSpecialtyAlternative,
  color,
  colorLight,
  onToggleAction,
  onAddCustom,
  onToggleCustom,
  onDeleteCustom,
  plannedKeys,
  onTogglePlanned,
}: ActionChecklistProps) {
  const variableDone = bloco.variableActions.filter((a) =>
    completedActionIds.has(a.id),
  ).length;
  const customDone = customActions.filter(
    (c) => c.blocoId === bloco.id && c.completed,
  ).length;
  const totalVariableDone = variableDone + customDone;

  return (
    <div className="space-y-4">
      {bloco.fixedActions.length > 0 && (
        <div>
          <div
            className="text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-t-md text-white"
            style={{ backgroundColor: color }}
          >
            Ações Fixas
          </div>
          <div className="border border-t-0 rounded-b-md divide-y">
            {bloco.fixedActions.map((action) => {
              const planKey = encodePlanKey({
                kind: "action",
                actionId: action.id,
              });
              return (
                <ActionItem
                  key={action.id}
                  id={action.id}
                  text={action.text}
                  checked={completedActionIds.has(action.id)}
                  status={actionStatusMap.get(action.id)}
                  onToggle={() => onToggleAction(action.id)}
                  color={color}
                  planned={plannedKeys?.has(planKey)}
                  onTogglePlanned={
                    onTogglePlanned
                      ? () => onTogglePlanned(planKey)
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div
          className="text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-t-md flex items-center justify-between"
          style={{ backgroundColor: colorLight, color }}
        >
          <span>Ações Variáveis</span>
          <span className="text-xs font-normal">
            {hasSpecialtyAlternative
              ? "✓ substituída por especialidade"
              : `${totalVariableDone}/${bloco.variableRequired} necessárias`}
          </span>
        </div>
        <div className="border border-t-0 rounded-b-md divide-y">
          {bloco.variableActions.map((action) => {
            const planKey = encodePlanKey({
              kind: "action",
              actionId: action.id,
            });
            return (
              <ActionItem
                key={action.id}
                id={action.id}
                text={action.text}
                checked={completedActionIds.has(action.id)}
                status={actionStatusMap.get(action.id)}
                onToggle={() => onToggleAction(action.id)}
                color={color}
                planned={plannedKeys?.has(planKey)}
                onTogglePlanned={
                  onTogglePlanned
                    ? () => onTogglePlanned(planKey)
                    : undefined
                }
              />
            );
          })}
          <CustomActionInput
            blocoId={bloco.id}
            customActions={customActions}
            color={color}
            onAdd={onAddCustom}
            onToggle={onToggleCustom}
            onDelete={onDeleteCustom}
            plannedKeys={plannedKeys}
            onTogglePlanned={onTogglePlanned}
          />
        </div>
      </div>
    </div>
  );
}
