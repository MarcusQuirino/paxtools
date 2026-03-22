import type { Bloco, CustomAction } from "@/data/types";
import { ActionItem } from "./action-item";
import { CustomActionInput } from "./custom-action-input";
import type { Id } from "../../../convex/_generated/dataModel";

type ActionChecklistProps = {
  bloco: Bloco;
  completedActionIds: Set<string>;
  customActions: CustomAction[];
  hasSpecialtyAlternative: boolean;
  color: string;
  colorLight: string;
  onToggleAction: (actionId: string) => void;
  onAddCustom: (blocoId: string, text: string) => void;
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
};

export function ActionChecklist({
  bloco,
  completedActionIds,
  customActions,
  hasSpecialtyAlternative,
  color,
  colorLight,
  onToggleAction,
  onAddCustom,
  onToggleCustom,
  onDeleteCustom,
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
            {bloco.fixedActions.map((action) => (
              <ActionItem
                key={action.id}
                id={action.id}
                text={action.text}
                checked={completedActionIds.has(action.id)}
                onToggle={() => onToggleAction(action.id)}
                color={color}
              />
            ))}
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
          {bloco.variableActions.map((action) => (
            <ActionItem
              key={action.id}
              id={action.id}
              text={action.text}
              checked={completedActionIds.has(action.id)}
              onToggle={() => onToggleAction(action.id)}
              color={color}
            />
          ))}
          <CustomActionInput
            blocoId={bloco.id}
            customActions={customActions}
            color={color}
            onAdd={onAddCustom}
            onToggle={onToggleCustom}
            onDelete={onDeleteCustom}
          />
        </div>
      </div>
    </div>
  );
}
