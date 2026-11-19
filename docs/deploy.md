# Deployment & environments

## Environments

| Env | Frontend | Convex backend | Auth | Data |
|---|---|---|---|---|
| Local | `localhost:3000` (`bun dev`) | dev (`handsome-walrus-236`) | Google + test-login | personal |
| PR preview | random `*.vercel.app` URL | the PR's own Convex **preview deployment** (named after the branch) | test-login only (no Google — URL not registered) | seeded test personas, isolated per PR |
| Staging | `paxtools-git-master-marcusquirinos-projects.vercel.app` | staging (`elated-goat-471`) | Google + test-login | seeded test users + disposable real accounts |
| Prod | `paxtools-xi.vercel.app` | prod (`flexible-tiger-306`) | Google only | real |

The Vercel production branch is `production` — a placeholder that never
receives pushes. Because master is NOT the production branch, every merge to
master produces a Preview deployment; Vercel keeps the stable
`paxtools-git-master-…` alias pointed at the latest one. That fixed URL is
staging's `SITE_URL` on the staging Convex deployment, which is what makes
Google OAuth work there.

Vercel Deployment Protection (SSO) is **intentionally disabled** for this
project: preview/staging URLs are publicly reachable. This is required —
with protection on, the staging alias sits behind a Vercel login wall,
which breaks Google sign-in UX and Playwright runs (bypass secrets are a
Pro feature). Staging holds only seeded test data and disposable accounts,
so public previews are acceptable. Don't re-enable it without a plan for
staging auth.

## PR previews (isolated backend per PR)

Every non-master branch gets its own Convex **preview deployment**, named
after the branch. Two things deploy the branch's `convex/` to it:

- **Vercel preview build** — `vercel.json` sets the build command to
  `scripts/vercel-build.ts`. For a PR branch (`VERCEL_ENV=preview`, branch ≠
  `master`) with a preview deploy key in `CONVEX_DEPLOY_KEY`, it runs
  `convex deploy --preview-name <branch>` and builds the frontend against that
  deployment (`--cmd scripts/build-frontend.ts`). On creation it runs
  `testing:seedPreview`, which seeds the test personas + simulated troop only
  if the deployment is empty. For `master` (staging) and production it is a
  plain `vite build` — those backends ship only from GitHub Actions.
- **The e2e merge gate** (`.github/workflows/e2e.yml`) — deploys the same
  branch to the same deployment, then runs Playwright against it
  (`docs/agents/e2e.md`).

Preview deployments get their env from the Convex project's **default
environment variables for preview deployments**: `TEST_AUTH=1`,
`TEST_AUTH_PASSWORD` (same value as staging / the GitHub secret), and a
preview-only `JWT_PRIVATE_KEY` / `JWKS` pair. No Google OAuth, no
`ANTHROPIC_API_KEY`. They expire automatically (Convex plan default) and are
recreated on the next push.

Safety rails: the preview deploy key can only create/update preview
deployments — it cannot reach staging or prod. `scripts/lib/preview-deploy.ts`
additionally refuses to run `convex deploy` with anything but a `preview:` key
or for `master`/`main`/`production`, and the test-auth guard
(`convex/lib/testAccounts.ts`) refuses the prod deployment regardless.

If `CONVEX_DEPLOY_KEY` is missing from Vercel's Preview env, PR previews fall
back to the shared staging backend (build log warns); the e2e gate is
unaffected.

## What happens on merge to master

1. Vercel builds the frontend with Preview env vars (staging Convex URLs)
   and updates the staging alias.
2. `ci.yml`'s `deploy-staging` job (after lint/test/build pass) runs
   `convex deploy` to the staging deployment, then `migrations:runPending`,
   then waits for migrations to settle.

Frontend and backend deploy in parallel, so staging can skew for ~1 minute.
Prod is untouched.

## Releasing to prod

```bash
# 1. Consume changesets, bump version, merge the release PR as usual
bun run version   # then commit + PR + merge

# 2. Cut the tag
git tag v1.5.0 && git push origin v1.5.0

# 3. Ship it
gh workflow run deploy-prod.yml -f tag=v1.5.0
```

`deploy-prod.yml` runs, in order:

1. lint + test on the tag (hotfix tags may never have seen CI)
2. **snapshot export of prod data** → workflow artifact, 90-day retention
   (the restore point — `bunx convex import` to roll data back)
3. `convex deploy` to prod
4. `migrations:runPending` + wait — **failure here stops the release**;
   the old frontend stays live
5. `vercel build` + `vercel deploy --prebuilt --prod`

Rollback: re-run the workflow with the previous tag (redeploys old backend
and frontend), or use Vercel's instant rollback for frontend-only issues.

Pipeline verification status: the master→staging half was exercised
end-to-end on 2026-07-06 (PR #55: CI gate, convex deploy, migration
runner, staging alias, test-login). `deploy-prod.yml` has not run yet —
its first execution is the first real release after PR #55; watch it
closely that time.

**Rule:** Convex functions must stay backward-compatible with the previous
frontend for the duration of a release (old frontend + new backend overlap
during the deploy, and after a mid-release failure).

## Migrations

Migrations use [`@convex-dev/migrations`](https://www.npmjs.com/package/@convex-dev/migrations)
— see the doc comment in `convex/migrations.ts` for the lifecycle. Short
version: define with `migrations.define`, append to `REGISTRY`, merge (runs
on staging automatically), verify on staging, release (runs on prod before
the frontend ships). Never edit or reorder a migration that has run anywhere.

## Staging data

- `bun run staging:seed` — seed the canonical test users + simulated troop
  (idempotent; run from your machine, affects staging).
- `bun run staging:wipe-real` — delete all REAL (Google) accounts and their
  data from staging, so onboarding can be re-tested from scratch. Test users
  (registros `99xxxxx`) survive. Guarded by `TEST_AUTH=1`, so it cannot run
  on prod.
- `bun run staging:reset` — wipe + re-seed the test users.
- Sign in on staging with the registro form (any seeded `99xxxxx` persona —
  see `convex/lib/testAccounts.ts` — + the shared test password) or with
  Google.

For a realistic dataset before a scary migration:
`bunx convex export --prod --path prod.zip && bunx convex import --deployment staging prod.zip`.

## Where credentials live

- GitHub Actions secrets: `CONVEX_DEPLOY_KEY_STAGING`, `CONVEX_DEPLOY_KEY_PROD`,
  `CONVEX_PREVIEW_DEPLOY_KEY` (e2e.yml; preview deploy key),
  `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `TEST_AUTH_PASSWORD`
  (e2e.yml + e2e-staging.yml; must equal staging's and the preview defaults'
  Convex `TEST_AUTH_PASSWORD`).
- Vercel env: `CONVEX_DEPLOY_KEY` = the preview deploy key, **Preview only**
  (sensitive). Never add a `CONVEX_DEPLOY_KEY` to Vercel's Production env —
  prod's backend ships only from `deploy-prod.yml`.
- Convex project default env vars (preview type): see "PR previews".
- Staging Convex env: same Google OAuth client as dev/prod (its
  `https://elated-goat-471.convex.site/api/auth/callback/google` redirect URI
  is registered on the client), staging-only JWT keypair, `TEST_AUTH=1`,
  `TEST_AUTH_PASSWORD` (shared test-persona password; no code default).
- Prod Convex env: **never** `TEST_AUTH` / `TEST_AUTH_PASSWORD`. Test functions
  refuse to run on `flexible-tiger-306`, and `deploy-prod.yml` aborts the
  release if either is set.
