import { useMemo } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { EIXOS } from "@/data/progression-data";
import {
  getCompletedBlockIds,
  getCurrentStage,
  getNextStage,
  allBlocksCompleted,
  isLisDeOuroComplete,
} from "@/lib/completion-logic";

export function useProgression(targetUserId?: Id<"users">) {
  // Both queries return the same shape; use type assertion to unify
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryOptions = (targetUserId
    ? convexQuery(api.progression.getCompletionsForUser, { targetUserId })
    : convexQuery(api.progression.getMyCompletions, {})) as any;
  const { data } = useSuspenseQuery<{
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

  const allActionIds = useMemo(
    () => new Set(data.actions.map((a) => a.actionId)),
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
        EIXOS,
        approvedActionIds,
        pendingActionIds,
        customActionsWithStatus,
        specialtiesWithStatus,
      ),
    [
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
  const stage = getCurrentStage(completedBlockCount);
  const nextStage = getNextStage(completedBlockCount);
  const blocksComplete = allBlocksCompleted(completedBlockCount);
  const lisDeOuro = isLisDeOuroComplete(completedBlockCount, approvedLisItemIds);

  return {
    approvedActionIds,
    pendingActionIds,
    allActionIds,
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
    lisDeOuro,
  };
}
