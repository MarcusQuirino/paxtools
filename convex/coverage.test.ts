/// <reference types="bun" />
import { describe, test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import { snapshotProgression } from "./lib/progression";

// Per-file modules map (Bun has no import.meta.glob). At least one
// "_generated/" path is required so convex-test finds the project root.
const modules = {
  "./_generated/api.js": () => import("./_generated/api.js"),
  "./_generated/server.js": () => import("./_generated/server.js"),
  "./approvals.ts": () => import("./approvals"),
  "./auth.config.ts": () => import("./auth.config"),
  "./auth.ts": () => import("./auth"),
  "./groups.ts": () => import("./groups"),
  "./http.ts": () => import("./http"),
  "./onboarding.ts": () => import("./onboarding"),
  "./plan.ts": () => import("./plan"),
  "./progression.ts": () => import("./progression"),
  "./testing.ts": () => import("./testing"),
  "./users.ts": () => import("./users"),
};
// NOTE: do NOT list "./stats.ts" here — it does not exist until Task 3, and a
// phantom module path makes convex-test throw ERR_MODULE_NOT_FOUND (Step 2
// would fail for the wrong reason). coverage.test.ts calls the helpers via
// t.run, never via api.stats, so it needs no stats module.

describe("snapshotProgression completedBlockCount (Task 1)", () => {
  test("works under a QueryCtx (run) and reports zero blocks for a fresh escoteiro", async () => {
    const t = convexTest(schema, modules);
    const escoteiro: Id<"users"> = await t.run(async (ctx) =>
      ctx.db.insert("users", { name: "E", role: "escoteiro", ramo: "escoteiro" }),
    );
    const snap = await t.run((ctx) => snapshotProgression(ctx, escoteiro));
    expect(snap.completedBlockCount).toBe(0);
    expect(snap.stageId).toBe("pista");
  });
});
