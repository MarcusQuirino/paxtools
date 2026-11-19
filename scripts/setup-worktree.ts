#!/usr/bin/env bun
/**
 * One-shot setup for a fresh checkout or git worktree (`bun run setup`).
 * A new worktree has no node_modules and no `.env.local`, so codegen, the
 * dev server and local e2e all fail until both exist. Idempotent; safe to
 * re-run. Uses node builtins only (it runs before `bun install`).
 *
 *   1. `bun install --frozen-lockfile`
 *   2. `.env.local`: kept if present; otherwise copied from the main
 *      checkout (first entry of `git worktree list`); otherwise points you at
 *      `bunx convex dev --once`, which needs a logged-in Convex CLI.
 *   3. Playwright's chromium (no-op when already downloaded).
 *
 * `.env.local` holds the dev deployment's URL and TEST_AUTH_PASSWORD — it is
 * gitignored; never commit or print it.
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseDotenv } from "./lib/e2e-local";

function run(cmd: string, args: string[]): boolean {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  return spawnSync(cmd, args, { stdio: "inherit" }).status === 0;
}

/** Path of the main checkout: `git worktree list --porcelain` lists it first. */
function mainCheckout(porcelain: string): string | null {
  const first = /^worktree (.+)$/m.exec(porcelain);
  return first ? first[1]!.trim() : null;
}

let ok = true;

ok = run("bun", ["install", "--frozen-lockfile"]) && ok;

const envFile = resolve(".env.local");
if (existsSync(envFile)) {
  console.log(".env.local present — kept.");
} else {
  const list = spawnSync("git", ["worktree", "list", "--porcelain"], { encoding: "utf8" });
  const main = list.status === 0 ? mainCheckout(list.stdout) : null;
  const source = main ? join(main, ".env.local") : null;
  if (source && resolve(source) !== envFile && existsSync(source)) {
    copyFileSync(source, envFile);
    console.log(`.env.local copied from the main checkout (${main}).`);
  } else {
    ok = false;
    console.error(
      "No .env.local and none in the main checkout. Create it with `bunx convex dev --once` " +
        "(needs `bunx convex login`), then `bunx convex env get TEST_AUTH_PASSWORD` into it " +
        "(see .env.example). Ask a human if you have no Convex access.",
    );
  }
}
if (existsSync(envFile)) {
  const env = parseDotenv(readFileSync(envFile, "utf8"));
  for (const k of ["CONVEX_DEPLOYMENT", "VITE_CONVEX_URL", "TEST_AUTH_PASSWORD"]) {
    if (!env[k]) console.warn(`warning: .env.local has no ${k} (see .env.example).`);
  }
}

ok = run("bunx", ["playwright", "install", "chromium"]) && ok;

if (!ok) {
  console.error("\nSetup incomplete — see errors above.");
  process.exit(1);
}
console.log(
  "\nReady. Next: `bun run test`, `bun run lint`; `bun run test:e2e` (local e2e — port, password and " +
    "workers are picked automatically, docs/agents/e2e.md).",
);
