import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { AuthButton } from "@/components/auth/auth-button";
import { SignInWithGoogle } from "@/components/auth/sign-in";
import { useProgression } from "@/hooks/use-progression";
import { StageBanner } from "@/components/progression/stage-banner";
import { OverallProgress } from "@/components/progression/overall-progress";
import { EixoSection } from "@/components/progression/eixo-section";
import { EIXOS } from "@/data/progression-data";
import { Compass, Map, Award, TrendingUp } from "lucide-react";

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
    <>
      <AuthLoading>
        <LoginPage loading />
      </AuthLoading>
      <Unauthenticated>
        <LoginPage />
      </Unauthenticated>
      <Authenticated>
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
            <header className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-green-800">Paxtools</h1>
              <AuthButton />
            </header>
            <Dashboard />
          </div>
        </div>
      </Authenticated>
    </>
  );
}

function LoginPage({ loading = false }: { loading?: boolean }) {
  const features = [
    {
      icon: Compass,
      title: "Trilha Pessoal",
      description: "Acompanhe cada passo da sua progressão",
    },
    {
      icon: Map,
      title: "Eixos de Desenvolvimento",
      description: "Visualize seu progresso por eixo",
    },
    {
      icon: Award,
      title: "Especialidades",
      description: "Registre suas conquistas e especialidades",
    },
    {
      icon: TrendingUp,
      title: "Etapas",
      description: "Veja sua evolução rumo à próxima etapa",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-emerald-900">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-green-800/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[30rem] w-[30rem] rounded-full bg-emerald-800/20 blur-3xl" />
        <div className="absolute top-1/4 right-1/4 h-64 w-64 rounded-full bg-yellow-900/10 blur-3xl" />
      </div>

      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-4 my-8">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 mb-4 shadow-lg">
            <img
              src="/paxtools-logo.png"
              alt="Paxtools"
              className="w-14 h-14 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Paxtools
          </h1>
          <p className="text-green-200/70 mt-1 text-sm">
            Progressão Pessoal &middot; Ramo Escoteiro
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 shadow-2xl">
          <div className="p-6 pb-0">
            <h2 className="text-xl font-semibold text-white text-center">
              Bem-vindo de volta
            </h2>
            <p className="text-green-200/60 text-sm text-center mt-1">
              Faça login para continuar sua jornada
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3 p-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl bg-white/[0.05] border border-white/[0.06] p-3 group hover:bg-white/[0.08] transition-colors"
              >
                <feature.icon className="w-5 h-5 text-amber-300/80 mb-2" />
                <p className="text-sm font-medium text-white/90">
                  {feature.title}
                </p>
                <p className="text-xs text-green-200/50 mt-0.5 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Sign-in section */}
          <div className="p-6 pt-2">
            {loading ? (
              <div className="h-11 rounded-lg bg-white/10 animate-pulse" />
            ) : (
              <SignInWithGoogle />
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-green-200/30 text-xs mt-6">
          Sempre Alerta
        </p>
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
