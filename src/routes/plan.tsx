import { useEffect, useMemo, useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AuthButton } from "@/components/auth/auth-button";
import { Footer } from "@/components/footer";
import { PlanNav } from "@/components/progression/plan-nav";
import { EixoSection } from "@/components/progression/eixo-section";
import { ActionItem } from "@/components/progression/action-item";
import { useProgression } from "@/hooks/use-progression";
import { usePlan } from "@/hooks/use-plan";
import { EIXOS } from "@/data/progression-data";
import {
  buildCatalogIndex,
  resolvePlanItems,
  isResolvedComplete,
  sortForLinearView,
  type PlanItemResolved,
} from "@/lib/plan-view";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, Clock, GripVertical, Sparkles } from "lucide-react";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/plan")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        convexQuery(api.progression.getMyCompletions, {}),
      ),
      context.queryClient.ensureQueryData(
        convexQuery(api.plan.getMyPlan, {}),
      ),
    ]);
  },
  component: PlanPage,
});

function PlanPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      void navigate({ to: "/signin" });
      return;
    }
    if (!user) return;
    if (!user.onboardingComplete) {
      void navigate({ to: "/onboarding" });
      return;
    }
    if (user.role === "escotista") {
      void navigate({ to: "/escotista" });
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  if (
    isLoading ||
    !isAuthenticated ||
    !user ||
    !user.onboardingComplete ||
    user.role === "escotista"
  ) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-12 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-green-800">Paxtools</h1>
          <AuthButton />
        </header>
        <PlanNav />
        <PlanDashboard />
        <Footer />
      </div>
    </div>
  );
}

type ViewMode = "byArea" | "ordered";

function PlanDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("byArea");
  const {
    approvedActionIds,
    pendingActionIds,
    actionStatusMap,
    completedSpecialties,
    customActions,
    completedBlockIds,
    pendingBlockIds,
  } = useProgression();
  const { items, plannedKeys, togglePlanned, reorderPlan } = usePlan();

  const catalog = useMemo(() => buildCatalogIndex(EIXOS), []);
  const resolved = useMemo(
    () =>
      resolvePlanItems(items, {
        catalog,
        approvedActionIds,
        pendingActionIds,
        actionStatusMap,
        completedSpecialties,
        customActions,
      }),
    [
      items,
      catalog,
      approvedActionIds,
      pendingActionIds,
      actionStatusMap,
      completedSpecialties,
      customActions,
    ],
  );

  const toggleActionFn = useConvexMutation(api.progression.toggleAction);
  const { mutate: toggleAction } = useMutation({ mutationFn: toggleActionFn });
  const toggleSpecialtyFn = useConvexMutation(api.progression.toggleSpecialty);
  const { mutate: toggleSpecialty } = useMutation({
    mutationFn: toggleSpecialtyFn,
  });
  const toggleCustomFn = useConvexMutation(api.progression.toggleCustomAction);
  const { mutate: toggleCustom } = useMutation({ mutationFn: toggleCustomFn });
  const deleteCustomFn = useConvexMutation(api.progression.deleteCustomAction);
  const { mutate: deleteCustom } = useMutation({ mutationFn: deleteCustomFn });
  const addCustomFn = useConvexMutation(api.progression.addCustomAction);
  const { mutate: addCustom } = useMutation({ mutationFn: addCustomFn });

  if (items.length === 0) {
    return (
      <EmptyState />
    );
  }

  const plannedBlocoIds = new Set(resolved.map((r) => r.bloco.id));

  return (
    <div className="space-y-4">
      <ViewToggle viewMode={viewMode} onChange={setViewMode} />

      {viewMode === "byArea" ? (
        EIXOS.filter((eixo) =>
          eixo.blocos.some((b) => plannedBlocoIds.has(b.id)),
        ).map((eixo) => (
          <EixoSection
            key={eixo.id}
            eixo={eixo}
            approvedActionIds={approvedActionIds}
            pendingActionIds={pendingActionIds}
            actionStatusMap={actionStatusMap}
            completedBlockIds={completedBlockIds}
            pendingBlockIds={pendingBlockIds}
            customActions={customActions}
            completedSpecialties={completedSpecialties}
            onToggleAction={(actionId) => toggleAction({ actionId })}
            onToggleSpecialty={(blocoId, specialtyName) =>
              toggleSpecialty({ blocoId, specialtyName })
            }
            onAddCustom={(blocoId, text) => addCustom({ blocoId, text })}
            onToggleCustom={(id) => toggleCustom({ customActionId: id })}
            onDeleteCustom={(id) => deleteCustom({ customActionId: id })}
            plannedKeys={plannedKeys}
            onTogglePlanned={(itemKey) => togglePlanned({ itemKey })}
            blocoFilter={(blocoId) => plannedBlocoIds.has(blocoId)}
          />
        ))
      ) : (
        <OrderedListView
          resolved={resolved}
          onToggleAction={(actionId) => toggleAction({ actionId })}
          onToggleSpecialty={(blocoId, specialtyName) =>
            toggleSpecialty({ blocoId, specialtyName })
          }
          onToggleCustom={(id) => toggleCustom({ customActionId: id })}
          onDeleteCustom={(id) => deleteCustom({ customActionId: id })}
          onTogglePlanned={(itemKey) => togglePlanned({ itemKey })}
          onReorder={(itemKey, beforeItemKey, afterItemKey) =>
            reorderPlan({ itemKey, beforeItemKey, afterItemKey })
          }
        />
      )}
    </div>
  );
}

function ViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const base =
    "flex-1 text-sm h-9 rounded-md font-medium transition-colors";
  const active = "bg-card text-foreground shadow-sm";
  const inactive = "text-muted-foreground hover:text-foreground";
  return (
    <div className="flex gap-1 p-1 bg-muted/60 rounded-lg">
      <button
        type="button"
        onClick={() => onChange("byArea")}
        className={`${base} ${viewMode === "byArea" ? active : inactive}`}
      >
        Por Área
      </button>
      <button
        type="button"
        onClick={() => onChange("ordered")}
        className={`${base} ${viewMode === "ordered" ? active : inactive}`}
      >
        Minha Ordem
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border bg-card p-8 text-center space-y-3">
      <Sparkles className="size-8 mx-auto text-muted-foreground/50" />
      <p className="text-sm font-medium">Seu plano está vazio</p>
      <p className="text-xs text-muted-foreground">
        Volte para <b>Tudo</b> e toque na estrela ao lado dos itens que você
        quer focar. Eles vão aparecer aqui.
      </p>
    </div>
  );
}

type OrderedListViewProps = {
  resolved: PlanItemResolved[];
  onToggleAction: (actionId: string) => void;
  onToggleSpecialty: (blocoId: string, specialtyName: string) => void;
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
  onTogglePlanned: (itemKey: string) => void;
  onReorder: (
    itemKey: string,
    beforeItemKey: string | undefined,
    afterItemKey: string | undefined,
  ) => void;
};

