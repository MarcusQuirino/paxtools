---
name: verify
description: Prove a paxtools change works on the running app before calling it done — map the diff to features, drive the PR preview as test personas, capture screenshots + a pass/fail log, publish it to the PR's Verification section. Use before marking any user-facing PR ready, when the Independent review blocks on verification, or when asked to verify/QA/screenshot a change.
---

Follow [`docs/agents/verify.md`](../../../docs/agents/verify.md) step by step — it is the procedure; this skill only points at it.

Start with `bun scripts/verify.ts affected`. Done = `bun scripts/verify.ts publish` succeeded and the PR body's `## Verification` section holds its output, for the PR's current head commit.
