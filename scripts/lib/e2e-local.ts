/**
 * Local-machine defaults for the e2e suite (tests/utils/target.ts), so an
 * agent in a fresh worktree can run `bun run test:e2e` with no hand-set env:
 *
 *   - TEST_AUTH_PASSWORD is read from `.env.local` (the dev deployment's
 *     value, the one `bun run test:e2e:seed` hashed) when the shell lacks it.
 *   - The dev server port is the first free one from 3000 up when E2E_PORT
 *     is unset — another worktree's dev server (or any other service) on
 *     3000 no longer times the web server out or, worse, gets reused.
 *   - The worker count scales with the machine instead of a fixed 8.
 *
 * Runs under Node (Playwright) and Bun, so no Bun-only APIs.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { availableParallelism } from "node:os";

/** Minimal dotenv parser: KEY=value, optional quotes, `#` comments, no expansion. */
export function parseDotenv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(raw);
    if (!m) continue;
    let value = m[2]!.trim();
    const quoted = /^(["'])(.*)\1$/.exec(value);
    if (quoted) value = quoted[2]!;
    else value = value.replace(/\s+#.*$/, "");
    out[m[1]!] = value;
  }
  return out;
}

/**
 * Copy `keys` from `.env.local` into `env` where `env` lacks them (shell wins).
 * Returns the keys it filled.
 */
export function fillFromDotenv(
  env: Record<string, string | undefined>,
  keys: readonly string[],
  file = ".env.local",
): string[] {
  if (!existsSync(file)) return [];
  const parsed = parseDotenv(readFileSync(file, "utf8"));
  const filled: string[] = [];
  for (const k of keys) {
    if (!env[k] && parsed[k]) {
      env[k] = parsed[k];
      filled.push(k);
    }
  }
  return filled;
}

/**
 * First port in [from, from+limit) nothing listens on (localhost, v4 + v6).
 * Synchronous (Playwright evaluates its config synchronously), so it probes in
 * a child process. Falls back to `from` if the probe itself fails.
 */
export function firstFreePort(from = 3000, limit = 50): number {
  const probe = `
    const net = require("node:net");
    const busy = (port, host) => new Promise((res) => {
      const s = net.connect({ port, host });
      s.once("connect", () => { s.destroy(); res(true); });
      s.once("error", () => res(false));
    });
    const bindable = (port) => new Promise((res) => {
      const s = net.createServer();
      s.once("error", () => res(false));
      s.listen({ port, host: "localhost" }, () => s.close(() => res(true)));
    });
    (async () => {
      for (let p = ${from}; p < ${from + limit}; p++) {
        if (await busy(p, "127.0.0.1") || await busy(p, "::1")) continue;
        if (await bindable(p)) { process.stdout.write(String(p)); return; }
      }
    })();`;
  const r = spawnSync(process.execPath, ["-e", probe], { encoding: "utf8", timeout: 15_000 });
  const port = Number(r.stdout?.trim());
  if (Number.isInteger(port) && port > 0) return port;
  console.warn(
    `e2e: no free localhost port found in ${from}-${from + limit - 1} (probe: ${r.error?.message ?? (r.stderr?.trim() || "nothing free")}); ` +
      `falling back to ${from} — if the web server times out, set E2E_PORT.`,
  );
  return from;
}

/**
 * Default Playwright worker count. CI's 2-core runners: 4. Locally the dev
 * server compiles routes on demand next to the browsers, and 8 workers on a
 * 4-vCPU box flaked ~30 tests per run (all green at 2): half the cores, min 2.
 * Remote targets (preview/staging) are network-bound, so they keep 8.
 * `E2E_WORKERS` or `--workers` overrides.
 */
export function defaultWorkers(opts: { ci: boolean; remote: boolean; override?: string; cpus?: number }): number {
  const n = Number(opts.override);
  if (Number.isInteger(n) && n > 0) return n;
  if (opts.ci) return 4;
  if (opts.remote) return 8;
  return Math.max(2, Math.floor((opts.cpus ?? availableParallelism()) / 2));
}
