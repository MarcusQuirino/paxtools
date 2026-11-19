#!/usr/bin/env bun
/**
 * `vite build` with VITE_CONVEX_SITE_URL derived from VITE_CONVEX_URL. Run as
 * the `--cmd` of `convex deploy` for preview deployments: the CLI injects only
 * the cloud URL, and the Vercel Preview env's VITE_CONVEX_SITE_URL points at
 * staging, so it must be overridden to match.
 */

import { run, siteUrlFor } from "./lib/preview-deploy";

const cloudUrl = process.env.VITE_CONVEX_URL;
if (!cloudUrl) throw new Error("VITE_CONVEX_URL is not set");
const siteUrl = siteUrlFor(cloudUrl);
console.log(`[build-frontend] Convex ${cloudUrl} (site ${siteUrl})`);
run("bunx", ["vite", "build"], { ...process.env, VITE_CONVEX_SITE_URL: siteUrl });
