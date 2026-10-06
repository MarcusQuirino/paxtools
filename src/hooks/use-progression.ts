import { useMemo } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { deriveProgression } from "@/lib/progression-state";

type Completions = FunctionReturnType<typeof api.progression.getMyCompletions>;

/**
 * An escoteiro's progression state — the caller's own, or `targetUserId`'s for
 * an escotista. Derived by the same module as the server's level-up snapshot
 * (src/lib/progression-state), so client and server never disagree on blocos
 * or etapa.
 */
export function useProgression(targetUserId?: Id<"users">) {
  // Both queries return the same shape; one hook call either way.
  const options = targetUserId
    ? convexQuery(api.progression.getCompletionsForUser, { targetUserId })
    : convexQuery(api.progression.getMyCompletions, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = useSuspenseQuery<Completions>(options as any);
  return useMemo(() => deriveProgression(data), [data]);
}

export type Progression = ReturnType<typeof useProgression>;
