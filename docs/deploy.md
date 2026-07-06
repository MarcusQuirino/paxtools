# Deployment & environments

## Environments

| Env | Frontend | Convex backend | Auth | Data |
|---|---|---|---|---|
| Local | `localhost:3000` (`bun dev`) | dev (`handsome-walrus-236`) | Google + test-login | personal |
| PR preview | random `*.vercel.app` URL | staging (`elated-goat-471`) | test-login only (no Google — URL not registered) | staging |
| Staging | `paxtools-git-master-marcusquirinos-projects.vercel.app` | staging (`elated-goat-471`) | Google + test-login | seeded test users + disposable real accounts |
| Prod | `paxtools-xi.vercel.app` | prod (`flexible-tiger-306`) | Google only | real |

The Vercel production branch is `production` — a placeholder that never
receives pushes. Because master is NOT the production branch, every merge to
master produces a Preview deployment; Vercel keeps the stable
`paxtools-git-master-…` alias pointed at the latest one. That fixed URL is
staging's `SITE_URL` on the staging Convex deployment, which is what makes
Google OAuth work there.

## What happens on merge to master

1. Vercel builds the frontend with Preview env vars (staging Convex URLs,
   `VITE_TEST_AUTH=1`) and updates the staging alias.
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
  survive. Guarded by `TEST_AUTH=1`, so it cannot run on prod.
- `bun run staging:reset` — wipe + re-seed the test users.
- Sign in on staging with the test-login form (any seeded
  `*@test.paxtools.local` user + the shared test password) or with Google.

For a realistic dataset before a scary migration:
`bunx convex export --prod --path prod.zip && bunx convex import --deployment staging prod.zip`.

## Where credentials live

- GitHub Actions secrets: `CONVEX_DEPLOY_KEY_STAGING`, `CONVEX_DEPLOY_KEY_PROD`,
  `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- Staging Convex env: same Google OAuth client as dev/prod (its
  `https://elated-goat-471.convex.site/api/auth/callback/google` redirect URI
  is registered on the client), staging-only JWT keypair, `TEST_AUTH=1`.
