import { useState, useMemo, useCallback } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronDown, Inbox } from "lucide-react";
import {
  getEixosForRamo,
  parseActionId,
  type Ramo,
} from "@/data/progression-data";
import { getRamoRules } from "@/data/progression-rules";
import { notifyLevelUps } from "@/lib/level-up-toast";

export const Route = createFileRoute("/escotista/pending")({
  component: PendingApprovalsPage,
});

function getActionLabel(actionId: string): string {
  const parsed = parseActionId(actionId);
  if (!parsed) return actionId;
  const eixos = getEixosForRamo(parsed.ramo);
  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) {
      if (bloco.id === parsed.blocoId) {
        const actions =
          parsed.type === "fixed" ? bloco.fixedActions : bloco.variableActions;
        return actions[parsed.index]?.text ?? actionId;
      }
    }
  }
  return actionId;
}

function getBlocoName(blocoId: string, ramo: Ramo | null): string {
  const eixos = getEixosForRamo(ramo);
  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) {
      if (bloco.id === blocoId) return bloco.name;
    }
  }
  return blocoId;
}

function getEixoForBloco(blocoId: string, ramo: Ramo | null) {
  const eixos = getEixosForRamo(ramo);
  for (const eixo of eixos) {
    for (const bloco of eixo.blocos) {
      if (bloco.id === blocoId) return eixo;
    }
  }
  return null;
}

type PendingItem = {
  key: string;
  type: "action" | "specialty" | "irr" | "custom";
  id: string;
  text: string;
  blocoId?: string;
  eixoColor?: string;
};

function PendingApprovalsPage() {
  const { data: pendingData } = useSuspenseQuery(
    convexQuery(api.approvals.getPendingForGroup, {}),
  );

  const bulkActionFn = useConvexMutation(api.approvals.bulkAction);
  const { mutate: bulkAction, isPending: isBulkPending } = useMutation({
    mutationFn: bulkActionFn,
    onSuccess: notifyLevelUps,
  });

  if (pendingData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="size-12 text-muted-foreground/40 mb-3" />
        <h2 className="font-semibold text-lg">Tudo em dia!</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Não há itens pendentes de aprovação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingData.map((entry) => (
        <EscoteiroPendingCard
          key={entry.escoteiro._id}
          entry={entry}
          onBulkAction={bulkAction}
          isBulkPending={isBulkPending}
        />
      ))}
    </div>
  );
}

type PendingEntry = {
  escoteiro: {
    _id: Id<"users">;
    name?: string | null;
    image?: string | null;
    ramo: Ramo | null;
  };
  pendingActions: {
    _id: Id<"actionCompletions">;
    actionId: string;
  }[];
  pendingSpecialties: {
    _id: Id<"specialtyCompletions">;
    blocoId: string;
    specialtyName: string;
  }[];
  pendingIrrItems: {
    _id: Id<"irrCompletions">;
    itemId: string;
  }[];
  pendingCustomActions: {
    _id: Id<"customActions">;
    blocoId: string;
    text: string;
  }[];
  totalPending: number;
};

