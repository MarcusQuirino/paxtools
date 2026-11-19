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
import { LOG_FILE } from "./verification-evidence";

export type StepResult = { name: string; persona: string; result: "pass" | "fail"; shots: string[]; note: string };

/**
 * Allowed targets: localhost or a Vercel preview / the staging alias. Prod
 * (paxtools-xi.vercel.app, docs/deploy.md) has no test personas and real data.
 */
export function isAllowedTarget(baseUrl: string): boolean {
  const host = new URL(baseUrl).hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  return host.endsWith(".vercel.app") && host !== "paxtools-xi.vercel.app";
}

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

  const url = (path: string) => `${baseUrl}${path}`;

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
    // Hydration takes seconds and the auth handshake can bounce; retry the form.
    for (let attempt = 1; ; attempt++) {
      await page.goto(url("/signin"));
      try {
        await submitSignIn(page, persona.scoutId, { timeout: 15_000 });
        await page.waitForURL((u) => !u.pathname.startsWith("/signin"), { timeout: 20_000 });
        break;
      } catch (e) {
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
      `- Commit verified: ${sha}`,
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

  return { url, signInAs, shot, step, finish, out, baseUrl };
}

/** Wipe a previous run's output (keeps runs from mixing evidence). */
export function resetOut(out = process.env.VERIFY_OUT ?? ".verification/out") {
  rmSync(out, { recursive: true, force: true });
}
