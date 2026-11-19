---
name: verify
description: Prove a paxtools change works on the running app before calling it done — map the diff to features, drive the PR preview as test personas, capture screenshots + a pass/fail log, publish it to the PR's Verification section. Use before marking any user-facing PR ready, when the Independent review blocks on verification, or when asked to verify/QA/screenshot a change.
---

Follow [`docs/agents/verify.md`](../../../docs/agents/verify.md) step by step — it is the procedure; this skill only points at it.

Invoked before a commit (e.g. a harness rule "run /verify before commit")? The running-app proof needs a pushed PR preview, so it can't happen yet. Do the pre-push part now: `bun scripts/verify.ts affected` (scope), `bun run test`, `bun run lint`, `bun run test:e2e` for UI/backend changes, a changeset — then commit, push, open the PR as a draft, and do the rest of `verify.md` on the preview before `gh pr ready`. Docs/CI/test/agent-config-only diffs: nothing to verify; say `Exempt — <why>` in the PR.

Start with `bun scripts/verify.ts affected`. Done = `bun scripts/verify.ts publish` succeeded and the PR body's `## Verification` section holds its output, for the PR's current head commit.
