import { RecognitionSection } from "paxtools";
import { irr, noop } from "./_fixtures";

/** The escoteiro IRR is "Lis de Ouro" — 18 blocos plus five items. */
export const Bloqueada = () => (
  <div className="max-w-2xl">
    <RecognitionSection
      irr={irr}
      blocksComplete={false}
      approvedIrrItemIds={new Set()}
      pendingIrrItemIds={new Set()}
      irrComplete={false}
      onToggleItem={noop}
    />
  </div>
);

export const EmProgresso = () => (
  <div className="max-w-2xl">
    <RecognitionSection
      irr={irr}
      blocksComplete
      approvedIrrItemIds={new Set(["irr_blocos", "irr_especialidades"])}
      pendingIrrItemIds={new Set(["irr_servico"])}
      irrComplete={false}
      onToggleItem={noop}
    />
  </div>
);

export const Conquistada = () => (
  <div className="max-w-2xl">
    <RecognitionSection
      irr={irr}
      blocksComplete
      approvedIrrItemIds={new Set(irr.items.map((i) => i.id))}
      pendingIrrItemIds={new Set()}
      irrComplete
      onToggleItem={noop}
    />
  </div>
);
