/**
 * "Changeset required" rule for PRs. Pure logic; the git plumbing is in
 * scripts/check-changeset.ts.
 *
 * A PR that touches shipped code must add a changeset in `.changeset/`.
 * Opt-out for changes with nothing to announce: an EMPTY changeset
 * (`bunx changeset --empty`) — native Changesets tooling, reviewable in the
 * diff, and `changeset version` consumes it without bumping anything.
 * PRs touching only docs / CI / tests / agent config pass without one.
 */

export const PACKAGE_NAME = "paxtools";

/** Paths whose changes reach users (frontend bundle, Convex backend, build). */
const SHIPPED: RegExp[] = [
  /^src\//,
  /^convex\//,
  /^public\//,
  /^styles\//,
  /^scripts\/(vercel-build|build-frontend)\.ts$/,
  /^(package\.json|bun\.lock|bunfig\.toml|tsconfig\.json|vite\.config\.ts|vercel\.json|components\.json|env\.d\.ts|bun-env\.d\.ts)$/,
];

/** Test-only files under shipped dirs never reach users. */
const TEST_ONLY = /(\.test\.tsx?|\.testkit\.ts)$/;

export function isShipped(path: string): boolean {
  return SHIPPED.some((re) => re.test(path)) && !TEST_ONLY.test(path);
}

export function isChangesetFile(path: string): boolean {
  return /^\.changeset\/[^/]+\.md$/.test(path) && path !== ".changeset/README.md";
}

export type ChangedFile = { status: "A" | "M" | "D"; path: string };

export type ChangesetVerdict =
  | { ok: true; reason: string }
  | { ok: false; errors: string[] };

/**
 * Validate one changeset's text. Returns problems (empty = valid).
 * Empty changeset = frontmatter with no packages; that's the opt-out.
 */
export function validateChangeset(text: string): string[] {
  const m = /^---\r?\n([\s\S]*?)^---\r?\n?([\s\S]*)$/m.exec(text);
  if (!m || !text.startsWith("---")) {
    return ["missing `---` frontmatter block"];
  }
  const releases = m[1]!
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (releases.length === 0) return []; // empty changeset (opt-out)

  const errors: string[] = [];
  for (const line of releases) {
    const r = /^["']?([^"':]+)["']?\s*:\s*(patch|minor|major)$/.exec(line);
    if (!r) {
      errors.push(
        `bad frontmatter line \`${line}\` (expected \`"${PACKAGE_NAME}": patch|minor|major\`)`,
      );
    } else if (r[1] !== PACKAGE_NAME) {
      errors.push(`unknown package \`${r[1]}\` (only \`${PACKAGE_NAME}\` exists)`);
    }
  }
  if (m[2]!.trim().length === 0) {
    errors.push("no description below the frontmatter (it becomes the CHANGELOG entry)");
  }
  return errors;
}

export function evaluateChangeset(
  files: ChangedFile[],
  readFile: (path: string) => string,
): ChangesetVerdict {
  const added = files.filter((f) => f.status !== "D" && isChangesetFile(f.path));

  const invalid = added.flatMap((f) =>
    validateChangeset(readFile(f.path)).map((e) => `${f.path}: ${e}`),
  );
  if (invalid.length > 0) return { ok: false, errors: invalid };

  if (added.length > 0) {
    return {
      ok: true,
      reason: `changeset present: ${added.map((f) => f.path).join(", ")}`,
    };
  }

  // Release PR (`bun run version`): consumes changesets into CHANGELOG.md.
  const consumed = files.some((f) => f.status === "D" && isChangesetFile(f.path));
  const changelog = files.some((f) => f.path === "CHANGELOG.md");
  if (consumed && changelog) {
    return { ok: true, reason: "release PR (changesets consumed into CHANGELOG.md)" };
  }

  const shipped = files.filter((f) => isShipped(f.path)).map((f) => f.path);
  if (shipped.length === 0) {
    return { ok: true, reason: "no shipped code changed (docs/CI/tests only)" };
  }
  return {
    ok: false,
    errors: [
      `this PR changes shipped code but adds no changeset:\n${shipped
        .slice(0, 15)
        .map((p) => `      ${p}`)
        .join("\n")}${shipped.length > 15 ? `\n      … and ${shipped.length - 15} more` : ""}`,
    ],
  };
}

export const CHANGESET_FIX_HINT = `How to fix — add ONE file to .changeset/ and commit it with the PR:

  .changeset/<short-kebab-name>.md
  ---
  "${PACKAGE_NAME}": patch          # patch = fix/chore, minor = feature, major = breaking
  ---

  One or two sentences for CHANGELOG.md: what changed for users.

Nothing user-facing (pure refactor, build tweak)? Add an EMPTY changeset
instead: \`bunx changeset --empty\` (frontmatter with no packages). The
check accepts it; say why in the PR body.
See docs/agents/ci-checks.md.`;
