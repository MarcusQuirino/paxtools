import type { CSSProperties } from "react";

/**
 * Hover/active tint for an interactive progression row (#54).
 *
 * Rows live inside a bloco that already carries its eixo's colour, so the
 * emphasis has to come from that colour rather than the theme's global green
 * `--accent`. The tint is a translucent overlay of the eixo colour — the
 * Material "state layer" model — so the row dividers and the faded pending
 * checkbox keep showing through, and hover→active reads as one ramp.
 *
 * A dynamic hex can't be a Tailwind `hover:` class, so the two levels ship as
 * CSS custom properties on the row and the classes read them back.
 */
const HOVER_ALPHA = "1F"; // 12%
const ACTIVE_ALPHA = "38"; // 22%

/** Both alpha steps of `color`, as hex. Exported for tests. */
export function rowTintColors(color: string) {
  return { hover: `${color}${HOVER_ALPHA}`, active: `${color}${ACTIVE_ALPHA}` };
}

export type RowTint = { className: string; style: CSSProperties };

/**
 * Tint for a row of the given eixo/IRR colour. Pass `interactive: false` for
 * locked or disabled rows — they get no tint at all, since nothing happens on
 * click. Rows with no colour of their own fall back to the theme accent.
 * Spread `style` onto the row and append `className` to its classes.
 */
export function rowTint(color: string | undefined, interactive = true): RowTint {
  if (!interactive) return { className: "", style: {} };
  if (!color) {
    return { className: "hover:bg-accent/40 active:bg-accent/70", style: {} };
  }
  const { hover, active } = rowTintColors(color);
  return {
    className:
      "hover:bg-[var(--row-tint-hover)] active:bg-[var(--row-tint-active)]",
    style: {
      "--row-tint-hover": hover,
      "--row-tint-active": active,
    } as CSSProperties,
  };
}
