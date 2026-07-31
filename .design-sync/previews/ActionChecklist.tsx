import { ActionChecklist } from "paxtools";
import {
  bloco,
  COLOR,
  COLOR_LIGHT,
  approvedActionIds,
  actionStatusMap,
  customActions,
  noop,
} from "./_fixtures";

const shared = {
  bloco,
  color: COLOR,
  colorLight: COLOR_LIGHT,
  onToggleAction: noop,
  onAddCustom: noop,
  onToggleCustom: noop,
  onDeleteCustom: noop,
};

/** Fixed + variable sections with approved, pending and open rows. */
export const EmProgresso = () => (
  <ActionChecklist
    {...shared}
    completedActionIds={approvedActionIds}
    actionStatusMap={actionStatusMap}
    customActions={customActions}
    hasSpecialtyAlternative={false}
  />
);

export const Vazio = () => (
  <ActionChecklist
    {...shared}
    completedActionIds={new Set()}
    actionStatusMap={new Map()}
    customActions={[]}
    hasSpecialtyAlternative={false}
  />
);

/**
 * With an especialidade alternative available the variable half shows the
 * "ou especialidade" affordance instead of a hard requirement count.
 */
export const ComAlternativaDeEspecialidade = () => (
  <ActionChecklist
    {...shared}
    completedActionIds={approvedActionIds}
    actionStatusMap={actionStatusMap}
    customActions={[]}
    hasSpecialtyAlternative
  />
);
