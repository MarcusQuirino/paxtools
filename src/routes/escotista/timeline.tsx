import { createFileRoute } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  TrendingUp,
  Award,
  UserPlus,
  UserMinus,
  Shield,
  Tag,
  ScrollText,
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

const TYPE_META: Record<
  EventType,
  { icon: React.ComponentType<{ className?: string }>; tint: string }
> = {
  approval: { icon: Check, tint: "bg-emerald-100 text-emerald-800" },
  rejection: { icon: X, tint: "bg-red-100 text-red-800" },
  levelUp: { icon: TrendingUp, tint: "bg-blue-100 text-blue-800" },
  lisDeOuro: { icon: Award, tint: "bg-amber-100 text-amber-800" },
  memberJoin: { icon: UserPlus, tint: "bg-emerald-100 text-emerald-800" },
  memberBan: { icon: UserMinus, tint: "bg-red-100 text-red-800" },
  accessChange: { icon: Shield, tint: "bg-purple-100 text-purple-800" },
  ramoChange: { icon: Tag, tint: "bg-sky-100 text-sky-800" },
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

  if (!ready || status === "LoadingFirstPage") {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-md border-2 border-black bg-muted"
          />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div
        data-testid="timeline-empty"
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <ScrollText className="size-12 text-muted-foreground/40 mb-3" />
        <h2 className="font-semibold text-lg">Sem atividade ainda</h2>
        <p className="text-sm text-muted-foreground mt-1">
          As ações do grupo aparecerão aqui conforme acontecem.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="timeline-feed" className="space-y-2">
      {results.map((e) => (
        <TimelineRow key={e._id} event={e} />
      ))}

      {status === "CanLoadMore" && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-black"
            onClick={() => loadMore(25)}
          >
            Carregar mais
          </Button>
        </div>
      )}
      {status === "LoadingMore" && (
        <div className="h-10 animate-pulse rounded-md border-2 border-black bg-muted" />
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
    <div className="flex items-start gap-3 rounded-md border-2 border-black bg-card px-3 py-2.5 shadow-[2px_2px_0px_0px_#000]">
      <div
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border-2 border-black ${meta.tint}`}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <span className="font-bold">{actor}</span>{" "}
          <span className="text-muted-foreground">·</span>{" "}
          <span className="font-semibold">{subject}</span>
        </p>
        {event.summary && (
          <p className="text-xs text-muted-foreground truncate">
            {event.summary}
          </p>
        )}
      </div>
      <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
        {formatWhen(event._creationTime)}
      </span>
    </div>
  );
}
