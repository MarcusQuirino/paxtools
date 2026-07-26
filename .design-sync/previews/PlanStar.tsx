import { PlanStar } from "paxtools";
import { COLOR, noop } from "./_fixtures";

export const Estados = () => (
  <div className="flex items-center gap-6">
    <PlanStar planned onToggle={noop} color={COLOR} label="No plano" />
    <PlanStar planned={false} onToggle={noop} color={COLOR} label="Fora do plano" />
  </div>
);

/** The star inherits the eixo colour so it reads inside a coloured bloco. */
export const CoresDosEixos = () => (
  <div className="flex items-center gap-6">
    <PlanStar planned onToggle={noop} color="#E91E63" label="Habilidades" />
    <PlanStar planned onToggle={noop} color="#2E7D32" label="Serviço" />
    <PlanStar planned onToggle={noop} color="#1565C0" label="Natureza" />
    <PlanStar planned onToggle={noop} color="#F9A825" label="Cultura" />
  </div>
);
