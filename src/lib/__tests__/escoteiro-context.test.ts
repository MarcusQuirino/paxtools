import { describe, it, expect } from "bun:test";
import { avatarInitials, formatEscoteiroContext } from "@/lib/escoteiro-context";

describe("formatEscoteiroContext", () => {
  it("joins the ramo label and the grupo identity", () => {
    expect(formatEscoteiroContext("escoteiro", "38", "RS")).toBe(
      "Ramo Escoteiro · 38/RS",
    );
    expect(formatEscoteiroContext("senior", "12", null)).toBe(
      "Ramo Sênior · 12",
    );
  });

  it("drops whichever half is unknown", () => {
    expect(formatEscoteiroContext("lobinho", null, "RS")).toBe("Ramo Lobinho");
    expect(formatEscoteiroContext(undefined, "38", "RS")).toBe("38/RS");
  });

  it("has nothing to show with neither", () => {
    expect(formatEscoteiroContext(null, null, null)).toBeNull();
    expect(formatEscoteiroContext(undefined, "  ", "RS")).toBeNull();
  });
});

describe("avatarInitials", () => {
  it("takes the first and last word of the name", () => {
    expect(avatarInitials("Rafael Andrade", null)).toBe("RA");
    expect(avatarInitials("  ana  maria da silva ", null)).toBe("AS");
  });

  it("uses a single initial for a one-word name", () => {
    expect(avatarInitials("Zeca", "z@x.com")).toBe("Z");
  });

  it("falls back to the email, then to a placeholder", () => {
    expect(avatarInitials("", "bruno@x.com")).toBe("B");
    expect(avatarInitials(null, null)).toBe("?");
  });
});
