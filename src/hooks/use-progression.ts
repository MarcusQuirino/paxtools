import { useMemo } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import { EIXOS } from "@/data/progression-data";
import {
  getCompletedBlockIds,
  getCurrentStage,
  getNextStage,
  isLisDeOuroEligible,
} from "@/lib/completion-logic";

export function useProgression() {
  const { data } = useSuspenseQuery(
    convexQuery(api.progression.getMyCompletions, {}),
  );

  const completedActionIds = useMemo(
    () => new Set(data.actions.map((a) => a.actionId)),
    [data.actions],
  );

  const completedBlockIds = useMemo(
    () =>
      getCompletedBlockIds(
        EIXOS,
        completedActionIds,
        data.customActions,
        data.specialties,
      ),
    [completedActionIds, data.customActions, data.specialties],
  );

  const completedBlockCount = completedBlockIds.size;
  const stage = getCurrentStage(completedBlockCount);
  const nextStage = getNextStage(completedBlockCount);
  const lisDeOuro = isLisDeOuroEligible(completedBlockCount);

  return {
    completedActionIds,
    completedSpecialties: data.specialties,
    customActions: data.customActions,
    completedBlockIds,
    completedBlockCount,
    stage,
    nextStage,
    lisDeOuro,
  };
}
