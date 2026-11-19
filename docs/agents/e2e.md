# E2E (Playwright) — targets and the PR merge gate

The suite in `tests/e2e/` runs against one of three targets, picked by
`E2E_TARGET` (single seam: `tests/utils/target.ts`). Every run wipes and
reseeds the target's test data in global setup and again in teardown.

| Target | Command | Frontend | Backend | Used by |
|---|---|---|---|---|
| `local` (default) | `bun run test:e2e` | `bun dev` (spawned) | your dev deployment | you, while iterating |
| `preview` | `bun run e2e:deploy-preview` then `bun run test:e2e:preview` | production build on localhost | the PR's own Convex preview deployment | **the merge gate** (`.github/workflows/e2e.yml`) |
| `staging` | `bun run test:e2e:staging` | staging Vercel alias | staging | `gh workflow run e2e-staging.yml` (manual) |

## The merge gate

Every PR against `master` runs the `E2E (Playwright)` job, and it is a
**required status check** on `master` (ruleset 27609274), next to
`Lint, Test, Build` and the guardrail checks (`docs/agents/ci-checks.md`). A
red e2e run blocks the merge; there is no bypass.

What the job does (both steps are the package scripts above, nothing else):

1. `bun run e2e:deploy-preview` — pushes the branch's `convex/` to the Convex
   preview deployment named after the branch (`E2E_PREVIEW_NAME` =
   `github.head_ref`; the same deployment the PR's Vercel preview uses), then
   builds the frontend against it with the `node-server` Nitro preset
   (`.output/server/index.mjs`).
2. `bun run test:e2e:preview` — Playwright serves that build on
   `localhost:3000` and runs the whole suite: setup → readonly (desktop +
   mobile) → mutating (desktop + mobile). One retry per test; anything that
   needs the retry is reported as **flaky** in the summary — treat that as a
   bug to fix, not a pass to shrug at.

Because the backend is the branch's own deployment, a PR that changes
`convex/` is tested against its new functions and schema — not master's.

On failure, the run uploads `e2e-test-results` (screenshots, videos, and a
trace for every retried test) and `e2e-playwright-report`:

```bash
gh run download <run-id> -n e2e-test-results -D /tmp/e2e
bunx playwright show-trace /tmp/e2e/<test-dir>/trace.zip
```

Each failure's `error-context.md` holds the page's accessibility snapshot at
the moment of failure — usually enough to see what was on screen.

## Reproducing the gate locally

Fastest: `bun run test:e2e` (local target) catches almost everything.

The exact gate needs a Convex **preview deploy key** (Convex dashboard →
paxtools → Settings → Preview Deploy Keys; it can only reach preview
deployments — never staging or prod):

```bash
export CONVEX_DEPLOY_KEY='preview:...'   # never commit it
export E2E_PREVIEW_NAME="$(git branch --show-current)"
export TEST_AUTH_PASSWORD=...            # same value as staging's
bun run e2e:deploy-preview && bun run test:e2e:preview
```

Port 3000 taken (another worktree's dev server)? `export E2E_PORT=3217`.
To aim the preview target at an already-running frontend instead of a local
build (e.g. the PR's Vercel preview URL), set `E2E_BASE_URL`; no server is
spawned then.

## Writing specs that stay green

- Read-only specs assert exact seed data; mutating specs own personas by name
  (`tests/utils/personas.ts`) and restore what they change.
- Never wait on `networkidle` — Convex holds a websocket open. Wait on a URL or
  a visible string.
- The app can bounce through `/signin` on a cold, parallel load before the
  auth handshake settles, and a stalled handshake only recovers on a fresh
  navigation. Re-`goto` in a bounded loop (see `openPlan` in
  `tests/e2e/readonly/r3-plan.spec.ts`, `gotoSettings` in `r6-settings`).
- `click({ force: true })` skips the hit-target check; anything near the
  viewport bottom sits under the fixed bottom nav and the click lands there.
  Use `forceClickCentered` (`tests/utils/click.ts`).
- Persona fixtures (`testAs`, `approvedTest`, …) sign in a **fresh session
  per test** (`tests/utils/fresh-session.ts`). Don't share one captured
  storageState across many contexts: the Convex client rotates the refresh
  token on every page load, and replaying a rotated token outside Convex
  Auth's 10s reuse window revokes the persona's session mid-run.
- Don't add `test.skip` to get a PR green. Fix the flake, or say in the PR why
  a test is skipped.

Expected skips (3, pre-existing, all the `ai_suggestions` feature): the two
`r5-stats` "AI suggestions card renders idle" variants are hard `.skip`s (the
flag is off on test deployments), and `m16-ai-smoke` skips itself when the
flag is off — always the case on fresh preview deployments (no flag rows, no
Anthropic key).
