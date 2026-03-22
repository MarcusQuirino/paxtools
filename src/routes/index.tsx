import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Authenticated, Unauthenticated } from "convex/react";
import { AuthButton } from "@/components/auth/auth-button";
import { SignInWithGoogle } from "@/components/auth/sign-in";
import { useProgression } from "@/hooks/use-progression";
import { StageBanner } from "@/components/progression/stage-banner";
import { OverallProgress } from "@/components/progression/overall-progress";
import { EixoSection } from "@/components/progression/eixo-section";
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
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-green-800">Paxtools</h1>
          <AuthButton />
        </header>
        <Authenticated>
          <Dashboard />
        </Authenticated>
        <Unauthenticated>
          <div className="text-center space-y-4 py-12">
            <h2 className="text-xl font-semibold text-gray-800">
              Bem-vindo ao Paxtools!
            </h2>
            <p className="text-gray-600">
              Acompanhe sua progressão pessoal no Ramo Escoteiro. Faça login
              para começar.
            </p>
            <SignInWithGoogle />
          </div>
        </Unauthenticated>
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
    stage,
    nextStage,
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
    </div>
  );
}
