/**
 * Single seam deciding which environment the e2e suite runs against.
 *
 *   E2E_TARGET=local    → (default) localhost dev server (`bun dev`) + the dev
 *                         Convex deployment.
 *   E2E_TARGET=preview  → a per-PR Convex PREVIEW deployment (named by
 *                         E2E_PREVIEW_NAME, normally the git branch) served by
 *                         a production build of the frontend on localhost
 *                         (`bun run e2e:serve`). This is what the PR merge gate
 *                         (.github/workflows/e2e.yml) runs. Set E2E_BASE_URL to
 *                         point at an already-running frontend instead (e.g.
 *                         the PR's Vercel preview URL) — no server is spawned.
 *   E2E_TARGET=staging  → the staging Vercel alias + staging Convex deployment
 *                         (no local web server is spawned).
 *
 * Everything environment-dependent (baseURL, retries, timeouts, the
 * deployment flag on convex CLI calls) derives from this module so specs
 * never branch on the target themselves.
 */

export type E2eTarget = "local" | "preview" | "staging";

function readTarget(): E2eTarget {
  const raw = process.env.E2E_TARGET;
  if (raw === "staging" || raw === "preview") return raw;
  if (raw && raw !== "local") {
    throw new Error(`Unknown E2E_TARGET "${raw}" (local | preview | staging)`);
  }
  return "local";
}

export const TARGET: E2eTarget = readTarget();

export const IS_STAGING = TARGET === "staging";
export const IS_PREVIEW = TARGET === "preview";
/** Targets reached over the network (relaxed timeouts, one retry). */
export const IS_REMOTE_BACKEND = TARGET !== "local";

/** Stable staging alias — see docs/deploy.md "Environments". */
export const STAGING_URL =
  "https://paxtools-git-master-marcusquirinos-projects.vercel.app";

/** E2E_PORT overrides (e.g. a parallel worktree already holds 3000). */
export const LOCAL_PORT = Number(process.env.E2E_PORT ?? 3000);
export const LOCAL_URL = `http://localhost:${LOCAL_PORT}`;

/** Convex preview deployment name (preview target only). */
export function previewName(): string {
  const name = process.env.E2E_PREVIEW_NAME;
  if (!name) {
    throw new Error(
      "E2E_TARGET=preview needs E2E_PREVIEW_NAME (the Convex preview " +
        "deployment name — the PR's branch name). See docs/agents/e2e.md.",
    );
  }
  return name;
}

/** Remote frontend for the preview target; unset → serve the local build. */
export const PREVIEW_BASE_URL = IS_PREVIEW ? process.env.E2E_BASE_URL : undefined;

export const BASE_URL = IS_STAGING
  ? STAGING_URL
  : (PREVIEW_BASE_URL ?? LOCAL_URL);
