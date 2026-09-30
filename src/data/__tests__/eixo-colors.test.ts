import { describe, expect, test } from "bun:test";
import { EIXO_COLORS, eixoColor, eixoMeta, eixoTint } from "../eixo-colors";
import { EIXOS_BY_RAMO } from "../progression-data";

/** Relative luminance per WCAG 2.x. */
function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

describe("eixo colours", () => {
  test("four eixos, hex colours", () => {
    expect(EIXO_COLORS.length).toBe(4);
    for (const e of EIXO_COLORS) {
      expect(e.color).toMatch(/^#[0-9A-F]{6}$/);
      expect(e.tint).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
  test("every eixo colour passes WCAG AA (4.5:1) with white text", () => {
    for (const e of EIXO_COLORS) {
      expect(contrast(e.color, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    }
  });
  test("every eixo colour passes AA as text on cream (crumbs, chip labels)", () => {
    for (const e of EIXO_COLORS) {
      expect(contrast(e.color, "#FAF7EF")).toBeGreaterThanOrEqual(4.5);
    }
  });
  test("tints are light: ink text on a tint passes AA; colour on tint is a UI-grade (3:1) contrast", () => {
    for (const e of EIXO_COLORS) {
      expect(contrast("#141414", e.tint)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(e.color, e.tint)).toBeGreaterThanOrEqual(3);
    }
  });
  test("progression data for every ramo uses the shared colours", () => {
    for (const eixos of Object.values(EIXOS_BY_RAMO)) {
      for (const eixo of eixos) {
        expect(eixo.color).toBe(eixoColor(eixo.id));
        expect(eixo.colorLight).toBe(eixoTint(eixo.id));
      }
    }
  });
  test("unknown id falls back to neutral, never an eixo colour", () => {
    const m = eixoMeta("nope");
    expect(m.color).toBe("#4A4A44");
    expect(EIXO_COLORS.some((e) => e.color === m.color)).toBe(false);
  });
});
