import { describe, expect, test } from "bun:test";
import {
  NOT_UNIT_TESTED,
  checkFloor,
  parseLcov,
  summarize,
} from "./coverage-floor";

const LCOV = `TN:
SF:convex/users.ts
FNF:10
FNH:9
LF:100
LH:95
end_of_record
TN:
SF:convex/users.test.ts
FNF:5
FNH:0
LF:50
LH:0
end_of_record
TN:
SF:convex/_generated/server.js
FNF:2
FNH:0
LF:20
LH:0
end_of_record
TN:
SF:src/lib/x.ts
FNF:1
FNH:0
LF:10
LH:0
end_of_record
`;

describe("coverage floor", () => {
  test("parseLcov reads every record", () => {
    const files = parseLcov(LCOV);
    expect(files).toHaveLength(4);
    expect(files[0]).toEqual({
      path: "convex/users.ts",
      linesFound: 100,
      linesHit: 95,
      fnFound: 10,
      fnHit: 9,
    });
  });

  test("only convex/ sources count (no tests, _generated, src)", () => {
    const r = summarize(parseLcov(LCOV), ["convex/users.ts"]);
    expect(r.lines).toBe(95);
    expect(r.functions).toBe(90);
  });

  test("passes at/above the floor, fails below", () => {
    const r = summarize(parseLcov(LCOV), ["convex/users.ts"]);
    expect(checkFloor(r, { lines: 95, functions: 90 })).toEqual([]);
    const errs = checkFloor(r, { lines: 96, functions: 91 });
    expect(errs).toHaveLength(2);
    expect(errs[0]).toMatch(/line coverage 95.00% is below the floor 96%/);
  });

  test("a convex/ source no test loads fails", () => {
    const r = summarize(parseLcov(LCOV), [
      "convex/users.ts",
      "convex/newThing.ts",
      "convex/newThing.test.ts",
      "convex/_generated/api.d.ts",
      "convex/tsconfig.json",
      "convex/env.d.ts",
      ...NOT_UNIT_TESTED,
    ]);
    expect(r.unloaded).toEqual(["convex/newThing.ts"]);
    expect(checkFloor(r, { lines: 0, functions: 0 })).toEqual([
      expect.stringMatching(/newThing.ts is not loaded by any test/),
    ]);
  });

  test("an exempt file that gains tests must leave the exemption list", () => {
    const lcov = `${LCOV}SF:convex/http.ts\nLF:1\nLH:1\nFNF:0\nFNH:0\nend_of_record\n`;
    const r = summarize(parseLcov(lcov), ["convex/users.ts", "convex/http.ts"]);
    expect(r.staleExemptions).toEqual(["convex/http.ts"]);
    expect(checkFloor(r, { lines: 0, functions: 0 })[0]).toMatch(
      /remove it from NOT_UNIT_TESTED/,
    );
  });
});
