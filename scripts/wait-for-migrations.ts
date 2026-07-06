#!/usr/bin/env bun
/**
 * Poll `migrations:status` until every registered migration settles.
 *
 * Used by the deploy workflows after `migrations:runPending`: the component
 * runs migrations asynchronously in batches, so CI must wait for completion
 * (and fail loudly) before letting the frontend deploy proceed.
 *
 * Deployment targeting comes from the environment (CONVEX_DEPLOY_KEY in CI,
 * .env.local locally) — same rules as any `bunx convex run`.
 *
 * Exit 0: no registered migration is pending or running.
 * Exit 1: a migration failed / was canceled, or the timeout elapsed.
 */

import { spawn } from "node:child_process";

const POLL_INTERVAL_MS = 5_000;
const TIMEOUT_MS = 15 * 60 * 1000;

type MigrationStatus = {
  name: string;
  state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
  isDone: boolean;
  processed?: number;
  error?: string;
};

async function fetchStatus(): Promise<MigrationStatus[]> {
  return await new Promise((resolve, reject) => {
    const child = spawn("bunx", ["convex", "run", "migrations:status"], {
      stdio: ["ignore", "pipe", "inherit"],
      env: process.env,
    });
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`migrations:status exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(out) as MigrationStatus[]);
      } catch {
        reject(new Error(`could not parse migrations:status output: ${out}`));
      }
    });
  });
}

const deadline = Date.now() + TIMEOUT_MS;
for (;;) {
  const statuses = await fetchStatus();

  const failed = statuses.filter(
    (s) => s.state === "failed" || s.state === "canceled",
  );
  if (failed.length > 0) {
    for (const s of failed) {
      console.error(`✗ migration ${s.name}: ${s.state}${s.error ? ` — ${s.error}` : ""}`);
    }
    process.exit(1);
  }

  const unfinished = statuses.filter((s) => !s.isDone);
  if (unfinished.length === 0) {
    console.log(
      statuses.length === 0
        ? "✓ no registered migrations"
        : `✓ all ${statuses.length} registered migrations complete`,
    );
    process.exit(0);
  }

  if (Date.now() > deadline) {
    console.error(
      `✗ timed out after ${TIMEOUT_MS / 60000}min waiting for: ${unfinished
        .map((s) => s.name)
        .join(", ")}`,
    );
    process.exit(1);
  }

  console.log(
    `… waiting on ${unfinished.map((s) => `${s.name} (${s.processed ?? 0} processed)`).join(", ")}`,
  );
  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
}
