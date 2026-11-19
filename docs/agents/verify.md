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

**When:** after your branch is pushed and its PR is open **as a draft** —
never as a pre-commit step (the preview it drives only exists after a push).
The whole sequence:

```
commit + push → gh pr create --draft → bun scripts/pr-checks.ts wait --no-review
  → steps 1–6 below (publish + gh pr edit --body-file)
  → gh pr ready → bun scripts/pr-checks.ts wait
```

`gh pr ready` is what starts the review (it re-runs Guardrails, whose
completion triggers `Independent review`), and the review reads `pr-<n>/`
when it starts — so evidence first, ready second. Asked to "verify before
committing"? Do the part that needs no preview: step 1 (scope), the local
quality checks, and optionally drive a frontend-only change on local dev;
the running-app proof follows after the push.

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
   (`bun scripts/pr-checks.ts wait --no-review` blocks until it has), or
   your session loses its data mid-run.
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
   VERIFY_BASE_URL=<preview url> bun .verification/scenario.ts
   ```
   `TEST_AUTH_PASSWORD` must be the **target deployment's**. PR previews
   are seeded with staging's value, which is *not* the one in your
   `.env.local` (that's your dev deployment's, right for a localhost target):
   `export TEST_AUTH_PASSWORD=$(bunx convex env get TEST_AUTH_PASSWORD --deployment staging)`
   — keep it in the env, never echo or commit it. A wrong one reads
   "Registro ou senha incorretos"; the harness stops at the first one
   because ten misses an hour lock the registro. Selector and hydration gotchas:
   `docs/agents/running-locally.md`, `docs/agents/e2e.md`.
   **Capture what the server returns, not just the UI.** Access and
   visibility fixes often render identically (the UI already hid the
   field); prove the response itself with the persona's own session:
   ```ts
   await v.step("pending escotista gets no seções", "escotista-pending", async () => {
     const data = await v.serverQuery(page, "groups:listSections");      // raw Convex result
     if (!Array.isArray(data) || data.length) throw new Error(JSON.stringify(data));
     await v.shotJson(page, "pending-escotista-api", { "groups:listSections": data });
   });
   ```
   `serverQuery` is read-only (Convex `/api/query`, public queries), uses
   the deployment the page is connected to, and refuses prod;
   `shotJson` redacts password/secret/token/senha fields (the evidence
   branch is public) but shows whether they were set.
   Seeded data you may need: the test grupo has **no seções** (create one as
   admin in Ajustes → Seções, PR preview only), and
   `escotista-pending-creator` (9900011) is a pending escotista who
   *created* their grupo (`__TEST__ Grupo Criador Pendente`) — for anything
   touching the creator-is-admin fallback.
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
   commit-pinned image links. Idempotent: re-running with unchanged
   evidence pushes nothing and prints the same markdown again. Paste it into the PR body's `## Verification`
   section ([template](../../.github/pull_request_template.md)): what you
   checked, the personas, results, and that markdown. Then
   `gh pr edit <n> --body-file …`. The review gate fetches `pr-<n>/` itself,
   so publish **before** `gh pr ready` (or before the push, if the PR is
   already ready). Already reviewed and blocked on verification? Publish,
   then push an empty commit to re-review — editing the body alone doesn't
   re-run it. Fixing code after review: `gh pr ready --undo` → push →
   re-verify → publish → `gh pr ready`.

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
