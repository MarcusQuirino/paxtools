# design-sync notes — paxtools

First sync: 2026-07-26. Project: `PaxTools Design System`
(https://claude.ai/design/p/f227a529-60d0-4757-88db-12f792ff8bce).
27 components (15 shadcn/ui primitives + 12 progression), all with authored
previews graded `good`. No floor cards.

## Repo shape — why this config looks unusual

- **paxtools is an application, not a published library.** No `main`/`module`/
  `exports`, no library `dist/` (the root `dist/` is the Vite app build), and no
  Storybook. So:
  - `.design-sync/entry.tsx` is a hand-maintained barrel re-exporting the real
    components. It is passed as `--entry`. **Adding a component to the sync
    means adding it here AND to `cfg.componentSrcMap`.**
  - `--entry` is also what makes the converter resolve `PKG_DIR` to the repo
    root. Without it, it looks for `node_modules/paxtools/package.json` and
    crashes with ENOENT.
- **`cfg.buildCmd` = `node .design-sync/prepare.mjs`. Always run it first.** It
  does three things the converter cannot do itself:
  1. Compiles Tailwind. `styles/globals.css` is Tailwind v4 *source*
     (`@import "tailwindcss"`, `@theme`, `@apply`), not CSS. Pointing
     `cfg.cssEntry` at it directly ships tokens with **zero utility classes** and
     every component renders unstyled.
  2. Emits `.d.ts` (`tsconfig.dts.json`) into `.cache/dts`. Without it every
     generated `<Name>.d.ts` is an empty `[key: string]: unknown` stub and the
     design agent gets no API contract at all.
  3. Rewrites `@/…` aliases in the emitted `.d.ts` to relative paths — the
     extractor's ts-morph project has no `paths`, so aliased prop types would
     resolve to `any`.
- **`package.json` has `"types": ".design-sync/.cache/dts/.design-sync/entry.d.ts"`.**
  That is how `findTypesRoot` locates the emitted tree. It points into a
  gitignored cache, so it dangles until `prepare.mjs` runs. Harmless (nothing
  imports paxtools as a package) but do not "clean it up".
- **`cfg.provider` = `DesignPreviewProvider`** (`.design-sync/ds-provider.tsx`,
  exported from the barrel). `PlanNav` uses `useLocation`; `SpecialtySection`
  and `BlocoCard`/`EixoSection` render `Link`. `RouterProvider` renders the
  matched route tree instead of children, so it cannot wrap a preview —
  `RouterContextProvider` over a memory-history router is the one that works.
- **Compound subparts are excluded as cards** (46 `null` entries in
  `componentSrcMap`) so the picker shows 27 real components. They are still
  bundle exports and usable — `window.PaxTools.DialogContent` etc.
- **`cfg.docsDir` = `.design-sync/docs`** holds 27 frontmatter-only stubs whose
  only job is `category:` (→ groups `primitives` / `progression`; the source
  dirs `ui`/`components` are in the converter's GENERIC_DIR list, so everything
  landed in a bucket called "general" without them). An **empty** doc body is
  required — add real prose and it *replaces* the synthesized `## Props`
  section rather than adding to it.
- `cfg.guidelinesGlob` is `[]` on purpose: the default globs pulled in
  `docs/deploy.md`, an internal deploy runbook that is noise for a design agent.

## Repo change this sync required

`src/lib/completion-logic.ts` — the diacritics regex was written with literal
combining marks (`/[U+0300-U+036F]/`). esbuild ASCII-escapes everything **except inside
regex literals**, so those bytes survived into `_ds_bundle.js`; any consumer
serving the JS without `charset=utf-8` fails to parse the **whole bundle** and
`window.PaxTools` never gets defined. Rewritten as `/[\u0300-\u036f]/` —
byte-identical behaviour (458 tests pass), ASCII source. Keep it that way.

`.oxlintrc.json` — `.design-sync`, `.ds-sync`, `ds-bundle` added to
`ignorePatterns`; sync scaffolding is not app code and was failing `bun run lint`
with TS2307 on `@/` imports.

## Tailwind safelist — do not remove

Designs built with this DS are **not** run through Tailwind; they consume the
pre-compiled `_ds_bundle.css`. Without the `@source inline(...)` block in
`.design-sync/tw-entry.css`, the only utilities that exist are the ones
paxtools' own components happen to use — `bg-accent`, `ring-ring`,
`text-card-foreground` were all missing, and a design agent writing them would
get **silently unstyled** output. The safelist emits the full semantic-token
palette (~5KB). `conventions.md` documents exactly this vocabulary, so the two
must stay in sync.

`.design-sync/tw-entry.css` also `@source`s `previews/**/*.tsx`, so **authoring a
preview that uses a new utility class requires re-running `prepare.mjs`** before
the class exists in the CSS.

## Known render warns (expected — not new)

- `[FONT_MISSING] "Cambria"` — comes from Tailwind's stock `--font-serif`
  fallback stack. paxtools defines no custom `--font-sans`/`--font-serif`; it
  renders in the system font stack **by design**. There is no brand webfont to
  ship. No action.
- `[RENDER_THIN] PlanStar` — PlanStar is an icon-only star toggle; its `label`
  prop is `aria-label` only, so the mount genuinely has no text. Screenshot
  confirmed correct (filled vs outline star, eixo-tinted). Benign.

## Deliberate preview omissions

Three props were dropped as stories because their static render is *identical*
to another cell (they only disable interaction), which trips
"variants render identically" while teaching nothing:
`BlocoCard.lockApproved`, `CustomActionInput.lockApproved`,
`SpecialtySection.earnedSpecialtyIds`. Each is noted in its `.tsx`.

## Re-sync risks — what can go stale

- **`entry.tsx` + `componentSrcMap` are hand-maintained.** New components in
  `src/components/ui` or `src/components/progression` are invisible to the sync
  until added to both. Deleted ones will fail the build loudly (good).
- **`_fixtures.tsx` inlines real catalog content** (bloco names, actions, IRR
  items) copied from `src/data/progression-data/escoteiro.ts` and
  `progression-rules.ts`. If the catalog changes, previews keep showing the old
  copy — nothing detects this. Re-check on any progression-data change.
- **Out of scope on purpose:** `src/components/auth`, `escotista`, `onboarding`,
  `footer.tsx`. They are coupled to Convex queries/auth. `footer.tsx` also uses
  the Vite `__APP_VERSION__` define, which makes `tsc` in `prepare.mjs` exit
  non-zero with two TS2304 errors — **expected**, declarations still emit, and
  `prepare.mjs` deliberately verifies by counting output rather than exit code.
- **Toolchain assumed:** node 22, bun 1.3, tailwindcss 4.2.2 (pinned in
  `.ds-sync`, must match the repo's `tailwindcss`), typescript 5.9 from the repo,
  playwright 1.60 + chromium-1223 (macOS cache is
  `~/Library/Caches/ms-playwright`, *not* `~/.cache`).
- **`.ds-sync/` is gitignored** — re-copy the skill's scripts and
  `npm i esbuild ts-morph @types/react @tailwindcss/cli@4.2.2` on a fresh clone.

## Re-sync

```sh
node .design-sync/prepare.mjs
node .ds-sync/resync.mjs --config .design-sync/config.json \
  --node-modules ./node_modules --entry .design-sync/entry.tsx \
  --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json
```
(fetch the project's `_ds_sync.json` into `.cache/remote-sync.json` first).
