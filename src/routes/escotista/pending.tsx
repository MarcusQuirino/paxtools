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
import { EIXOS } from "@/data/progression-data";

export const Route = createFileRoute("/escotista/pending")({
  component: PendingApprovalsPage,
});

function getActionLabel(actionId: string): string {
  const parts = actionId.split(":");
  const blocoId = parts[0];
  const type = parts[1];
  const index = parseInt(parts[2] ?? "0", 10);

  for (const eixo of EIXOS) {
    for (const bloco of eixo.blocos) {
      if (bloco.id === blocoId) {
        const actions =
          type === "fixed" ? bloco.fixedActions : bloco.variableActions;
        const action = actions[index];
        return action?.text ?? actionId;
      }
    }
  }
  return actionId;
}

function getBlocoName(blocoId: string): string {
  for (const eixo of EIXOS) {
    for (const bloco of eixo.blocos) {
      if (bloco.id === blocoId) return bloco.name;
    }
  }
  return blocoId;
}

function getEixoForBloco(blocoId: string) {
  for (const eixo of EIXOS) {
    for (const bloco of eixo.blocos) {
      if (bloco.id === blocoId) return eixo;
    }
  }
  return null;
}

type PendingItem = {
  key: string;
  type: "action" | "specialty" | "lis";
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
  pendingLisItems: {
    _id: Id<"lisDeOuroCompletions">;
    itemId: string;
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
    lisIds: Id<"lisDeOuroCompletions">[];
  }) => void;
  isBulkPending: boolean;
}) {
  // Build a flat list of all pending items with unique keys
  const allItems = useMemo(() => {
    const items: PendingItem[] = [];

    for (const action of entry.pendingActions) {
      const blocoId = action.actionId.split(":")[0] ?? "";
      items.push({
        key: `action:${action._id}`,
        type: "action",
        id: action._id,
        text: getActionLabel(action.actionId),
        blocoId,
        eixoColor: getEixoForBloco(blocoId)?.color,
      });
    }

    for (const s of entry.pendingSpecialties) {
      items.push({
        key: `specialty:${s._id}`,
        type: "specialty",
        id: s._id,
        text: `${s.specialtyName} (${getBlocoName(s.blocoId)})`,
        blocoId: s.blocoId,
      });
    }

    for (const l of entry.pendingLisItems) {
      items.push({
        key: `lis:${l._id}`,
        type: "lis",
        id: l._id,
        text: l.itemId.replace("lis_", "").replace(/_/g, " "),
      });
    }

    return items;
  }, [entry]);

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
    const lisIds: Id<"lisDeOuroCompletions">[] = [];

    for (const item of allItems) {
      if (deselected.has(item.key)) continue;
      if (item.type === "action")
        actionIds.push(item.id as Id<"actionCompletions">);
      else if (item.type === "specialty")
        specialtyIds.push(item.id as Id<"specialtyCompletions">);
      else if (item.type === "lis")
        lisIds.push(item.id as Id<"lisDeOuroCompletions">);
    }

    return { actionIds, specialtyIds, lisIds };
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
      if (item.type !== "action") continue;
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
  const lisItems = allItems.filter((i) => i.type === "lis");

  return (
    <Collapsible>
      <div className="rounded-xl border bg-card overflow-hidden">
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors">
          <Avatar className="size-9">
            <AvatarImage src={entry.escoteiro.image ?? undefined} />
            <AvatarFallback className="text-xs">
              {entry.escoteiro.name?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">
              {entry.escoteiro.name ?? "Sem nome"}
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-amber-600 border-amber-300 text-xs"
          >
            {entry.totalPending} pendente{entry.totalPending !== 1 ? "s" : ""}
          </Badge>
          <ChevronDown className="size-4 text-muted-foreground" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 py-3 space-y-3">
            {/* Select all toggle */}
            <label className="flex items-center gap-2 cursor-pointer py-1 px-1">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                className="size-4"
              />
              <span className="text-xs font-medium text-muted-foreground">
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
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: eixoColor }}
                  >
                    {getBlocoName(blocoId)}
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
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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

            {/* Lis de Ouro items */}
            {lisItems.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
                  Lis de Ouro
                </p>
                {lisItems.map((item) => (
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
            <div className="pt-2 border-t flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => handleBulk("approve")}
                disabled={noneSelected || isBulkPending}
              >
                <Check className="size-4 mr-1" />
                Aprovar ({selectedCount})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
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
  return (
    <label className="flex items-center gap-3 py-1.5 px-1 cursor-pointer hover:bg-muted/30 rounded-md transition-colors">
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        className="size-4"
      />
      <span
        className={`text-sm flex-1 line-clamp-2 ${!selected ? "text-muted-foreground line-through" : ""}`}
      >
        {text}
      </span>
    </label>
  );
}
