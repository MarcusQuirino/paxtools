import { Accordion, BlocoCard } from "paxtools";
import {
  bloco,
  blocoComEspecialidade,
  COLOR,
  COLOR_LIGHT,
  approvedActionIds,
  pendingActionIds,
  actionStatusMap,
  customActions,
  completedSpecialties,
  noop,
} from "./_fixtures";

/**
 * BlocoCard renders an AccordionItem, so it only mounts inside an <Accordion>.
 * Every story composes it that way — that is the only render that is true.
 */
const shared = {
  onToggleAction: noop,
  onToggleSpecialty: noop,
  onAddCustom: noop,
  onToggleCustom: noop,
  onDeleteCustom: noop,
  color: COLOR,
  colorLight: COLOR_LIGHT,
};

export const EmProgresso = () => (
  <Accordion type="single" collapsible defaultValue={bloco.id}>
    <BlocoCard
      {...shared}
      bloco={bloco}
      approvedActionIds={approvedActionIds}
      pendingActionIds={pendingActionIds}
      actionStatusMap={actionStatusMap}
      customActions={customActions}
      completedSpecialties={[]}
    />
  </Accordion>
);

export const Fechado = () => (
  <Accordion type="single" collapsible>
    <BlocoCard
      {...shared}
      bloco={bloco}
      approvedActionIds={approvedActionIds}
      pendingActionIds={pendingActionIds}
      actionStatusMap={actionStatusMap}
      customActions={[]}
      completedSpecialties={[]}
    />
  </Accordion>
);

/** Variable half satisfied by an earned especialidade (#44). */
export const ConcluidoViaEspecialidade = () => (
  <Accordion type="single" collapsible defaultValue={blocoComEspecialidade.id}>
    <BlocoCard
      {...shared}
      bloco={blocoComEspecialidade}
      approvedActionIds={new Set(["escoteiro:autonomia-lideranca:fixed:0"])}
      pendingActionIds={new Set()}
      actionStatusMap={
        new Map([["escoteiro:autonomia-lideranca:fixed:0", "approved" as const]])
      }
      customActions={[]}
      completedSpecialties={completedSpecialties}
      earnedViaSpecialty
      earnedSpecialtyIds={new Set(["campismo"])}
    />
  </Accordion>
);

// `lockApproved` (escotista review mode) is deliberately not a story: it only
// disables interaction, so its static render is identical to EmProgresso and
// would trip the "variants render identically" check without teaching anything.
