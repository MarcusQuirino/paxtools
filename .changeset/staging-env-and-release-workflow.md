---
"paxtools": minor
---

Staging environment + tag-driven prod releases. Master merges now deploy to staging only (stable `paxtools-git-master-*` Vercel alias + dedicated staging Convex deployment with working Google OAuth); prod ships exclusively via the manual `deploy-prod.yml` workflow (`-f tag=vX.Y.Z`), which snapshots prod data, deploys the backend, runs pending migrations, and only then releases the frontend. Migrations move to `@convex-dev/migrations` (stateful, resumable, append-only registry; legacy one-off migrations removed). New staging data scripts: `staging:seed`, `staging:wipe-real`, `staging:reset`.
