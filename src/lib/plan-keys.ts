import type { Id } from "../../convex/_generated/dataModel";

export type PlanItemKey =
  | { kind: "action"; actionId: string }
  | { kind: "specialty"; blocoId: string; specialtyName: string }
  /** Starred from the /especialidades catalog — not tied to a bloco. */
  | { kind: "especialidade"; specialtyId: string }
  | { kind: "custom"; customActionId: Id<"customActions"> };

export function encodePlanKey(item: PlanItemKey): string {
  switch (item.kind) {
    case "action":
      return `action:${item.actionId}`;
    case "specialty":
      return `specialty:${item.blocoId}:${item.specialtyName}`;
    case "especialidade":
      return `especialidade:${item.specialtyId}`;
    case "custom":
      return `custom:${item.customActionId}`;
  }
}

export function decodePlanKey(key: string): PlanItemKey | null {
  if (key.startsWith("action:")) {
    return { kind: "action", actionId: key.slice("action:".length) };
  }
  if (key.startsWith("specialty:")) {
    const rest = key.slice("specialty:".length);
    const idx = rest.indexOf(":");
    if (idx < 0) return null;
    return {
      kind: "specialty",
      blocoId: rest.slice(0, idx),
      specialtyName: rest.slice(idx + 1),
    };
  }
  if (key.startsWith("especialidade:")) {
    return {
      kind: "especialidade",
      specialtyId: key.slice("especialidade:".length),
    };
  }
  if (key.startsWith("custom:")) {
    return {
      kind: "custom",
      customActionId: key.slice("custom:".length) as Id<"customActions">,
    };
  }
  return null;
}
