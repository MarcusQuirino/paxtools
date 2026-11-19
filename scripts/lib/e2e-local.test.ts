import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultWorkers, fillFromDotenv, firstFreePort, parseDotenv } from "./e2e-local";

describe("parseDotenv", () => {
  test("keys, quotes, comments, export prefix", () => {
    expect(
      parseDotenv(
        [
          "# comment",
          "CONVEX_DEPLOYMENT=dev:foo # team: x",
          'TEST_AUTH_PASSWORD="p a#ss"',
          "export QUOTED='single'",
          "EMPTY=",
          "not a line",
        ].join("\n"),
      ),
    ).toEqual({ CONVEX_DEPLOYMENT: "dev:foo", TEST_AUTH_PASSWORD: "p a#ss", QUOTED: "single", EMPTY: "" });
  });
});

describe("fillFromDotenv", () => {
  const file = join(mkdtempSync(join(tmpdir(), "e2e-local-")), ".env.local");
  writeFileSync(file, "TEST_AUTH_PASSWORD=fromfile\nOTHER=x\n");

  test("fills only missing requested keys; the shell wins", () => {
    const env: Record<string, string | undefined> = {};
    expect(fillFromDotenv(env, ["TEST_AUTH_PASSWORD"], file)).toEqual(["TEST_AUTH_PASSWORD"]);
    expect(env).toEqual({ TEST_AUTH_PASSWORD: "fromfile" });
    const set = { TEST_AUTH_PASSWORD: "shell" };
    expect(fillFromDotenv(set, ["TEST_AUTH_PASSWORD"], file)).toEqual([]);
    expect(set.TEST_AUTH_PASSWORD).toBe("shell");
  });

  test("missing file is a no-op", () => {
    expect(fillFromDotenv({}, ["TEST_AUTH_PASSWORD"], "/nonexistent/.env.local")).toEqual([]);
  });
});

describe("firstFreePort", () => {
  test("skips a port something listens on", async () => {
    const server = createServer();
    await new Promise<void>((r) => server.listen({ port: 0, host: "127.0.0.1" }, r));
    const taken = (server.address() as { port: number }).port;
    try {
      const port = firstFreePort(taken, 20);
      expect(port).toBeGreaterThan(taken);
    } finally {
      server.close();
    }
  });
});

describe("defaultWorkers", () => {
  test("CI 4, remote 8, local half the cores (min 2), override wins", () => {
    expect(defaultWorkers({ ci: true, remote: true })).toBe(4);
    expect(defaultWorkers({ ci: false, remote: true })).toBe(8);
    expect(defaultWorkers({ ci: false, remote: false, cpus: 4 })).toBe(2);
    expect(defaultWorkers({ ci: false, remote: false, cpus: 2 })).toBe(2);
    expect(defaultWorkers({ ci: false, remote: false, cpus: 12 })).toBe(6);
    expect(defaultWorkers({ ci: true, remote: false, override: "3" })).toBe(3);
    expect(defaultWorkers({ ci: false, remote: false, override: "x", cpus: 4 })).toBe(2);
  });
});