function EscoteiroPendingCard({
  entry,
  onBulkAction,
  isBulkPending,
}: {
  entry: PendingEntry;
  onBulkAction: (args: {
    action: "approve" | "reject";
    actionIds: Id<"actionCompletions">[];
    specialtyIds: Id<"specialtyCompletions">[];
    irrIds: Id<"irrCompletions">[];
    customActionIds: Id<"customActions">[];
  }) => void;
  isBulkPending: boolean;
}) {
  const ramo = entry.escoteiro.ramo;
  const irr = getRamoRules(ramo).irr;
  // Build a flat list of all pending items with unique keys
  const allItems = useMemo(() => {
    const items: PendingItem[] = [];

    for (const action of entry.pendingActions) {
      const parsed = parseActionId(action.actionId);
      const blocoId = parsed?.blocoId ?? "";
      items.push({
        key: `action:${action._id}`,
        type: "action",
        id: action._id,
        text: getActionLabel(action.actionId),
        blocoId,
        eixoColor: getEixoForBloco(blocoId, ramo)?.color,
      });
    }

    for (const s of entry.pendingSpecialties) {
      items.push({
        key: `specialty:${s._id}`,
        type: "specialty",
        id: s._id,
        text: `${s.specialtyName} (${getBlocoName(s.blocoId, ramo)})`,
        blocoId: s.blocoId,
      });
    }

    for (const l of entry.pendingIrrItems) {
      const label =
        irr.items.find((i) => i.id === l.itemId)?.text ??
        l.itemId.replace("irr_", "").replace(/_/g, " ");
      items.push({
        key: `irr:${l._id}`,
        type: "irr",
        id: l._id,
        text: label,
      });
    }

    for (const c of entry.pendingCustomActions) {
      items.push({
        key: `custom:${c._id}`,
        type: "custom",
        id: c._id,
        text: c.text,
        blocoId: c.blocoId,
        eixoColor: getEixoForBloco(c.blocoId, ramo)?.color,
      });
    }

    return items;
  }, [entry, ramo, irr]);

  // All items selected by default
  const [deselected, setDeselected] = useState<Set<string>>(new Set());

  const selectedCount = allItems.length - deselected.size;
  const allSelected = deselected.size === 0;
  const noneSelected = deselected.size === allItems.length;

  const toggleItem = useCallback((key: string) => {
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setDeselected(new Set(allItems.map((i) => i.key)));
    } else {
      setDeselected(new Set());
    }
  }, [allSelected, allItems]);

  const getSelectedIds = useCallback(() => {
    const actionIds: Id<"actionCompletions">[] = [];
    const specialtyIds: Id<"specialtyCompletions">[] = [];
    const irrIds: Id<"irrCompletions">[] = [];
    const customActionIds: Id<"customActions">[] = [];

    for (const item of allItems) {
      if (deselected.has(item.key)) continue;
      if (item.type === "action")
        actionIds.push(item.id as Id<"actionCompletions">);
      else if (item.type === "specialty")
        specialtyIds.push(item.id as Id<"specialtyCompletions">);
      else if (item.type === "irr")
        irrIds.push(item.id as Id<"irrCompletions">);
      else if (item.type === "custom")
        customActionIds.push(item.id as Id<"customActions">);
    }

    return { actionIds, specialtyIds, irrIds, customActionIds };
  }, [allItems, deselected]);

  const handleBulk = useCallback(
    (action: "approve" | "reject") => {
      const ids = getSelectedIds();
      onBulkAction({ action, ...ids });
    },
    [getSelectedIds, onBulkAction],
  );

  // Group items by section for display
  const actionsByBloco = useMemo(() => {
    const map = new Map<
      string,
      { items: PendingItem[]; eixoColor?: string }
    >();
    for (const item of allItems) {
      if (item.type !== "action" && item.type !== "custom") continue;
      const blocoId = item.blocoId ?? "";
      const group = map.get(blocoId) ?? {
        items: [],
        eixoColor: item.eixoColor,
      };
      group.items.push(item);
      map.set(blocoId, group);
    }
    return map;
  }, [allItems]);

  const specialties = allItems.filter((i) => i.type === "specialty");
  const irrItems = allItems.filter((i) => i.type === "irr");

  return (
    <Collapsible>
      <div className="rounded-md border-2 border-black bg-card overflow-hidden shadow-[3px_3px_0px_0px_#000]">
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors">
          <Avatar className="size-9 border-2 border-black">
            <AvatarImage src={entry.escoteiro.image ?? undefined} />
            <AvatarFallback className="text-xs font-bold">
              {entry.escoteiro.name?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold truncate">
              {entry.escoteiro.name ?? "Sem nome"}
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-amber-800 border-amber-600 bg-amber-50 text-xs"
          >
            {entry.totalPending} pendente{entry.totalPending !== 1 ? "s" : ""}
          </Badge>
          <ChevronDown className="size-4 text-foreground" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t-2 border-black px-4 py-3 space-y-3">
            {/* Select all toggle */}
            <label className="flex items-center gap-2 cursor-pointer py-1 px-1">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
              />
              <span className="text-xs font-bold text-muted-foreground">
                {allSelected
                  ? "Todos selecionados"
                  : `${selectedCount}/${allItems.length} selecionados`}
              </span>
            </label>

            {/* Actions grouped by bloco */}
            {Array.from(actionsByBloco.entries()).map(
              ([blocoId, { items, eixoColor }]) => (
                <div key={blocoId} className="space-y-0.5">
                  <p
                    className="text-xs font-black uppercase tracking-widest"
                    style={{ color: eixoColor }}
                  >
                    {getBlocoName(blocoId, ramo)}
                  </p>
                  {items.map((item) => (
                    <SelectableItem
                      key={item.key}
                      text={item.text}
                      selected={!deselected.has(item.key)}
                      onToggle={() => toggleItem(item.key)}
                    />
                  ))}
                </div>
              ),
            )}

            {/* Specialties */}
            {specialties.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Especialidades
                </p>
                {specialties.map((item) => (
                  <SelectableItem
                    key={item.key}
                    text={item.text}
                    selected={!deselected.has(item.key)}
                    onToggle={() => toggleItem(item.key)}
                  />
                ))}
              </div>
            )}

            {/* IRR (recognition) items — named for the escoteiro's ramo */}
            {irrItems.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-xs font-black uppercase tracking-widest text-primary">
                  {irr.name}
                </p>
                {irrItems.map((item) => (
                  <SelectableItem
                    key={item.key}
                    text={item.text}
                    selected={!deselected.has(item.key)}
                    onToggle={() => toggleItem(item.key)}
                  />
                ))}
              </div>
            )}

            {/* Bulk action buttons */}
            <div className="pt-2 border-t-2 border-black flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-emerald-700 text-white border-black hover:bg-emerald-800"
                onClick={() => handleBulk("approve")}
                disabled={noneSelected || isBulkPending}
              >
                <Check className="size-4 mr-1" />
                Aprovar ({selectedCount})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-destructive text-white border-black hover:bg-destructive/80"
                onClick={() => handleBulk("reject")}
                disabled={noneSelected || isBulkPending}
              >
                <X className="size-4 mr-1" />
                Rejeitar ({selectedCount})
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function SelectableItem({
  text,
  selected,
  onToggle,
}: {
  text: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex items-start gap-3 py-1.5 px-1 hover:bg-muted/40 rounded-md transition-colors">
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        aria-label={text}
        className="mt-0.5 shrink-0"
      />
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`text-sm flex-1 text-left ${expanded ? "" : "line-clamp-2"} ${!selected ? "text-muted-foreground line-through" : ""}`}
        title={expanded ? "Recolher" : "Expandir"}
      >
        {text}
      </button>
    </div>
  );
}
