import { defineConfig, devices } from "@playwright/test";
import { defaultWorkers } from "./scripts/lib/e2e-local";
import {
  BASE_URL,
  IS_PREVIEW,
  IS_REMOTE_BACKEND,
  LOCAL_PORT,
  LOCAL_URL,
  PREVIEW_BASE_URL,
  TARGET,
} from "./tests/utils/target";

const LOCAL_WEB_SERVER = {
  // `bun run dev`, but with vite pinned to LOCAL_PORT: vite.config.ts says
  // 3000 and silently moves to the next port when that's taken, which left
  // Playwright waiting on the wrong one.
  local: {
    command: `bunx concurrently --names convex,vite -c cyan,magenta "bunx convex dev" "vite dev --port ${LOCAL_PORT} --strictPort"`,
    timeout: 120_000,
  },
  // Production build from `bun run e2e:deploy-preview` (node-server preset).
  preview: { command: "node .output/server/index.mjs", timeout: 30_000 },
} as const;

/**
 * Unified e2e suite (PRD #58). One config, three targets (tests/utils/target.ts):
 *
 *   E2E_TARGET=local   (default) spawns the dev server, dev Convex, strict
 *                      timeouts, zero retries.
 *   E2E_TARGET=preview the PR's own Convex preview deployment + a local
 *                      production build — the PR merge gate (e2e.yml).
 *   E2E_TARGET=staging points at the staging Vercel alias + staging Convex,
 *                      no web server.
 *   Remote backends (preview, staging) get 1 retry + relaxed timeouts
 *   (network blips self-heal; local stays strict).
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
  // network-bound, so modest oversubscription is still worthwhile). Local
  // target: half the cores, min 2 (scripts/lib/e2e-local.ts). E2E_WORKERS
  // or --workers overrides.
  workers: defaultWorkers({
    ci: Boolean(process.env.CI),
    remote: IS_REMOTE_BACKEND,
    override: process.env.E2E_WORKERS,
  }),
  retries: IS_REMOTE_BACKEND ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }], ["github"]]
    : [["list"], ["html", { open: "never" }]],
  timeout: IS_REMOTE_BACKEND ? 60_000 : 30_000,
  expect: { timeout: IS_REMOTE_BACKEND ? 15_000 : 5_000 },
  globalTeardown: "./tests/e2e/global.teardown.ts",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer:
    TARGET === "staging" || (IS_PREVIEW && PREVIEW_BASE_URL)
      ? undefined
      : {
        ...LOCAL_WEB_SERVER[IS_PREVIEW ? "preview" : "local"],
        url: LOCAL_URL,
        // CI must test the build it just made, never a leftover server.
        reuseExistingServer: !process.env.CI,
        env: {
          TEST_AUTH: "1",
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
