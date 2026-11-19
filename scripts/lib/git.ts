import { spawnSync } from "node:child_process";

/** Run git, return trimmed stdout; exit the process with a clear error on failure. */
export function git(args: string[]): string {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`::error::git ${args.join(" ")} failed:\n${r.stderr}`);
    process.exit(2);
  }
  return r.stdout.trim();
}

/**
 * Merge base of HEAD with the PR's base branch. `BASE_REF` overrides
 * (default `origin/master`). CI checks out with full history so this works.
 */
export function resolveMergeBase(): string {
  const baseRef = process.env.BASE_REF || "origin/master";
  return git(["merge-base", baseRef, "HEAD"]);
}
