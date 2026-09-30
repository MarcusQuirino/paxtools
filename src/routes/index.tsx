import { useEffect, useMemo, useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useProgression } from "@/hooks/use-progression";
import { AppShellSkeleton } from "@/components/layout/app-shell";
import { StageBanner } from "@/components/progression/stage-banner";
import { EixoSection } from "@/components/progression/eixo-section";
import { BlocoRow } from "@/components/progression/bloco-card";
import { RecognitionSection } from "@/components/progression/recognition-section";
import { EscoteiroShell } from "@/components/progression/escoteiro-shell";
import { ListBox, Section } from "@/components/ui/section";
import { notifyLevelUps } from "@/lib/level-up-toast";
import {
  LAST_BLOCO_KEY,
  pickContinueBloco,
  summarizeAll,
} from "@/lib/bloco-summary";

export const Route = createFileRoute("/")({
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
  component: Home,
});

function Home() {
  const { ready } = useAuthGate("escoteiro");

  // Skeleton while loading OR while the user needs onboarding/redirect.
  if (!ready) return <AppShellSkeleton rows={3} />;

  return (
    <EscoteiroShell title="Progressão">
      <Dashboard />
    </EscoteiroShell>
  );
}

/** Last bloco screen the escoteiro opened (client-only, read after hydration). */
function useLastVisitedBloco(enabled: boolean): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    try {
      setId(window.localStorage.getItem(LAST_BLOCO_KEY));
    } catch {
      // Storage unavailable (private mode) — fall back to the heuristic.
    }
  }, [enabled]);
  return id;
}

/**
 * The Progressão body (Design A frame 1): etapa hero · "Continue de onde
 * parou" · eixos with bloco rows (each pushes /bloco/$blocoId) · Reconhecimento
 * de Ramo. Also rendered by the escotista's impersonation view with
 * `targetUserId` (no "continue" card; bloco screens open for that scout).
 */
export function Dashboard({ targetUserId }: { targetUserId?: Id<"users"> }) {
  const {
    ramoRules,
    eixos,
    approvedActionIds,
    pendingActionIds,
    customActions,
    completedBlockIds,
    pendingBlockIds,
    earnedSpecialtyBlocoIds,
    completedBlockCount,
    pendingBlockCount,
    approvedIrrItemIds,
    pendingIrrItemIds,
    stage,
    nextStage,
    blocksComplete,
    irrComplete,
  } = useProgression(targetUserId);

  // Escoteiros can't un-check their own approved items; escotistas viewing a
  // scout keep edit rights.
  const lockApproved = !targetUserId;
  const isOwn = !targetUserId;

  const summaries = useMemo(
    () =>
      summarizeAll(eixos, {
        approvedActionIds,
        pendingActionIds,
        customActions,
        earnedSpecialtyBlocoIds,
      }),
    [eixos, approvedActionIds, pendingActionIds, customActions, earnedSpecialtyBlocoIds],
  );

  const lastVisited = useLastVisitedBloco(isOwn);
  const continueWith = isOwn ? pickContinueBloco(eixos, summaries, lastVisited) : null;
  const continueSummary = continueWith ? summaries.get(continueWith.bloco.id) : undefined;

  const toggleIrrItemFn = useConvexMutation(api.progression.toggleIrrItem);
  const { mutate: toggleIrrItem } = useMutation({
    mutationFn: toggleIrrItemFn,
    onSuccess: notifyLevelUps,
  });

  const totalBlocos = eixos.reduce((n, e) => n + e.blocos.length, 0);

  return (
    <div>
      <StageBanner
        etapas={ramoRules.etapas}
        irr={ramoRules.irr}
        stage={stage}
        nextStage={nextStage}
        completedBlockCount={completedBlockCount}
        pendingBlockCount={pendingBlockCount}
        irrComplete={irrComplete}
      />

      {continueWith && continueSummary && (
        <Section label="Continue de onde parou">
          <ListBox testId="continue-card">
            <BlocoRow
              bloco={continueWith.bloco}
              summary={continueSummary}
              eixoName={continueWith.eixo.name}
              testId="continue-bloco"
            />
          </ListBox>
        </Section>
      )}

      <Section label="Eixos" meta={`${totalBlocos} blocos`}>
        {eixos.map((eixo) => (
          <EixoSection
            key={eixo.id}
            eixo={eixo}
            summaries={summaries}
            completedBlockIds={completedBlockIds}
            pendingBlockIds={pendingBlockIds}
            escoteiroId={targetUserId}
          />
        ))}
      </Section>

      <RecognitionSection
        irr={ramoRules.irr}
        blocksComplete={blocksComplete}
        approvedIrrItemIds={approvedIrrItemIds}
        pendingIrrItemIds={pendingIrrItemIds}
        irrComplete={irrComplete}
        onToggleItem={(itemId) => toggleIrrItem({ itemId, targetUserId })}
        lockApproved={lockApproved}
      />
    </div>
  );
}
