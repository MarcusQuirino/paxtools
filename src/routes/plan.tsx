import { useMemo, useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { EscoteiroShell } from "@/components/progression/escoteiro-shell";
import { EixoSection } from "@/components/progression/eixo-section";
import { ActionItem } from "@/components/progression/action-item";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useProgression } from "@/hooks/use-progression";
import { usePlan } from "@/hooks/use-plan";
import { useResolvedPlan } from "@/hooks/use-resolved-plan";
import {
  isResolvedComplete,
  sortForLinearView,
  type PlanItemResolved,
} from "@/lib/plan-view";
import { PlanStar } from "@/components/progression/plan-star";
import { Checkbox } from "@/components/ui/checkbox";
import { Award, Clock, GripVertical, Sparkles, Trophy } from "lucide-react";
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
      context.queryClient.ensureQueryData(
        convexQuery(api.specialties.getMyEspecialidades, {}),
      ),
    ]);
  },
  component: PlanPage,
});

function PlanPage() {
  const { ready } = useAuthGate("escoteiro");

  if (!ready) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
          <div className="h-6 w-32 animate-pulse rounded-md border-2 border-black bg-muted" />
          <div className="h-12 animate-pulse rounded-md border-2 border-black bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <EscoteiroShell title="Plano">
      <PlanDashboard />
    </EscoteiroShell>
  );
}

type ViewMode = "byArea" | "ordered";

function PlanDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("byArea");
  const progression = useProgression();
  const { eixos } = progression;
  const { items, plannedKeys, togglePlanned, reorderPlan } = usePlan();
  const { data: especialidadesRecord } = useSuspenseQuery(
    convexQuery(api.specialties.getMyEspecialidades, {}),
  );
  const resolved = useResolvedPlan(items, progression, especialidadesRecord);

  const toggleActionFn = useConvexMutation(api.progression.toggleAction);
  const { mutate: toggleAction } = useMutation({ mutationFn: toggleActionFn });
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

  const plannedBlocoIds = new Set<string>();
  const especialidadesByEixo = new Map<string, EspecialidadeItem[]>();
  for (const r of resolved) {
    if (r.kind === "especialidade") {
      const list = especialidadesByEixo.get(r.eixo.id) ?? [];
      list.push(r);
      especialidadesByEixo.set(r.eixo.id, list);
    } else {
      plannedBlocoIds.add(r.bloco.id);
    }
  }

  return (
    <div className="space-y-4">
      <ViewToggle viewMode={viewMode} onChange={setViewMode} />

      {viewMode === "byArea" ? (
        eixos.filter(
          (eixo) =>
            eixo.blocos.some((b) => plannedBlocoIds.has(b.id)) ||
            especialidadesByEixo.has(eixo.id),
        ).map((eixo) => (
          <EixoSection
            key={eixo.id}
            eixo={eixo}
            footer={
              especialidadesByEixo.has(eixo.id) && (
                <PlannedEspecialidades
                  items={especialidadesByEixo.get(eixo.id)!}
                  onTogglePlanned={(itemKey) => togglePlanned({ itemKey })}
                />
              )
            }
            progression={progression}
            onToggleAction={(actionId) => toggleAction({ actionId })}
            onAddCustom={(blocoId, text) => addCustom({ blocoId, text })}
            onToggleCustom={(id) => toggleCustom({ customActionId: id })}
            onDeleteCustom={(id) => deleteCustom({ customActionId: id })}
            plannedKeys={plannedKeys}
            onTogglePlanned={(itemKey) => togglePlanned({ itemKey })}
            blocoFilter={(blocoId) => plannedBlocoIds.has(blocoId)}
            planOnly
            lockApproved
          />
        ))
      ) : (
        <OrderedListView
          resolved={resolved}
          onToggleAction={(actionId) => toggleAction({ actionId })}
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
    "flex-1 text-sm h-9 rounded-md font-bold transition-all";
  const active = "bg-primary text-white border-2 border-black shadow-[2px_2px_0px_0px_#000]";
  const inactive = "text-foreground border-2 border-transparent hover:border-black hover:bg-white";
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-md border-2 border-black">
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
    <div className="rounded-md border-2 border-dashed border-black bg-card p-8 text-center space-y-3">
      <Sparkles className="size-8 mx-auto text-primary" />
      <p className="text-sm font-black uppercase">Seu plano está vazio</p>
      <p className="text-xs font-medium text-muted-foreground">
        Vá em <b>Progressão</b> ou <b>Especialidades</b> e toque na estrela ao
        lado dos itens que você quer focar. Eles vão aparecer aqui.
      </p>
    </div>
  );
}

type OrderedListViewProps = {
  resolved: PlanItemResolved[];
  onToggleAction: (actionId: string) => void;
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
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
  onTogglePlanned: (itemKey: string) => void;
};

function SortableRow({
  item,
  onToggleAction,
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
      className="rounded-md border-2 border-black bg-card flex items-stretch shadow-[2px_2px_0px_0px_#000]"
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
            {item.kind === "especialidade" ? "Especialidade" : item.bloco.name}
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
        lockApproved
      />
    );
  }
  if (item.kind === "especialidade") {
    return (
      <EspecialidadeRow
        item={item}
        onTogglePlanned={() => onTogglePlanned(item.itemKey)}
      />
    );
  }
  if (item.kind === "specialty") {
    // Read-only since #47: an especialidade is earned on /especialidades, never
    // ticked from the plano.
    return (
      <div className="flex items-center gap-3 min-h-[44px] px-3 py-2">
        <Checkbox checked={item.checked} disabled className="size-5" />
        <Award className="size-3.5 text-muted-foreground shrink-0" />
        <span
          className={`text-sm flex-1 ${
            item.checked ? "line-through text-muted-foreground" : ""
          }`}
        >
          {item.specialtyName}
        </span>
      </div>
    );
  }
  // custom
  const c = item.customAction;
  const isPending = c.completed && c.status === "pending";
  const isLocked = c.completed && c.status === "approved";
  return (
    <div className="flex items-start gap-3 px-3 py-2 min-h-[44px]">
      <Checkbox
        checked={c.completed}
        onCheckedChange={() => onToggleCustom(c._id)}
        disabled={isLocked}
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
      {!isLocked && (
        <button
          type="button"
          onClick={() => onDeleteCustom(c._id)}
          className="text-muted-foreground hover:text-destructive p-1"
          aria-label="Remover"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

type EspecialidadeItem = Extract<PlanItemResolved, { kind: "especialidade" }>;

/** An eixo's starred especialidades, below its blocos in "Por Área". */
function PlannedEspecialidades({
  items,
  onTogglePlanned,
}: {
  items: EspecialidadeItem[];
  onTogglePlanned: (itemKey: string) => void;
}) {
  return (
    <div className="border-t-2 border-black">
      <div className="flex items-center gap-2 px-4 pt-3 text-xs font-semibold text-muted-foreground uppercase">
        <Award className="size-3.5" />
        Especialidades
      </div>
      <div className="pb-1">
        {items.map((item) => (
          <EspecialidadeRow
            key={item.itemKey}
            item={item}
            onTogglePlanned={() => onTogglePlanned(item.itemKey)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * A starred catalog especialidade: progress at a glance, tap to open its card
 * on /especialidades (where items/etapas are marked). Done = earned.
 */
function EspecialidadeRow({
  item,
  onTogglePlanned,
}: {
  item: EspecialidadeItem;
  onTogglePlanned: () => void;
}) {
  const { approved, total, unit } = item.progress;
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 min-h-[44px] px-3 py-2">
      <Link
        to="/especialidades"
        search={{ specialty: item.specialtyId }}
        aria-label={`abrir ${item.name}`}
        className="flex-1 min-w-0 flex items-center gap-3"
      >
        {item.checked ? (
          <Trophy className="size-4 text-yellow-600 shrink-0" />
        ) : (
          <Award className="size-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm ${
              item.checked ? "line-through text-muted-foreground" : ""
            }`}
          >
            {item.name}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted border border-black/20 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: item.eixo.color }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {approved}/{total} {unit}
            </span>
          </div>
        </div>
      </Link>
      <PlanStar
        planned
        onToggle={onTogglePlanned}
        color={item.eixo.color}
        label={`Remover ${item.name} do plano`}
      />
    </div>
  );
}
