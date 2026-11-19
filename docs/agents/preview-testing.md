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
          → wait for the preview → drive it → E2E check green → report
          → ask for review
```

The step runs on the PR's own preview, once the deployment is `Ready`. It is not a replacement for `bun test` or the Playwright suite —
it catches what those two structurally cannot: the built bundle, real network
latency, real Convex data, and whatever the diff looks like to an actual
person.

## Which target answers what

| Question | Where |
|---|---|
| Does the logic hold? | `bun test` (unit + convex) |
| Does the flow still work end to end? | `bun run test:e2e` locally; the `E2E (Playwright)` check on the PR (required to merge — `docs/agents/e2e.md`) |
| Does the change look and feel right, built and deployed? | PR preview |
| Do the new Convex functions behave? | PR preview (its own backend) |
| Do they behave against staging's real-ish data? | staging alias, post-merge |
| Is the whole suite still green on staging? | `gh workflow run e2e-staging.yml` (manual) |

## Each PR has its own backend

A PR preview is the **branch's frontend against the branch's own Convex
preview deployment** (named after the branch; `docs/deploy.md` "PR
previews"). New functions, schema changes and migrations-in-progress are all
live there, so backend changes are testable on the preview before merge. The
deployment is seeded with the test personas on creation, and every e2e run
reseeds it.

One preview deployment is shared by everything on that branch — the Vercel
preview and the PR's e2e job. An e2e run wipes and reseeds it, so a manual
session in progress loses its data when CI runs (on every push).

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
the `scout-signin-*` field ids, and the persona registros. What differs on a
deployed target:

- The extension is paired with **Helium**, not Chrome. Helium must be open for
  `tabs_context_mcp` to find a browser.
- **Confirm who you are before concluding anything.** Sessions are per-origin:
  each preview URL is a fresh one that lands on `/signin`, while the staging
  alias usually opens straight into whichever persona was left signed in — and
  an escotista's view of a scout is not the scout's own view. Screenshot
  first, then sign in as the persona whose role the change affects.
- PR previews take the **registro sign-in only**. The Google button renders,
  but its redirect URI is registered for the staging alias, not for a random
  preview URL, so it fails there.
- The PR preview reads its own preview deployment's data; the staging alias
  reads staging's.

## Staging is shared — keep it read-only

`e2e-staging.yml` reseeds staging at both ends of a run, and the mutating
specs own personas by name (`tests/utils/personas.ts`). Your mutations can
break a run in flight; a run erases yours. Smoke-test by navigating and
reading.

When the change can only be shown by mutating, do it on the **PR preview**
instead (its data is the branch's own); on staging, do it, then `bun run
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

- Posting preview findings as PR comments automatically; ask first.

The `qa` agent is the natural consumer of this doc when a change is big
enough to want spec-writing alongside the manual drive.
