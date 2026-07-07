/**
 * Thin wrappers around the test-only Convex functions in `convex/testing.ts`.
 *
 * Spawns `bunx convex run testing:<fn>` via `node:child_process` (Playwright
 * runs under Node, not Bun) with argv array — no shell, no injection surface.
 * Throws on non-zero exit.
 *
 * Per `docs/qa/infra-plan.md` section 11, specs must NOT call `bunx convex run`
 * directly — go through these helpers (or the `scripts/test-e2e-*.ts`
 * wrappers). This is THE single edit point for deployment targeting:
 *   - local target                 → no flag; the CLI uses CONVEX_DEPLOYMENT
 *                                    from `.env.local` (the dev deployment).
 *   - staging target               → `--deployment staging`, same as the
 *                                    `staging:*` package scripts.
 *   - CI (CONVEX_DEPLOY_KEY set)   → no flag; the deploy key pins the
 *                                    deployment, exactly like `ci.yml` does.
 */

import { spawn } from "node:child_process";
import { IS_STAGING } from "./target";

const CONVEX_BIN = "bunx";

function deploymentArgs(): string[] {
  if (!IS_STAGING) return [];
  // A deploy key (CI) already selects the deployment; the flag would fight it.
  if (process.env.CONVEX_DEPLOY_KEY) return [];
  return ["--deployment", "staging"];
}

async function runConvexFn(
  fn: string,
  args?: Record<string, unknown>,
): Promise<void> {
  const argv = [
    "convex",
    "run",
    ...deploymentArgs(),
    `testing:${fn}`,
    ...(args ? [JSON.stringify(args)] : []),
  ];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(CONVEX_BIN, argv, {
      stdio: "inherit",
      env: {
        ...process.env,
        TEST_AUTH: process.env.TEST_AUTH ?? "1",
      },
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`testing:${fn} failed with exit code ${code}`));
    });
  });
}

export async function seedTestData(): Promise<void> {
  await runConvexFn("seedTestUsers");
}

export async function seedSimulatedTroop(): Promise<void> {
  await runConvexFn("seedSimulatedTroop");
}

export async function wipeTestData(): Promise<void> {
  await runConvexFn("wipeTestData");
}

/**
 * Guaranteed-pristine reset: wipe every test user (canonical + sim) and all
 * rows they own, then reseed the full unified dataset. Both targets get the
 * exact same data, so exact-count assertions behave identically.
 *
 * NOTE: this recreates sim users with fresh IDs — any storageState captured
 * before the reset is dead afterwards. Only global setup/teardown may call it.
 */
export async function resetTestData(): Promise<void> {
  await wipeTestData();
  await seedTestData();
  await seedSimulatedTroop();
}

/**
 * Reset a dedicated onboarding persona back to the not-onboarded state.
 * Makes the M13 onboarding spec retry-safe: it calls this before acting.
 */
export async function resetOnboardingUser(email: string): Promise<void> {
  await runConvexFn("resetOnboardingUser", { email });
}
