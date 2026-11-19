/**
 * Shared plumbing for per-PR Convex preview deployments
 * (docs/deploy.md "PR previews"). Used by the Vercel build
 * (scripts/vercel-build.ts) and the CI e2e job
 * (scripts/e2e-deploy-preview.ts).
 *
 * Safety model: `convex deploy` only ever runs with a PREVIEW deploy key
 * (`preview:<team>:<project>|...`), which can create/update preview
 * deployments and nothing else — it cannot reach staging or prod. Any other
 * key, or none, is refused here before the CLI is spawned.
 */

import { spawnSync } from "node:child_process";

/** Branches that must never get a preview backend (they own real ones). */
const PROTECTED_BRANCHES = new Set(["master", "main", "production"]);

export function isPreviewDeployKey(key: string | undefined): boolean {
  return typeof key === "string" && key.startsWith("preview:");
}

export function assertPreviewTarget(
  key: string | undefined,
  previewName: string | undefined,
): asserts previewName is string {
  if (!isPreviewDeployKey(key)) {
    throw new Error(
      "REFUSING: CONVEX_DEPLOY_KEY is not a preview deploy key. Preview " +
        "tooling only deploys with a `preview:` key so it can never touch " +
        "staging or prod.",
    );
  }
  if (!previewName) throw new Error("Preview deployment name is empty.");
  if (PROTECTED_BRANCHES.has(previewName)) {
    throw new Error(`REFUSING: "${previewName}" never gets a preview backend.`);
  }
}

/** `https://x.convex.cloud` → `https://x.convex.site` (HTTP actions/auth). */
export function siteUrlFor(cloudUrl: string): string {
  const url = new URL(cloudUrl);
  if (!url.hostname.endsWith(".convex.cloud")) {
    throw new Error(`Not a Convex cloud URL: ${cloudUrl}`);
  }
  url.hostname = url.hostname.replace(/\.convex\.cloud$/, ".convex.site");
  return url.origin;
}

export function run(cmd: string, args: string[], env = process.env): void {
  const res = spawnSync(cmd, args, { stdio: "inherit", env });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args[0] ?? ""} exited with ${res.status}`);
  }
}

/**
 * Push this checkout's convex/ to the named preview deployment (created on
 * first use, reused afterwards), then run `buildCmd` with VITE_CONVEX_URL
 * pointed at it. `previewRun` seeds only when the deployment is new.
 */
export function deployPreview(opts: {
  previewName: string;
  buildCmd: string;
  previewRun?: string;
}): void {
  assertPreviewTarget(process.env.CONVEX_DEPLOY_KEY, opts.previewName);
  run("bunx", [
    "convex",
    "deploy",
    "-y",
    "--preview-name",
    opts.previewName,
    "--cmd-url-env-var-name",
    "VITE_CONVEX_URL",
    "--cmd",
    opts.buildCmd,
    ...(opts.previewRun ? ["--preview-run", opts.previewRun] : []),
  ]);
}
