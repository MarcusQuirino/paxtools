import { useEffect } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: "/signin" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
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
      </div>
    </div>
  );
}

function Dashboard() {
  const {
    completedActionIds,
    completedSpecialties,
    customActions,
    completedBlockIds,
    completedBlockCount,
    completedLisItemIds,
    stage,
    nextStage,
    blocksComplete,
    lisDeOuro,
  } = useProgression();

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
    toggleAction({ actionId });
  };

  const handleToggleSpecialty = (blocoId: string, specialtyName: string) => {
    toggleSpecialty({ blocoId, specialtyName });
  };

  const handleAddCustom = (blocoId: string, text: string) => {
    addCustom({ blocoId, text });
  };

  const handleToggleCustom = (id: Id<"customActions">) => {
    toggleCustom({ customActionId: id });
  };

  const handleDeleteCustom = (id: Id<"customActions">) => {
    deleteCustom({ customActionId: id });
  };

  const handleToggleLisItem = (itemId: string) => {
    toggleLisItem({ itemId });
  };

  return (
    <div className="space-y-4">
      <StageBanner
        stage={stage}
        nextStage={nextStage}
        completedBlockCount={completedBlockCount}
        lisDeOuro={lisDeOuro}
      />

      <OverallProgress completedBlockIds={completedBlockIds} />

      {EIXOS.map((eixo) => (
        <EixoSection
          key={eixo.id}
          eixo={eixo}
          completedActionIds={completedActionIds}
          completedBlockIds={completedBlockIds}
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
        completedLisItemIds={completedLisItemIds}
        lisDeOuro={lisDeOuro}
        onToggleItem={handleToggleLisItem}
      />
    </div>
  );
}
