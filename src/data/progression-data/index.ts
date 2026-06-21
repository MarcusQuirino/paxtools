import type { Eixo } from "../types";
import { EIXOS_ESCOTEIRO } from "./escoteiro";
import { EIXOS_LOBINHO } from "./lobinho";
import { EIXOS_SENIOR } from "./senior";
import { EIXOS_PIONEIRO } from "./pioneiro";

export { EIXOS_ESCOTEIRO, EIXOS_LOBINHO, EIXOS_SENIOR, EIXOS_PIONEIRO };

export type Ramo = "lobinho" | "escoteiro" | "senior" | "pioneiro";

export const EIXOS_BY_RAMO: Record<Ramo, Eixo[]> = {
  lobinho: EIXOS_LOBINHO,
  escoteiro: EIXOS_ESCOTEIRO,
  senior: EIXOS_SENIOR,
  pioneiro: EIXOS_PIONEIRO,
};

export function getEixosForRamo(ramo: Ramo | null | undefined): Eixo[] {
  if (!ramo) return EIXOS_ESCOTEIRO;
  return EIXOS_BY_RAMO[ramo];
}

export type ParsedActionId = {
  ramo: Ramo;
  blocoId: string;
  type: "fixed" | "variable";
  index: number;
};

export function parseActionId(actionId: string): ParsedActionId | null {
  const parts = actionId.split(":");
  if (parts.length !== 4) return null;
  const [ramo, blocoId, type, indexStr] = parts;
  if (ramo !== "lobinho" && ramo !== "escoteiro" && ramo !== "senior" && ramo !== "pioneiro") return null;
  if (type !== "fixed" && type !== "variable") return null;
  const index = Number(indexStr);
  if (!Number.isInteger(index) || index < 0) return null;
  return { ramo, blocoId: blocoId!, type, index };
}
