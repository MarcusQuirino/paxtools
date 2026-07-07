import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AuthButton } from "@/components/auth/auth-button";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useProgression } from "@/hooks/use-progression";
import { usePlan } from "@/hooks/use-plan";
import { StageBanner } from "@/components/progression/stage-banner";
import { OverallProgress } from "@/components/progression/overall-progress";
import { EixoSection } from "@/components/progression/eixo-section";
import { RecognitionSection } from "@/components/progression/recognition-section";
import { PlanNav } from "@/components/progression/plan-nav";
import { Footer } from "@/components/footer";
import { notifyLevelUps } from "@/lib/level-up-toast";
import type { Eixo } from "@/data/types";

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

  // Show skeleton while loading OR while the user needs onboarding/redirect.
  if (!ready) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
          <header className="flex items-center justify-between">
            <div className="h-6 w-20 animate-pulse rounded bg-muted" />
            <div className="size-8 animate-pulse rounded-full bg-muted" />
          </header>
          <div className="h-32 animate-pulse rounded-md border-2 border-black bg-muted" />
          <div className="h-24 animate-pulse rounded-md border-2 border-black bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-black uppercase text-foreground">Paxtools</h1>
          <AuthButton />
        </header>
        <PlanNav />
        <Dashboard />
        <Footer />
      </div>
    </div>
  );
}

