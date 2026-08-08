---
name: run-app
description: Launch and drive the Paxtools app locally — run, start, or screenshot it, sign in as a test persona, or confirm a change works in the real UI rather than only in tests.
---

# Running Paxtools

Vite frontend on port 3000 plus a Convex backend, launched together by one
script. Everything below is the part the environment does not confess —
`package.json` remains the source of truth for the scripts themselves.

## Launch

Check port 3000 first; the dev server often survives from an earlier session,
and a second `bun run dev` will fight the first for the port.

```bash
lsof -ti:3000 && echo "already up"
```

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

The app has no local auth bypass; you sign in through the dev-only test
provider on `/signin`.

Three things must all hold, or the form fails in a way that looks like a bug:

1. `VITE_TEST_AUTH=1` — otherwise the TEST SIGN-IN block never renders.
2. The users must exist. Seeding is additive and safe to re-run:
   ```bash
   TEST_AUTH=1 bunx convex run testing:seedTestUsers
   ```
3. The email must end in `@test.paxtools.local`. The provider rejects anything
   else with a server error, not a form validation message.

Password for every seeded persona: `paxtools-test-only`.

`progression@test.paxtools.local` is the default persona to reach for — an
approved escoteiro with partial progression, so the home view has real data in
it. The full persona list with roles, ramos and membership states lives in
`tests/utils/catalog.ts`; read it there rather than guessing.

Form field test ids: `test-signin-email`, `test-signin-password`,
`test-signin-submit`.

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
see: sign in, expand a bloco on the home view, switch to the **Esp.** tab, and
read the console for errors. Look at the screenshot — a blank frame means you
screenshotted too early, not that the app is broken.
