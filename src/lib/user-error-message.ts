import { ConvexError } from "convex/values";

/** The Portuguese message of a failed Convex call, without Convex's wrapper. */
export function userErrorMessage(err: unknown): string {
  if (err instanceof ConvexError && typeof err.data === "string") {
    return err.data;
  }
  const raw = err instanceof Error ? err.message : String(err);
  const m = raw.match(/Uncaught (?:Convex)?Error:\s*([^\n]+)/);
  return (m?.[1] ?? raw).replace(/\s+at .*$/, "").trim();
}
