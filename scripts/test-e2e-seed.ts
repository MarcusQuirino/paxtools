#!/usr/bin/env bun
/**
 * Seed the canonical test users + group via `convex/testing.ts`.
 * Idempotent — safe to re-run.
 */

import { seedTestData } from "../tests/utils/convex-cli";

if (!process.env.TEST_AUTH) {
  process.env.TEST_AUTH = "1";
}

await seedTestData();
