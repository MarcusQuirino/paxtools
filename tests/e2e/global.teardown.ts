/**
 * Global teardown — reseed the target deployment after every run (PRD #58
 * story 12) so the environment ends pristine: staging is ready for manual
 * poking, local for the next run. Skipped alongside E2E_SKIP_SEED=1 so
 * spec-iteration loops don't invalidate captured sessions, and alone via
 * E2E_SKIP_TEARDOWN=1 (bootstrap: `E2E_SKIP_TEARDOWN=1 playwright test
 * --project=setup` reseeds + captures states that STAY valid for iteration).
 */

import { resetTestData } from "../utils/convex-cli";

export default async function globalTeardown(): Promise<void> {
  if (process.env.E2E_SKIP_SEED === "1") return;
  if (process.env.E2E_SKIP_TEARDOWN === "1") return;
  await resetTestData();
}
