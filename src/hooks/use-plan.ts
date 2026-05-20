import { useMemo } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";

export function usePlan() {
  const { data: items } = useSuspenseQuery(
    convexQuery(api.plan.getMyPlan, {}),
  );

  const plannedKeys = useMemo(
    () => new Set(items.map((i) => i.itemKey)),
    [items],
  );

  const toggleFn = useConvexMutation(api.plan.togglePlanned);
  const { mutate: togglePlanned } = useMutation({ mutationFn: toggleFn });

  const reorderFn = useConvexMutation(api.plan.reorderPlan);
  const { mutate: reorderPlan } = useMutation({ mutationFn: reorderFn });

  return {
    items,
    plannedKeys,
    togglePlanned,
    reorderPlan,
  };
}
