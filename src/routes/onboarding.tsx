import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Compass, Shield, ArrowRight, Users, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const [step, setStep] = useState<"role" | "group">("role");
  const [selectedRole, setSelectedRole] = useState<
    "escoteiro" | "escotista" | null
  >(null);
  const [groupPassword, setGroupPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const setRoleFn = useConvexMutation(api.onboarding.setRole);
  const { mutate: setRole, isPending: settingRole } = useMutation({
    mutationFn: setRoleFn,
  });

  const joinGroupFn = useConvexMutation(api.groups.joinGroup);
  const { mutate: joinGroup, isPending: joiningGroup } = useMutation({
    mutationFn: joinGroupFn,
  });

  const completeOnboardingFn = useConvexMutation(
    api.onboarding.completeOnboarding,
  );
  const { mutate: completeOnboarding } = useMutation({
    mutationFn: completeOnboardingFn,
  });

  const handleRoleSelect = (role: "escoteiro" | "escotista") => {
    setSelectedRole(role);
    setError("");
    setRole(
      { role },
      {
        onSuccess: () => setStep("group"),
        onError: (err) => setError(err.message),
      },
    );
  };

  const handleJoinGroup = () => {
    const password = groupPassword.trim();
    if (!password) return;
    setError("");
    joinGroup(
      { password },
      {
        onSuccess: () => {
          completeOnboarding(
            {},
            {
              onSuccess: () => {
                void navigate({
                  to: selectedRole === "escotista" ? "/escotista" : "/",
                });
              },
            },
          );
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  const handleSkip = () => {
    setError("");
    completeOnboarding(
      {},
      {
        onSuccess: () => {
          void navigate({
            to: selectedRole === "escotista" ? "/escotista" : "/",
          });
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 via-green-900 to-emerald-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-green-800/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-[30rem] w-[30rem] rounded-full bg-emerald-800/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 my-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Bem-vindo ao Paxtools</h1>
          <p className="text-green-200/70 mt-1 text-sm">
            {step === "role"
              ? "Escolha como você vai usar o app"
              : "Junte-se a um grupo (opcional)"}
          </p>
        </div>

        {step === "role" ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => handleRoleSelect("escoteiro")}
              disabled={settingRole}
              className="w-full rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 p-6 text-left hover:bg-white/[0.12] transition-colors group disabled:opacity-50"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-emerald-500/20 p-3">
                  <Compass className="size-8 text-emerald-300" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white">
                    Escoteiro
                  </h2>
                  <p className="text-sm text-green-200/60 mt-1">
                    Registre sua progressão pessoal, marque ações completadas e
                    acompanhe seu avanço nas etapas.
                  </p>
                </div>
                <ArrowRight className="size-5 text-white/40 mt-1 group-hover:text-white/80 transition-colors" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect("escotista")}
              disabled={settingRole}
              className="w-full rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 p-6 text-left hover:bg-white/[0.12] transition-colors group disabled:opacity-50"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-amber-500/20 p-3">
                  <Shield className="size-8 text-amber-300" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white">
                    Escotista
                  </h2>
                  <p className="text-sm text-green-200/60 mt-1">
                    Acompanhe a progressão do seu grupo, aprove itens pendentes
                    e gerencie escoteiros.
                  </p>
                </div>
                <ArrowRight className="size-5 text-white/40 mt-1 group-hover:text-white/80 transition-colors" />
              </div>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/20 p-3">
                <Users className="size-6 text-blue-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Entrar em um grupo
                </h2>
                <p className="text-xs text-green-200/50">
                  Peça a senha ao seu escotista
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Senha do grupo (ex: A3K9X2)"
                value={groupPassword}
                onChange={(e) => {
                  setGroupPassword(e.target.value.toUpperCase());
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleJoinGroup()}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-center text-lg tracking-widest font-mono"
                maxLength={6}
              />

              <Button
                onClick={handleJoinGroup}
                disabled={!groupPassword.trim() || joiningGroup}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {joiningGroup ? "Entrando..." : "Entrar no grupo"}
              </Button>
            </div>

            <div className="flex items-start gap-2 text-xs text-amber-200/60 bg-amber-900/20 rounded-lg px-3 py-2">
              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
              <span>
                Você pode fazer isso depois nas configurações. Sem um grupo,
                seus itens não terão aprovação de um escotista.
              </span>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full text-sm text-green-200/50 hover:text-green-200/80 transition-colors py-2"
            >
              Pular por enquanto
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-red-900/30 border border-red-500/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-center gap-2 mt-6">
          <div
            className={`h-1.5 w-8 rounded-full transition-colors ${step === "role" ? "bg-white" : "bg-white/30"}`}
          />
          <div
            className={`h-1.5 w-8 rounded-full transition-colors ${step === "group" ? "bg-white" : "bg-white/30"}`}
          />
        </div>
      </div>
    </div>
  );
}
