/**
 * Harness for verifying a change on the RUNNING app (docs/agents/verify.md).
 * An author agent writes a throwaway scenario under `.verification/`
 * (gitignored) that imports this, drives the real UI as test personas, and
 * leaves screenshots + `log.md` in `.verification/out/` for
 * `bun scripts/verify.ts publish`.
 *
 *   import { verifySession } from "../scripts/lib/verify-session";
 *   const v = await verifySession({ feature: "plan" });
 *   const page = await v.signInAs("escoteiro-with-progression");
 *   await v.step("plan shows starred item", "escoteiro-with-progression", async () => {
 *     await page.goto(v.url("/plan"));
 *     await page.getByText("Por Área").waitFor();
 *     await v.shot(page, "plan-por-area");
 *   });
 *   await v.finish();
 *
 * Access/visibility fixes often look identical in the UI; capture what the
 * server actually returns to that persona's session too:
 *
 *   const data = await v.serverQuery(page, "groups:listSections");
 *   await v.shotJson(page, "pending-escotista-api", { "groups:listSections": data });
 *
 * serverQuery is read-only (Convex `/api/query`), uses the page's own session
 * token and Convex deployment, and refuses the prod deployment.
 *
 * Env: VERIFY_BASE_URL (the PR's Vercel preview URL, or http://localhost:3000),
 * TEST_AUTH_PASSWORD (the target deployment's), optional VERIFY_OUT,
 * VERIFY_HEADED=1. Never point it at prod: the helper only accepts localhost
 * and non-prod *.vercel.app hosts.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
// bun resolves bare "playwright" to its global cache (browser not downloaded);
// go through the repo's @playwright/test (docs/agents/running-locally.md).
import { chromium, devices, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { personaBySlug } from "../../tests/utils/personas";
import { submitSignIn } from "../../tests/utils/signin";
import {
  assertQueryableDeployment,
  convexOriginFromWsUrl,
  isAllowedTarget,
  LOG_FILE,
  redactSecrets,
} from "./verification-evidence";

export type StepResult = { name: string; persona: string; result: "pass" | "fail"; shots: string[]; note: string };

export async function verifySession(opts: { feature: string; out?: string; mobile?: boolean }) {
  const baseUrl = (process.env.VERIFY_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (!isAllowedTarget(baseUrl)) {
    throw new Error(`VERIFY_BASE_URL ${baseUrl} is not localhost or a Vercel preview — never verify on prod.`);
  }
  const out = opts.out ?? process.env.VERIFY_OUT ?? ".verification/out";
  mkdirSync(out, { recursive: true });
  const browser: Browser = await chromium.launch({ headless: process.env.VERIFY_HEADED !== "1" });
  const contexts: BrowserContext[] = [];
  const steps: StepResult[] = [];
  const consoleErrors: string[] = [];
  let shotN = 0;
  let current: StepResult | null = null;
  const sha = (() => {
    try {
      return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    } catch {
      return "unknown";
    }
  })();

  const pushed = (() => {
    try {
      return execSync("git rev-parse @{u}", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() === sha;
    } catch {
      return false;
    }
  })();
  if (!pushed) console.warn(`WARNING: HEAD ${sha.slice(0, 7)} is not the pushed branch head — the preview may be a different build.`);

  const url = (path: string) => `${baseUrl}${path}`;
  /** Convex deployment each signed-in page talks to (from its sync socket). */
  const convexOrigin = new WeakMap<Page, string>();

  /** Fresh browser context signed in as `slug` (tests/utils/personas.ts). */
  async function signInAs(slug: string, o: { mobile?: boolean } = {}): Promise<Page> {
    const persona = personaBySlug(slug);
    const ctx = await browser.newContext(
      (o.mobile ?? opts.mobile) ? { ...devices["Pixel 7"] } : { viewport: { width: 1280, height: 900 } },
    );
    contexts.push(ctx);
    const page = await ctx.newPage();
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(`[${slug}] ${m.text().slice(0, 300)}`);
    });
    page.on("pageerror", (e) => consoleErrors.push(`[${slug}] pageerror: ${e.message.slice(0, 300)}`));
    page.on("websocket", (ws) => {
      const origin = convexOriginFromWsUrl(ws.url());
      if (origin) convexOrigin.set(page, origin);
    });
    // Hydration takes seconds and the auth handshake can bounce; retry the form.
    for (let attempt = 1; ; attempt++) {
      await page.goto(url("/signin"));
      try {
        await submitSignIn(page, persona.scoutId, { timeout: 15_000 });
        await page.waitForURL((u) => !u.pathname.startsWith("/signin"), { timeout: 20_000 });
        break;
      } catch (e) {
        // Wrong password: retrying only burns attempts (10 misses/hour lock the registro).
        if (await page.getByText("Registro ou senha incorretos").isVisible().catch(() => false)) {
          throw new Error(
            `sign-in as ${slug} (${persona.scoutId}) rejected: TEST_AUTH_PASSWORD is not this deployment's ` +
              "(PR previews use staging's: `bunx convex env get TEST_AUTH_PASSWORD --deployment staging`). Not retrying.",
          );
        }
        if (attempt >= 3) throw new Error(`sign-in as ${slug} (${persona.scoutId}) failed: ${(e as Error).message}`);
      }
    }
    return page;
  }

  /** Screenshot into the evidence dir, numbered in capture order. */
  async function shot(page: Page, name: string, o: { fullPage?: boolean } = {}): Promise<string> {
    await page.waitForTimeout(800); // let transitions settle
    const file = `${String(++shotN).padStart(2, "0")}-${name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.png`;
    await page.screenshot({ path: join(out, file), fullPage: o.fullPage ?? false });
    current?.shots.push(file);
    return file;
  }

  /**
   * Raw result of a public Convex query as this page's persona sees it —
   * `path` like "groups:getMyGroup". Read-only; refuses prod. Returns
   * `{ error }` instead of throwing when the server rejects the call (a
   * denial is often exactly what you are proving).
   */
  async function serverQuery(page: Page, path: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const origin = convexOrigin.get(page);
    assertQueryableDeployment(origin);
    if (!/^[\w/]+:\w+$/.test(path)) throw new Error(`serverQuery: "${path}" is not a module:function path`);
    return await page.evaluate(
      async ({ origin, path, args }) => {
        const key = Object.keys(localStorage).find((k) => k.startsWith("__convexAuthJWT"));
        const token = key ? localStorage.getItem(key) : null;
        if (!token) return { error: "no session token in localStorage (signed out?)" };
        const r = await fetch(`${origin}/api/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ path, args, format: "json" }),
        });
        const j = (await r.json().catch(() => ({ errorMessage: `HTTP ${r.status}` }))) as {
          status?: string;
          value?: unknown;
          errorMessage?: string;
        };
        return j.status === "success" ? j.value : { error: j.errorMessage ?? `HTTP ${r.status}` };
      },
      { origin, path, args },
    );
  }

  /**
   * Screenshot `data` as pretty JSON (secret-looking fields redacted — the
   * evidence branch is public) in a throwaway tab of `page`'s context.
   */
  async function shotJson(page: Page, name: string, data: unknown, o: { title?: string } = {}): Promise<string> {
    const tab = await page.context().newPage();
    const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const json = JSON.stringify(redactSecrets(data), null, 2) ?? "undefined";
    await tab.setContent(
      `<body style="font:13px ui-monospace,monospace;padding:16px;white-space:pre-wrap">` +
        `<h3 style="font-family:sans-serif">${esc(o.title ?? name)}</h3><pre>${esc(json)}</pre></body>`,
    );
    try {
      return await shot(tab, name, { fullPage: true });
    } finally {
      await tab.close();
    }
  }

  /** One checked behaviour. A throw = fail (the run continues; finish() exits 1). */
  async function step(name: string, persona: string, fn: () => Promise<void | string>) {
    current = { name, persona, result: "pass", shots: [], note: "" };
    try {
      const note = await fn();
      if (typeof note === "string") current.note = note;
    } catch (e) {
      current.result = "fail";
      current.note = (e as Error).message.split("\n")[0]!.slice(0, 300);
      for (const ctx of contexts) {
        for (const p of ctx.pages()) {
          await shot(p, `FAIL-${name}`).catch(() => {});
        }
      }
    }
    steps.push(current);
    console.log(`${current.result === "pass" ? "PASS" : "FAIL"}  ${name} (${persona})${current.note ? ` — ${current.note}` : ""}`);
    current = null;
  }

  /** Write log.md, close the browser, exit 1 if any step failed. */
  async function finish(): Promise<StepResult[]> {
    await browser.close();
    const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
    const failed = steps.filter((s) => s.result === "fail").length;
    const log = [
      `# Verification log — ${opts.feature}`,
      "",
      `- Target: ${baseUrl}`,
      `- Commit verified: ${sha}${pushed ? "" : " (WARNING: not the pushed branch head)"}`,
      `- Date: ${new Date().toISOString()}`,
      `- Result: ${failed ? `**${failed} FAILED**` : "all passed"} (${steps.length} steps)`,
      "",
      "| # | Step | Persona | Result | Screenshots | Note |",
      "|---|---|---|---|---|---|",
      ...steps.map(
        (s, i) =>
          `| ${i + 1} | ${cell(s.name)} | ${s.persona} | ${s.result === "pass" ? "✅ pass" : "❌ FAIL"} | ${s.shots.join(", ")} | ${cell(s.note)} |`,
      ),
      "",
      `## Console errors (${consoleErrors.length})`,
      "",
      ...(consoleErrors.length ? consoleErrors.slice(0, 50).map((e) => `- ${cell(e)}`) : ["none"]),
      "",
    ].join("\n");
    writeFileSync(join(out, LOG_FILE), log);
    console.log(`\n${join(out, LOG_FILE)} written — ${steps.length - failed}/${steps.length} passed`);
    if (failed) process.exitCode = 1;
    return steps;
  }

  return { url, signInAs, shot, shotJson, serverQuery, step, finish, out, baseUrl };
}

/** Wipe a previous run's output (keeps runs from mixing evidence). */
export function resetOut(out = process.env.VERIFY_OUT ?? ".verification/out") {
  rmSync(out, { recursive: true, force: true });
}
