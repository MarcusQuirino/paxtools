import type { Bloco, CustomAction, Eixo } from "../data/types";
import type { Doc } from "../../convex/_generated/dataModel";
import { decodePlanKey } from "./plan-keys";
import { isSpecialtyEarned, toSpecialtySlug } from "./completion-logic";
import type { Standing } from "./especialidade-standing";

export type PlanItemResolved =
  | {
      itemKey: string;
      position: number;
      kind: "action";
      eixo: Eixo;
      bloco: Bloco;
      actionId: string;
      text: string;
      actionType: "fixed" | "variable";
      checked: boolean;
      status?: "pending" | "approved";
    }
  | {
      itemKey: string;
      position: number;
      kind: "specialty";
      eixo: Eixo;
      bloco: Bloco;
      specialtyName: string;
      checked: boolean;
      status?: "pending" | "approved";
    }
  | {
      // Catalog especialidade starred on /especialidades — no bloco.
      itemKey: string;
      position: number;
      kind: "especialidade";
      eixo: Eixo;
      specialtyId: string;
      name: string;
      progress: SpecialtyProgress;
      checked: boolean;
      status?: "pending" | "approved";
    }
  | {
      itemKey: string;
      position: number;
      kind: "custom";
      eixo: Eixo;
      bloco: Bloco;
      customAction: CustomAction;
    };

/** Younger: approved/total items. Older: approved/3 etapas. */
export type SpecialtyProgress = {
  approved: number;
  total: number;
  unit: "itens" | "etapas";
};

/** Younger entries carry their item count; older ones `null` (3 etapas). */
export type SpecialtyCatalogEntry = {
  id: string;
  name: string;
  eixoId: string;
  itemCount: number | null;
};

type CatalogIndex = {
  blocosById: Map<string, { eixo: Eixo; bloco: Bloco }>;
  actionsById: Map<
    string,
    {
      eixo: Eixo;
      bloco: Bloco;
      text: string;
      actionType: "fixed" | "variable";
    }
  >;
};

export function buildCatalogIndex(eixos: Eixo[]): CatalogIndex {
  const blocosById = new Map<string, { eixo: Eixo; bloco: Bloco }>();
  const actionsById = new Map<
    string,
    {
      eixo: Eixo;
      bloco: Bloco;
      text: string;
      actionType: "fixed" | "variable";
    }
  >();
  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) {
      blocosById.set(bloco.id, { eixo, bloco });
      for (const a of bloco.fixedActions) {
        actionsById.set(a.id, {
          eixo,
          bloco,
          text: a.text,
          actionType: "fixed",
        });
      }
      for (const a of bloco.variableActions) {
        actionsById.set(a.id, {
          eixo,
          bloco,
          text: a.text,
          actionType: "variable",
        });
      }
    }
  }
  return { blocosById, actionsById };
}

export type ResolverInput = {
  catalog: CatalogIndex;
  approvedActionIds: Set<string>;
  pendingActionIds: Set<string>;
  actionStatusMap: Map<string, "pending" | "approved">;
  /** Canonical ids of specialties earned via items (#44) — always approved. */
  earnedSpecialtyIds?: Set<string>;
  /** Ids of earned insígnias de interesse especial (src/lib/badge-standing). */
  earnedBadgeIds?: Set<string>;
  customActions: CustomAction[];
  /** Current ramoGroup's especialidade catalog, for `especialidade:` keys. */
  specialtyCatalog?: SpecialtyCatalogEntry[];
  /** specialtyId → especialidade standing; missing = not started. */
  especialidades?: Map<
    string,
    Pick<Standing, "kind" | "approvedCount" | "total" | "earned">
  >;
};

