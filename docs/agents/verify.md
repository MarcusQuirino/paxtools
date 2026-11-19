# Verify on the running app

Before you call a user-facing change done, **prove it works on the running
app** and publish the proof where the reviewer sees it. Green unit tests and
e2e are necessary, not sufficient: they check what someone thought to
assert; this checks what a user actually gets, on your PR's own build and
backend, across the personas the change touches.

The `Independent review` gate blocks a user-facing PR whose Verification is
missing, stale or contradicted by its own screenshots
(`docs/agents/review-rubric.md` §8). Docs-, CI-, test- and agent-config-only
PRs are exempt — `bun scripts/verify.ts affected` tells you which you are.

Inspired by Lauren Tan's pstack (verify-on-running-app, feature map,
fresh-agent re-check); the fresh agent here is the review gate.

## Steps

1. **Scope it.** `bun scripts/verify.ts affected` → the features your diff
   touches (`[changed]`) and their neighbours (`[adjacent]`) from
   [`feature-map.yaml`](./feature-map.yaml), with routes, personas, e2e
   specs and each feature's `check` recipe. Done when you have a list:
   changed features × personas whose role sees the change, plus one smoke
   path per adjacent feature. "No user-facing feature touched" → write
   `Verification: exempt (<why>)` in the PR and stop here. Files listed as
   *unmapped* → add them to the map in this PR first.

2. **Pick the target.** The default is the PR's **Vercel preview**: your
   frontend build against your branch's own **Convex preview deployment**
   with the test personas seeded (`docs/agents/preview-testing.md`).
   ```bash
   bun scripts/verify.ts preview-url        # URL + status; wait for Ready
   ```
   The `E2E (Playwright)` job wipes and reseeds that backend on every push,
   so drive it **after** the E2E check for your head commit finishes
   (`gh pr checks`), or your session loses its data mid-run.
   While iterating before a push, a frontend-only change can be driven on
   `bunx vite dev --port 3217` (your `.env.local` dev deployment); backend
   changes need the preview. Never prod (`paxtools-xi.vercel.app`) — the
   harness refuses it.

3. **Write the scenario.** A throwaway script in `.verification/`
   (gitignored) using the harness `scripts/lib/verify-session.ts`: real
   sign-in through `/signin` as personas from `tests/utils/personas.ts`,
   real clicks, numbered screenshots, a pass/fail step log.
   ```ts
   // .verification/scenario.ts
   import { verifySession, resetOut } from "../scripts/lib/verify-session";
   resetOut();
   const v = await verifySession({ feature: "plan" });
   const page = await v.signInAs("escoteiro-with-progression"); // { mobile: true } for a phone viewport
   await v.step("starred item shows in Por Área", "escoteiro-with-progression", async () => {
     await page.goto(v.url("/plan"));
     await page.getByRole("button", { name: "Por Área" }).click();
     await page.getByText("Aprendizagem Contínua").waitFor(); // assert, don't just look
     await v.shot(page, "plan-por-area");
   });
   await v.finish(); // writes .verification/out/log.md; exits 1 if a step failed
   ```
   ```bash
   VERIFY_BASE_URL=<preview url> TEST_AUTH_PASSWORD=... bun .verification/scenario.ts
   ```
   `TEST_AUTH_PASSWORD` is the target deployment's (the same value the e2e
   job seeds previews with; locally in `.env.local`). A wrong one reads
   "Registro ou senha incorretos" and ten misses lock the registro — stop
   and ask Marcus rather than guess. Selector and hydration gotchas:
   `docs/agents/running-locally.md`, `docs/agents/e2e.md`.
   Driving interactively instead (T3 preview tools, claude-in-chrome,
   `playwright-cli`) is fine for exploring; the evidence still has to end up
   as files in `.verification/out/` with a `log.md` in the same shape.

4. **Cover it.** Each step asserts something (a `waitFor` / `expect` on the
   changed text, state or route), then screenshots it. The run is complete
   when the log has:
   - the changed flow, end to end, as **every persona whose role sees it**
     (escoteiro and escotista sides of an approval; admin and non-admin for
     a guarded screen);
   - its edge cases from the diff: empty state, the guard/redirect,
     error/invalid input, mobile viewport if the screen is used on phones;
   - one smoke step per `[adjacent]` feature (open it, assert its main
     content renders);
   - before/after for a visual fix when you can (drive master's preview or
     staging read-only for the "before").
   Mutate only on the PR preview, never staging. Re-check side effects from a
   second view (approve as escotista → the escoteiro sees it locked).

5. **Read your evidence.** Open every screenshot. A blank or skeleton frame
   is a hydration capture, not proof — wait on content and retake. A `FAIL`
   step or unexplained console error means the change isn't done: fix the
   code, push, re-run. The proof must be of the **head commit** you'll ask
   to merge: after any later push that changes `src/`/`convex/` code, run
   it again (`log.md` records the commit verified).

6. **Publish.**
   ```bash
   bun scripts/verify.ts publish          # → branch verification-evidence, pr-<n>/
   ```
   It replaces the PR's previous evidence, pushes, and prints markdown with
   commit-pinned image links. Paste it into the PR body's `## Verification`
   section ([template](../../.github/pull_request_template.md)): what you
   checked, the personas, results, and that markdown. Then
   `gh pr edit <n> --body-file …`. The review gate fetches `pr-<n>/` itself,
   so publish **before** the push that triggers the review you want to pass
   (or push an empty commit afterwards to re-review; editing the body alone
   doesn't re-run it).

## Where evidence lives (and why)

Branch **`verification-evidence`** (orphan, never merged, Vercel deploys
disabled by its own `vercel.json`) holds `pr-<n>/log.md` + screenshots. Why
not the alternatives: committing to the PR branch would merge binary junk
into master; Actions artifacts can't be uploaded from an agent's machine;
GitHub has no API to attach images to comments. A branch is plain `git push`,
renders inline in the PR via `raw.githubusercontent.com` links pinned to the
evidence commit (later runs can't rewrite what a reviewer saw), and the
review gate reads it with an anonymous `git fetch`. The repo is public: only
test-persona data (99xxxxx registros) ever goes there.
