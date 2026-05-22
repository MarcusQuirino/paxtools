import { useEffect, useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RamoPicker } from "@/components/onboarding/ramo-picker";
import {
  Compass,
  Shield,
  ArrowRight,
  Users,
  AlertCircle,
  Plus,
} from "lucide-react";
import { RAMO_UNIT_PREFIX, type Ramo } from "@/lib/ramos";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

type Step = "role" | "ramo" | "group";

function OnboardingPage() {
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  const navigate = useNavigate();

  // Resume onboarding at the right step on reload.
  const initialStep: Step = !user?.role
    ? "role"
    : (user.role === "escoteiro" && !user.ramo) ||
        (user.role === "escotista" &&
          (!user.escotistaRamos || user.escotistaRamos.length === 0))
      ? "ramo"
      : "group";

  const [step, setStep] = useState<Step>(initialStep);
  const [selectedRole, setSelectedRole] = useState<
    "escoteiro" | "escotista" | null
  >(user?.role ?? null);
  const [escoteiroRamo, setEscoteiroRamo] = useState<Ramo | null>(
    user?.ramo ?? null,
  );
  const [escotistaRamos, setEscotistaRamos] = useState<Ramo[]>(
    user?.escotistaRamos ?? [],
  );
  const [groupPassword, setGroupPassword] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupNumber, setNewGroupNumber] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  // Not signed in? Bounce to signin. Already onboarded? Send them home.
  useEffect(() => {
    if (user === null) {
      void navigate({ to: "/signin" });
      return;
    }
    if (user?.onboardingComplete) {
      void navigate({
        to: user.role === "escotista" ? "/escotista" : "/",
      });
    }
  }, [user, navigate]);

  const setRoleFn = useConvexMutation(api.onboarding.setRole);
  const { mutate: setRole, isPending: settingRole } = useMutation({
    mutationFn: setRoleFn,
  });

  const setEscoteiroRamoFn = useConvexMutation(
    api.onboarding.setEscoteiroRamo,
  );
  const { mutate: saveEscoteiroRamo, isPending: savingEscoteiroRamo } =
    useMutation({ mutationFn: setEscoteiroRamoFn });

  const setEscotistaRamosFn = useConvexMutation(
    api.onboarding.setEscotistaRamos,
  );
  const { mutate: saveEscotistaRamos, isPending: savingEscotistaRamos } =
    useMutation({ mutationFn: setEscotistaRamosFn });

  const joinGroupFn = useConvexMutation(api.groups.joinGroup);
  const { mutate: joinGroup, isPending: joiningGroup } = useMutation({
    mutationFn: joinGroupFn,
  });

  const createGroupFn = useConvexMutation(api.groups.createGroup);
  const { mutate: createGroup, isPending: creatingGroup } = useMutation({
    mutationFn: createGroupFn,
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
        onSuccess: () => setStep("ramo"),
        onError: (err) => setError(err.message),
      },
    );
  };

  const handleSaveRamo = () => {
    setError("");
    if (selectedRole === "escoteiro") {
      if (!escoteiroRamo) {
        setError("Selecione um ramo");
        return;
      }
      saveEscoteiroRamo(
        { ramo: escoteiroRamo },
        {
          onSuccess: () => setStep("group"),
          onError: (err) => setError(err.message),
        },
      );
    } else if (selectedRole === "escotista") {
      if (escotistaRamos.length === 0) {
        setError("Selecione pelo menos um ramo");
        return;
      }
      saveEscotistaRamos(
        { ramos: escotistaRamos },
        {
          onSuccess: () => setStep("group"),
          onError: (err) => setError(err.message),
        },
      );
    }
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

  const handleCreateGroup = () => {
    const name = newGroupName.trim();
    const number = newGroupNumber.trim();
    if (!name || !number) return;
    setError("");
    createGroup(
      { name, number },
      {
        onSuccess: () => {
          completeOnboarding(
            {},
            {
              onSuccess: () => {
                void navigate({ to: "/escotista" });
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

  // For the create-group preview prefix, use the first selected ramo.
  const previewRamo: Ramo | null =
    selectedRole === "escotista" ? (escotistaRamos[0] ?? null) : null;

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
              : step === "ramo"
                ? selectedRole === "escotista"
                  ? "Escolha um ou mais ramos"
                  : "Em qual ramo você está?"
                : "Junte-se a um grupo"}
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
                <div className="rounded-xl bg-teal-500/20 p-3">
                  <Shield className="size-8 text-teal-300" />
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
        ) : step === "ramo" ? (
          <div className="rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 p-6 space-y-5">
            <p className="text-xs text-green-200/60">
              {selectedRole === "escotista"
                ? "Você verá apenas os escoteiros dos ramos que escolher. Pode mudar depois."
                : "Por enquanto a progressão só está disponível para o ramo Escoteiro. Para outros ramos exibimos 'em breve'."}
            </p>

            {selectedRole === "escoteiro" ? (
              <RamoPicker
                mode="single"
                variant="dark"
                value={escoteiroRamo}
                onChange={setEscoteiroRamo}
              />
            ) : (
              <RamoPicker
                mode="multi"
                variant="dark"
                value={escotistaRamos}
                onChange={setEscotistaRamos}
              />
            )}

            <Button
              onClick={handleSaveRamo}
              disabled={
                savingEscoteiroRamo ||
                savingEscotistaRamos ||
                (selectedRole === "escoteiro" && !escoteiroRamo) ||
                (selectedRole === "escotista" && escotistaRamos.length === 0)
              }
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Continuar
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/10 p-6 space-y-5">
            {showCreate && selectedRole === "escotista" ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/20 p-3">
                    <Plus className="size-6 text-emerald-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Criar um grupo
                    </h2>
                    <p className="text-xs text-green-200/50">
                      Você será o primeiro administrador
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="group-number"
                      className="text-xs text-green-200/70"
                    >
                      Número do grupo
                    </label>
                    <Input
                      id="group-number"
                      placeholder="Ex: 123"
                      inputMode="numeric"
                      value={newGroupNumber}
                      onChange={(e) => {
                        setNewGroupNumber(e.target.value.replace(/\D/g, ""));
                        setError("");
                      }}
                      maxLength={6}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="group-name"
                      className="text-xs text-green-200/70"
                    >
                      Nome do grupo
                    </label>
                    <Input
                      id="group-name"
                      placeholder="Ex: Potiguara"
                      value={newGroupName}
                      onChange={(e) => {
                        setNewGroupName(e.target.value);
                        setError("");
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleCreateGroup()
                      }
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                    />
                  </div>

                  {previewRamo && newGroupName.trim() && (
                    <p className="text-xs text-emerald-200/80">
                      Sua unidade será chamada de{" "}
                      <strong>
                        {RAMO_UNIT_PREFIX[previewRamo]} {newGroupName.trim()}
                      </strong>
                      .
                    </p>
                  )}

                  <Button
                    onClick={handleCreateGroup}
                    disabled={
                      !newGroupName.trim() ||
                      !newGroupNumber.trim() ||
                      creatingGroup
                    }
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {creatingGroup ? "Criando..." : "Criar grupo"}
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setError("");
                  }}
                  className="w-full text-sm text-green-200/50 hover:text-green-200/80 transition-colors py-1"
                >
                  Entrar em um grupo existente
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-500/20 p-3">
                    <Users className="size-6 text-blue-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Entrar em um grupo
                    </h2>
                    <p className="text-xs text-green-200/50">
                      {selectedRole === "escotista"
                        ? "Você precisará da aprovação de um administrador"
                        : "Peça o código ao seu escotista"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Input
                    placeholder="Código do grupo (ex: A3K9X2)"
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

                {selectedRole === "escotista" && (
                  <>
                    <div className="flex items-center gap-2 text-xs text-green-200/30">
                      <div className="flex-1 border-t border-white/10" />
                      <span>ou</span>
                      <div className="flex-1 border-t border-white/10" />
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreate(true);
                        setError("");
                      }}
                      className="w-full border-white/20 text-white bg-white/5 hover:bg-white/10"
                    >
                      <Plus className="size-4 mr-1" />
                      Criar novo grupo
                    </Button>
                  </>
                )}

                <div className="flex items-start gap-2 text-xs text-sky-200/60 bg-sky-900/20 rounded-lg px-3 py-2">
                  <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                  <span>
                    {selectedRole === "escotista"
                      ? "Após entrar, sua solicitação ficará pendente até que um administrador do grupo aprove."
                      : "Você pode fazer isso depois nas configurações. Sem um grupo, seus itens não terão aprovação de um escotista."}
                  </span>
                </div>
              </>
            )}

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
            className={`h-1.5 w-8 rounded-full transition-colors ${step === "ramo" ? "bg-white" : "bg-white/30"}`}
          />
          <div
            className={`h-1.5 w-8 rounded-full transition-colors ${step === "group" ? "bg-white" : "bg-white/30"}`}
          />
        </div>

      </div>
    </div>
  );
}
