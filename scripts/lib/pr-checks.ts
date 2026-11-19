/**
 * Pure logic for `bun scripts/pr-checks.ts wait`: decide whether a PR head's
 * required checks are finished — counting only an `Independent review` that
 * belongs to the latest Guardrails run on that head.
 *
 * Why not `gh pr checks --watch`: marking a draft ready re-runs Guardrails on
 * the SAME commit, and the review only starts when that finishes (~1–2 min).
 * Until then the head still carries the draft's failed review, so `--watch`
 * sees every check completed and returns early on a stale result.
 *
 * The anchor is the PR's last `ready_for_review` timeline event: GitHub
 * creates the new Guardrails run a few seconds AFTER it, so "latest
 * Guardrails run" alone races (seen on PR #158). And the draft refusal can't
 * be recognised by its text — review.yml's fail-closed step retitles it
 * "Review job failed".
 */

export const REVIEW_CHECK = "Independent review";

/** One entry of `gh pr checks --required --json name,bucket,link`. */
export type RequiredCheck = { name: string; bucket: string; link?: string };

/** One check run from `repos/{repo}/commits/{sha}/check-runs?check_name=Independent review`. */
export type ReviewRun = {
  started_at: string;
  status: string;
  conclusion: string | null;
  html_url?: string;
  output?: { title?: string | null; summary?: string | null };
};

/** One entry of `gh run list --workflow guardrails.yml --commit <sha> --json createdAt,status`. */
export type GuardrailsRun = { createdAt: string; status: string };

export type CheckState = { name: string; state: "pass" | "fail" | "pending"; detail: string };

export type Evaluation = { done: boolean; ok: boolean; checks: CheckState[] };

/**
 * The review state for the head: the newest review run started after the
 * newest Guardrails run was created (the review is triggered by Guardrails
 * completing) — and, when the PR was ever marked ready, only Guardrails runs
 * created after the last `ready_for_review` count (earlier ones fed reviews
 * that refused the draft).
 */
export function reviewState(
  reviews: ReviewRun[],
  guardrails: GuardrailsRun[],
  isDraft: boolean,
  readyAt?: string | null,
): CheckState {
  const name = REVIEW_CHECK;
  if (isDraft) return { name, state: "fail", detail: "PR is a draft — the review refuses drafts; `gh pr ready` first" };
  const latestG = guardrails
    .filter((g) => !readyAt || g.createdAt >= readyAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!latestG) return { name, state: "pending", detail: "no Guardrails run on this head since it was marked ready yet" };
  if (latestG.status !== "completed") return { name, state: "pending", detail: "Guardrails still running; review starts after it" };
  const fresh = reviews
    .filter((r) => r.started_at >= latestG.createdAt)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))[0];
  if (!fresh) return { name, state: "pending", detail: "waiting for the review to start" };
  if (fresh.status !== "completed") return { name, state: "pending", detail: `in progress ${fresh.html_url ?? ""}`.trim() };
  const title = fresh.output?.title ? ` (${fresh.output.title})` : "";
  return {
    name,
    state: fresh.conclusion === "success" ? "pass" : "fail",
    detail: `${fresh.conclusion}${title} ${fresh.html_url ?? ""}`.trim(),
  };
}

/** Combine the required checks (minus the review, judged by reviewState) into one verdict. */
export function evaluate(required: RequiredCheck[], review: CheckState): Evaluation {
  const checks: CheckState[] = required
    .filter((c) => c.name !== REVIEW_CHECK)
    .map((c) => ({
      name: c.name,
      state: c.bucket === "pass" || c.bucket === "skipping" ? "pass" : c.bucket === "pending" ? "pending" : "fail",
      detail: `${c.bucket} ${c.link ?? ""}`.trim(),
    }));
  checks.push(review);
  const done = checks.every((c) => c.state !== "pending");
  return { done, ok: done && checks.every((c) => c.state === "pass"), checks };
}
