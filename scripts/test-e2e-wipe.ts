#!/usr/bin/env bun
/**
 * Delete every test user + child row matching the canonical wipe predicate.
 * Gated by `TEST_AUTH=1` on the Convex side.
 */

import { wipeTestData } from "../tests/utils/convex-cli";

if (!process.env.TEST_AUTH) {
  process.env.TEST_AUTH = "1";
}

await wipeTestData();
