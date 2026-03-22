export const STAGES = [
  { id: "pista", name: "Pista", blocksRequired: 0, blocksToNext: 4 },
  { id: "trilha", name: "Trilha", blocksRequired: 4, blocksToNext: 4 },
  { id: "rumo", name: "Rumo", blocksRequired: 8, blocksToNext: 5 },
  { id: "travessia", name: "Travessia", blocksRequired: 13, blocksToNext: 5 },
] as const;

export type Stage = (typeof STAGES)[number];

export const LIS_DE_OURO_BLOCKS = 18;
