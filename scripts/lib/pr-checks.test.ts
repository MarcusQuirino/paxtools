import { describe, expect, test } from "bun:test";
import { evaluate, type ReviewRun, reviewState } from "./pr-checks";

const draftFail: ReviewRun = {
  started_at: "2026-11-19T17:57:00Z",
  status: "completed",
  conclusion: "failure",
  // review.yml's fail-closed step retitles the draft refusal (PR #158).
  output: { title: "Review job failed", summary: "The review job ended without a verdict." },
};
const g = (createdAt: string, status = "completed") => ({ createdAt, status });

describe("reviewState", () => {
  test("PR #158 race: polled right after `gh pr ready`, before the new Guardrails run exists", () => {
    const readyAt = "2026-11-19T19:36:33Z";
    const drafted = [g("2026-11-19T19:26:55Z")]; // only the draft-era run is listed yet
    const stale: ReviewRun = { ...draftFail, started_at: "2026-11-19T19:27:43Z" };
    expect(reviewState([stale], drafted, false, readyAt).state).toBe("pending");
    expect(reviewState([stale], [...drafted, g("2026-11-19T19:36:36Z", "in_progress")], false, readyAt).state).toBe("pending");
    const fresh: ReviewRun = { started_at: "2026-11-19T19:38:10Z", status: "completed", conclusion: "success" };
    expect(reviewState([stale, fresh], [...drafted, g("2026-11-19T19:36:36Z")], false, readyAt).state).toBe("pass");
  });

  test("after `gh pr ready`, the draft's stale failure is not the answer", () => {
    // Guardrails re-ran at 18:07 (ready_for_review); review not started yet.
    expect(reviewState([draftFail], [g("2026-11-19T17:55:00Z"), g("2026-11-19T18:07:40Z")], false).state).toBe("pending");
    // Guardrails still running → pending even though a completed run exists.
    expect(reviewState([draftFail], [g("2026-11-19T18:07:40Z", "in_progress")], false).state).toBe("pending");
  });

  test("the fresh review decides", () => {
    const fresh: ReviewRun = { started_at: "2026-11-19T18:08:54Z", status: "completed", conclusion: "success", output: { title: "Pass" } };
    const gs = [g("2026-11-19T17:55:00Z"), g("2026-11-19T18:07:40Z")];
    expect(reviewState([draftFail, fresh], gs, false)).toMatchObject({ state: "pass" });
    const blocked = { ...fresh, conclusion: "failure", output: { title: "Blocked: 2 findings", summary: "…" } };
    expect(reviewState([draftFail, blocked], gs, false)).toMatchObject({ state: "fail" });
    expect(reviewState([{ ...fresh, status: "in_progress", conclusion: null }], gs, false).state).toBe("pending");
  });

  test("a review older than the latest Guardrails run is stale", () => {
    const old: ReviewRun = { started_at: "2026-11-19T17:57:00Z", status: "completed", conclusion: "success" };
    expect(reviewState([old], [g("2026-11-19T18:07:40Z")], false).state).toBe("pending");
  });

  test("draft PR and no Guardrails run", () => {
    expect(reviewState([], [], true).state).toBe("fail");
    expect(reviewState([], [], false).state).toBe("pending");
  });
});

describe("evaluate", () => {
  const pass = { name: "Independent review", state: "pass" as const, detail: "" };
  test("done only when nothing is pending; ok only when all pass", () => {
    const req = [
      { name: "Lint, Test, Build", bucket: "pass" },
      { name: "E2E (Playwright)", bucket: "pending" },
      { name: "Independent review", bucket: "fail" }, // stale rollup entry — replaced by reviewState
    ];
    expect(evaluate(req, pass)).toMatchObject({ done: false, ok: false });
    req[1]!.bucket = "pass";
    expect(evaluate(req, pass)).toMatchObject({ done: true, ok: true });
    req[1]!.bucket = "fail";
    expect(evaluate(req, pass)).toMatchObject({ done: true, ok: false });
    expect(evaluate([{ name: "x", bucket: "skipping" }], pass).ok).toBe(true);
  });
});
