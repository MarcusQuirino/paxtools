import { useMemo } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getEixosForRamo, type Ramo } from "@/data/progression-data";
import { getRamoRules } from "@/data/progression-rules";
import {
  getCompletedBlockIds,
  getCurrentStage,
  getNextStage,
  allBlocksCompleted,
  isIrrComplete,
} from "@/lib/completion-logic";

export function useProgression(targetUserId?: Id<"users">) {
  // Both queries return the same shape; use type assertion to unify
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryOptions = (targetUserId
    ? convexQuery(api.progression.getCompletionsForUser, { targetUserId })
    : convexQuery(api.progression.getMyCompletions, {})) as any;
  const { data } = useSuspenseQuery<{
    ramo: Ramo | null;
    actions: { actionId: string; status?: string }[];
    specialties: { blocoId: string; specialtyName: string; status?: string }[];
    customActions: {
      _id: Id<"customActions">;
      blocoId: string;
      text: string;
      completed: boolean;
      status?: string;
    }[];
    lisDeOuroItems: { itemId: string; status?: string }[];
  }>(queryOptions);

  const eixos = useMemo(() => getEixosForRamo(data.ramo), [data.ramo]);
  const ramoRules = useMemo(() => getRamoRules(data.ramo), [data.ramo]);

  const approvedActionIds = useMemo(
    () =>
      new Set(
        data.actions
          .filter((a) => a.status !== "pending")
          .map((a) => a.actionId),
      ),
    [data.actions],
  );

  const pendingActionIds = useMemo(
    () =>
      new Set(
        data.actions
          .filter((a) => a.status === "pending")
          .map((a) => a.actionId),
      ),
    [data.actions],
  );

  const actionStatusMap = useMemo(() => {
    const map = new Map<string, "pending" | "approved">();
    for (const a of data.actions) {
      map.set(a.actionId, a.status === "pending" ? "pending" : "approved");
    }
    return map;
  }, [data.actions]);

  const specialtiesWithStatus = useMemo(
    () =>
      data.specialties.map((s) => ({
        ...s,
        status: (s.status ?? "approved") as "pending" | "approved",
      })),
    [data.specialties],
  );

  const customActionsWithStatus = useMemo(
    () =>
      data.customActions.map((c) => ({
        ...c,
        status: c.status as "pending" | "approved" | undefined,
      })),
    [data.customActions],
  );

  const { approved: completedBlockIds, pending: pendingBlockIds } = useMemo(
    () =>
      getCompletedBlockIds(
        eixos,
        approvedActionIds,
        pendingActionIds,
        customActionsWithStatus,
        specialtiesWithStatus,
      ),
    [
      eixos,
      approvedActionIds,
      pendingActionIds,
      customActionsWithStatus,
      specialtiesWithStatus,
    ],
  );

  const approvedLisItemIds = useMemo(
    () =>
      new Set(
        data.lisDeOuroItems
          .filter((i) => i.status !== "pending")
          .map((i) => i.itemId),
      ),
    [data.lisDeOuroItems],
  );

  const pendingLisItemIds = useMemo(
    () =>
      new Set(
        data.lisDeOuroItems
          .filter((i) => i.status === "pending")
          .map((i) => i.itemId),
      ),
    [data.lisDeOuroItems],
  );

  const completedBlockCount = completedBlockIds.size;
  const stage = getCurrentStage(completedBlockCount, data.ramo);
  const nextStage = getNextStage(completedBlockCount, data.ramo);
  const blocksComplete = allBlocksCompleted(completedBlockCount, data.ramo);
  const irrComplete = isIrrComplete(
    completedBlockCount,
    approvedLisItemIds,
    data.ramo,
  );

  return {
    ramo: data.ramo,
    ramoRules,
    eixos,
    approvedActionIds,
    pendingActionIds,
    actionStatusMap,
    completedSpecialties: specialtiesWithStatus,
    customActions: customActionsWithStatus,
    completedBlockIds,
    pendingBlockIds,
    completedBlockCount,
    pendingBlockCount: pendingBlockIds.size,
    approvedLisItemIds,
    pendingLisItemIds,
    stage,
    nextStage,
    blocksComplete,
    irrComplete,
  };
}
