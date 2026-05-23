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
import { RAMO_UNIT_PREFIX, type Ramo, type RamoNames } from "@/lib/ramos";
import { RamoNamesInputs } from "@/components/onboarding/ramo-names-inputs";

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
  const [newGroupRamoNames, setNewGroupRamoNames] = useState<RamoNames>({});
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
      { name, number, ramoNames: newGroupRamoNames },
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md mx-4 my-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Bem-vindo ao Paxtools</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
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
              className="w-full rounded-sm bg-card border-2 border-black shadow-[3px_3px_0_0_#000] p-6 text-left hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] transition-all disabled:opacity-50"
            >
              <div className="flex items-start gap-4">
                <div className="bg-emerald-600 border-2 border-black p-3">
                  <Compass className="size-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-black uppercase tracking-wide text-foreground">
                    Escoteiro
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Registre sua progressão pessoal, marque ações completadas e
                    acompanhe seu avanço nas etapas.
                  </p>
                </div>
                <ArrowRight className="size-5 text-muted-foreground mt-1" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect("escotista")}
              disabled={settingRole}
              className="w-full rounded-sm bg-card border-2 border-black shadow-[3px_3px_0_0_#000] p-6 text-left hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] transition-all disabled:opacity-50"
            >
              <div className="flex items-start gap-4">
                <div className="bg-teal-600 border-2 border-black p-3">
                  <Shield className="size-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-black uppercase tracking-wide text-foreground">
                    Escotista
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Acompanhe a progressão do seu grupo, aprove itens pendentes
                    e gerencie escoteiros.
                  </p>
                </div>
                <ArrowRight className="size-5 text-muted-foreground mt-1" />
              </div>
            </button>
          </div>
        ) : step === "ramo" ? (
          <div className="rounded-sm bg-card border-2 border-black shadow-[3px_3px_0_0_#000] p-6 space-y-5">
            <p className="text-xs text-muted-foreground font-medium">
              {selectedRole === "escotista"
                ? "Você verá apenas os escoteiros dos ramos que escolher. Pode mudar depois."
                : "Por enquanto a progressão só está disponível para o ramo Escoteiro. Para outros ramos exibimos 'em breve'."}
            </p>

            {selectedRole === "escoteiro" ? (
              <RamoPicker
                mode="single"
                value={escoteiroRamo}
                onChange={setEscoteiroRamo}
              />
            ) : (
              <RamoPicker
                mode="multi"
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
              className="w-full"
            >
              Continuar
            </Button>
          </div>
        ) : (
          <div className="rounded-sm bg-card border-2 border-black shadow-[3px_3px_0_0_#000] p-6 space-y-5">
            {showCreate && selectedRole === "escotista" ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="bg-primary border-2 border-black p-3">
                    <Plus className="size-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-wide text-foreground">
                      Criar um grupo
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Você será o primeiro administrador
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="group-number"
                      className="text-xs font-bold uppercase tracking-wide text-foreground"
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
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="group-name"
                      className="text-xs font-bold uppercase tracking-wide text-foreground"
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
                    />
                  </div>

                  {previewRamo && newGroupName.trim() && (
                    <p className="text-xs text-muted-foreground font-medium">
                      Sua unidade será chamada de{" "}
                      <strong>
                        {RAMO_UNIT_PREFIX[previewRamo]}{" "}
                        {newGroupRamoNames[previewRamo]?.trim() ||
                          newGroupName.trim()}
                      </strong>
                      .
                    </p>
                  )}

                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-bold uppercase tracking-wide text-foreground">
                      Nomes das unidades (opcional)
                    </label>
                    <RamoNamesInputs
                      value={newGroupRamoNames}
                      onChange={setNewGroupRamoNames}
                      groupName={newGroupName}
                    />
                  </div>

                  <Button
                    onClick={handleCreateGroup}
                    disabled={
                      !newGroupName.trim() ||
                      !newGroupNumber.trim() ||
                      creatingGroup
                    }
                    className="w-full"
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
                  className="w-full text-sm text-muted-foreground hover:text-foreground font-medium transition-colors py-1"
                >
                  Entrar em um grupo existente
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 border-2 border-black p-3">
                    <Users className="size-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-wide text-foreground">
                      Entrar em um grupo
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium">
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
                    className="text-center text-lg tracking-widest font-mono"
                    maxLength={6}
                  />

                  <Button
                    onClick={handleJoinGroup}
                    disabled={!groupPassword.trim() || joiningGroup}
                    className="w-full"
                  >
                    {joiningGroup ? "Entrando..." : "Entrar no grupo"}
                  </Button>
                </div>

                {selectedRole === "escotista" && (
                  <>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex-1 border-t border-black/30" />
                      <span className="font-bold uppercase tracking-wide">ou</span>
                      <div className="flex-1 border-t border-black/30" />
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreate(true);
                        setError("");
                      }}
                      className="w-full"
                    >
                      <Plus className="size-4 mr-1" />
                      Criar novo grupo
                    </Button>
                  </>
                )}

                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted border-2 border-black px-3 py-2">
                  <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                  <span className="font-medium">
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
              className="w-full text-sm text-muted-foreground hover:text-foreground font-medium transition-colors py-2"
            >
              Pular por enquanto
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-sm bg-destructive/10 border-2 border-destructive px-4 py-3 text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        <div className="flex justify-center gap-2 mt-6">
          <div
            className={`h-2 w-8 border-2 border-black transition-colors ${step === "role" ? "bg-primary" : "bg-muted"}`}
          />
          <div
            className={`h-2 w-8 border-2 border-black transition-colors ${step === "ramo" ? "bg-primary" : "bg-muted"}`}
          />
          <div
            className={`h-2 w-8 border-2 border-black transition-colors ${step === "group" ? "bg-primary" : "bg-muted"}`}
          />
        </div>

      </div>
    </div>
  );
}
