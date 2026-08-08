---
name: test-preview
description: Verify a change on its deployed Vercel preview — after opening or updating a PR, before asking for review, or on the staging alias after a merge. Resolves the preview URL for a commit and drives it in a real browser.
---

# Testing on the preview

Every push builds a Vercel preview; every merge to master moves the staging
alias. Both are publicly reachable — deployment protection is off on purpose
(`docs/deploy.md`), so there is no login wall and no bypass token to arrange.

## The skew rule — decide this first

A PR preview is the **branch's frontend against master's backend**. Convex
only deploys on merge (`ci.yml` `deploy-staging`), so a branch's new functions
do not exist on the deployment the preview talks to.

```bash
git diff master...HEAD --name-only | grep '^convex/'
```

**Hits** — the preview validates layout, routing, and anything the current
backend already serves. Flows that call the new functions fail there in ways
that are not bugs; test those locally with the `run-app` skill, and re-verify
on the staging alias after the merge lands.

**No hits** — the preview is the honest article. Test the change there.

## Resolving the URL

Preview URLs are per-deployment hashes, so resolve by commit SHA and you know
which code you are looking at. Branch aliases mangle slashes in branch names;
the SHA does not.

```bash
SHA=$(gh pr view <n> --json headRefOid --jq .headRefOid)
vercel ls paxtools --meta githubCommitSha="$SHA"
```

The bare URL is the last line of output. Two states to poll through: an empty
list right after a push, because the build has not registered yet, and a row
reading `Canceled` when a newer push superseded it. Wait for `● Ready`
(~1 minute for this project) and confirm the parsed line starts with
`https://` before driving it.

The staging alias is the constant in `tests/utils/target.ts`.

## Driving it

The `run-app` skill covers the browser mechanics that carry over unchanged:
hydration wait, semantic `find` → `form_input` → `browser_batch`, the
`test-signin-*` field ids, and the persona catalogue. What differs on a
deployed target:

- The extension is paired with **Helium**, not Chrome. Helium must be open for
  `tabs_context_mcp` to find a browser.
- **Confirm who you are before concluding anything.** The profile usually
  carries a live staging session, so the app opens straight into someone's
  home view — and an escotista's view of a scout is not the scout's own view.
  Screenshot first; sign in as the persona whose role the change affects.
- PR previews take the **test-login form only** — Google's redirect URI is
  registered for the staging alias, not for a random preview URL.
- Both targets read the same staging Convex data.

## Keep it read-only

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
