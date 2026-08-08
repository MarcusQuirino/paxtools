# Preview Testing

When an agent should drive a deployed environment instead of trusting a green
CI run, and which environment answers which question. The mechanics live in
the `test-preview` skill; the environment table lives in `docs/deploy.md`.

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

## Skew is the one rule that changes the plan

PR previews serve the branch's frontend from master's backend — `ci.yml`
deploys Convex only on merge. A PR touching `convex/` therefore cannot be
fully judged on its preview: verify the UI there, the backend locally, and
close the loop on the staging alias after merge.

Frontend-only PRs — the common case — are fully covered by the preview.

## Staging is shared

One dataset backs every preview and the staging alias, and `e2e-staging.yml`
reseeds it at both ends of a run. Manual poking defaults to read-only; a
deliberate mutation ends with `bun run staging:reset` and a note in the
report.

## Deliberately out of scope

- **Per-PR Convex deployments** (Convex preview deploy keys) would erase the
  skew rule entirely — worth revisiting if backend-heavy PRs start piling up.
- **Auto-running the Playwright suite against a PR preview** — the suite
  reseeds shared staging data, so concurrent PRs would fight. It stays manual.
- Posting preview findings as PR comments automatically; ask first.

The `qa` agent is the natural consumer of the skill when a change is big
enough to want spec-writing alongside the manual drive.
