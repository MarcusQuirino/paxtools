#!/usr/bin/env bun
/**
 * Vercel build command (vercel.json). Three cases:
 *
 *   PR branch preview (VERCEL_ENV=preview, branch ≠ master, preview deploy key
 *   in CONVEX_DEPLOY_KEY): deploy this branch's convex/ to its own Convex
 *   preview deployment (named after the branch), seed it if new, and build the
 *   frontend against it. The PR preview is then fully isolated.
 *
 *   master (staging) and production: plain `vite build` with the Vercel env's
 *   VITE_CONVEX_* vars. Their backends ship from GitHub Actions only (ci.yml
 *   deploy-staging, deploy-prod.yml) — this script never deploys them, and
 *   deploy-prod.yml's prod key is ignored because it isn't a `preview:` key.
 */

import { deployPreview, isPreviewDeployKey, run } from "./lib/preview-deploy";

const vercelEnv = process.env.VERCEL_ENV;
const branch = process.env.VERCEL_GIT_COMMIT_REF;
const key = process.env.CONVEX_DEPLOY_KEY;

const isPrPreview =
  vercelEnv === "preview" && !!branch && branch !== "master";

if (isPrPreview && isPreviewDeployKey(key)) {
  console.log(`[vercel-build] PR preview: Convex preview "${branch}"`);
  deployPreview({
    previewName: branch,
    buildCmd: "bun scripts/build-frontend.ts",
    previewRun: "testing:seedPreview",
  });
} else {
  if (isPrPreview) {
    console.warn(
      "[vercel-build] WARNING: no preview deploy key — this PR preview " +
        "falls back to the shared staging backend.",
    );
  }
  console.log(`[vercel-build] ${vercelEnv ?? "local"}: plain vite build`);
  run("bunx", ["vite", "build"]);
}
