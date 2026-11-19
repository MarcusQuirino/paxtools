# CI checks — what blocks a merge and how to satisfy it

`master` is protected by ruleset 27609274: a PR merges only when **every
required check below is green**. There is no bypass. Each check runs locally
with the same command, so run it before pushing.

| Required check | Workflow | Local command | Fails when |
|---|---|---|---|
| `Lint, Test, Build` | `ci.yml` | `bun run lint && bun run test && bun run build` | lint/type error, failing unit test, broken build, a route/Convex module missing from the feature map |
| `E2E (Playwright)` | `e2e.yml` | `bun run test:e2e` | any e2e spec fails — `docs/agents/e2e.md` |
| `Changeset` | `guardrails.yml` | `bun run check:changeset` | shipped code changed without a changeset |
| `Migration registry append-only` | `guardrails.yml` | `bun run check:migrations` | `REGISTRY` entries removed/reordered/renamed, or a registered migration's body edited |
| `Convex codegen in sync` | `guardrails.yml` | `bun run check:codegen` | `convex/_generated` differs from what codegen produces |
| `Coverage floor (convex/)` | `guardrails.yml` | `bun run test:coverage` | convex/ line or function coverage below the floor, or a convex/ module no test loads |
| `Independent review` | `review.yml` | see `docs/agents/review-gate.md` | a fresh reviewer agent finds blocking issues (intent not delivered, bug, missing auth/test, weakened check, security/data-loss risk), or produced no verdict |

`bun run lint` is oxlint with type-aware rules **and full TypeScript type
checking** (`.oxlintrc.json` `options.typeCheck`, via tsgolint) over every
`.ts/.tsx` in the repo — a type error fails it, so there is no separate
`typecheck` script. `bun run build` additionally catches bundling/SSR errors.

## Waiting for CI

```bash
bun scripts/pr-checks.ts wait               # every required check on the current head, incl. a fresh review
bun scripts/pr-checks.ts wait --no-review   # draft: just CI/E2E (before driving the preview)
```

Foreground, polls every 20 s, follows the head if you push again; exit 0 =
all green, 1 = something failed (links printed). Prefer it to
`gh pr checks --watch`: marking a draft ready re-runs Guardrails on the
*same* commit and the review starts only after that (~1–2 min), so until
then the head still shows the draft's "Not reviewed" failure and `--watch`
returns at once on that stale result. The script only counts a review that
started after the head's latest Guardrails run.

The local `check:changeset` / `check:migrations` compare your **committed**
HEAD against `origin/master` (`git fetch` first; `BASE_REF=` overrides).
Every failure prints a "How to fix" block — read it before changing anything.

`Independent review` is the only judgment-based check: flow, how to respond
to blocking findings, and the threat model are in `docs/agents/review-gate.md`;
the reviewer's prompt is `docs/agents/review-rubric.md`.

Never make a check pass by weakening it (lowering the floor, adding to an
exemption list without a reason, editing the checker). If a check is wrong,
say so in the PR and ask Marcus.

## Feature map (inside `Lint, Test, Build`)

`scripts/lib/feature-map.test.ts` fails when a file in `src/routes/` or a
top-level `convex/*.ts` module belongs to no feature in
[`feature-map.yaml`](./feature-map.yaml), or when the map names a file,
spec, persona or feature id that doesn't exist. Fix: add the file to the
feature it belongs to (or a new feature with routes, personas, specs and a
`check` recipe); purely internal modules go in `infra.none`. It is a hard
failure, not a warning: a stale map silently sends the next agent's
verification to the wrong screens, and the fix is one YAML entry. It runs in
`bun test`, so no new required check was needed.

## Changeset

Shipped code = `src/`, `convex/`, `public/`, `styles/`, root build/config
files (`package.json`, `bun.lock`, `vite.config.ts`, …) and the build
scripts — minus `*.test.ts(x)` / `*.testkit.ts`. The exact list is
`SHIPPED` in `scripts/lib/changeset-rules.ts`.

- Changed shipped code → add `.changeset/<kebab-name>.md`:
  ```md
  ---
  "paxtools": patch
  ---

  What changed, for CHANGELOG.md.
  ```
  `patch` fix/chore, `minor` feature, `major` breaking.
- Nothing worth announcing (refactor, build tweak) → **empty changeset**:
  `bunx changeset --empty` (frontmatter with no packages; `changeset version`
  consumes it without a bump). Say why in the PR body.
- Docs / CI / tests / agent-config-only PRs pass without one.
- Release PRs (`bun run version`: changesets deleted + `CHANGELOG.md`
  updated) pass automatically.
- Every added changeset is validated (frontmatter, package name, bump type,
  non-empty description) even when one isn't required.

## Migration registry append-only

`convex/migrations.ts` `REGISTRY` is history: `@convex-dev/migrations`
tracks by name what ran on each deployment and runs pending ones in order.
Versus the merge base the check requires:

- every base entry still present, **same position** (appending at the end is
  the only allowed change);
- entries stay plain `internal.migrations.<name>` references;
- the `migrations.define(...)` body of every base entry is unchanged
  (comments/whitespace may change, code may not).

To change behaviour, define a new migration and append it. Helpers in
`convex/lib/` called by a migration aren't diffed, but the same rule
applies. Pruning old entries is Marcus's call.

## Convex codegen in sync

CI regenerates `convex/_generated` with a throwaway **anonymous local Convex
backend** (`CONVEX_AGENT_MODE=anonymous convex dev --once`; no account, no
secrets, nothing cloud touched — `convex codegen` refuses deploy keys, so the
per-PR preview key can't be used) and fails on any diff or new file
(`convex/_generated/ai/` is excluded). Locally `bun run check:codegen` runs
`bunx convex codegen` against your `.env.local` dev deployment.

Fix: run `bunx convex codegen` (or keep `bunx convex dev` running while you
edit `convex/`) and commit `convex/_generated/`. Never hand-edit it.

## Coverage floor (convex/)

`bun run test:coverage` runs the same tests as `bun run test` with bun's
coverage, then `scripts/check-coverage.ts` sums lcov over convex/ sources
(no tests, testkits, `_generated`). Floors live in `FLOOR` in
`scripts/lib/coverage-floor.ts`, set just under the measured value
(2026-11-19: lines 96.24%, functions 97.38% → floors 96 / 97).

bun only reports files a test imports, so an untested new module would be
invisible to the percentage. The check therefore also fails for any
convex/ source no test loads, unless it's in `NOT_UNIT_TESTED` (pure wiring:
`ai.ts`, `auth.config.ts`, `convex.config.ts`, `http.ts`, `migrations.ts`).
When one of those gains a test, the check tells you to drop it from the list.

**Raising the floor (ratchet):** when a PR raises coverage, set `FLOOR` to
just under the new numbers (round down to the nearest 0.25) in the same PR,
and update the measured values in the comments. The check prints a reminder
when coverage is >1 point above the floor. Never lower it.

## Adding or renaming a check

Required check names are exact strings in the ruleset. Renaming a job's
`name:` without updating ruleset 27609274 leaves master unmergeable (the old
name never reports). Add the new name first, then remove the old one —
Marcus owns the ruleset.
