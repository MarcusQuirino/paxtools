import { EixoSection } from "paxtools";
import {
  eixo,
  eixoServico,
  approvedActionIds,
  pendingActionIds,
  actionStatusMap,
  customActions,
  completedSpecialties,
  noop,
} from "./_fixtures";

const handlers = {
  onToggleAction: noop,
  onToggleSpecialty: noop,
  onAddCustom: noop,
  onToggleCustom: noop,
  onDeleteCustom: noop,
};

/** EixoSection provides its own <Accordion>, so it mounts standalone. */
export const EmProgresso = () => (
  <EixoSection
    {...handlers}
    eixo={eixo}
    approvedActionIds={approvedActionIds}
    pendingActionIds={pendingActionIds}
    actionStatusMap={actionStatusMap}
    completedBlockIds={new Set()}
    pendingBlockIds={new Set()}
    customActions={customActions}
    completedSpecialties={completedSpecialties}
  />
);

export const ComBlocoConcluido = () => (
  <EixoSection
    {...handlers}
    eixo={eixo}
    approvedActionIds={approvedActionIds}
    pendingActionIds={pendingActionIds}
    actionStatusMap={actionStatusMap}
    completedBlockIds={new Set(["autonomia-lideranca"])}
    pendingBlockIds={new Set(["aprendizagem-continua"])}
    earnedSpecialtyBlocoIds={new Set(["autonomia-lideranca"])}
    earnedSpecialtyIds={new Set(["campismo"])}
    customActions={[]}
    completedSpecialties={completedSpecialties}
  />
);

/** A second eixo — each carries its own catalog colour. */
export const OutroEixo = () => (
  <EixoSection
    {...handlers}
    eixo={eixoServico}
    approvedActionIds={new Set()}
    pendingActionIds={new Set()}
    actionStatusMap={new Map()}
    completedBlockIds={new Set()}
    pendingBlockIds={new Set()}
    customActions={[]}
    completedSpecialties={[]}
  />
);