export function resolvePlanItems(
  planned: Doc<"plannedItems">[],
  input: ResolverInput,
): PlanItemResolved[] {
  const customById = new Map(input.customActions.map((c) => [c._id, c]));
  const specialtyById = new Map(
    (input.specialtyCatalog ?? []).map((s) => [s.id, s]),
  );
  const eixosById = new Map<string, Eixo>();
  for (const { eixo } of input.catalog.blocosById.values()) {
    eixosById.set(eixo.id, eixo);
  }

  const sorted = [...planned].sort((a, b) => a.position - b.position);
  const resolved: PlanItemResolved[] = [];

  for (const p of sorted) {
    const decoded = decodePlanKey(p.itemKey);
    if (!decoded) continue;

    if (decoded.kind === "action") {
      const hit = input.catalog.actionsById.get(decoded.actionId);
      if (!hit) continue;
      const checked =
        input.approvedActionIds.has(decoded.actionId) ||
        input.pendingActionIds.has(decoded.actionId);
      resolved.push({
        itemKey: p.itemKey,
        position: p.position,
        kind: "action",
        eixo: hit.eixo,
        bloco: hit.bloco,
        actionId: decoded.actionId,
        text: hit.text,
        actionType: hit.actionType,
        checked,
        status: input.actionStatusMap.get(decoded.actionId),
      });
    } else if (decoded.kind === "specialty") {
      const hit = input.catalog.blocosById.get(decoded.blocoId);
      if (!hit) continue;
      // The bloco's "ou" list names especialidades and insígnias alike.
      const earned =
        isSpecialtyEarned(
          decoded.specialtyName,
          input.earnedSpecialtyIds ?? new Set(),
        ) || !!input.earnedBadgeIds?.has(toSpecialtySlug(decoded.specialtyName));
      resolved.push({
        itemKey: p.itemKey,
        position: p.position,
        kind: "specialty",
        eixo: hit.eixo,
        bloco: hit.bloco,
        specialtyName: decoded.specialtyName,
        checked: earned,
        status: earned ? "approved" : undefined,
      });
    } else if (decoded.kind === "especialidade") {
      const spec = specialtyById.get(decoded.specialtyId);
      const eixo = spec && eixosById.get(spec.eixoId);
      if (!spec || !eixo) continue;
      const standing = input.especialidades?.get(spec.id);
      const earned = !!standing?.earned;
      resolved.push({
        itemKey: p.itemKey,
        position: p.position,
        kind: "especialidade",
        eixo,
        specialtyId: spec.id,
        name: spec.name,
        progress: standing
          ? {
              approved: standing.approvedCount,
              total: standing.total,
              unit: standing.kind === "younger" ? "itens" : "etapas",
            }
          : {
              approved: 0,
              total: spec.itemCount ?? 3,
              unit: spec.itemCount === null ? "etapas" : "itens",
            },
        checked: earned,
        status: earned ? "approved" : undefined,
      });
    } else if (decoded.kind === "custom") {
      const custom = customById.get(decoded.customActionId);
      if (!custom) continue;
      const hit = input.catalog.blocosById.get(custom.blocoId);
      if (!hit) continue;
      resolved.push({
        itemKey: p.itemKey,
        position: p.position,
        kind: "custom",
        eixo: hit.eixo,
        bloco: hit.bloco,
        customAction: custom,
      });
    }
  }

  return resolved;
}

export function isResolvedComplete(item: PlanItemResolved): boolean {
  if (item.kind === "custom") {
    return item.customAction.completed && item.customAction.status !== "pending";
  }
  return item.checked && item.status !== "pending";
}

export function isResolvedChecked(item: PlanItemResolved): boolean {
  if (item.kind === "custom") return item.customAction.completed;
  return item.checked;
}

export function sortForLinearView(
  items: PlanItemResolved[],
): PlanItemResolved[] {
  const open: PlanItemResolved[] = [];
  const done: PlanItemResolved[] = [];
  for (const item of items) {
    (isResolvedChecked(item) ? done : open).push(item);
  }
  return [...open, ...done];
}

/** Where a Plano item stands: not started, awaiting an escotista, or done. */
export type PlanItemState = "open" | "pending" | "done";

export function planItemState(item: PlanItemResolved): PlanItemState {
  if (isResolvedComplete(item)) return "done";
  return isResolvedChecked(item) ? "pending" : "open";
}
