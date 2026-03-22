export const STAGES = [
  { id: "pista", name: "Pista", image: "/pista.png", blocksRequired: 0, blocksToNext: 4 },
  { id: "trilha", name: "Trilha", image: "/trilha.png", blocksRequired: 4, blocksToNext: 4 },
  { id: "rumo", name: "Rumo", image: "/rumo.png", blocksRequired: 8, blocksToNext: 5 },
  { id: "travessia", name: "Travessia", image: "/travessia.png", blocksRequired: 13, blocksToNext: 5 },
] as const;

export type Stage = (typeof STAGES)[number];

export const LIS_DE_OURO_BLOCKS = 18;

export const LIS_DE_OURO_ITEMS = [
  {
    id: "lis_promessa",
    text: "Realizou ou Renovou sua Promessa Escoteira",
    auto: false,
  },
  {
    id: "lis_blocos",
    text: "Concluiu todos os 18 Blocos de Aprendizagem",
    auto: true,
  },
  {
    id: "lis_jornada",
    text: "Vivenciou a Jornada de Travessia",
    auto: false,
  },
  {
    id: "lis_autoavaliacao",
    text: "Realizou a autoavaliação",
    auto: false,
  },
  {
    id: "lis_corte_honra",
    text: "Ser avaliado positivamente pela Corte de Honra e pelos Escotistas",
    auto: false,
  },
] as const;

export type LisDeOuroItem = (typeof LIS_DE_OURO_ITEMS)[number];

export const LIS_DE_OURO_COLOR = "#2E7D32";
export const LIS_DE_OURO_COLOR_LIGHT = "#E8F5E9";
