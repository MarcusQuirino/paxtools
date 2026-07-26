#!/usr/bin/env node
/**
 * design-sync prerequisites (cfg.buildCmd). Run from the repo root BEFORE
 * package-build.mjs / resync.mjs. Three steps, all writing into the gitignored
 * .design-sync/.cache/:
 *
 *  1. Compile Tailwind. styles/globals.css is Tailwind v4 SOURCE (@import
 *     "tailwindcss", @theme, @apply), not CSS. Handing it to the converter
 *     would ship tokens with zero utility classes and every component would
 *     render unstyled. cfg.cssEntry points at the compiled output.
 *
 *  2. Emit .d.ts. paxtools has no library build, so there is no declaration
 *     tree for the converter's prop extractor — without this every
 *     <Name>.d.ts is an empty `[key: string]: unknown` stub and the design
 *     agent gets no API contract.
 *
 *  3. Rewrite `@/…` path aliases in the emitted .d.ts to relative specifiers.
 *     The extractor parses the tree with a fixed ts-morph config that has no
 *     `paths`, so aliased imports would fail to resolve and every prop type
 *     sourced from `@/data/types` et al. would collapse to `any`.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CACHE = join(ROOT, '.design-sync/.cache');
const DTS = join(CACHE, 'dts');

const run = (label, cmd, args) => {
  process.stderr.write(`» ${label}\n`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] });
  if (r.error) throw r.error;
  return r.status ?? 0;
};

mkdirSync(CACHE, { recursive: true });

// 1 ── Tailwind
if (run('tailwind → .cache/compiled.css', 'node', [
  '.ds-sync/node_modules/@tailwindcss/cli/dist/index.mjs',
  '-i', '.design-sync/tw-entry.css',
  '-o', '.design-sync/.cache/compiled.css',
]) !== 0) { console.error('✗ tailwind compile failed'); process.exit(1); }

// 2 ── declarations. tsc exits non-zero on pre-existing type errors in files
// outside the synced surface (e.g. footer.tsx's Vite `__APP_VERSION__` define)
// while still emitting every declaration, so the emit is verified by counting
// output rather than by exit code.
run('tsc --emitDeclarationOnly → .cache/dts', './node_modules/typescript/bin/tsc',
    ['-p', '.design-sync/tsconfig.dts.json']);

// 3 ── alias rewrite
const walk = (d, out = []) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.d.ts')) out.push(p);
  }
  return out;
};
const files = walk(DTS);
if (!files.length) { console.error('✗ no .d.ts emitted — check the tsc errors above'); process.exit(1); }

const SRC = join(DTS, 'src');
let rewrote = 0;
for (const f of files) {
  const before = readFileSync(f, 'utf8');
  // `@/x/y` → relative path to <dts>/src/x/y, POSIX-separated and ./-prefixed.
  const after = before.replace(/(["'])@\/([^"']+)\1/g, (_m, q, sub) => {
    let rel = relative(dirname(f), join(SRC, sub)).split('\\').join('/');
    if (!rel.startsWith('.')) rel = './' + rel;
    return `${q}${rel}${q}`;
  });
  if (after !== before) { writeFileSync(f, after); rewrote++; }
}
console.error(`  rewrote @/ aliases in ${rewrote}/${files.length} .d.ts files`);
console.error('✓ prepare complete');
