import { describe, it, expect } from "bun:test";
import { rowTint, rowTintColors } from "@/lib/row-tint";
import { EIXOS_SENIOR } from "@/data/progression-data/senior";

/** The tint ships as CSS custom properties, which aren't in React's CSSProperties. */
const vars = (style: object) => ({ ...style }) as Record<string, string>;

describe("rowTint", () => {
  it("derives both levels from the row's own colour", () => {
    const tint = rowTint("#E91E63");
    expect(vars(tint.style)).toEqual({
      "--row-tint-hover": "#E91E631F",
      "--row-tint-active": "#E91E6338",
    });
    expect(tint.className).toContain("hover:bg-[var(--row-tint-hover)]");
    expect(tint.className).toContain("active:bg-[var(--row-tint-active)]");
  });

  it("gives a locked row no tint at all", () => {
    expect(rowTint("#E91E63", false)).toEqual({ className: "", style: {} });
  });

  it("falls back to the theme accent when the row has no colour", () => {
    const tint = rowTint(undefined);
    expect(vars(tint.style)).toEqual({});
    expect(tint.className).toBe("hover:bg-accent/40 active:bg-accent/70");
  });

  it("never emits the global green accent for a coloured row (#54)", () => {
    for (const eixo of EIXOS_SENIOR) {
      const tint = rowTint(eixo.color);
      expect(tint.className).not.toContain("accent");
      expect(vars(tint.style)["--row-tint-hover"]).toBe(
        rowTintColors(eixo.color).hover,
      );
    }
  });

  it("keeps active stronger than hover", () => {
    const { hover, active } = rowTintColors("#1A237E");
    expect(parseInt(hover.slice(7), 16)).toBeLessThan(
      parseInt(active.slice(7), 16),
    );
  });
});
