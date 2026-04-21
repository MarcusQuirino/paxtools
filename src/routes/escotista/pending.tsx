import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronDown, CheckCheck, Inbox } from "lucide-react";
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

function PendingApprovalsPage() {
  const { data: pendingData } = useSuspenseQuery(
    convexQuery(api.approvals.getPendingForGroup, {}),
  );

  const approveActionFn = useConvexMutation(api.approvals.approveAction);
  const { mutate: approveAction } = useMutation({
    mutationFn: approveActionFn,
  });

  const rejectActionFn = useConvexMutation(api.approvals.rejectAction);
  const { mutate: rejectAction } = useMutation({
    mutationFn: rejectActionFn,
  });

  const approveSpecialtyFn = useConvexMutation(api.approvals.approveSpecialty);
  const { mutate: approveSpecialty } = useMutation({
    mutationFn: approveSpecialtyFn,
  });

  const rejectSpecialtyFn = useConvexMutation(api.approvals.rejectSpecialty);
  const { mutate: rejectSpecialty } = useMutation({
    mutationFn: rejectSpecialtyFn,
  });

  const approveLisFn = useConvexMutation(api.approvals.approveLisDeOuroItem);
  const { mutate: approveLis } = useMutation({ mutationFn: approveLisFn });

  const rejectLisFn = useConvexMutation(api.approvals.rejectLisDeOuroItem);
  const { mutate: rejectLis } = useMutation({ mutationFn: rejectLisFn });

  const approveAllFn = useConvexMutation(api.approvals.approveAllForEscoteiro);
  const { mutate: approveAll } = useMutation({ mutationFn: approveAllFn });

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
          onApproveAction={(id) => approveAction({ completionId: id })}
          onRejectAction={(id) => rejectAction({ completionId: id })}
          onApproveSpecialty={(id) => approveSpecialty({ completionId: id })}
          onRejectSpecialty={(id) => rejectSpecialty({ completionId: id })}
          onApproveLis={(id) => approveLis({ completionId: id })}
          onRejectLis={(id) => rejectLis({ completionId: id })}
          onApproveAll={() =>
            approveAll({ escoteiroId: entry.escoteiro._id })
          }
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
  onApproveAction,
  onRejectAction,
  onApproveSpecialty,
  onRejectSpecialty,
  onApproveLis,
  onRejectLis,
  onApproveAll,
}: {
  entry: PendingEntry;
  onApproveAction: (id: Id<"actionCompletions">) => void;
  onRejectAction: (id: Id<"actionCompletions">) => void;
  onApproveSpecialty: (id: Id<"specialtyCompletions">) => void;
  onRejectSpecialty: (id: Id<"specialtyCompletions">) => void;
  onApproveLis: (id: Id<"lisDeOuroCompletions">) => void;
  onRejectLis: (id: Id<"lisDeOuroCompletions">) => void;
  onApproveAll: () => void;
}) {
  // Group actions by eixo/bloco
  const actionsByBloco = new Map<
    string,
    { _id: Id<"actionCompletions">; actionId: string; text: string }[]
  >();
  for (const action of entry.pendingActions) {
    const blocoId = action.actionId.split(":")[0] ?? "";
    const items = actionsByBloco.get(blocoId) ?? [];
    items.push({ ...action, text: getActionLabel(action.actionId) });
    actionsByBloco.set(blocoId, items);
  }

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
          <div className="border-t px-4 py-3 space-y-4">
            {/* Actions grouped by bloco */}
            {Array.from(actionsByBloco.entries()).map(
              ([blocoId, actions]) => {
                const eixo = getEixoForBloco(blocoId);
                return (
                  <div key={blocoId} className="space-y-1">
                    <p
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: eixo?.color }}
                    >
                      {getBlocoName(blocoId)}
                    </p>
                    {actions.map((action) => (
                      <PendingItemRow
                        key={action._id}
                        text={action.text}
                        onApprove={() => onApproveAction(action._id)}
                        onReject={() => onRejectAction(action._id)}
                      />
                    ))}
                  </div>
                );
              },
            )}

            {/* Specialties */}
            {entry.pendingSpecialties.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Especialidades
                </p>
                {entry.pendingSpecialties.map((s) => (
                  <PendingItemRow
                    key={s._id}
                    text={`${s.specialtyName} (${getBlocoName(s.blocoId)})`}
                    onApprove={() => onApproveSpecialty(s._id)}
                    onReject={() => onRejectSpecialty(s._id)}
                  />
                ))}
              </div>
            )}

            {/* Lis de Ouro items */}
            {entry.pendingLisItems.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-green-700">
                  Lis de Ouro
                </p>
                {entry.pendingLisItems.map((item) => (
                  <PendingItemRow
                    key={item._id}
                    text={item.itemId.replace("lis_", "").replace(/_/g, " ")}
                    onApprove={() => onApproveLis(item._id)}
                    onReject={() => onRejectLis(item._id)}
                  />
                ))}
              </div>
            )}

            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={onApproveAll}
              >
                <CheckCheck className="size-4 mr-1" />
                Aprovar tudo ({entry.totalPending})
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function PendingItemRow({
  text,
  onApprove,
  onReject,
}: {
  text: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-1">
      <span className="text-sm flex-1 line-clamp-2">{text}</span>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onApprove}
          className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
          aria-label="Aprovar"
        >
          <Check className="size-4" />
        </button>
        <button
          type="button"
          onClick={onReject}
          className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
          aria-label="Rejeitar"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
