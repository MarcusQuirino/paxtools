/**
 * Etapa + blocos per escoteiro for escotista lists (Painel, Pendentes).
 *
 * `getGroupStats` / `getPendingForGroup` don't carry progression, so this
 * reads `stats.getRamoScouts` once per ramo the viewer may see (admins: all
 * four) and indexes the rows by user id. Non-suspending: rows render with a
 * fallback subtitle until the numbers arrive; a ramo the viewer can't read
 * simply contributes nothing.
 */
import { convexQuery } from "@convex-dev/react-query";
import { useQueries, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";
import { RAMOS, type Ramo } from "@/lib/ramos";

export type ScoutProgress = {
  stageName: string;
  completedBlockCount: number;
};

/** Blocos needed for the ramo's recognition — 18 in every ramo. */
export const TOTAL_BLOCOS = 18;

export function useScoutProgress(): Map<string, ScoutProgress> {
  const { data: viewer } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  const ramos: Ramo[] =
    viewer?.isAdmin === true ? RAMOS : ((viewer?.escotistaRamos ?? []) as Ramo[]);

  const results = useQueries({
    queries: ramos.map((ramo) => ({
      ...convexQuery(api.stats.getRamoScouts, { ramo }),
      retry: false,
    })),
  });

  const map = new Map<string, ScoutProgress>();
  for (const r of results) {
    for (const row of r.data ?? []) {
      map.set(row._id, {
        stageName: row.stageName,
        completedBlockCount: row.completedBlockCount,
      });
    }
  }
  return map;
}

/** "Trilha · 6/18 blocos", or null while unknown. */
export function progressLabel(p: ScoutProgress | undefined): string | null {
  if (!p) return null;
  return `${p.stageName} · ${Math.min(p.completedBlockCount, TOTAL_BLOCOS)}/${TOTAL_BLOCOS} blocos`;
}
