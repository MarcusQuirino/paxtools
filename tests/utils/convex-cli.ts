/**
 * Thin wrappers around the test-only Convex mutations in `convex/testing.ts`.
 *
 * Spawns `bunx convex run testing:<fn>` via `node:child_process` (Playwright
 * runs under Node, not Bun) with argv array — no shell, no injection surface.
 * Throws on non-zero exit.
 *
 * Per `docs/qa/infra-plan.md` section 11, specs must NOT call `bunx convex run`
 * directly — go through these helpers (or the `scripts/test-e2e-*.ts`
 * wrappers) so a future deployment-isolation change has a single edit point.
 */

import { spawn } from "node:child_process";

const CONVEX_BIN = "bunx";

async function runConvexFn(fn: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(CONVEX_BIN, ["convex", "run", `testing:${fn}`], {
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

export async function wipeTestData(): Promise<void> {
  await runConvexFn("wipeTestData");
}

export async function resetTestData(): Promise<void> {
  await wipeTestData();
  await seedTestData();
}
