import { OverallProgress } from "paxtools";
import { eixo, eixoServico } from "./_fixtures";

const eixos = [eixo, eixoServico];

export const Inicio = () => (
  <OverallProgress
    eixos={eixos}
    completedBlockIds={new Set()}
    pendingBlockIds={new Set()}
  />
);

export const EmProgresso = () => (
  <OverallProgress
    eixos={eixos}
    completedBlockIds={new Set(["aprendizagem-continua"])}
    pendingBlockIds={new Set(["autonomia-lideranca"])}
  />
);

export const Completo = () => (
  <OverallProgress
    eixos={eixos}
    completedBlockIds={
      new Set(["aprendizagem-continua", "autonomia-lideranca", "cidadania"])
    }
    pendingBlockIds={new Set()}
  />
);
