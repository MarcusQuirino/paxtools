/**
 * The feature map (docs/agents/feature-map.yaml): which user-facing features
 * exist, what code and e2e specs back them, and how to check them by hand.
 * Pure helpers here; `scripts/verify.ts affected` and
 * `scripts/lib/feature-map.test.ts` (completeness check) use them.
 */

export const FEATURE_MAP_PATH = "docs/agents/feature-map.yaml";

export type Feature = {
  id: string;
  name: string;
  routes: Record<string, string>;
  convex: string[];
  paths: string[];
  personas: string[];
  specs: string[];
  adjacent: string[];
  check: string;
};

export type FeatureMap = {
  infra: { shared: string[]; none: string[]; "core-smoke": string[] };
  features: Feature[];
};

/** Parse + shape-check the YAML. Throws with every problem listed. */
export function parseFeatureMap(text: string): FeatureMap {
  const raw = Bun.YAML.parse(text) as Partial<FeatureMap> | null;
  const problems: string[] = [];
  if (!raw || typeof raw !== "object") throw new Error("feature map: not a YAML object");
  const infra = raw.infra ?? ({} as FeatureMap["infra"]);
  for (const k of ["shared", "none", "core-smoke"] as const) {
    if (!Array.isArray(infra[k])) problems.push(`infra.${k} must be a list`);
  }
  const features = Array.isArray(raw.features) ? raw.features : [];
  if (!features.length) problems.push("features must be a non-empty list");
  for (const [i, f] of features.entries()) {
    const at = `features[${i}]${f?.id ? ` (${f.id})` : ""}`;
    if (!f || typeof f !== "object") {
      problems.push(`${at}: not an object`);
      continue;
    }
    if (typeof f.id !== "string" || !/^[a-z0-9-]+$/.test(f.id)) problems.push(`${at}: id must be kebab-case`);
    if (typeof f.name !== "string" || !f.name) problems.push(`${at}: name missing`);
    if (!f.routes || typeof f.routes !== "object" || Array.isArray(f.routes)) problems.push(`${at}: routes must be a map (URL → file)`);
    for (const k of ["convex", "paths", "personas", "specs", "adjacent"] as const) {
      if (!Array.isArray(f[k])) problems.push(`${at}: ${k} must be a list (use [] for none)`);
    }
    if (typeof f.check !== "string" || f.check.trim().length < 20) problems.push(`${at}: check recipe missing or too short`);
  }
  if (problems.length) throw new Error(`feature map invalid:\n- ${problems.join("\n- ")}`);
  return { infra: infra as FeatureMap["infra"], features: features as Feature[] };
}

/** Minimal glob: `**` = any depth, `*` = within one segment. */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === "*" && glob[i + 1] === "*") {
      re += ".*";
      i++;
      if (glob[i + 1] === "/") i++;
    } else if (c === "*") re += "[^/]*";
    else re += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

const matches = (globs: string[], file: string) => globs.some((g) => globToRegExp(g).test(file));

/** Every source file a feature claims (route files, convex modules, paths, specs). */
export function featureFiles(f: Feature): string[] {
  return [...Object.values(f.routes), ...f.convex, ...f.paths, ...f.specs];
}

/** Route files and top-level Convex modules that must each be mapped. */
export function mustBeMapped(file: string): boolean {
  if (/^src\/routes\/.+\.tsx?$/.test(file)) return file !== "src/routes/routeTree.gen.ts";
  return /^convex\/[^/]+\.ts$/.test(file) && !/(\.test\.ts|\.testkit\.ts|\.d\.ts)$/.test(file);
}

/**
 * Completeness problems: required files nobody maps, references to files
 * that don't exist, unknown adjacent/core-smoke ids, unknown personas.
 */
