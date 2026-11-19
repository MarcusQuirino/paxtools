#!/usr/bin/env bun
/**
 * Fail if convex/_generated is stale: regenerate it, then diff.
 *
 * `convex codegen` needs SOME deployment — it pushes the component tree to
 * a backend for analysis (never modifies what runs there), and refuses
 * CONVEX_DEPLOY_KEY. So:
 *   - CI: a throwaway *anonymous local* backend (`CONVEX_AGENT_MODE=anonymous
 *     convex dev --once`): no account, no secrets, no cloud deployment
 *     touched. The backend binary is downloaded once and cached.
 *   - Locally: plain `convex codegen` against your configured dev deployment
 *     (.env.local). We never run the anonymous path locally because it
 *     rewrites .env.local.
 *
 *   bun run check:codegen
 */

import { spawnSync } from "node:child_process";

const GENERATED = "convex/_generated";
// Agent docs (`convex ai-files install`) live under _generated but aren't codegen output.
const PATHSPEC = [GENERATED, `:(exclude)${GENERATED}/ai`];

const inCI = process.env.CI === "true";
const [cmd, args, env] = inCI
  ? [
      "bunx",
      ["convex", "dev", "--once", "--typecheck", "disable"],
      { ...process.env, CONVEX_AGENT_MODE: "anonymous" },
    ]
  : ["bunx", ["convex", "codegen", "--typecheck", "disable"], process.env];

console.log(`$ ${cmd} ${args.join(" ")}${inCI ? "  (anonymous local backend)" : ""}`);
const gen = spawnSync(cmd, args, { stdio: "inherit", env });
if (gen.status !== 0) {
  console.error(
    "::error::Convex codegen itself failed (see output above). Usually a " +
      "bundling/import error in convex/ — fix it, then run `bunx convex dev` " +
      "or `bunx convex codegen` locally and commit convex/_generated.",
  );
  process.exit(gen.status ?? 1);
}

const status = spawnSync(
  "git",
  ["status", "--porcelain", "--untracked-files=all", "--", ...PATHSPEC],
  { encoding: "utf8" },
);
const dirty = status.stdout.trim();
if (dirty) {
  spawnSync("git", ["--no-pager", "diff", "--", ...PATHSPEC], {
    stdio: "inherit",
  });
  console.error(`
::error::${GENERATED} is out of date with convex/.
  Changed:
${dirty
  .split("\n")
  .map((l) => `    ${l}`)
  .join("\n")}

How to fix: run \`bunx convex codegen\` (or keep \`bunx convex dev\` running
while you edit convex/), then commit everything under ${GENERATED}/.
Never hand-edit files in ${GENERATED}/. See docs/agents/ci-checks.md.`);
  process.exit(1);
}
console.log(`✓ ${GENERATED} is in sync with convex/.`);
