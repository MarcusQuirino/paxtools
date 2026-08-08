import { describe, it, expect } from "bun:test";
import { formatGroupIdentity } from "@/lib/group-identity";

describe("formatGroupIdentity", () => {
  it("joins the numeral and the região", () => {
    expect(formatGroupIdentity("38", "RS")).toBe("38/RS");
  });

  it("falls back to the numeral alone, with no stray slash", () => {
    expect(formatGroupIdentity("38", null)).toBe("38");
    expect(formatGroupIdentity("38", undefined)).toBe("38");
    expect(formatGroupIdentity("38", "  ")).toBe("38");
  });

  it("has nothing to show without a numeral", () => {
    expect(formatGroupIdentity(null, "RS")).toBeNull();
    expect(formatGroupIdentity("", "RS")).toBeNull();
  });
});
