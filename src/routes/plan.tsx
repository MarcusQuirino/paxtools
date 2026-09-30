import { useMemo, type ReactNode } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
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
import { Award, GripVertical } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Eixo } from "@/data/types";
import { eixoColor } from "@/data/eixo-colors";
import { AppShellSkeleton } from "@/components/layout/app-shell";
import { EscoteiroShell } from "@/components/progression/escoteiro-shell";
import { ActionItem } from "@/components/progression/action-item";
import { DeleteCustomButton } from "@/components/progression/custom-action-input";
import { PlanStar } from "@/components/progression/plan-star";
import { EmptyState } from "@/components/ui/empty-state";
import { RowChevron } from "@/components/ui/list-row";
import { Note } from "@/components/ui/section";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatusText } from "@/components/ui/status-pill";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useProgression } from "@/hooks/use-progression";
import { usePlan } from "@/hooks/use-plan";
import { notifyLevelUps } from "@/lib/level-up-toast";
import { toCanonicalSpecialtyId } from "@/lib/completion-logic";
import {
  buildCatalogIndex,
  resolvePlanItems,
  isResolvedChecked,
  isResolvedComplete,
  sortForLinearView,
  type PlanItemResolved,
} from "@/lib/plan-view";
import { cn } from "@/lib/utils";

type ViewMode = "byArea" | "ordered";

