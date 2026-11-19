import { describe, expect, test } from "bun:test";
import {
  LIMITS,
  parseLsTree,
  renderEvidenceIndex,
  renderEvidenceLinks,
  selectEvidence,
} from "./verification-evidence";

describe("parseLsTree", () => {
  test("reads blobs with sizes, ignores trees and junk", () => {
    const out = [
      "100644 blob 1111111111111111111111111111111111111111    1234\tpr-7/log.md",
      "100644 blob 2222222222222222222222222222222222222222  500000\tpr-7/01-home.png",
      "040000 tree 3333333333333333333333333333333333333333       -\tpr-7/sub",
      "",
    ].join("\n");
    expect(parseLsTree(out)).toEqual([
      { path: "pr-7/log.md", size: 1234 },
      { path: "pr-7/01-home.png", size: 500000 },
    ]);
  });
});

describe("selectEvidence", () => {
  test("log first, then text, then images by name; skips oversize and unknown types", () => {
    const sel = selectEvidence([
      { path: "pr-7/02-b.png", size: 10 },
      { path: "pr-7/01-a.png", size: 10 },
      { path: "pr-7/notes.txt", size: 10 },
      { path: "pr-7/log.md", size: 10 },
      { path: "pr-7/huge.png", size: LIMITS.maxImageBytes + 1 },
      { path: "pr-7/run.webm", size: 10 },
    ]);
    expect(sel.take.map((e) => e.path)).toEqual(["pr-7/log.md", "pr-7/notes.txt", "pr-7/01-a.png", "pr-7/02-b.png"]);
    expect(sel.skipped.map((s) => s.path)).toEqual(["pr-7/huge.png", "pr-7/run.webm"]);
  });

  test("caps the image count", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ path: `pr-1/${i}.png`, size: 1 }));
    const sel = selectEvidence(many, { ...LIMITS, maxImages: 3 });
    expect(sel.take).toHaveLength(3);
    expect(sel.skipped).toHaveLength(2);
  });
});

describe("renderEvidenceIndex", () => {
  test("says none found when there is nothing", () => {
    expect(renderEvidenceIndex({ pr: "9", commit: null, selection: null })).toContain("**None found**");
  });
  test("lists files relative to the PR dir", () => {
    const md = renderEvidenceIndex({
      pr: "9",
      commit: "abc",
      selection: { take: [{ path: "pr-9/log.md", size: 5 }], skipped: [{ path: "pr-9/x.webm", reason: "nope" }] },
    });
    expect(md).toContain("`log.md` (5 bytes)");
    expect(md).toContain("`pr-9/x.webm` — nope");
  });
});

describe("renderEvidenceLinks", () => {
  test("pins image URLs to the evidence commit", () => {
    const md = renderEvidenceLinks({ repo: "o/r", commit: "0123456789", pr: 5, files: ["log.md", "02-b.png", "01-a.png"] });
    expect(md).toContain("https://raw.githubusercontent.com/o/r/0123456789/pr-5/01-a.png");
    expect(md.indexOf("01-a.png")).toBeLessThan(md.indexOf("02-b.png"));
    expect(md).toContain("/blob/0123456789/pr-5/log.md");
  });
});
