import { useMemo } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import type { Progression } from "@/hooks/use-progression";
import { buildCatalogIndex, resolvePlanItems } from "@/lib/plan-view";
import { catalogFor } from "@/data/specialty-data/catalog";
import { standingsById } from "@/lib/especialidade-standing";

type EspecialidadesRecord = FunctionReturnType<
  typeof api.specialties.getMyEspecialidades
>;

/**
 * A Plano's rows resolved against the escoteiro's progression and
 * especialidades — the escoteiro's own /plan and an escotista reading it share
 * one resolution. Especialidade keys resolve against the current ramo group's
 * catalog, with the same standing /especialidades shows.
 */
export function useResolvedPlan(
  items: Doc<"plannedItems">[],
  progression: Progression,
  especialidadesRecord: EspecialidadesRecord,
) {
  const {
    eixos,
    approvedActionIds,
    pendingActionIds,
    actionStatusMap,
    customActions,
    earnedSpecialtyIds,
  } = progression;
  const catalog = useMemo(() => buildCatalogIndex(eixos), [eixos]);
  const especialidades = useMemo(
    () => standingsById(especialidadesRecord.standings),
    [especialidadesRecord],
  );
  return useMemo(
    () =>
      resolvePlanItems(items, {
        catalog,
        approvedActionIds,
        pendingActionIds,
        actionStatusMap,
        earnedSpecialtyIds,
        customActions,
        specialtyCatalog: catalogFor(especialidadesRecord.ramoGroup),
        especialidades,
      }),
    [
      items,
      catalog,
      approvedActionIds,
      pendingActionIds,
      actionStatusMap,
      earnedSpecialtyIds,
      customActions,
      especialidadesRecord.ramoGroup,
      especialidades,
    ],
  );
}