export const Route = createFileRoute("/plan")({
  // `?view=ordem` keeps "Minha ordem" across reloads and back navigation.
  validateSearch: (search: Record<string, unknown>): { view?: "ordem" } => ({
    view: search.view === "ordem" ? "ordem" : undefined,
  }),
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
  const { ready } = useAuthGate("escoteiro");
  if (!ready) return <AppShellSkeleton rows={3} />;
  return (
    <EscoteiroShell title="Plano">
      <PlanDashboard />
    </EscoteiroShell>
  );
}

type Handlers = {
  onToggleAction: (actionId: string, wasChecked: boolean) => void;
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
  onTogglePlanned: (itemKey: string) => void;
};

function PlanDashboard() {
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const viewMode: ViewMode = view === "ordem" ? "ordered" : "byArea";
  const setViewMode = (v: ViewMode) =>
    void navigate({ search: { view: v === "ordered" ? "ordem" : undefined }, replace: true });

  const {
    eixos,
    approvedActionIds,
    pendingActionIds,
    actionStatusMap,
    customActions,
    earnedSpecialtyIds,
  } = useProgression();
  const { items, togglePlanned, reorderPlan } = usePlan();

  const catalog = useMemo(() => buildCatalogIndex(eixos), [eixos]);
  const resolved = useMemo(
    () =>
      resolvePlanItems(items, {
        catalog,
        approvedActionIds,
        pendingActionIds,
        actionStatusMap,
        earnedSpecialtyIds,
        customActions,
      }),
    [
      items,
      catalog,
      approvedActionIds,
      pendingActionIds,
      actionStatusMap,
      earnedSpecialtyIds,
      customActions,
    ],
  );

  const toggleActionFn = useConvexMutation(api.progression.toggleAction);
  const { mutate: toggleAction } = useMutation({
    mutationFn: toggleActionFn,
    onSuccess: notifyLevelUps,
  });
  const toggleCustomFn = useConvexMutation(api.progression.toggleCustomAction);
  const { mutate: toggleCustom } = useMutation({
    mutationFn: toggleCustomFn,
    onSuccess: notifyLevelUps,
  });
  const deleteCustomFn = useConvexMutation(api.progression.deleteCustomAction);
  const { mutate: deleteCustom } = useMutation({ mutationFn: deleteCustomFn });

  if (resolved.length === 0) return <PlanEmptyState />;

  const handlers: Handlers = {
    onToggleAction: (actionId) => toggleAction({ actionId }),
    onToggleCustom: (id) => toggleCustom({ customActionId: id }),
    onDeleteCustom: (id) => deleteCustom({ customActionId: id }),
    onTogglePlanned: (itemKey) => togglePlanned({ itemKey }),
  };

  const done = resolved.filter(isResolvedComplete).length;
  const pending = resolved.filter((r) => isResolvedChecked(r) && !isResolvedComplete(r)).length;

  return (
    <div className="space-y-4">
      <p className="text-[13px] font-bold text-[#4A4A44]" data-testid="plan-counts">
        {resolved.length} {resolved.length === 1 ? "item" : "itens"} · {done}{" "}
        {done === 1 ? "feito" : "feitos"}
        {pending > 0 && <span className="text-[#6B4A00]"> · {pending} aguardando aprovação</span>}
      </p>
      <SegmentedControl
        ariaLabel="Organizar o plano"
        value={viewMode}
        onChange={setViewMode}
        options={[
          { value: "byArea", label: "Por área", testId: "plan-view-area" },
          { value: "ordered", label: "Minha ordem", testId: "plan-view-ordered" },
        ]}
      />

      {viewMode === "byArea" ? (
        <ByAreaView eixos={eixos} resolved={resolved} {...handlers} />
      ) : (
        <OrderedListView
          resolved={resolved}
          {...handlers}
          onReorder={(itemKey, beforeItemKey, afterItemKey) =>
            reorderPlan({ itemKey, beforeItemKey, afterItemKey })
          }
        />
      )}

      <Note>Toque na ★ em qualquer ação da Progressão para trazê-la para cá; na ★ daqui, para tirar do plano.</Note>
    </div>
  );
}

function PlanEmptyState() {
  return (
    <EmptyState title="Seu plano está vazio" testId="plan-empty">
      <p>
        Em <b>Progressão</b>, abra um bloco e toque na ★ ao lado das ações que você quer focar. Elas
        aparecem aqui.
      </p>
      <Link
        to="/"
        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[10px] border-2 border-[#141414] bg-white px-4 text-[15px] font-black text-[#141414] shadow-[2px_2px_0_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        Ir para Progressão
      </Link>
    </EmptyState>
  );
}

// ---------------------------------------------------------------------------
// Por área: eixo dot + "Eixo · Bloco" crumb, the bloco's plan cards below.
// ---------------------------------------------------------------------------

function ByAreaView({
  eixos,
  resolved,
  ...handlers
}: Handlers & { eixos: Eixo[]; resolved: PlanItemResolved[] }) {
  const groups = useMemo(() => {
    const byBloco = new Map<string, PlanItemResolved[]>();
    for (const r of resolved) {
      const list = byBloco.get(r.bloco.id) ?? [];
      list.push(r);
      byBloco.set(r.bloco.id, list);
    }
    return eixos.flatMap((eixo) =>
      eixo.blocos
        .filter((b) => byBloco.has(b.id))
        .map((bloco) => ({ eixo, bloco, items: byBloco.get(bloco.id)! })),
    );
  }, [eixos, resolved]);

  return (
    <div className="space-y-4">
      {groups.map(({ eixo, bloco, items }) => (
        <section key={bloco.id} data-testid={`plan-group-${bloco.id}`}>
          <h2 className="mb-1.5 ml-0.5 flex flex-wrap items-center gap-x-2 text-[12px] font-black uppercase tracking-[0.08em]">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[2px] border-2 border-[#141414]"
              style={{ background: eixoColor(eixo.id) }}
            />
            {eixo.name}
            <Link
              to="/bloco/$blocoId"
              params={{ blocoId: bloco.id }}
              className="font-bold normal-case tracking-[0.02em] text-[#8A887F] underline-offset-2 hover:underline"
            >
              · {bloco.name}
            </Link>
          </h2>
          <div className="space-y-2">
            {items.map((item) => (
              <PlanCard key={item.itemKey} item={item} idMode="raw" {...handlers} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Minha ordem: one draggable list (grip 36×44), eixo bar + bloco crumb.
// ---------------------------------------------------------------------------

type OrderedListViewProps = Handlers & {
  resolved: PlanItemResolved[];
  onReorder: (
    itemKey: string,
    beforeItemKey: string | undefined,
    afterItemKey: string | undefined,
  ) => void;
};

function OrderedListView({ resolved, onReorder, ...handlers }: OrderedListViewProps) {
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={itemKeys} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2">
          {ordered.map((item) => (
            <SortableRow key={item.itemKey} item={item} {...handlers} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ item, ...handlers }: Handlers & { item: PlanItemResolved }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.itemKey,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: "relative",
  };
  const grip = (
    <button
      type="button"
      className="-my-2 -ml-2 grid h-11 w-9 shrink-0 touch-none place-items-center rounded-md text-[#8A887F] hover:bg-black/[0.04] hover:text-[#141414]"
      aria-label="Arrastar"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-5" aria-hidden />
    </button>
  );
  return (
    <li ref={setNodeRef} style={style}>
      <PlanCard item={item} idMode="key" grip={grip} crumb {...handlers} />
    </li>
  );
}

// ---------------------------------------------------------------------------
// One plan card (both views): tappable/movable → paper + 2px hard shadow.
// ---------------------------------------------------------------------------

const KIND_LABEL = {
  fixed: "Ação fixa",
  variable: "Ação variável",
  custom: "Ação personalizada",
  specialty: "Especialidade",
} as const;

function PlanCard({
  item,
  idMode,
  grip,
  crumb,
  onToggleAction,
  onToggleCustom,
  onDeleteCustom,
  onTogglePlanned,
}: Handlers & {
  item: PlanItemResolved;
  /** DOM id of the check: raw action id (Por área) or plan key (Minha ordem). */
  idMode: "raw" | "key";
  grip?: ReactNode;
  /** Show the "Bloco · tipo" crumb in the eixo colour (Minha ordem). */
  crumb?: boolean;
}) {
  const color = eixoColor(item.eixo.id);
  const kindText =
    item.kind === "action" ? KIND_LABEL[item.actionType] : KIND_LABEL[item.kind];
  const kind = crumb ? (
    <span className="normal-case tracking-normal" style={{ color }}>
      {item.bloco.name} · {kindText.toLowerCase()}
    </span>
  ) : item.kind === "action" ? undefined : (
    kindText
  );
  const unstar = () => onTogglePlanned(item.itemKey);

  let body: ReactNode;
  if (item.kind === "action") {
    body = (
      <ActionItem
        id={idMode === "raw" ? item.actionId : item.itemKey}
        text={item.text}
        kind={kind}
        checked={item.checked}
        status={item.status}
        onToggle={() => onToggleAction(item.actionId, item.checked)}
        planned
        onTogglePlanned={unstar}
        lockApproved
        leading={grip}
      />
    );
  } else if (item.kind === "custom") {
    const c = item.customAction;
    const locked = c.completed && c.status !== "pending";
    body = (
      <ActionItem
        id={`custom-${c._id}`}
        text={c.text}
        kind={kind}
        checked={c.completed}
        status={c.status}
        onToggle={() => onToggleCustom(c._id)}
        planned
        onTogglePlanned={unstar}
        lockApproved
        leading={grip}
        trailing={!locked ? <DeleteCustomButton onClick={() => onDeleteCustom(c._id)} /> : null}
      />
    );
  } else {
    // Read-only since #47: an especialidade is earned on /especialidades.
    body = (
      <div className="flex min-h-14 items-start gap-3 py-3 pr-1 pl-3" data-state={item.checked ? "approved" : "open"}>
        {grip}
        <span
          aria-hidden
          className={cn(
            "-my-2.5 -ml-2.5 grid size-12 shrink-0 place-items-center",
            item.checked ? "text-[#0E6B4E]" : "text-[#4A4A44]",
          )}
        >
          <Award className="size-6" />
        </span>
        <Link
          to="/especialidades"
          search={{ specialty: toCanonicalSpecialtyId(item.specialtyName) }}
          className="flex min-w-0 flex-1 items-center gap-2 pt-0.5"
        >
          <span className="min-w-0 flex-1">
            <span className="mb-0.5 block text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#8A887F]">
              {kind ?? KIND_LABEL.specialty}
            </span>
            <span
              className={cn(
                "block text-[15px] leading-[1.4]",
                item.checked && "text-[#8A887F] line-through decoration-[#0E6B4E]",
              )}
            >
              {item.specialtyName}
            </span>
            <StatusText state={item.checked ? "approved" : "open"}>
              {item.checked ? "Conquistada" : undefined}
            </StatusText>
          </span>
          <RowChevron />
        </Link>
        <PlanStar planned onToggle={unstar} />
      </div>
    );
  }

  return (
    <div
      data-testid={`plan-item-${item.itemKey}`}
      className="flex overflow-hidden rounded-[10px] border-2 border-[#141414] bg-white shadow-[2px_2px_0_#141414]"
    >
      {crumb && (
        <span aria-hidden className="w-2 shrink-0 border-r-2 border-[#141414]" style={{ background: color }} />
      )}
      <div className="min-w-0 flex-1">{body}</div>
    </div>
  );
}
