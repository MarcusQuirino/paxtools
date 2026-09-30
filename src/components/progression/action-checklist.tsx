import type { Bloco, CustomAction, CompletionStatus } from "@/data/types";
import type { Id } from "../../../convex/_generated/dataModel";
import { eixoTint } from "@/data/eixo-colors";
import { EMERALD } from "@/lib/design-tokens";
import { encodePlanKey } from "@/lib/plan-keys";
import type { BlocoProgress } from "@/lib/completion-logic";
import { ListBox, ListHeader } from "@/components/ui/section";
import { ActionItem } from "./action-item";
import { AddCustomAction, CustomActionRows } from "./custom-action-input";

type ActionChecklistProps = {
  bloco: Bloco;
  progress: BlocoProgress;
  approvedActionIds: Set<string>;
  pendingActionIds: Set<string>;
  actionStatusMap: Map<string, CompletionStatus>;
  customActions: CustomAction[];
  /** Variáveis satisfied by an earned especialidade. */
  viaSpecialty: boolean;
  onToggleAction: (actionId: string) => void;
  onAddCustom: (blocoId: string, text: string) => void;
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
  plannedKeys?: Set<string>;
  onTogglePlanned?: (itemKey: string) => void;
  lockApproved?: boolean;
};

/**
 * The bloco screen's two lists (Design A frame 2): "Ações fixas" (eixo-tinted
 * header, "6/8 · obrigatórias") and "Ações variáveis" ("escolha 2/5", emerald
 * once met) with the escoteiro's ações personalizadas, then the dashed
 * "+ Ação personalizada" row.
 */
export function ActionChecklist({
  bloco,
  progress,
  approvedActionIds,
  pendingActionIds,
  actionStatusMap,
  customActions,
  viaSpecialty,
  onToggleAction,
  onAddCustom,
  onToggleCustom,
  onDeleteCustom,
  plannedKeys,
  onTogglePlanned,
  lockApproved,
}: ActionChecklistProps) {
  const checked = (id: string) => approvedActionIds.has(id) || pendingActionIds.has(id);
  const row = (action: Bloco["fixedActions"][number]) => {
    const planKey = encodePlanKey({ kind: "action", actionId: action.id });
    return (
      <ActionItem
        key={action.id}
        id={action.id}
        text={action.text}
        checked={checked(action.id)}
        status={actionStatusMap.get(action.id)}
        onToggle={() => onToggleAction(action.id)}
        planned={plannedKeys?.has(planKey)}
        onTogglePlanned={onTogglePlanned ? () => onTogglePlanned(planKey) : undefined}
        lockApproved={lockApproved}
      />
    );
  };

  const variableMet = viaSpecialty || progress.variableDone >= bloco.variableRequired;
  const hasCustom = customActions.some((c) => c.blocoId === bloco.id);

  return (
    <div className="space-y-4">
      {bloco.fixedActions.length > 0 && (
        <ListBox testId="bloco-fixed">
          <ListHeader
            label="Ações fixas"
            tint={eixoTint(bloco.eixoId)}
            meta={
              <span style={progress.fixedDone === progress.fixedTotal ? { color: EMERALD } : undefined}>
                <b className="text-[#141414]">{progress.fixedDone}</b>/{progress.fixedTotal} · obrigatórias
              </span>
            }
          />
          {bloco.fixedActions.map(row)}
        </ListBox>
      )}

      <div>
        <ListBox testId="bloco-variable">
          <ListHeader
            label="Ações variáveis"
            meta={
              <span style={variableMet ? { color: EMERALD } : undefined}>
                {viaSpecialty ? (
                  "substituídas por especialidade"
                ) : (
                  <>
                    escolha{" "}
                    <b className={variableMet ? undefined : "text-[#141414]"}>
                      {Math.min(progress.variableDone, bloco.variableRequired)}
                    </b>
                    /{bloco.variableRequired}
                  </>
                )}
              </span>
            }
          />
          {bloco.variableActions.map(row)}
          <CustomActionRows
            blocoId={bloco.id}
            customActions={customActions}
            onToggle={onToggleCustom}
            onDelete={onDeleteCustom}
            plannedKeys={plannedKeys}
            onTogglePlanned={onTogglePlanned}
            lockApproved={lockApproved}
          />
          {bloco.variableActions.length === 0 && !hasCustom && (
            <p className="px-3.5 py-3 text-[13px] text-[#4A4A44]">
              Nenhuma ação variável listada — crie uma ação personalizada.
            </p>
          )}
        </ListBox>
        <AddCustomAction blocoId={bloco.id} onAdd={onAddCustom} />
      </div>
    </div>
  );
}
