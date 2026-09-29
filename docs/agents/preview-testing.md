# Preview Testing

When an agent should drive a deployed environment instead of trusting a green
CI run, which environment answers which question, and how to drive it. The
environment table lives in `docs/deploy.md`; local browser mechanics in
`docs/agents/running-locally.md`.

Every push builds a Vercel preview; every merge to master moves the staging
alias. Both are publicly reachable — deployment protection is off on purpose
(`docs/deploy.md`), so there is no login wall and no bypass token to arrange.

## Where the step sits

```
implement → bun test + bun run lint → changeset → branch → gh pr create
          → wait for the preview → drive it → report → ask for review
```

The step runs on the PR's own preview, once the deployment is `Ready`, and
again on the staging alias after the merge when the skew rule sent backend
work there. It is not a replacement for `bun test` or the Playwright suite —
it catches what those two structurally cannot: the built bundle, real network
latency, real Convex data, and whatever the diff looks like to an actual
person.

## Which target answers what

| Question | Where |
|---|---|
| Does the logic hold? | `bun test` (unit + convex) |
| Does the flow still work end to end? | `bun run test:e2e` (local Playwright) |
| Does the change look and feel right, built and deployed? | PR preview |
| Do the new Convex functions behave against staging data? | staging alias, post-merge |
| Is the whole suite still green on a deployed target? | `gh workflow run e2e-staging.yml` (manual) |

## The skew rule — decide this first

A PR preview is the **branch's frontend against master's backend**. Convex
only deploys on merge (`ci.yml` `deploy-staging`), so a branch's new functions
do not exist on the deployment the preview talks to.

```bash
git diff master...HEAD --name-only | grep '^convex/'
```

**Hits** — the preview validates layout, routing, and anything the current
backend already serves. Flows that call the new functions fail there in ways
that are not bugs; test those locally (`docs/agents/running-locally.md`), and
re-verify on the staging alias after the merge lands.

**No hits** — the common case; the preview is the honest article. Test the
change there.

## Resolving the URL

Preview URLs are per-deployment hashes, so resolve by commit SHA and you know
which code you are looking at. Branch aliases mangle slashes in branch names;
the SHA does not.

```bash
SHA=$(gh pr view <n> --json headRefOid --jq .headRefOid)
URL=$(vercel ls paxtools --meta githubCommitSha="$SHA" 2>/dev/null)
vercel inspect "$URL" 2>&1 | grep status     # ● Ready
```

`vercel ls` prints its table on **stderr** and the bare URL on stdout, which
is why `2>/dev/null` leaves a clean variable — and why a poll loop that greps
that stdout for `Ready` never matches. Ask `vercel inspect` for the status
instead.

An empty `$URL` right after a push means the build has not registered yet;
give it a few seconds and ask again. Builds take about a minute here, and a
deployment reads `Canceled` when a newer push superseded it — resolve by the
SHA you mean to test and that resolves itself.

The staging alias is the constant in `tests/utils/target.ts`.

## Driving it

The browser mechanics in `docs/agents/running-locally.md` carry over
unchanged: hydration wait, semantic `find` → `form_input` → `browser_batch`,
the `test-signin-*` field ids, and the persona catalogue. What differs on a
deployed target:

- The extension is paired with **Helium**, not Chrome. Helium must be open for
  `tabs_context_mcp` to find a browser.
- **Confirm who you are before concluding anything.** Sessions are per-origin:
  each preview URL is a fresh one that lands on `/signin`, while the staging
  alias usually opens straight into whichever persona was left signed in — and
  an escotista's view of a scout is not the scout's own view. Screenshot
  first, then sign in as the persona whose role the change affects.
- PR previews take the **test-login form only**. The Google button renders,
  but its redirect URI is registered for the staging alias, not for a random
  preview URL, so it fails there.
- Both targets read the same staging Convex data.

## Staging is shared — keep it read-only

`e2e-staging.yml` reseeds staging at both ends of a run, and the mutating
specs own personas by name (`tests/utils/personas.ts`). Your mutations can
break a run in flight; a run erases yours. Smoke-test by navigating and
reading.

When the change can only be shown by mutating, do it, then `bun run
staging:reset`, and say in the report that staging was written to.

## What a pass looks like

Drive the path the diff changed, then one path around it that used to work,
and read the console (`read_console_messages`, `onlyErrors: true`) on both.
Report in chat: the URL, the SHA, which persona, what you drove, and a
screenshot of the changed surface. A blank frame means you screenshotted
during hydration — wait and take it again.

Post the findings as a PR comment when asked for one; the chat report is the
default.

## Deliberately out of scope

- **Per-PR Convex deployments** (Convex preview deploy keys) would erase the
  skew rule entirely — worth revisiting if backend-heavy PRs start piling up.
- **Auto-running the Playwright suite against a PR preview** — the suite
  reseeds shared staging data, so concurrent PRs would fight. It stays manual.
- Posting preview findings as PR comments automatically; ask first.

The `qa` agent is the natural consumer of this doc when a change is big
enough to want spec-writing alongside the manual drive.
