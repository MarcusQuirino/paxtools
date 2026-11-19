# AGENTS.md

**Read [`CLAUDE.md`](./CLAUDE.md) before doing anything — it is the single
source of truth for every coding agent in this repo, not just Claude.** This
file only points at it so the rules can't drift apart; edit `CLAUDE.md`, not
this file.

The rules agents most often break (all detailed in `CLAUDE.md`):

- Never deploy to prod. Never commit to `master` — branch, then PR via `gh`.
  `master` is protected: PR + passing `Lint, Test, Build`, `E2E (Playwright)`,
  `Changeset`, `Migration registry append-only`, `Convex codegen in sync`,
  `Coverage floor (convex/)` and `Independent review` required. What each
  enforces and how to fix it: `docs/agents/ci-checks.md`.
- `Independent review` is a fresh agent reviewing your PR against its
  description (`docs/agents/review-gate.md`). Write a PR body that states the
  intent. On blocking findings: **fix and push** — never argue the check off,
  re-run it, or edit the PR text/workflow/rubric to get green. If a finding
  is wrong, say why in the PR and ask Marcus.
- **Prove user-facing changes on the running app** before calling them
  done: `docs/agents/verify.md` (skill `verify`) — feature map → PR preview
  as test personas → screenshots + log published to the PR's
  `## Verification` section. The review blocks without it.
- New worktree: `bun run setup` (deps + `.env.local` + browser). Before
  committing: `bun run test` and `bun run lint` (lint includes type checking)
  pass, and a changeset is added in `.changeset/` (`bunx changeset --empty`
  if nothing user-facing).
- PR order: push → `gh pr create --draft` → `bun scripts/pr-checks.ts wait
  --no-review` → verify + `verify.ts publish` into the body → `gh pr ready` →
  `bun scripts/pr-checks.ts wait`. Running-app verification happens after the
  push (it needs the preview), never as a pre-commit step.
- Convex work: read `convex/_generated/ai/guidelines.md` first. Migrations are
  append-only (CI-enforced). Commit regenerated `convex/_generated`. Keep
  convex/ coverage at or above the floor — add tests, never lower it.
- Never put secrets or real passwords in the repo. `TEST_AUTH` /
  `TEST_AUTH_PASSWORD` must never be set on the prod Convex deployment.

The "Workflows & subagents — model routing" section of `CLAUDE.md` names
Claude models; map its tiers to your own equivalents.
