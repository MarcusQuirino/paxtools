#!/usr/bin/env bun
/**
 * Step 1 of the PR e2e gate (docs/agents/e2e.md): push this checkout's
 * convex/ to the PR's Convex preview deployment and build a self-hosted
 * frontend (`.output/server`, node-server preset) pointed at it. Step 2 is
 * `bun run test:e2e:preview`, which serves that build and runs Playwright.
 *
 * Needs CONVEX_DEPLOY_KEY = a preview deploy key and E2E_PREVIEW_NAME (the
 * branch name — the same deployment the Vercel preview build uses). Data is
 * not seeded here: Playwright's global setup wipes + reseeds it.
 */

import { deployPreview } from "./lib/preview-deploy";

const previewName = process.env.E2E_PREVIEW_NAME;
if (!previewName) throw new Error("E2E_PREVIEW_NAME is not set");
process.env.NITRO_PRESET = "node-server";
deployPreview({ previewName, buildCmd: "bun scripts/build-frontend.ts" });
