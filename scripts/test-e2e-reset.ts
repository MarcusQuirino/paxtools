#!/usr/bin/env bun
/**
 * Wipe then re-seed — the escape hatch when a crashed spec leaves orphans.
 */

import { resetTestData } from "../tests/utils/convex-cli";

if (!process.env.TEST_AUTH) {
  process.env.TEST_AUTH = "1";
}

await resetTestData();
