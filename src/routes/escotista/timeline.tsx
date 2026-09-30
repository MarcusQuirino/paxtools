import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { ListBox } from "@/components/ui/section";
import { ListRow } from "@/components/ui/list-row";
import { EmptyState } from "@/components/ui/empty-state";
import { HardButton } from "@/components/ui/hard-button";
import {
  Check,
  X,
  TrendingUp,
  Award,
  UserPlus,
  UserMinus,
  Shield,
  Tag,
} from "lucide-react";

export const Route = createFileRoute("/escotista/timeline")({
  component: TimelinePage,
});

type EventType =
  | "approval"
  | "rejection"
  | "levelUp"
  | "lisDeOuro"
  | "memberJoin"
  | "memberBan"
  | "ramoChange"
  | "accessChange";

/**
 * Semantic icon tiles: emerald = approved / progressed / joined, red =
 * rejected / banned, gold = the ramo's recognition (Lis de Ouro etc.),
 * neutral sand for administrative changes. No per-type rainbow.
 */
const TINT = {
  emerald: { background: "#DDF3E8", color: "#0E6B4E" },
  red: { background: "#FCE4E4", color: "#C62828" },
  gold: { background: "#F4C430", color: "#141414" },
  neutral: { background: "#EEE9DC", color: "#4A4A44" },
} as const;

const TYPE_META: Record<
  EventType,
  {
    icon: React.ComponentType<{ className?: string }>;
    tint: keyof typeof TINT;
    label: string;
  }
> = {
  approval: { icon: Check, tint: "emerald", label: "Aprovação" },
  rejection: { icon: X, tint: "red", label: "Rejeição" },
  levelUp: { icon: TrendingUp, tint: "emerald", label: "Nova etapa" },
  lisDeOuro: { icon: Award, tint: "gold", label: "Reconhecimento" },
  memberJoin: { icon: UserPlus, tint: "emerald", label: "Entrada" },
  memberBan: { icon: UserMinus, tint: "red", label: "Banimento" },
  accessChange: { icon: Shield, tint: "neutral", label: "Acesso" },
  ramoChange: { icon: Tag, tint: "neutral", label: "Ramo" },
};

function formatWhen(ts: number): string {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function TimelinePage() {
  const { ready } = useAuthGate("escotista");
  const { results, status, loadMore } = usePaginatedQuery(
    api.events.listTimeline,
    {},
    { initialNumItems: 25 },
  );

  // The backend filters each page AFTER reading numItems from the index, so a
  // ramo-scoped non-admin can get an empty first page while matching events
  // still sit on later pages. Keep advancing until something shows or the feed
  // is genuinely exhausted — otherwise the viewer is stranded on a false empty
  // state.
  useEffect(() => {
    if (results.length === 0 && status === "CanLoadMore") {
      loadMore(25);
    }
  }, [results.length, status, loadMore]);

  const loadingInitial = !ready || status === "LoadingFirstPage";
  // While we're still chasing empty filtered pages, show the skeleton, not the
  // empty state.
  const chasingPages =
    results.length === 0 &&
    (status === "CanLoadMore" || status === "LoadingMore");

  if (loadingInitial || chasingPages) {
    return (
      <div className="h-72 animate-pulse rounded-[10px] border-2 border-[#141414] bg-[#EEE9DC]" />
    );
  }

  if (results.length === 0) {
    return (
      <EmptyState title="Sem atividade ainda" testId="timeline-empty">
        As ações do grupo aparecerão aqui conforme acontecem.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <ListBox testId="timeline-feed">
        {results.map((e) => (
          <TimelineRow key={e._id} event={e} />
        ))}
      </ListBox>

      {status === "CanLoadMore" && (
        <HardButton tone="paper" size="md" full onClick={() => loadMore(25)}>
          Carregar mais
        </HardButton>
      )}
      {status === "LoadingMore" && (
        <div className="h-11 animate-pulse rounded-[10px] border-2 border-[#141414] bg-[#EEE9DC]" />
      )}
    </div>
  );
}

function TimelineRow({
  event,
}: {
  event: {
    _id: string;
    _creationTime: number;
    type: EventType;
    actorName: string | null;
    subjectName: string | null;
    summary: string | null;
  };
}) {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  const actor = event.actorName ?? "Alguém";
  const subject = event.subjectName ?? "membro";

  return (
    <ListRow
      data={{ type: event.type }}
      leading={
        <span
          className="grid size-9 shrink-0 place-items-center self-start rounded-md border-2 border-[#141414]"
          style={TINT[meta.tint]}
          role="img"
          aria-label={meta.label}
        >
          <Icon className="size-[18px]" />
        </span>
      }
      title={
        <>
          {actor}
          <span className="font-semibold text-[#8A887F]"> · </span>
          {subject}
        </>
      }
      subtitle={
        event.summary ? (
          <span className="line-clamp-2 text-[#4A4A44]" title={event.summary}>
            {event.summary}
          </span>
        ) : undefined
      }
      trailing={
        <span className="shrink-0 self-start pt-0.5 text-[12px] font-bold text-[#8A887F]">
          {formatWhen(event._creationTime)}
        </span>
      }
    />
  );
}
