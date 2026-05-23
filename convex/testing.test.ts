/// <reference types="bun" />
import { test, expect } from "bun:test";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

const TEST_EMAIL = "wipeme@test.paxtools.local";
const REAL_EMAIL = "real@gmail.com";

// Bun's test runner has no `import.meta.glob` (Vite-only). Enumerate
// convex modules explicitly so the in-memory backend can load them.
// At least one "_generated/" path must be present so convex-test can
// locate the project root via findModulesRoot.
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

test("wipeTestData removes only @test.paxtools.local users", async () => {
  const prev = process.env.TEST_AUTH;
  process.env.TEST_AUTH = "1";
  try {
    const t = convexTest(schema, modules);

    const realId = await t.run(async (ctx) => {
      const real = await ctx.db.insert("users", {
        email: REAL_EMAIL,
        name: "Real Developer",
      });
      await ctx.db.insert("users", {
        email: TEST_EMAIL,
        name: "Test User",
      });
      return real;
    });

    await t.mutation(internal.testing.wipeTestData, {});

    const survivors = await t.run(async (ctx) => ctx.db.query("users").collect());

    // Invariant: no surviving user matches the test-email pattern.
    for (const u of survivors) {
      expect(u.email?.endsWith("@test.paxtools.local") ?? false).toBe(false);
    }

    // And the real user is still there.
    const real = survivors.find((u) => u._id === realId);
    expect(real).toBeDefined();
    expect(real?.email).toBe(REAL_EMAIL);
  } finally {
    if (prev === undefined) delete process.env.TEST_AUTH;
    else process.env.TEST_AUTH = prev;
  }
});
