import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  checkRegistry,
  parseMigrations,
  stripComments,
} from "./migration-registry";

function file(
  entries: string[],
  defs: Record<string, string> = {},
  extra = "",
): string {
  const defSrc = Object.entries(defs)
    .map(
      ([name, body]) =>
        `export const ${name} = migrations.define({\n  table: "t",\n  migrateOne: async (ctx, doc) => {\n    ${body}\n  },\n});\n`,
    )
    .join("\n");
  return `${defSrc}
const REGISTRY: Parameters<typeof migrations.runSerially>[1] = [
  // a comment, with commas, and internal.migrations.fake
${entries.map((e) => `  internal.migrations.${e},`).join("\n")}
];
${extra}`;
}

const DEFS = {
  a: "await ctx.db.patch(doc._id, { x: 1 });",
  b: 'await f(ctx, doc, "b(]");',
  c: "await g(ctx, doc);",
};

describe("parseMigrations", () => {
  test("reads entries in order and ignores comments", () => {
    const p = parseMigrations(file(["a", "b"], DEFS));
    expect(p.entries).toEqual(["a", "b"]);
    expect([...p.definitions.keys()]).toEqual(["a", "b", "c"]);
  });

  test("parses the real convex/migrations.ts", () => {
    const p = parseMigrations(readFileSync("convex/migrations.ts", "utf8"));
    expect(p.entries.length).toBeGreaterThan(0);
    for (const e of p.entries) expect(p.definitions.has(e)).toBe(true);
  });

  test("empty registry", () => {
    expect(parseMigrations(file([])).entries).toEqual([]);
  });

  test("rejects a non-reference entry", () => {
    const src = file(["a"]).replace(
      "internal.migrations.a,",
      "...internal.migrations.list,",
    );
    expect(() => parseMigrations(src)).toThrow(/unrecognized REGISTRY entry/);
  });

  test("throws when REGISTRY is missing", () => {
    expect(() => parseMigrations("const X = [];")).toThrow(/REGISTRY/);
  });
});

describe("stripComments", () => {
  test("keeps comment-like text inside strings", () => {
    expect(stripComments('const s = "a // b"; // gone')).toBe(
      'const s = "a // b"; ',
    );
    expect(stripComments("x /* gone */ y")).toBe("x   y");
  });
});

describe("checkRegistry", () => {
  const base = file(["a", "b"], DEFS);

  test("unchanged passes", () => {
    expect(checkRegistry(base, base)).toEqual([]);
  });

  test("appending passes", () => {
    expect(checkRegistry(base, file(["a", "b", "c"], DEFS))).toEqual([]);
  });

  test("no base file passes (first registry)", () => {
    expect(checkRegistry(null, base)).toEqual([]);
  });

  test("comment and whitespace edits pass", () => {
    const head = file(["a", "b"], DEFS)
      .replace("table: \"t\",", 'table:   "t", // tweaked')
      .replace("// a comment", "// a different comment");
    expect(checkRegistry(base, head)).toEqual([]);
  });

  test("removing an entry fails", () => {
    const errs = checkRegistry(base, file(["a"], DEFS));
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/#2 `b` was removed/);
  });

  test("removing the first entry fails", () => {
    const errs = checkRegistry(base, file(["b"], DEFS));
    expect(errs.join("\n")).toMatch(/`a` was removed/);
    expect(errs.join("\n")).toMatch(/`b` moved from position 2 to 1/);
  });

  test("reordering fails", () => {
    const errs = checkRegistry(base, file(["b", "a"], DEFS));
    expect(errs.join("\n")).toMatch(/`a` moved from position 1 to 2/);
  });

  test("inserting before the end fails", () => {
    const errs = checkRegistry(base, file(["a", "c", "b"], DEFS));
    expect(errs.join("\n")).toMatch(/`b` moved from position 2 to 3/);
  });

  test("renaming an entry fails", () => {
    const errs = checkRegistry(
      base,
      file(["a", "b2"], { ...DEFS, b2: DEFS.b }),
    );
    expect(errs.join("\n")).toMatch(/`b` was removed/);
  });

  test("editing a registered migration's body fails", () => {
    const errs = checkRegistry(
      base,
      file(["a", "b"], { ...DEFS, a: "await ctx.db.patch(doc._id, { x: 2 });" }),
    );
    expect(errs).toEqual([
      expect.stringMatching(/body of registered migration `a` changed/),
    ]);
  });

  test("editing a string inside a body fails", () => {
    const errs = checkRegistry(
      base,
      file(["a", "b"], { ...DEFS, b: 'await f(ctx, doc, "b (]");' }),
    );
    expect(errs.join("\n")).toMatch(/`b` changed/);
  });

  test("deleting a registered definition fails", () => {
    const { a: _a, ...rest } = DEFS;
    const errs = checkRegistry(base, file(["a", "b"], rest));
    expect(errs.join("\n")).toMatch(/`a`.*no longer has/);
  });

  test("editing an unregistered migration passes", () => {
    const head = file(["a", "b"], { ...DEFS, c: "await h(ctx, doc);" });
    expect(checkRegistry(base, head)).toEqual([]);
  });

  test("deleting the file fails", () => {
    expect(checkRegistry(base, null).join()).toMatch(/deleted/);
  });
});
