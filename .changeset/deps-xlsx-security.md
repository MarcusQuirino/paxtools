---
"paxtools": patch
---

fix(deps): move `xlsx` (dev-only) from the abandoned npm 0.18.5 to SheetJS 0.20.3 from the official CDN

- Fixes GHSA-4r6h-8v6p-xvw6 (prototype pollution) and GHSA-5pgg-2g8v-p4x9 (ReDoS); `bun audit` now reports no vulnerabilities
- `scripts/dump-ramo-sheet.ts` injects `fs` via `XLSX.set_fs` — the 0.20 ESM build no longer bundles it
