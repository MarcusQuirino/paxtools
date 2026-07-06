/**
 * Single seam deciding which environment the e2e suite runs against.
 *
 *   E2E_TARGET=staging  → the staging Vercel alias + staging Convex deployment
 *                         (no local web server is spawned).
 *   E2E_TARGET=local    → (default) localhost dev server + the dev Convex
 *                         deployment, exactly like before.
 *
 * Everything environment-dependent (baseURL, retries, timeouts, the
 * `--deployment` flag on convex CLI calls) derives from this module so specs
 * never branch on the target themselves.
 */

export type E2eTarget = "local" | "staging";

export const TARGET: E2eTarget =
  process.env.E2E_TARGET === "staging" ? "staging" : "local";

export const IS_STAGING = TARGET === "staging";

/** Stable staging alias — see docs/deploy.md "Environments". */
export const STAGING_URL =
  "https://paxtools-git-master-marcusquirinos-projects.vercel.app";

export const LOCAL_PORT = 3000;
export const LOCAL_URL = `http://localhost:${LOCAL_PORT}`;

export const BASE_URL = IS_STAGING ? STAGING_URL : LOCAL_URL;
