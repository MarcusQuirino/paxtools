# Running Paxtools locally

Vite frontend on port 3000 plus a Convex backend, launched together by one
script. Everything below is the part the environment does not confess —
`package.json` remains the source of truth for the scripts themselves.

## First time in a checkout / worktree

```bash
bun run setup   # bun install, .env.local (copied from the main checkout), Playwright chromium
```

A fresh git worktree has no `node_modules` and no `.env.local` (gitignored),
so codegen, `bun run dev` and e2e all fail until this has run. If the main
checkout has no `.env.local` either, `bunx convex dev --once` creates one
(needs `bunx convex login`); add `TEST_AUTH_PASSWORD` per `.env.example`.

## Launch

Check port 3000 first; the dev server often survives from an earlier session
(or another worktree's), and a second `bun run dev` will fight the first for
the port — vite then silently moves to 3001.

```bash
lsof -ti:3000 && echo "already up"   # taken by someone else? `bunx convex dev` + `bunx vite dev --port 3217`
```

`bun run test:e2e` doesn't need this: it starts its own server on a free port.

Otherwise run `bun run dev` in the background, redirecting to a log. It is
ready only when **both** lines have appeared:

```
[vite]     ➜  Local:   http://localhost:3000/
[convex] ✔ Convex functions ready!
```

Vite prints its line in about a second; Convex takes a few more. Driving the
app before the Convex line lands gives you a shell with no data in it.

## Hydration delay

**Navigating to `/` returns a blank page for several seconds**, then the app
hydrates and redirects to `/signin`. A screenshot taken before that lands is an
empty frame, and a `body.innerText` read is an empty string — a working app that
reads as broken.

Wait ~5s after every navigation before screenshotting or asserting. In
Playwright, `waitUntil: "networkidle"` is **not** enough — Convex holds a
websocket open, so networkidle resolves early. Wait on a route or a visible
string instead:

```js
await page.waitForURL("**/signin");
await page.getByText("BEM-VINDO DE VOLTA").waitFor();
```

## Signing in

The app has no auth bypass. Test personas are ordinary contas gerenciadas:
sign in through the same **registro + senha** form real members use on
`/signin`.

The personas must exist first. Seeding is idempotent and safe to re-run:

```bash
TEST_AUTH=1 bunx convex run testing:seedTestUsers
TEST_AUTH=1 bunx convex run testing:seedSimulatedTroop   # optional, full troop
```

Password for every seeded persona: the deployment's `TEST_AUTH_PASSWORD`
Convex env var, which the seed hashes. There is no default — the seed throws if
it's unset (`bunx convex env get TEST_AUTH_PASSWORD` to read it). Local
Playwright reads the same value from `.env.local` (a shell export wins). E2E targets (local / PR preview / staging) and the CI
merge gate: `docs/agents/e2e.md`. A wrong password reads
"Registro ou senha incorretos", and ten misses in an hour lock the registro.

Registro `9900006` (`progression`) is the default persona to reach for — an
approved escoteiro with partial progression, so the home view has real data in
it. Admin is `9900001`. Test registros all live in `99xxxxx`; the mapping is in
`convex/lib/testAccounts.ts`, and the full persona list with roles, ramos and
membership states in `tests/utils/catalog.ts` — read them rather than
guessing.

Form field test ids: `scout-signin-id`, `scout-signin-password`,
`scout-signin-submit` (disabled until both fields are filled).

## Driving it

Prefer the **claude-in-chrome** extension. Locate elements semantically and
batch the round trips:

`find` (returns refs) → `form_input` on each ref → `browser_batch` of
click / wait / screenshot.

Semantic refs survive layout changes that break pixel coordinates, and
`form_input` fires the events React's controlled inputs need.

### Playwright fallback

When no browser is paired, drive it with Playwright — with one import gotcha:

```js
// bun resolves bare "playwright" to its own global cache (a newer version
// whose browser build was never downloaded) and fails at launch.
import { chromium } from "<repo>/node_modules/@playwright/test/index.js";
```

If launch reports a missing executable, `bunx playwright install chromium`.

## Verifying

Launching alone proves the entrypoint resolves. Drive to something a user would
see: sign in, expand a bloco on the home view, switch to the **Especialidades** tab, and
read the console for errors. Look at the screenshot — a blank frame means you
screenshotted too early, not that the app is broken.
