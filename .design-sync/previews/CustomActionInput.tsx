import { CustomActionInput } from "paxtools";
import { bloco, COLOR, customActions, noop } from "./_fixtures";

const shared = {
  blocoId: bloco.id,
  color: COLOR,
  onAdd: noop,
  onToggle: noop,
  onDelete: noop,
};

/** Empty state — just the add row. */
export const Vazio = () => (
  <div className="max-w-2xl">
    <CustomActionInput {...shared} customActions={[]} />
  </div>
);

/** With actions the escoteiro combined with their escotista. */
export const ComAcoes = () => (
  <div className="max-w-2xl">
    <CustomActionInput {...shared} customActions={customActions} />
  </div>
);

// `lockApproved` (escotista review) is deliberately not a story: it only hides
// the delete affordance on already-approved rows, so its static render is
// identical to ComAcoes at this size.
