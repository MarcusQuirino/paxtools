import { useCallback, useMemo, useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Check } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ListBox } from "@/components/ui/section";
import { KpiGrid, KpiTile } from "@/components/ui/kpi-tile";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { HardButton } from "@/components/ui/hard-button";
import { ActionCheck } from "@/components/ui/action-check";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { eixoColor } from "@/data/eixo-colors";
import { RAMO_LABELS } from "@/lib/ramos";
import { notifyLevelUps } from "@/lib/level-up-toast";
import {
  buildPendingItems,
  hasBulk,
  planSelection,
  type PendingEntry,
  type PendingItem,
} from "@/components/escotista/pending-items";
import {
  progressLabel,
  useScoutProgress,
} from "@/components/escotista/use-scout-progress";

export const Route = createFileRoute("/escotista/pending")({
  component: PendingApprovalsPage,
});

function errorMessage(err: unknown): string {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  if (err instanceof Error) return err.message;
  return "Não foi possível concluir";
}

function PendingApprovalsPage() {
  const { data: pendingData } = useSuspenseQuery(
    convexQuery(api.approvals.getPendingForGroup, {}),
  );
  const progress = useScoutProgress();

  const people = useMemo(
    () =>
      (pendingData as PendingEntry[]).map((entry) => ({
        entry,
        items: buildPendingItems(entry),
      })),
    [pendingData],
  );
  const allItems = useMemo(() => people.flatMap((p) => p.items), [people]);

  // Nothing is selected by default: the action bar spans every escoteiro, so
  // an "all selected" default would make one tap approve the whole queue.
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // Keys of items that left the queue (approved elsewhere) drop out on their own.
  const selected = useMemo(
    () => new Set(allItems.filter((i) => picked.has(i.key)).map((i) => i.key)),
    [allItems, picked],
  );
  const [busy, setBusy] = useState(false);

  const bulkAction = useConvexMutation(api.approvals.bulkAction);
  const approveItems = useConvexMutation(api.specialties.approveSpecialtyItems);
  const rejectItems = useConvexMutation(api.specialties.rejectSpecialtyItems);
  const approveStep = useConvexMutation(api.specialties.approveSpecialtyStep);
  const rejectStep = useConvexMutation(api.specialties.rejectSpecialtyStep);

  const toggle = useCallback((key: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const setMany = useCallback((keys: string[], on: boolean) => {
    setPicked((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  }, []);

  const run = async (action: "approve" | "reject") => {
    const plan = planSelection(allItems, selected);
    const calls: Promise<unknown>[] = [];
    if (hasBulk(plan)) {
      calls.push(
        bulkAction({
          action,
          actionIds: plan.bulk.actionIds as Id<"actionCompletions">[],
          irrIds: plan.bulk.irrIds as Id<"irrCompletions">[],
          customActionIds: plan.bulk.customActionIds as Id<"customActions">[],
        }),
      );
    }
    for (const g of plan.specialtyItems) {
      const args = {
        escoteiroId: g.escoteiroId as Id<"users">,
        specialtyId: g.specialtyId,
        ramoGroup: g.ramoGroup,
        itemIds: g.itemIds as Id<"specialtyItemCompletions">[],
      };
      calls.push(action === "approve" ? approveItems(args) : rejectItems(args));
    }
    for (const id of plan.reportIds) {
      const args = { reportId: id as Id<"specialtyProjectReports"> };
      calls.push(action === "approve" ? approveStep(args) : rejectStep(args));
    }
    if (calls.length === 0) return;

    setBusy(true);
    const results = await Promise.allSettled(calls);
    setBusy(false);
    let failed = 0;
    for (const r of results) {
      if (r.status === "fulfilled") {
        if (action === "approve") notifyLevelUps(r.value);
      } else {
        failed++;
        toast.error(errorMessage(r.reason));
      }
    }
    if (failed === 0) setPicked(new Set());
  };

  if (people.length === 0) {
    return (
      <EmptyState title="Tudo em dia!" testId="pending-empty">
        Não há itens pendentes de aprovação.
      </EmptyState>
    );
  }

  const n = selected.size;
  const allOn = n === allItems.length;

  return (
    <div className="space-y-4 pb-20">
      <KpiGrid>
        <KpiTile tone="gold" value={allItems.length} label="Aguardando" testId="kpi-itens" />
        <KpiTile value={people.length} label="Escoteiros" testId="kpi-escoteiros" />
      </KpiGrid>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-bold text-[#8A887F]">
          {n === 0
            ? "Toque para selecionar."
            : `${n} de ${allItems.length} selecionados`}
        </p>
        <HardButton
          tone="ghost"
          size="sm"
          className="-mr-2 whitespace-nowrap"
          onClick={() => setMany(allItems.map((i) => i.key), !allOn)}
        >
          {allOn ? "Limpar seleção" : "Selecionar tudo"}
        </HardButton>
      </div>

      <div className="space-y-3">
        {people.map(({ entry, items }) => (
          <PersonCard
            key={entry.escoteiro._id}
            entry={entry}
            items={items}
            subtitle={
              progressLabel(progress.get(entry.escoteiro._id)) ??
              (entry.escoteiro.ramo ? RAMO_LABELS[entry.escoteiro.ramo] : "")
            }
            selected={selected}
            onToggle={toggle}
            onSetMany={setMany}
          />
        ))}
      </div>

      {/* Shown once something is selected (frame 5): Aprovar is the screen's
          one 4px CTA; Rejeitar is the paper secondary. */}
      {n > 0 && (
        <div
          className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-4"
          data-testid="pending-action-bar"
        >
          <div className="mx-auto flex max-w-lg gap-2">
            <HardButton
              tone="primary"
              size="lg"
              className="flex-1"
              disabled={busy}
              onClick={() => void run("approve")}
            >
              <Check aria-hidden strokeWidth={3} />
              Aprovar ({n})
            </HardButton>
            <HardButton
              tone="paper"
              size="lg"
              disabled={busy}
              onClick={() => void run("reject")}
            >
              Rejeitar
            </HardButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PersonCard({
  entry,
  items,
  subtitle,
  selected,
  onToggle,
  onSetMany,
}: {
  entry: PendingEntry;
  items: PendingItem[];
  subtitle: string;
  selected: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onSetMany: (keys: string[], on: boolean) => void;
}) {
  const name = entry.escoteiro.name ?? "Sem nome";
  const picked = items.filter((i) => selected.has(i.key)).length;
  const all = picked === items.length;
  const toggleAll = () => onSetMany(items.map((i) => i.key), !all);

  return (
    <ListBox testId="pending-person">
      <div className="flex min-h-16 items-center gap-3 border-b-2 border-[#141414] py-2.5 pl-3 pr-3">
        <ActionCheck
          state={all ? "selected" : "open"}
          onClick={toggleAll}
          ariaLabel={`Selecionar tudo de ${name}`}
        />
        {/* The name is a second, larger target for the same "select all". */}
        <button
          type="button"
          onClick={toggleAll}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <PersonAvatar
            id={entry.escoteiro._id}
            name={entry.escoteiro.name}
            image={entry.escoteiro.image}
            size={36}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-black leading-tight">{name}</span>
            <span className="mt-0.5 block text-[12px] font-bold text-[#8A887F]">
              {picked > 0 && !all ? `${picked} de ${items.length} selecionados` : subtitle}
            </span>
          </span>
          <StatusPill state="pending">
            {entry.totalPending}
            <span className="sr-only"> pendente{entry.totalPending !== 1 ? "s" : ""}</span>
          </StatusPill>
        </button>
      </div>
      {items.map((item) => (
        <PendingRow
          key={item.key}
          item={item}
          selected={selected.has(item.key)}
          onToggle={() => onToggle(item.key)}
        />
      ))}
    </ListBox>
  );
}

function PendingRow({
  item,
  selected,
  onToggle,
}: {
  item: PendingItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="flex min-h-14 items-start gap-3 border-t-[1.5px] border-[#D9D5C9] py-2.5 pl-3 pr-3 first:border-t-0"
      data-testid="pending-item"
      data-kind={item.kind}
      data-selected={selected}
    >
      <ActionCheck
        state={selected ? "selected" : "open"}
        onClick={onToggle}
        ariaLabel={`${item.ctx}: ${item.text}`}
      />
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="min-w-0 flex-1 pt-0.5 text-left"
      >
        <span className="mb-0.5 flex items-start gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.05em] text-[#8A887F]">
          {item.eixoId && (
            <span
              className="mt-[3px] size-2 shrink-0 rounded-full"
              style={{ background: eixoColor(item.eixoId) }}
              aria-hidden
            />
          )}
          <span className="leading-tight">{item.ctx}</span>
        </span>
        <span
          className={`block text-[15px] leading-snug text-[#141414] ${
            item.kind === "report" ? "whitespace-pre-wrap" : ""
          } ${expanded ? "" : "line-clamp-3"}`}
        >
          {item.text}
        </span>
      </button>
    </div>
  );
}
