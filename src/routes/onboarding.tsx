import { useEffect, useState, type ReactNode } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { HardButton } from "@/components/ui/hard-button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/section";
import { RamoPicker } from "@/components/onboarding/ramo-picker";
import { FieldLabel } from "@/components/settings/field";
import { cn } from "@/lib/utils";
import {
  Compass,
  Shield,
  ChevronRight,
  Users,
  Info,
  Plus,
} from "lucide-react";
import { RAMO_UNIT_PREFIX, type Ramo, type RamoNames } from "@/lib/ramos";
import { RamoNamesInputs } from "@/components/onboarding/ramo-names-inputs";
import { RegiaoInput } from "@/components/onboarding/regiao-input";

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
  const [newGroupRegiao, setNewGroupRegiao] = useState("");
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
    const regiao = newGroupRegiao.trim();
    if (!name || !number || !regiao) return;
    setError("");
    createGroup(
      { name, number, regiao, ramoNames: newGroupRamoNames },
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


  const stepIndex = step === "role" ? 0 : step === "ramo" ? 1 : 2;

  return (
    <div className="min-h-screen bg-background text-[#141414]">
      <div className="mx-auto w-full max-w-lg px-4 pb-10 pt-8">
        <header className="mb-6">
          <div className="mb-4 flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-full border-2 border-[#141414] transition-colors",
                  i <= stepIndex ? "bg-[#0E6B4E]" : "bg-[#EEE9DC]",
                )}
              />
            ))}
          </div>
          <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#8A887F]">
            Passo {stepIndex + 1} de 3
          </p>
          <h1 className="text-[28px] font-black leading-[1.05] tracking-[-0.02em]">
            Bem-vindo ao Paxtools
          </h1>
          <p className="mt-1.5 text-[15px] text-[#4A4A44]">
            {step === "role"
              ? "Escolha como você vai usar o app."
              : step === "ramo"
                ? selectedRole === "escotista"
                  ? "Escolha um ou mais ramos."
                  : "Em qual ramo você está?"
                : "Junte-se a um grupo."}
          </p>
        </header>

        {step === "role" ? (
          <div className="space-y-3">
            <RoleCard
              icon={<Compass />}
              tileClass="bg-[#0E6B4E] text-white"
              title="Escoteiro"
              description="Registre sua progressão pessoal, marque ações completadas e acompanhe seu avanço nas etapas."
              onClick={() => handleRoleSelect("escoteiro")}
              disabled={settingRole}
            />
            <RoleCard
              icon={<Shield />}
              tileClass="bg-[#141414] text-white"
              title="Escotista"
              description="Acompanhe a progressão do seu grupo, aprove itens pendentes e gerencie escoteiros."
              onClick={() => handleRoleSelect("escotista")}
              disabled={settingRole}
            />
          </div>
        ) : step === "ramo" ? (
          <Card className="space-y-4 p-4">
            <p className="text-[15px] text-[#4A4A44]">
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

            <HardButton
              size="lg"
              full
              onClick={handleSaveRamo}
              disabled={
                savingEscoteiroRamo ||
                savingEscotistaRamos ||
                (selectedRole === "escoteiro" && !escoteiroRamo) ||
                (selectedRole === "escotista" && escotistaRamos.length === 0)
              }
            >
              Continuar
            </HardButton>
          </Card>
        ) : (
          <div className="space-y-3">
            <Card className="space-y-4 p-4">
              {showCreate && selectedRole === "escotista" ? (
                <>
                  <StepHeading
                    icon={<Plus />}
                    tileClass="bg-[#0E6B4E] text-white"
                    title="Criar um grupo"
                    meta="Você será o primeiro administrador"
                  />

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="group-number">
                        Número do grupo
                      </FieldLabel>
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

                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="group-regiao">
                        Região escoteira (UF)
                      </FieldLabel>
                      <RegiaoInput
                        id="group-regiao"
                        value={newGroupRegiao}
                        onChange={(next) => {
                          setNewGroupRegiao(next);
                          setError("");
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="group-name">Nome do grupo</FieldLabel>
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
                      <p className="text-[12px] font-bold text-[#0E6B4E]">
                        Sua seção será chamada de{" "}
                        <strong>
                          {RAMO_UNIT_PREFIX[previewRamo]}{" "}
                          {newGroupRamoNames[previewRamo]?.trim() ||
                            newGroupName.trim()}
                        </strong>
                        .
                      </p>
                    )}

                    <div className="space-y-1.5 pt-1">
                      <FieldLabel>Seções iniciais (opcional)</FieldLabel>
                      <RamoNamesInputs
                        value={newGroupRamoNames}
                        onChange={setNewGroupRamoNames}
                        groupName={newGroupName}
                      />
                    </div>

                    <HardButton
                      size="lg"
                      full
                      onClick={handleCreateGroup}
                      disabled={
                        !newGroupName.trim() ||
                        !newGroupNumber.trim() ||
                        !newGroupRegiao.trim() ||
                        creatingGroup
                      }
                    >
                      {creatingGroup ? "Criando..." : "Criar grupo"}
                    </HardButton>
                  </div>

                  <HardButton
                    tone="paper"
                    full
                    onClick={() => {
                      setShowCreate(false);
                      setError("");
                    }}
                  >
                    Entrar em um grupo existente
                  </HardButton>
                </>
              ) : (
                <>
                  <StepHeading
                    icon={<Users />}
                    tileClass="bg-[#141414] text-white"
                    title="Entrar em um grupo"
                    meta={
                      selectedRole === "escotista"
                        ? "Você precisará da aprovação de um administrador"
                        : "Peça o código ao seu escotista"
                    }
                  />

                  <div className="space-y-3">
                    <Input
                      aria-label="Código do grupo"
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

                    <HardButton
                      size="lg"
                      full
                      onClick={handleJoinGroup}
                      disabled={!groupPassword.trim() || joiningGroup}
                    >
                      {joiningGroup ? "Entrando..." : "Entrar no grupo"}
                    </HardButton>
                  </div>

                  {selectedRole === "escotista" && (
                    <>
                      <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase text-[#8A887F]">
                        <div className="flex-1 border-t-[1.5px] border-[#D9D5C9]" />
                        <span>ou</span>
                        <div className="flex-1 border-t-[1.5px] border-[#D9D5C9]" />
                      </div>

                      <HardButton
                        tone="paper"
                        full
                        onClick={() => {
                          setShowCreate(true);
                          setError("");
                        }}
                      >
                        <Plus aria-hidden />
                        Criar novo grupo
                      </HardButton>
                    </>
                  )}

                  <div className="flex items-start gap-2 rounded-[10px] border-[1.5px] border-[#D9D5C9] bg-[#F4F1E8] px-3 py-2.5 text-[13px] text-[#4A4A44]">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      {selectedRole === "escotista"
                        ? "Após entrar, sua solicitação ficará pendente até que um administrador do grupo aprove."
                        : "Você pode fazer isso depois nas configurações. Sem um grupo, seus itens não terão aprovação de um escotista."}
                    </span>
                  </div>
                </>
              )}
            </Card>

            <HardButton tone="ghost" full onClick={handleSkip}>
              Pular por enquanto
            </HardButton>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-[10px] border-2 border-[#C62828] bg-[#FCE4E4] px-4 py-3 text-[15px] font-semibold text-[#C62828]"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Tappable role block: paper, ink border, 2px shadow (it moves on press — the
 * screen has no 4px CTA on this step), 48px icon tile, 20/900 title.
 */
function RoleCard({
  icon,
  tileClass,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  tileClass: string;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-4 rounded-[10px] border-2 border-[#141414] bg-white p-4 text-left shadow-[2px_2px_0_#141414] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
    >
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-md border-2 border-[#141414] [&_svg]:size-6",
          tileClass,
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[20px] font-black leading-tight">{title}</span>
        <span className="mt-1 block text-[15px] text-[#4A4A44]">{description}</span>
      </span>
      <ChevronRight
        className="mt-1 size-5 shrink-0 text-[#8A887F]"
        strokeWidth={2.5}
        aria-hidden
      />
    </button>
  );
}

/** Step card head: 40px icon tile + 18/900 title + 12px meta. */
function StepHeading({
  icon,
  tileClass,
  title,
  meta,
}: {
  icon: ReactNode;
  tileClass: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-md border-2 border-[#141414] [&_svg]:size-5",
          tileClass,
        )}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-[18px] font-black leading-tight">{title}</h2>
        <p className="text-[12px] font-semibold text-[#8A887F]">{meta}</p>
      </div>
    </div>
  );
}