function OrderedListView({
  resolved,
  onToggleAction,
  onToggleSpecialty,
  onToggleCustom,
  onDeleteCustom,
  onTogglePlanned,
  onReorder,
}: OrderedListViewProps) {
  const ordered = useMemo(() => sortForLinearView(resolved), [resolved]);
  const itemKeys = ordered.map((r) => r.itemKey);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = itemKeys.indexOf(String(active.id));
    const newIndex = itemKeys.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const without = itemKeys.filter((k) => k !== active.id);
    const beforeItemKey = without[newIndex - 1];
    const afterItemKey = without[newIndex];
    onReorder(String(active.id), beforeItemKey, afterItemKey);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={itemKeys} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {ordered.map((item) => (
            <SortableRow
              key={item.itemKey}
              item={item}
              onToggleAction={onToggleAction}
              onToggleSpecialty={onToggleSpecialty}
              onToggleCustom={onToggleCustom}
              onDeleteCustom={onDeleteCustom}
              onTogglePlanned={onTogglePlanned}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

type SortableRowProps = {
  item: PlanItemResolved;
  onToggleAction: (actionId: string) => void;
  onToggleSpecialty: (blocoId: string, specialtyName: string) => void;
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
  onTogglePlanned: (itemKey: string) => void;
};

function SortableRow({
  item,
  onToggleAction,
  onToggleSpecialty,
  onToggleCustom,
  onDeleteCustom,
  onTogglePlanned,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.itemKey });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const done = isResolvedComplete(item);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-card flex items-stretch"
    >
      <button
        type="button"
        className="px-2 flex items-center text-muted-foreground hover:text-foreground touch-none"
        aria-label="Arrastar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div
        className="flex-1 min-w-0 py-1 pr-1 border-l"
        style={{ borderLeftColor: item.eixo.color, borderLeftWidth: 3 }}
      >
        <div className="px-2 pt-1 flex items-center gap-1.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: item.eixo.color }}
          >
            {item.bloco.name}
          </span>
          {done && (
            <span className="text-[10px] text-muted-foreground">
              • concluído
            </span>
          )}
        </div>
        <RowBody
          item={item}
          onToggleAction={onToggleAction}
          onToggleSpecialty={onToggleSpecialty}
          onToggleCustom={onToggleCustom}
          onDeleteCustom={onDeleteCustom}
          onTogglePlanned={onTogglePlanned}
        />
      </div>
    </div>
  );
}

function RowBody({
  item,
  onToggleAction,
  onToggleSpecialty,
  onToggleCustom,
  onDeleteCustom,
  onTogglePlanned,
}: Omit<SortableRowProps, "item"> & { item: PlanItemResolved }) {
  if (item.kind === "action") {
    return (
      <ActionItem
        id={item.itemKey}
        text={item.text}
        checked={item.checked}
        status={item.status}
        onToggle={() => onToggleAction(item.actionId)}
        color={item.eixo.color}
        planned
        onTogglePlanned={() => onTogglePlanned(item.itemKey)}
      />
    );
  }
  if (item.kind === "specialty") {
    const isPending = item.checked && item.status === "pending";
    return (
      <label className="flex items-center gap-3 min-h-[44px] cursor-pointer px-3 py-2">
        <Checkbox
          checked={item.checked}
          onCheckedChange={() =>
            onToggleSpecialty(item.bloco.id, item.specialtyName)
          }
          className="size-5"
          style={item.checked ? { opacity: isPending ? 0.4 : 1 } : undefined}
        />
        <Award className="size-3.5 text-muted-foreground shrink-0" />
        <span
          className={`text-sm flex-1 ${
            item.checked
              ? isPending
                ? "text-muted-foreground/60"
                : "line-through text-muted-foreground"
              : ""
          }`}
        >
          {item.specialtyName}
        </span>
        {isPending && (
          <Clock className="size-3.5 text-amber-500 shrink-0" />
        )}
      </label>
    );
  }
  // custom
  const c = item.customAction;
  const isPending = c.completed && c.status === "pending";
  return (
    <div className="flex items-start gap-3 px-3 py-2 min-h-[44px]">
      <Checkbox
        checked={c.completed}
        onCheckedChange={() => onToggleCustom(c._id)}
        className="mt-0.5 size-5"
        style={
          c.completed
            ? {
                backgroundColor: item.eixo.color,
                borderColor: item.eixo.color,
                opacity: isPending ? 0.4 : 1,
              }
            : undefined
        }
      />
      <span
        className={`text-sm leading-relaxed flex-1 ${
          c.completed
            ? isPending
              ? "text-muted-foreground/60"
              : "line-through text-muted-foreground"
            : ""
        }`}
      >
        {c.text}
      </span>
      {isPending && (
        <Clock className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
      )}
      <button
        type="button"
        onClick={() => onDeleteCustom(c._id)}
        className="text-muted-foreground hover:text-destructive p-1"
        aria-label="Remover"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
