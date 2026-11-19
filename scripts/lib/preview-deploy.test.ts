import { describe, expect, test } from "bun:test";
import {
  assertPreviewTarget,
  isPreviewDeployKey,
  siteUrlFor,
} from "./preview-deploy";

const PREVIEW_KEY = "preview:team:project|abc";

describe("preview deploy guards", () => {
  test("only `preview:` keys count as preview keys", () => {
    expect(isPreviewDeployKey(PREVIEW_KEY)).toBe(true);
    expect(isPreviewDeployKey("prod:flexible-tiger-306|abc")).toBe(false);
    expect(isPreviewDeployKey("prod:elated-goat-471|abc")).toBe(false);
    expect(isPreviewDeployKey("")).toBe(false);
    expect(isPreviewDeployKey(undefined)).toBe(false);
  });

  test("refuses non-preview keys (staging/prod) outright", () => {
    expect(() =>
      assertPreviewTarget("prod:flexible-tiger-306|abc", "feat/x"),
    ).toThrow(/REFUSING/);
    expect(() => assertPreviewTarget(undefined, "feat/x")).toThrow(/REFUSING/);
  });

  test("refuses protected branches and empty names", () => {
    for (const name of ["master", "main", "production"]) {
      expect(() => assertPreviewTarget(PREVIEW_KEY, name)).toThrow(/REFUSING/);
    }
    expect(() => assertPreviewTarget(PREVIEW_KEY, "")).toThrow();
  });

  test("accepts a preview key + PR branch", () => {
    expect(() => assertPreviewTarget(PREVIEW_KEY, "feat/x")).not.toThrow();
  });

  test("derives the .convex.site URL", () => {
    expect(siteUrlFor("https://happy-otter-123.convex.cloud")).toBe(
      "https://happy-otter-123.convex.site",
    );
    expect(() => siteUrlFor("https://example.com")).toThrow();
  });
});
