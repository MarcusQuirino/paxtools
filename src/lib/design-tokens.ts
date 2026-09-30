/**
 * Design A tokens (calm neo-brutalism) — the non-eixo palette. Eixo colours
 * live in src/data/eixo-colors.ts (re-exported here for convenience).
 *
 * Use these for inline `style` values and for the few places Tailwind can't
 * express a dynamic colour; prefer the Tailwind arbitrary classes in the
 * primitives (`border-[#141414]` etc.) for static styling.
 */

export const CREAM = "#FAF7EF";
export const PAPER = "#FFFFFF";
export const INK = "#141414";
export const INK_2 = "#4A4A44";
export const INK_3 = "#8A887F";
/** 1.5px inner dividers between rows. Never ink. */
export const LINE_SOFT = "#D9D5C9";
/** Empty track behind progress bars / rings and the segmented-control well. */
export const SAND = "#EEE9DC";
/** Default list-header tint when there is no eixo. */
export const TINT_DEFAULT = "#F4F1E8";

export const EMERALD = "#0E6B4E";
export const EMERALD_INK = "#08452F";
export const EMERALD_TINT = "#DDF3E8";
export const AMBER = "#F5B300";
export const AMBER_TINT = "#FFF3C4";
export const AMBER_INK = "#6B4A00";
export const GOLD = "#F4C430";
/** Rejeitado. */
export const RED = "#C62828";
export const RED_TINT = "#FCE4E4";

export const SHADOW_1 = "2px 2px 0 #141414";
export const SHADOW_2 = "4px 4px 0 #141414";

/** Striped amber fill for the "aguardando" share of a progress bar. */
export const PENDING_STRIPES =
  "repeating-linear-gradient(45deg,#F5B300 0 4px,#fff 4px 8px)";

export {
  EIXO_COLORS,
  EIXO_COLOR_BY_ID,
  eixoColor,
  eixoMeta,
  eixoTint,
  type EixoColor,
  type EixoId,
} from "@/data/eixo-colors";
