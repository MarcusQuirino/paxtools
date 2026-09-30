/**
 * The single source of truth for eixo colours (Design A palette).
 *
 * One colour per eixo, used everywhere: progression data, especialidades,
 * plan, escotista surfaces. Every `color` passes WCAG AA with white text;
 * every `tint` is the matching light background for headers and pills.
 *
 * Lives under src/data (not src/lib) and uses no path alias because the
 * progression data files — which convex/testing.ts imports — depend on it.
 */

export type EixoId =
  | "habilidades-para-a-vida"
  | "meio-ambiente"
  | "paz-e-desenvolvimento"
  | "saude-e-bem-estar";

export type EixoColor = {
  id: EixoId;
  name: string;
  /** Solid colour: 8px side bars, progress rings/bars, chip dots, crumbs. */
  color: string;
  /** Light background: list headers, level boxes, chips. */
  tint: string;
};

export const EIXO_COLORS: readonly EixoColor[] = [
  {
    id: "habilidades-para-a-vida",
    name: "Habilidades para a Vida",
    color: "#C2185B",
    tint: "#FBE3EC",
  },
  { id: "meio-ambiente", name: "Meio Ambiente", color: "#2E7D32", tint: "#DFF2E0" },
  {
    id: "paz-e-desenvolvimento",
    name: "Paz e Desenvolvimento",
    color: "#1E3A8A",
    tint: "#E3E8F8",
  },
  {
    id: "saude-e-bem-estar",
    name: "Saúde e Bem-estar",
    color: "#C62828",
    tint: "#FCE4E4",
  },
];

export const EIXO_COLOR_BY_ID: Record<EixoId, EixoColor> = Object.fromEntries(
  EIXO_COLORS.map((e) => [e.id, e]),
) as Record<EixoId, EixoColor>;

/** Neutral fallback for an unknown eixo id (never an eixo's own colour). */
export const EIXO_FALLBACK: EixoColor = {
  id: "habilidades-para-a-vida",
  name: "",
  color: "#4A4A44",
  tint: "#F4F1E8",
};

/** Colour + tint + display name for an eixo id; neutral when unknown. */
export function eixoMeta(id: string): EixoColor {
  return EIXO_COLOR_BY_ID[id as EixoId] ?? { ...EIXO_FALLBACK, id: id as EixoId, name: id };
}

export function eixoColor(id: string): string {
  return eixoMeta(id).color;
}

export function eixoTint(id: string): string {
  return eixoMeta(id).tint;
}
