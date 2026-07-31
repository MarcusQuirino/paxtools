import { StageBanner } from "paxtools";
import { etapas, irr } from "./_fixtures";

export const PrimeiraEtapa = () => (
  <div className="max-w-2xl">
    <StageBanner
      etapas={etapas}
      irr={irr}
      stage={etapas[0]}
      nextStage={etapas[1]}
      completedBlockCount={2}
      pendingBlockCount={1}
      irrComplete={false}
    />
  </div>
);

export const SegundaEtapa = () => (
  <div className="max-w-2xl">
    <StageBanner
      etapas={etapas}
      irr={irr}
      stage={etapas[1]}
      nextStage={etapas[2]}
      completedBlockCount={9}
      pendingBlockCount={2}
      irrComplete={false}
    />
  </div>
);

/** All 18 blocos done and the IRR conquered. */
export const IrrConquistada = () => (
  <div className="max-w-2xl">
    <StageBanner
      etapas={etapas}
      irr={irr}
      stage={etapas[2]}
      nextStage={etapas[2]}
      completedBlockCount={18}
      pendingBlockCount={0}
      irrComplete
    />
  </div>
);
