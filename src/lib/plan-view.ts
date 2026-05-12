import type { Bloco, CustomAction, Eixo } from "@/data/types";
import type { Doc } from "../../convex/_generated/dataModel";
import { decodePlanKey } from "./plan-keys";

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
      itemKey: string;
      position: number;
      kind: "custom";
      eixo: Eixo;
      bloco: Bloco;
      customAction: CustomAction;
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
  completedSpecialties: {
    blocoId: string;
    specialtyName: string;
    status: "pending" | "approved";
  }[];
  customActions: CustomAction[];
};

export function resolvePlanItems(
  planned: Doc<"plannedItems">[],
  input: ResolverInput,
): PlanItemResolved[] {
  const customById = new Map(input.customActions.map((c) => [c._id, c]));
  const specialtyByKey = new Map(
    input.completedSpecialties.map((s) => [
      `${s.blocoId}:${s.specialtyName}`,
      s,
    ]),
  );

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
      const completion = specialtyByKey.get(
        `${decoded.blocoId}:${decoded.specialtyName}`,
      );
      resolved.push({
        itemKey: p.itemKey,
        position: p.position,
        kind: "specialty",
        eixo: hit.eixo,
        bloco: hit.bloco,
        specialtyName: decoded.specialtyName,
        checked: !!completion,
        status: completion?.status,
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
