---
"paxtools": patch
---

chore(deps): bump all dependencies to their latest minor/patch versions

- TanStack Router/Start 1.170/1.168, React 19.3, Convex 1.46, Vite 8.3, Tailwind 4.3, zod 4.6, radix-ui 1.6, Playwright 1.63, oxlint 1.86 (+ oxlint-tsgolint 7, which it now requires), nitro beta 260903, convex-test 0.0.60
- Replaced the deprecated `@tanstack/react-router-with-query` (frozen at 1.130, broke SSR on router 1.170 with `router.serverSsr.isDehydrated is not a function`) with its successor `@tanstack/react-router-ssr-query`. Server-side query results are not dehydrated: Convex Auth tokens are client-only, so the server always sees the signed-out view and hydrating it made `/settings` bounce to `/signin` on a hard load
- Regenerated `bun.lock` so transitive deps pick up security fixes (postcss, nanoid, picomatch, ws, browserslist, @babel/core, js-yaml…) — `bun audit` 66 → 5 findings; the rest (`@auth/core`, `xlsx`) ship in follow-up PRs
