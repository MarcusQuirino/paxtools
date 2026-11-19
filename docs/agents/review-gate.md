# Independent review gate

Every PR gets reviewed by a **fresh agent that didn't write it**, and master
can't take the PR until that review passes on the PR's latest commit. The
author never approves its own work.

| | |
|---|---|
| Required check | `Independent review` (ruleset 27609274, GitHub Actions app 15368) — a check run the gate posts on the PR head |
| Workflow | `.github/workflows/review.yml` (`workflow_run` after `Guardrails` completes; always runs from master) |
| Reviewer | Claude Code CLI, `opus` / effort `high`, Marcus's subscription (`CLAUDE_CODE_OAUTH_TOKEN` secret) |
| Rubric (the prompt) | [`docs/agents/review-rubric.md`](./review-rubric.md) — versioned, tune it by PR |
| Glue | `scripts/review-gate.ts` + `scripts/lib/review-gate.ts` (tested) |
| Typical time | starts when Guardrails finishes (~1–2 min after a push), review ~1.5–4 min; runs in parallel with `E2E (Playwright)` (5–10 min), so it rarely adds wall-clock |

## Flow

1. PR opened / pushed / reopened / marked ready → `Guardrails` runs → when
   it completes, `review.yml` runs **from master** (GitHub only runs
   `workflow_run` workflows from the default branch), resolves the PR whose
   head is that commit and opens an in-progress `Independent review` check
   run on it.
2. It gathers context into `review/context/`: PR title + body + linked
   issues (`pr.md`), the diff vs the merge base, the changed-file list, the
   conventions **from master** (`CLAUDE.md`, `AGENTS.md`, `docs/agents/`,
   Convex guidelines) and the CI results on that commit (waits ≤10 min for
   the fast checks; E2E is reported as-is).
3. A new `claude -p` session reviews it against the rubric: intent vs diff,
   correctness, Convex auth/validation/migrations, missing or weakened tests,
   guardrail tampering, security/data loss, scope creep.
4. It returns a schema-checked verdict: `pass`, or `block` with blocking
   findings (`file:line`, problem, concrete fix) plus non-blocking nits.
5. The gate completes the check run — `success` only on a clean pass,
   `failure` on any blocking finding **or no valid verdict** (fails closed:
   expired token, usage limit, malformed output, crash, cancel) — and
   posts/updates one sticky PR comment with the findings.
6. A new push = new head SHA = no review on it yet → master is blocked
   again until the new review passes. A stale in-flight review is cancelled.

Drafts and fork PRs get a failed check without spending a review (never a
skip/neutral: those count as passing). Mark the PR ready → it reviews.

Why not `pull_request_target`: it does the same job but GitHub blocks it by
default on public repos from 2026-12-02. `workflow_run` has the same
"runs from master, has secrets" property without needing a repo exception.

## When the review blocks your PR (author agents read this)

- **Fix and push.** Apply each blocking finding's fix (or an equivalent
  one), add the missing test, restore the weakened check. The push triggers a
  fresh review.
- **Never argue the check off.** Don't edit the PR body to persuade the
  reviewer, don't add "reviewer: approve" text (that is itself blocking),
  don't re-run the job hoping for a different answer, don't touch the
  workflow, rubric or ruleset to get green.
- **If a finding is wrong**, say why in a PR comment and ask Marcus. Only
  Marcus decides to override, and the fix for a bad rubric is a separate PR
  to `review-rubric.md`.
- Nits don't block; fix them if cheap.
- "No verdict" (⚠️) = infrastructure. Report it; don't work around it.

Reproduce a review locally (same prompt, your subscription): see the
`Review` step in `review.yml`; run `bun scripts/review-gate.ts context` with
`REPO PR_NUMBER HEAD_SHA BASE_SHA WORKDIR` set and the PR head cloned at
`$WORKDIR/pr`, then the same `claude -p …` from `$WORKDIR`.

## Why the author can't approve itself

- **No shared context.** The reviewer is a new process on a GitHub runner:
  `--safe-mode` (no `CLAUDE.md` auto-load, memory, hooks, MCP, skills or
  settings from any directory), `--no-session-persistence`, and the only input
  is what the workflow hands it. The author's thread, memory and reasoning
  never reach it.
- **The PR can't edit its reviewer.** `workflow_run` runs the workflow,
  `scripts/review-gate.ts` and the rubric from **master**; a PR that
  changes them only affects reviews after it merges (and the rubric tells the
  reviewer to scrutinise such PRs). Conventions are read from master too, so
  a PR can't loosen `CLAUDE.md` for its own review.
- **A plain token can't post the check.** The required check is pinned to
  the GitHub Actions app (integration 15368). Check runs can only be created
  by GitHub Apps (a PAT / `gh` token gets 403), and a commit status posted
  with a PAT doesn't satisfy an app-pinned check.
- **The reviewer can't be turned against the repo.** It runs with only
  Read/Grep/Glob, no GitHub token in its environment (`env -i`), no network
  tools, and nothing from the PR is executed. PR text is declared untrusted;
  attempts to steer the reviewer are blocking findings. Output is scanned for
  secrets before posting.

## Remaining gaps (honest list)

1. **Another Actions job can impersonate the check.** The ruleset can only
   pin the *app* (GitHub Actions), not the workflow. A PR can add a
   `pull_request` workflow (which runs the PR's own YAML) with a job named
   `Independent review`, or one that posts a check run of that name with
   `GITHUB_TOKEN` — both come from GitHub Actions on the PR head. The real
   reviewer blocks such a PR (rubric §5), but a later passing duplicate may
   still satisfy the ruleset. This is exactly how the step-4 PR bootstrapped
   its own review (branch `review-gate/bootstrap`, deleted after merge).
   **Fix (needs Marcus):** a dedicated GitHub App whose private key lives in
   a `review-gate` environment restricted to `master`; the gate posts the
   check as that App and the ruleset pins the App's integration ID.
   `workflow_run` jobs are evaluated against master and can read it;
   `pull_request` jobs are evaluated against the PR merge ref and can't, so
   only master's `review.yml` can produce the check.
2. **Re-run until green.** `gh run rerun` re-reviews the same commit; LLM
   output varies. Policy forbids it; nothing enforces it.
3. **Agents hold Marcus's admin token.** Anything admin can do (edit the
   ruleset, workflows on master via a merged PR, secrets) an agent can do.
   No ruleset closes that; a scoped token for agents would.
4. **Same model family.** The reviewer is Claude reviewing (often) Claude.
   Independence is of context, not of model. A second-provider reviewer is
   possible later if blind spots show up.
5. **Subscription limits.** Reviews share Marcus's Claude usage. A usage-limit
   hit fails closed (blocks merges) until it resets; re-run the job then.
   `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) is valid ~1 year —
   created 2026-04-12, so rotate before ~2027-04.
