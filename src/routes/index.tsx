import { useEffect } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AuthButton } from "@/components/auth/auth-button";
import { useProgression } from "@/hooks/use-progression";
import { StageBanner } from "@/components/progression/stage-banner";
import { OverallProgress } from "@/components/progression/overall-progress";
import { EixoSection } from "@/components/progression/eixo-section";
import { LisDeOuroSection } from "@/components/progression/lis-de-ouro-section";
import { Footer } from "@/components/footer";
import { EIXOS } from "@/data/progression-data";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.progression.getMyCompletions, {}),
    );
  },
  component: Home,
});

function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();

  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));

  // Redirect based on auth/role state
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

  // Show skeleton while loading OR while user needs onboarding/redirect
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
          <header className="flex items-center justify-between">
            <div className="h-6 w-20 animate-pulse rounded bg-muted" />
            <div className="size-8 animate-pulse rounded-full bg-muted" />
          </header>
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
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
        <Dashboard />
        <Footer />
      </div>
    </div>
  );
}

export function Dashboard({ targetUserId }: { targetUserId?: Id<"users"> }) {
  const {
    approvedActionIds,
    pendingActionIds,
    actionStatusMap,
    completedSpecialties,
    customActions,
    completedBlockIds,
    pendingBlockIds,
    completedBlockCount,
    pendingBlockCount,
    approvedLisItemIds,
    pendingLisItemIds,
    stage,
    nextStage,
    blocksComplete,
    lisDeOuro,
  } = useProgression(targetUserId);

  const toggleActionFn = useConvexMutation(api.progression.toggleAction);
  const { mutate: toggleAction } = useMutation({ mutationFn: toggleActionFn });

  const toggleSpecialtyFn = useConvexMutation(api.progression.toggleSpecialty);
  const { mutate: toggleSpecialty } = useMutation({
    mutationFn: toggleSpecialtyFn,
  });

  const addCustomFn = useConvexMutation(api.progression.addCustomAction);
  const { mutate: addCustom } = useMutation({ mutationFn: addCustomFn });

  const toggleCustomFn = useConvexMutation(api.progression.toggleCustomAction);
  const { mutate: toggleCustom } = useMutation({ mutationFn: toggleCustomFn });

  const deleteCustomFn = useConvexMutation(api.progression.deleteCustomAction);
  const { mutate: deleteCustom } = useMutation({ mutationFn: deleteCustomFn });

  const toggleLisItemFn = useConvexMutation(
    api.progression.toggleLisDeOuroItem,
  );
  const { mutate: toggleLisItem } = useMutation({
    mutationFn: toggleLisItemFn,
  });

  const handleToggleAction = (actionId: string) => {
    toggleAction({ actionId, targetUserId });
  };

  const handleToggleSpecialty = (blocoId: string, specialtyName: string) => {
    toggleSpecialty({ blocoId, specialtyName, targetUserId });
  };

  const handleAddCustom = (blocoId: string, text: string) => {
    addCustom({ blocoId, text, targetUserId });
  };

  const handleToggleCustom = (id: Id<"customActions">) => {
    toggleCustom({ customActionId: id, targetUserId });
  };

  const handleDeleteCustom = (id: Id<"customActions">) => {
    deleteCustom({ customActionId: id, targetUserId });
  };

  const handleToggleLisItem = (itemId: string) => {
    toggleLisItem({ itemId, targetUserId });
  };

  return (
    <div className="space-y-4">
      <StageBanner
        stage={stage}
        nextStage={nextStage}
        completedBlockCount={completedBlockCount}
        pendingBlockCount={pendingBlockCount}
        lisDeOuro={lisDeOuro}
      />

      <OverallProgress
        completedBlockIds={completedBlockIds}
        pendingBlockIds={pendingBlockIds}
      />

      {EIXOS.map((eixo) => (
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
          onToggleAction={handleToggleAction}
          onToggleSpecialty={handleToggleSpecialty}
          onAddCustom={handleAddCustom}
          onToggleCustom={handleToggleCustom}
          onDeleteCustom={handleDeleteCustom}
        />
      ))}

      <LisDeOuroSection
        blocksComplete={blocksComplete}
        approvedLisItemIds={approvedLisItemIds}
        pendingLisItemIds={pendingLisItemIds}
        lisDeOuro={lisDeOuro}
        onToggleItem={handleToggleLisItem}
      />
    </div>
  );
}
