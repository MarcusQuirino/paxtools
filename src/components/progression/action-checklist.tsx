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
  planOnly?: boolean;
  lockApproved?: boolean;
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
  planOnly,
  lockApproved,
}: ActionChecklistProps) {
  const variableDone = bloco.variableActions.filter((a) =>
    completedActionIds.has(a.id),
  ).length;
  const customDone = customActions.filter(
    (c) => c.blocoId === bloco.id && c.completed,
  ).length;
  const totalVariableDone = variableDone + customDone;

  const isPlanned = (actionId: string) =>
    !planOnly ||
    !!plannedKeys?.has(encodePlanKey({ kind: "action", actionId }));

  const visibleFixed = bloco.fixedActions.filter((a) => isPlanned(a.id));
  const visibleVariable = bloco.variableActions.filter((a) => isPlanned(a.id));
  const visibleCustomCount = customActions.filter(
    (c) =>
      c.blocoId === bloco.id &&
      (!planOnly ||
        !!plannedKeys?.has(
          encodePlanKey({ kind: "custom", customActionId: c._id }),
        )),
  ).length;
  const showVariableSection =
    visibleVariable.length > 0 || visibleCustomCount > 0 || !planOnly;

  return (
    <div className="space-y-4">
      {visibleFixed.length > 0 && (
        <div>
          <div
            className="text-xs font-black uppercase tracking-widest px-3 py-2 rounded-t-md text-white border-2 border-black"
            style={{ backgroundColor: color }}
          >
            Ações Fixas
          </div>
          <div className="border-2 border-t-0 border-black rounded-b-md divide-y-2 divide-black/20">
            {visibleFixed.map((action) => {
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
                  lockApproved={lockApproved}
                />
              );
            })}
          </div>
        </div>
      )}

      {showVariableSection && (
      <div>
        <div
          className="text-xs font-black uppercase tracking-widest px-3 py-2 rounded-t-md flex items-center justify-between border-2 border-black"
          style={{ backgroundColor: colorLight, color }}
        >
          <span>Ações Variáveis</span>
          <span className="text-xs font-bold">
            {hasSpecialtyAlternative
              ? "✓ substituída por especialidade"
              : `${totalVariableDone}/${bloco.variableRequired} necessárias`}
          </span>
        </div>
        <div className="border-2 border-t-0 border-black rounded-b-md divide-y-2 divide-black/20">
          {visibleVariable.map((action) => {
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
                lockApproved={lockApproved}
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
            planOnly={planOnly}
            lockApproved={lockApproved}
          />
        </div>
      </div>
      )}
    </div>
  );
}
