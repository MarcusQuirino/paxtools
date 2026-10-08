import { Suspense, useState } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useProgression } from "@/hooks/use-progression";
import { buildRevisaoDeck } from "@/lib/revisao-deck";
import { RevisaoScreen } from "@/components/revisao-rapida/revisao-screen";

type RevisaoSearch = { escoteiroId?: string };

export const Route = createFileRoute("/revisao-rapida")({
  // Revisão rápida (#141). Without params the escoteiro reviews their own
  // ações; `?escoteiroId=<id>` is an escotista marking for that escoteiro.
  validateSearch: (search: Record<string, unknown>): RevisaoSearch => ({
    escoteiroId:
      typeof search.escoteiroId === "string" && search.escoteiroId
        ? search.escoteiroId
        : undefined,
  }),
  loaderDeps: ({ search: { escoteiroId } }) => ({ escoteiroId }),
  loader: async ({ context, deps }) => {
    // Not getCompletionsForUser: it throws when unauthenticated, and a hard
    // load runs this loader before the session is up. The component fetches
    // it once the auth gate is ready.
    const queries = deps.escoteiroId
      ? [convexQuery(api.groups.getGroupMembers, {})]
      : [
          convexQuery(api.progression.getMyCompletions, {}),
          convexQuery(api.plan.getMyPlan, {}),
        ];
    await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queries.map((q) => context.queryClient.ensureQueryData(q as any)),
    );
  },
  component: RevisaoRapidaPage,
});

function RevisaoRapidaPage() {
  const { escoteiroId } = Route.useSearch();
  const { ready } = useAuthGate(escoteiroId ? "escotista" : "escoteiro");

  if (!ready) return <ScreenSkeleton />;
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      {escoteiroId ? (
        <EscotistaRevisao escoteiroId={escoteiroId as Id<"users">} />
      ) : (
        <EscoteiroRevisao />
      )}
    </Suspense>
  );
}

/** The escoteiro's own deck: Plano first, marks go to Pendentes. */
function EscoteiroRevisao() {
  const progression = useProgression();
  const { data: plan } = useSuspenseQuery(convexQuery(api.plan.getMyPlan, {}));
  // Snapshot once per run: reactive updates from our own swipes must not
  // reshuffle or shrink the deck mid-run.
  const [deck] = useState(() =>
    buildRevisaoDeck({
      progression,
      planItemKeys: plan.map((i) => i.itemKey),
      random: Math.random,
    }),
  );
  return <RevisaoScreen deck={deck} />;
}

/** An escotista marking for one escoteiro: no Plano, marks approved. */
function EscotistaRevisao({ escoteiroId }: { escoteiroId: Id<"users"> }) {
  const { data: members } = useSuspenseQuery(
    convexQuery(api.groups.getGroupMembers, {}),
  );
  const progression = useProgression(escoteiroId);
  const [deck] = useState(() =>
    buildRevisaoDeck({ progression, planItemKeys: [], random: Math.random }),
  );
  const name = members.find((m) => m._id === escoteiroId)?.name ?? "Escoteiro";
  return <RevisaoScreen deck={deck} target={{ id: escoteiroId, name }} />;
}

function ScreenSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex max-w-lg flex-col gap-3 px-4 py-3">
        <div className="h-10 animate-pulse rounded-md border-2 border-black bg-muted" />
        <div className="h-[420px] animate-pulse rounded-lg border-2 border-black bg-muted" />
        <div className="h-16 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
