# AGENTS.md

**Read [`CLAUDE.md`](./CLAUDE.md) before doing anything — it is the single
source of truth for every coding agent in this repo, not just Claude.** This
file only points at it so the rules can't drift apart; edit `CLAUDE.md`, not
this file.

The rules agents most often break (all detailed in `CLAUDE.md`):

- Never deploy to prod. Never commit to `master` — branch, then PR via `gh`.
  `master` is protected: PR + passing `Lint, Test, Build` required.
- Before committing: `bun test` and `bun run lint` pass, and a changeset is
  added in `.changeset/`.
- Convex work: read `convex/_generated/ai/guidelines.md` first. Migrations are
  append-only.
- Never put secrets or real passwords in the repo. `TEST_AUTH` /
  `TEST_AUTH_PASSWORD` must never be set on the prod Convex deployment.

The "Workflows & subagents — model routing" section of `CLAUDE.md` names
Claude models; map its tiers to your own equivalents.
