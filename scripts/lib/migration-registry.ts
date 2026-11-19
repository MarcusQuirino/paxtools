/**
 * Append-only guard for the migration REGISTRY in convex/migrations.ts.
 *
 * `@convex-dev/migrations` records, per deployment, which migrations have run
 * — by name — and `runSerially` walks REGISTRY in order. So once a PR lands,
 * its entries are history: removing or reordering one changes what
 * `runPending` does on deployments that haven't caught up yet, and editing a
 * migration that already ran on prod silently diverges prod from every
 * deployment that runs the new body. The only safe change is appending.
 *
 * Pure functions over source text (no TS compiler dependency); the CLI in
 * scripts/check-migration-registry.ts feeds it the base and head versions.
 */

export const MIGRATIONS_FILE = "convex/migrations.ts";

/**
 * Drop comments (string-aware, so `"//"` inside a literal survives). Strings
 * are kept verbatim — they are part of a migration's semantics. Regex
 * literals aren't special-cased; migrations.ts doesn't need them.
 */
export function stripComments(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 2;
      out += " ";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const start = i;
      i = skipString(src, i);
      out += src.slice(start, i);
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Index just past the string literal starting at `i` (quote char at `i`). */
function skipString(src: string, i: number): number {
  const quote = src[i];
  i++;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === quote) return i + 1;
    if (quote === "`" && c === "$" && src[i + 1] === "{") {
      i = matchBracket(src, i + 1) + 1;
      continue;
    }
    i++;
  }
  return i;
}

/**
 * Given `src[open]` is `(`, `[` or `{`, return the index of its matching
 * closer, skipping strings. Expects comment-free input. -1 if unbalanced.
 */
export function matchBracket(src: string, open: number): number {
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const stack: string[] = [];
  let i = open;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(src, i);
      continue;
    }
    if (c in pairs) stack.push(pairs[c]!);
    else if (c === ")" || c === "]" || c === "}") {
      if (stack.pop() !== c) return -1;
      if (stack.length === 0) return i;
    }
    i++;
  }
  return -1;
}

/** Remove all whitespace outside string literals (formatter-proof compare). */
export function squashWhitespace(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '"' || c === "'" || c === "`") {
      const start = i;
      i = skipString(src, i);
      out += src.slice(start, i);
      continue;
    }
    if (!/\s/.test(c)) out += c;
    i++;
  }
  return out;
}

export type ParsedRegistry = {
  /** Migration export names, in registry order. */
  entries: string[];
  /** Export name → normalized `migrations.define(...)` call text. */
  definitions: Map<string, string>;
};

/** Parse REGISTRY + migration definitions. Throws with a readable message. */
export function parseMigrations(src: string): ParsedRegistry {
  const code = stripComments(src);
  const head = /\bconst\s+REGISTRY\b[^=]*=\s*\[/.exec(code);
  if (!head) {
    throw new Error(
      `could not find \`const REGISTRY = [...]\` in ${MIGRATIONS_FILE}`,
    );
  }
  const open = head.index + head[0].length - 1;
  const close = matchBracket(code, open);
  if (close === -1) throw new Error("unbalanced brackets in REGISTRY");

  const entries = code
    .slice(open + 1, close)
    .split(",")
    .map((s) => squashWhitespace(s))
    .filter((s) => s.length > 0)
    .map((s) => {
      const m = /^internal\.migrations\.([A-Za-z_$][\w$]*)$/.exec(s);
      if (!m) {
        throw new Error(
          `unrecognized REGISTRY entry \`${s}\` — entries must be plain ` +
            "`internal.migrations.<name>` references",
        );
      }
      return m[1]!;
    });

  const definitions = new Map<string, string>();
  const defRe =
    /\bexport\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*migrations\.define\s*\(/g;
  for (let m = defRe.exec(code); m; m = defRe.exec(code)) {
    const parenOpen = m.index + m[0].length - 1;
    const parenClose = matchBracket(code, parenOpen);
    if (parenClose === -1) throw new Error(`unbalanced define() for ${m[1]}`);
    definitions.set(
      m[1]!,
      squashWhitespace(code.slice(parenOpen, parenClose + 1)),
    );
  }
  return { entries, definitions };
}

/**
 * Compare base vs head. Returns human-readable violations (empty = OK).
 * `baseSrc === null` means the base branch has no migrations file yet.
 */
export function checkRegistry(
  baseSrc: string | null,
  headSrc: string | null,
): string[] {
  if (baseSrc === null) return [];
  const base = parseMigrations(baseSrc);
  if (headSrc === null) {
    return [`${MIGRATIONS_FILE} was deleted; the registry is append-only.`];
  }
  const head = parseMigrations(headSrc);
  const errors: string[] = [];

  base.entries.forEach((name, i) => {
    const at = head.entries[i];
    if (at === name) return;
    const moved = head.entries.indexOf(name);
    if (moved === -1) {
      errors.push(`REGISTRY entry #${i + 1} \`${name}\` was removed.`);
    } else {
      errors.push(
        `REGISTRY entry \`${name}\` moved from position ${i + 1} to ` +
          `${moved + 1} (found \`${at ?? "nothing"}\` at ${i + 1}).`,
      );
    }
  });

  for (const name of base.entries) {
    const before = base.definitions.get(name);
    if (before === undefined) continue; // defined elsewhere; can't compare
    const after = head.definitions.get(name);
    if (after === undefined) {
      errors.push(
        `migration \`${name}\` (in REGISTRY on the base branch) no longer ` +
          "has a `migrations.define(...)` definition.",
      );
    } else if (after !== before) {
      errors.push(
        `the body of registered migration \`${name}\` changed. Migrations ` +
          "that may have already run are frozen.",
      );
    }
  }
  return errors;
}

export const REGISTRY_FIX_HINT = `How to fix:
  - Restore every existing REGISTRY entry, in its original order, and restore
    the existing migrations.define(...) bodies exactly (comments and
    whitespace may change; code may not).
  - To change behaviour, define a NEW migration and append it to the END of
    REGISTRY. Fix a bad migration with a follow-up migration, not an edit.
  - Behaviour that lives in a helper (convex/lib/...) is not covered by this
    check, but the same rule applies: don't change what an already-run
    migration does.
  - Pruning entries that have run everywhere is a maintainer decision: ask
    Marcus, don't work around this check.
See convex/migrations.ts and docs/agents/ci-checks.md.`;
