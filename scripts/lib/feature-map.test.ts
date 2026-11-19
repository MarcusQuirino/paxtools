import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { MANIFEST } from "../../tests/utils/personas";
import {
  affectedFeatures,
  auditFeatureMap,
  FEATURE_MAP_PATH,
  globToRegExp,
  mustBeMapped,
  parseFeatureMap,
  renderAffected,
  type FeatureMap,
} from "./feature-map";

const feature = (id: string, over: Partial<FeatureMap["features"][number]> = {}) => ({
  id,
  name: id,
  routes: { [`/${id}`]: `src/routes/${id}.tsx` },
  convex: [`convex/${id}.ts`],
  paths: [] as string[],
  personas: ["admin"],
  specs: [] as string[],
  adjacent: [] as string[],
  check: "sign in as admin, open the page, see the thing",
  ...over,
});

const MAP: FeatureMap = {
  infra: { shared: ["convex/schema.ts", "src/components/ui/**"], none: ["convex/migrations.ts"], "core-smoke": ["home"] },
  features: [
    feature("home", { paths: ["src/components/progression/**"], adjacent: ["plan"] }),
    feature("plan", { adjacent: ["home"] }),
    feature("stats"),
  ],
};

describe("globToRegExp", () => {
  test("** spans directories, * stays in a segment", () => {
    expect(globToRegExp("src/components/**").test("src/components/a/b.tsx")).toBe(true);
    expect(globToRegExp("src/*.ts").test("src/a/b.ts")).toBe(false);
    expect(globToRegExp("src/*.ts").test("src/a.ts")).toBe(true);
    expect(globToRegExp("convex/a.ts").test("convex/aXts")).toBe(false);
  });
});

describe("mustBeMapped", () => {
  test("route files and top-level convex modules, not tests/generated", () => {
    expect(mustBeMapped("src/routes/escotista/admin.tsx")).toBe(true);
    expect(mustBeMapped("convex/plan.ts")).toBe(true);
    expect(mustBeMapped("convex/plan.test.ts")).toBe(false);
    expect(mustBeMapped("convex/fixtures.testkit.ts")).toBe(false);
    expect(mustBeMapped("convex/env.d.ts")).toBe(false);
    expect(mustBeMapped("convex/lib/x.ts")).toBe(false);
    expect(mustBeMapped("convex/_generated/api.d.ts")).toBe(false);
    expect(mustBeMapped("src/components/x.tsx")).toBe(false);
  });
});

describe("parseFeatureMap", () => {
  test("rejects missing fields with every problem listed", () => {
    expect(() => parseFeatureMap("infra: {}\nfeatures:\n  - id: Bad_Id\n")).toThrow(/infra.shared[\s\S]*id must be kebab-case[\s\S]*routes must be a map/);
  });
});

describe("auditFeatureMap", () => {
  const files = [
    "src/routes/home.tsx", "src/routes/plan.tsx", "src/routes/stats.tsx",
    "convex/home.ts", "convex/plan.ts", "convex/stats.ts", "convex/schema.ts", "convex/migrations.ts",
    "src/components/progression/a.tsx", "src/components/ui/b.tsx",
  ];
  const personas = new Set(["admin"]);

  test("clean map has no problems", () => {
    expect(auditFeatureMap(MAP, files, personas)).toEqual([]);
  });

  test("flags a new route and a new convex module nobody maps", () => {
    const problems = auditFeatureMap(MAP, [...files, "src/routes/new.tsx", "convex/newModule.ts"], personas);
    expect(problems.some((p) => p.startsWith('"src/routes/new.tsx" is in no feature'))).toBe(true);
    expect(problems.some((p) => p.startsWith('"convex/newModule.ts" is in no feature'))).toBe(true);
  });

  test("flags stale references, unknown personas and adjacent ids", () => {
    const bad: FeatureMap = {
      ...MAP,
      features: [
        ...MAP.features,
        feature("x", { specs: ["tests/e2e/gone.spec.ts"], personas: ["nobody"], adjacent: ["nope"], paths: ["src/none/**"] }),
      ],
    };
    const problems = auditFeatureMap(bad, [...files, "src/routes/x.tsx", "convex/x.ts"], personas).join("\n");
    expect(problems).toContain('"tests/e2e/gone.spec.ts" does not exist');
    expect(problems).toContain('persona "nobody"');
    expect(problems).toContain('adjacent "nope"');
    expect(problems).toContain('path "src/none/**" matches no file');
  });
});

describe("affectedFeatures", () => {
  test("direct hit + adjacent neighbours", () => {
    const a = affectedFeatures(MAP, ["src/components/progression/a.tsx"]);
    expect(a.direct.map((f) => f.id)).toEqual(["home"]);
    expect(a.adjacent.map((f) => f.id)).toEqual(["plan"]);
  });

  test("shared file pulls in core-smoke", () => {
    const a = affectedFeatures(MAP, ["src/components/ui/b.tsx"]);
    expect(a.shared).toEqual(["src/components/ui/b.tsx"]);
    expect(a.direct.map((f) => f.id)).toEqual(["home"]);
  });

  test("docs/CI-only diff needs no browser verification", () => {
    const a = affectedFeatures(MAP, ["docs/x.md", ".github/workflows/ci.yml", "convex/migrations.ts"]);
    expect(a.direct).toEqual([]);
    expect(a.none).toEqual(["convex/migrations.ts"]);
    expect(renderAffected(a)).toContain("no browser verification required");
  });

  test("unknown src file is reported as unmapped", () => {
    const a = affectedFeatures(MAP, ["src/hooks/new-hook.ts", "src/hooks/new-hook.test.ts"]);
    expect(a.unmapped).toEqual(["src/hooks/new-hook.ts"]);
  });
});

// The real map must cover the real repo — this is the CI check (it runs in
// `bun test` → required `Lint, Test, Build`). A failure names the file and
// what to add to docs/agents/feature-map.yaml.
describe(`${FEATURE_MAP_PATH} matches the repo`, () => {
  test("every route file and convex module is mapped; every reference exists", () => {
    const map = parseFeatureMap(readFileSync(FEATURE_MAP_PATH, "utf8"));
    const ls = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
    expect(ls.status).toBe(0);
    const files = ls.stdout.split("\n").filter(Boolean);
    const problems = auditFeatureMap(map, files, new Set(MANIFEST.map((m) => m.slug)));
    expect(problems).toEqual([]);
  });
});
