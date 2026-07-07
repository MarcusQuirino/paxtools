import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, IS_STAGING, LOCAL_PORT, LOCAL_URL } from "./tests/utils/target";

/**
 * Unified e2e suite (PRD #58). One config, two targets:
 *
 *   E2E_TARGET=local   (default) spawns the dev server, dev Convex, strict
 *                      timeouts, zero retries.
 *   E2E_TARGET=staging points at the staging Vercel alias + staging Convex,
 *                      no web server, 1 retry + relaxed timeouts (network
 *                      blips self-heal; local stays strict).
 *
 * Phases via project dependencies:
 *   setup                 reseed + storageState capture (tests/utils/personas.ts)
 *   readonly-desktop ┐    fully parallel, pristine-data exact assertions,
 *   readonly-mobile  ┘    same specs in a mobile viewport
 *   mutating         ┐    run only after ALL readonly specs; parallel via
 *   mutating-mobile  ┘    disjoint persona ownership (see the manifest)
 *
 * Global teardown reseeds so the target ends pristine.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // GitHub's hosted runners have 2 cores; 8 workers oversubscribes them badly
  // enough that page hydration blows the expect timeout (staging tests are
  // network-bound, so modest oversubscription is still worthwhile).
  workers: process.env.CI ? 4 : 8,
  retries: IS_STAGING ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: IS_STAGING ? 60_000 : 30_000,
  expect: { timeout: IS_STAGING ? 15_000 : 5_000 },
  globalTeardown: "./tests/e2e/global.teardown.ts",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: IS_STAGING
    ? undefined
    : {
        command: "bun dev",
        url: LOCAL_URL,
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          TEST_AUTH: "1",
          VITE_TEST_AUTH: "1",
          TEST_AUTH_PASSWORD:
            process.env.TEST_AUTH_PASSWORD ?? "paxtools-test-only",
          PORT: String(LOCAL_PORT),
        },
        stdout: "pipe",
        stderr: "pipe",
      },
  projects: [
    { name: "setup", testMatch: /global\.setup\.ts/ },
    {
      name: "readonly-desktop",
      testMatch: /readonly\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "readonly-mobile",
      testMatch: /readonly\/.*\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
    },
    {
      name: "mutating",
      testMatch: /mutating\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["readonly-desktop", "readonly-mobile"],
    },
    {
      name: "mutating-mobile",
      testMatch: /mutating-mobile\/.*\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
      dependencies: ["readonly-desktop", "readonly-mobile"],
    },
  ],
});