export function auditFeatureMap(
  map: FeatureMap,
  repoFiles: string[],
  personaSlugs: Set<string>,
): string[] {
  const problems: string[] = [];
  const files = new Set(repoFiles);
  const ids = new Set<string>();
  for (const f of map.features) {
    if (ids.has(f.id)) problems.push(`duplicate feature id "${f.id}"`);
    ids.add(f.id);
  }
  const claimed = new Set<string>();
  const exists = (glob: string) => repoFiles.some((r) => globToRegExp(glob).test(r));
  for (const f of map.features) {
    for (const file of [...Object.values(f.routes), ...f.convex, ...f.specs]) {
      if (!files.has(file)) problems.push(`${f.id}: "${file}" does not exist`);
      claimed.add(file);
    }
    for (const g of f.paths) if (!exists(g)) problems.push(`${f.id}: path "${g}" matches no file`);
    for (const a of f.adjacent) if (!ids.has(a)) problems.push(`${f.id}: adjacent "${a}" is not a feature id`);
    for (const p of f.personas) if (!personaSlugs.has(p)) problems.push(`${f.id}: persona "${p}" is not in tests/utils/personas.ts`);
    for (const s of f.specs) if (!/^tests\/e2e\/.+\.spec\.ts$/.test(s)) problems.push(`${f.id}: spec "${s}" is not a tests/e2e/**.spec.ts file`);
  }
  for (const g of [...map.infra.shared, ...map.infra.none]) {
    if (!exists(g)) problems.push(`infra: "${g}" matches no file`);
  }
  for (const id of map.infra["core-smoke"]) if (!ids.has(id)) problems.push(`infra.core-smoke: "${id}" is not a feature id`);
  const infra = [...map.infra.shared, ...map.infra.none];
  for (const file of repoFiles) {
    if (mustBeMapped(file) && !claimed.has(file) && !matches(infra, file)) {
      problems.push(
        `"${file}" is in no feature. Add it to a feature's routes/convex in ${FEATURE_MAP_PATH} ` +
          `(or a new feature with personas, specs and a check recipe), or to infra.none if it is not user-facing.`,
      );
    }
  }
  return problems;
}

export type Affected = {
  /** Features whose files the diff touches directly. */
  direct: Feature[];
  /** Neighbours of the direct ones (from `adjacent`), not already direct. */
  adjacent: Feature[];
  /** Changed files that hit `infra.shared` → core-smoke features apply. */
  shared: string[];
  /** Changed files in infra.none (no browser check needed). */
  none: string[];
  /** Changed src/ or convex/ files the map doesn't know (map gap or non-UI). */
  unmapped: string[];
};

export function affectedFeatures(map: FeatureMap, changed: string[]): Affected {
  const byId = new Map(map.features.map((f) => [f.id, f]));
  const direct = new Map<string, Feature>();
  const shared: string[] = [];
  const none: string[] = [];
  const unmapped: string[] = [];
  for (const file of changed) {
    let hit = false;
    for (const f of map.features) {
      if (matches(featureFiles(f), file)) {
        direct.set(f.id, f);
        hit = true;
      }
    }
    if (matches(map.infra.shared, file)) {
      shared.push(file);
      hit = true;
    } else if (matches(map.infra.none, file)) {
      none.push(file);
      hit = true;
    }
    if (!hit && /^(src|convex)\//.test(file) && !/\.test\.tsx?$/.test(file)) unmapped.push(file);
  }
  if (shared.length) {
    for (const id of map.infra["core-smoke"]) {
      const f = byId.get(id);
      if (f) direct.set(id, f);
    }
  }
  const adjacent = new Map<string, Feature>();
  for (const f of direct.values()) {
    for (const a of f.adjacent) {
      const n = byId.get(a);
      if (n && !direct.has(a)) adjacent.set(a, n);
    }
  }
  return { direct: [...direct.values()], adjacent: [...adjacent.values()], shared, none, unmapped };
}

/** Human-readable plan for `bun scripts/verify.ts affected`. */
export function renderAffected(a: Affected): string {
  const out: string[] = [];
  if (!a.direct.length && !a.unmapped.length) {
    out.push("No user-facing feature touched (docs/CI/tests/infra only) — no browser verification required.");
    if (a.none.length) out.push(`Non-UI files changed: ${a.none.join(", ")}`);
    return out.join("\n");
  }
  if (a.shared.length) out.push(`Shared files changed (${a.shared.join(", ")}) → core-smoke features included.\n`);
  const block = (f: Feature, tag: string) =>
    [
      `## [${tag}] ${f.id} — ${f.name}`,
      `routes:   ${Object.keys(f.routes).join(", ") || "-"}`,
      `personas: ${f.personas.join(", ") || "-"}`,
      `specs:    ${f.specs.join(" ") || "(none — manual check is the only coverage)"}`,
      "check:",
      ...f.check.trimEnd().split("\n").map((l) => `  ${l}`),
      "",
    ].join("\n");
  for (const f of a.direct) out.push(block(f, "changed"));
  for (const f of a.adjacent) out.push(block(f, "adjacent"));
  if (a.unmapped.length) {
    out.push(`Unmapped src/convex files (add them to ${FEATURE_MAP_PATH} if user-facing):\n  ${a.unmapped.join("\n  ")}`);
  }
  return out.join("\n");
}