export function Dashboard({ targetUserId }: { targetUserId?: Id<"users"> }) {
  const {
    ramoRules,
    eixos,
    approvedActionIds,
    pendingActionIds,
    actionStatusMap,
    completedSpecialties,
    customActions,
    completedBlockIds,
    pendingBlockIds,
    earnedSpecialtyBlocoIds,
    earnedSpecialtyIds,
    completedBlockCount,
    pendingBlockCount,
    approvedIrrItemIds,
    pendingIrrItemIds,
    stage,
    nextStage,
    blocksComplete,
    irrComplete,
  } = useProgression(targetUserId);

  // Plan favorites only apply to the escoteiro viewing their own dashboard.
  const showPlanStars = !targetUserId;
  // Lock approved items from being un-checked by the escoteiro themselves;
  // escotistas viewing an escoteiro retain edit rights.
  const lockApproved = !targetUserId;

  const toggleActionFn = useConvexMutation(api.progression.toggleAction);
  const { mutate: toggleAction } = useMutation({
    mutationFn: toggleActionFn,
    onSuccess: notifyLevelUps,
  });

  const toggleSpecialtyFn = useConvexMutation(api.progression.toggleSpecialty);
  const { mutate: toggleSpecialty } = useMutation({
    mutationFn: toggleSpecialtyFn,
    onSuccess: notifyLevelUps,
  });

  const addCustomFn = useConvexMutation(api.progression.addCustomAction);
  const { mutate: addCustom } = useMutation({ mutationFn: addCustomFn });

  const toggleCustomFn = useConvexMutation(api.progression.toggleCustomAction);
  const { mutate: toggleCustom } = useMutation({
    mutationFn: toggleCustomFn,
    onSuccess: notifyLevelUps,
  });

  const deleteCustomFn = useConvexMutation(api.progression.deleteCustomAction);
  const { mutate: deleteCustom } = useMutation({ mutationFn: deleteCustomFn });

  const toggleIrrItemFn = useConvexMutation(api.progression.toggleIrrItem);
  const { mutate: toggleIrrItem } = useMutation({
    mutationFn: toggleIrrItemFn,
    onSuccess: notifyLevelUps,
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

  const handleToggleIrrItem = (itemId: string) => {
    toggleIrrItem({ itemId, targetUserId });
  };

  return (
    <div className="space-y-4">
      <StageBanner
        etapas={ramoRules.etapas}
        irr={ramoRules.irr}
        stage={stage}
        nextStage={nextStage}
        completedBlockCount={completedBlockCount}
        pendingBlockCount={pendingBlockCount}
        irrComplete={irrComplete}
      />

      <OverallProgress
        eixos={eixos}
        completedBlockIds={completedBlockIds}
        pendingBlockIds={pendingBlockIds}
      />

      {showPlanStars ? (
        <DashboardEixosWithPlan
          eixos={eixos}
          approvedActionIds={approvedActionIds}
          pendingActionIds={pendingActionIds}
          actionStatusMap={actionStatusMap}
          completedBlockIds={completedBlockIds}
          pendingBlockIds={pendingBlockIds}
          earnedSpecialtyBlocoIds={earnedSpecialtyBlocoIds}
          earnedSpecialtyIds={earnedSpecialtyIds}
          customActions={customActions}
          completedSpecialties={completedSpecialties}
          onToggleAction={handleToggleAction}
          onToggleSpecialty={handleToggleSpecialty}
          onAddCustom={handleAddCustom}
          onToggleCustom={handleToggleCustom}
          onDeleteCustom={handleDeleteCustom}
          lockApproved={lockApproved}
        />
      ) : (
        eixos.map((eixo) => (
          <EixoSection
            key={eixo.id}
            eixo={eixo}
            approvedActionIds={approvedActionIds}
            pendingActionIds={pendingActionIds}
            actionStatusMap={actionStatusMap}
            completedBlockIds={completedBlockIds}
            pendingBlockIds={pendingBlockIds}
            earnedSpecialtyBlocoIds={earnedSpecialtyBlocoIds}
            earnedSpecialtyIds={earnedSpecialtyIds}
            customActions={customActions}
            completedSpecialties={completedSpecialties}
            onToggleAction={handleToggleAction}
            onToggleSpecialty={handleToggleSpecialty}
            onAddCustom={handleAddCustom}
            onToggleCustom={handleToggleCustom}
            onDeleteCustom={handleDeleteCustom}
            lockApproved={lockApproved}
            escoteiroId={targetUserId}
          />
        ))
      )}

      <RecognitionSection
        irr={ramoRules.irr}
        blocksComplete={blocksComplete}
        approvedIrrItemIds={approvedIrrItemIds}
        pendingIrrItemIds={pendingIrrItemIds}
        irrComplete={irrComplete}
        onToggleItem={handleToggleIrrItem}
        lockApproved={lockApproved}
      />
    </div>
  );
}

type DashboardEixosWithPlanProps = {
  eixos: Eixo[];
  approvedActionIds: Set<string>;
  pendingActionIds: Set<string>;
  actionStatusMap: Map<string, "pending" | "approved">;
  completedBlockIds: Set<string>;
  pendingBlockIds: Set<string>;
  earnedSpecialtyBlocoIds?: Set<string>;
  earnedSpecialtyIds?: Set<string>;
  customActions: React.ComponentProps<typeof EixoSection>["customActions"];
  completedSpecialties: React.ComponentProps<
    typeof EixoSection
  >["completedSpecialties"];
  onToggleAction: (actionId: string) => void;
  onToggleSpecialty: (blocoId: string, specialtyName: string) => void;
  onAddCustom: (blocoId: string, text: string) => void;
  onToggleCustom: (id: Id<"customActions">) => void;
  onDeleteCustom: (id: Id<"customActions">) => void;
  lockApproved?: boolean;
};

function DashboardEixosWithPlan({
  eixos,
  ...props
}: DashboardEixosWithPlanProps) {
  const { plannedKeys, togglePlanned } = usePlan();
  const handleTogglePlanned = (itemKey: string) => {
    togglePlanned({ itemKey });
  };
  return (
    <>
      {eixos.map((eixo) => (
        <EixoSection
          key={eixo.id}
          eixo={eixo}
          {...props}
          plannedKeys={plannedKeys}
          onTogglePlanned={handleTogglePlanned}
        />
      ))}
    </>
  );
}
