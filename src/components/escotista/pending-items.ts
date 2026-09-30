/**
 * Pure model for the escotista Pendentes queue: flattens one escoteiro's
 * pending rows (ações, ações personalizadas, IRR, itens de especialidade,
 * relatos de etapa) into a single selectable list with a context line, and
 * splits a selection back into the mutation calls that approve/reject it.
 */
import {
  getEixosForRamo,
  parseActionId,
  type Ramo,
} from "@/data/progression-data";
import { getRamoRules } from "@/data/progression-rules";
import { YOUNGER_SPECIALTY_BY_ID } from "@/data/specialty-data/younger";
import {
  OLDER_SPECIALTY_BY_ID,
  PROJECT_STEP_LABELS,
  type ProjectStep,
} from "@/data/specialty-data/older";

export type RamoGroup = "younger" | "older";

export type PendingEntry = {
  escoteiro: { _id: string; name?: string | null; image?: string | null; ramo: Ramo | null };
  pendingActions: { _id: string; actionId: string }[];
  pendingIrrItems: { _id: string; itemId: string }[];
  pendingCustomActions: { _id: string; blocoId: string; text: string }[];
  pendingSpecialtyItems?: {
    _id: string;
    specialtyId: string;
    itemIndex: number;
    ramoGroup: RamoGroup;
  }[];
  pendingSpecialtyReports?: {
    _id: string;
    specialtyId: string;
    step: ProjectStep;
    text: string;
    ramoGroup: RamoGroup;
  }[];
  totalPending: number;
};

export type PendingKind = "action" | "custom" | "irr" | "specItem" | "report";

export type PendingItem = {
  /** Unique across the whole queue: `${kind}:${id}`. */
  key: string;
  kind: PendingKind;
  id: string;
  escoteiroId: string;
  /** 12px caps line above the text: "Bloco · fixa", "Especialidade X · item 3"… */
  ctx: string;
  text: string;
  /** Eixo id for the context dot (none for IRR). */
  eixoId?: string;
  specialtyId?: string;
  ramoGroup?: RamoGroup;
};

function findBloco(blocoId: string, ramo: Ramo | null) {
  for (const eixo of getEixosForRamo(ramo)) {
    for (const bloco of eixo.blocos) {
      if (bloco.id === blocoId) return { eixo, bloco };
    }
  }
  return null;
}

function specialtyName(id: string): { name: string; eixoId?: string } {
  const s = YOUNGER_SPECIALTY_BY_ID.get(id) ?? OLDER_SPECIALTY_BY_ID.get(id);
  return s ? { name: s.name, eixoId: s.eixoId } : { name: id };
}

export function buildPendingItems(entry: PendingEntry): PendingItem[] {
  const ramo = entry.escoteiro.ramo;
  const escoteiroId = entry.escoteiro._id;
  const items: PendingItem[] = [];

  for (const a of entry.pendingActions) {
    const parsed = parseActionId(a.actionId);
    const found = parsed ? findBloco(parsed.blocoId, parsed.ramo) : null;
    const list = found && parsed
      ? parsed.type === "fixed"
        ? found.bloco.fixedActions
        : found.bloco.variableActions
      : null;
    items.push({
      key: `action:${a._id}`,
      kind: "action",
      id: a._id,
      escoteiroId,
      ctx: found && parsed
        ? `${found.bloco.name} · ${parsed.type === "fixed" ? "fixa" : "variável"}`
        : "Ação",
      text: (parsed && list?.[parsed.index]?.text) ?? a.actionId,
      eixoId: found?.eixo.id,
    });
  }

  for (const c of entry.pendingCustomActions) {
    const found = findBloco(c.blocoId, ramo);
    items.push({
      key: `custom:${c._id}`,
      kind: "custom",
      id: c._id,
      escoteiroId,
      ctx: `${found?.bloco.name ?? c.blocoId} · personalizada`,
      text: c.text,
      eixoId: found?.eixo.id,
    });
  }

  const irr = getRamoRules(ramo).irr;
  for (const l of entry.pendingIrrItems) {
    items.push({
      key: `irr:${l._id}`,
      kind: "irr",
      id: l._id,
      escoteiroId,
      ctx: irr.name,
      text:
        irr.items.find((i) => i.id === l.itemId)?.text ??
        l.itemId.replace("irr_", "").replace(/_/g, " "),
    });
  }

  for (const s of entry.pendingSpecialtyItems ?? []) {
    const { name, eixoId } = specialtyName(s.specialtyId);
    const text = YOUNGER_SPECIALTY_BY_ID.get(s.specialtyId)?.items[s.itemIndex];
    items.push({
      key: `specItem:${s._id}`,
      kind: "specItem",
      id: s._id,
      escoteiroId,
      ctx: `Especialidade ${name} · item ${s.itemIndex + 1}`,
      text: text ?? `Item ${s.itemIndex + 1}`,
      eixoId,
      specialtyId: s.specialtyId,
      ramoGroup: s.ramoGroup,
    });
  }

  for (const r of entry.pendingSpecialtyReports ?? []) {
    const { name, eixoId } = specialtyName(r.specialtyId);
    items.push({
      key: `report:${r._id}`,
      kind: "report",
      id: r._id,
      escoteiroId,
      ctx: `Relato · ${name} · ${PROJECT_STEP_LABELS[r.step] ?? r.step}`,
      text: r.text,
      eixoId,
      specialtyId: r.specialtyId,
      ramoGroup: r.ramoGroup,
    });
  }

  return items;
}

export type SelectionPlan = {
  /** One `approvals.bulkAction` call (spans escoteiros). */
  bulk: { actionIds: string[]; irrIds: string[]; customActionIds: string[] };
  /** One approve/rejectSpecialtyItems call per (escoteiro, especialidade, grupo). */
  specialtyItems: {
    escoteiroId: string;
    specialtyId: string;
    ramoGroup: RamoGroup;
    itemIds: string[];
  }[];
  /** One approve/rejectSpecialtyStep call per relato. */
  reportIds: string[];
};

export function planSelection(items: PendingItem[], selected: ReadonlySet<string>): SelectionPlan {
  const plan: SelectionPlan = {
    bulk: { actionIds: [], irrIds: [], customActionIds: [] },
    specialtyItems: [],
    reportIds: [],
  };
  const groups = new Map<string, SelectionPlan["specialtyItems"][number]>();
  for (const item of items) {
    if (!selected.has(item.key)) continue;
    switch (item.kind) {
      case "action":
        plan.bulk.actionIds.push(item.id);
        break;
      case "irr":
        plan.bulk.irrIds.push(item.id);
        break;
      case "custom":
        plan.bulk.customActionIds.push(item.id);
        break;
      case "report":
        plan.reportIds.push(item.id);
        break;
      case "specItem": {
        const k = `${item.escoteiroId}|${item.ramoGroup}|${item.specialtyId}`;
        let g = groups.get(k);
        if (!g) {
          g = {
            escoteiroId: item.escoteiroId,
            specialtyId: item.specialtyId!,
            ramoGroup: item.ramoGroup!,
            itemIds: [],
          };
          groups.set(k, g);
          plan.specialtyItems.push(g);
        }
        g.itemIds.push(item.id);
        break;
      }
    }
  }
  return plan;
}

export function hasBulk(plan: SelectionPlan): boolean {
  const b = plan.bulk;
  return b.actionIds.length + b.irrIds.length + b.customActionIds.length > 0;
}
