import { useEffect, useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthButton } from "@/components/auth/auth-button";
import { RamoNamesInputs } from "@/components/onboarding/ramo-names-inputs";
import { type RamoNames } from "@/lib/ramos";
import {
  ArrowLeft,
  Users,
  LogOut,
  Plus,
  Copy,
  Check,
  Shield,
  Compass,
  Settings as SettingsIcon,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  const { data: group } = useSuspenseQuery(
    convexQuery(api.groups.getMyGroup, {}),
  );

  useEffect(() => {
    if (user === null) void navigate({ to: "/signin" });
  }, [user, navigate]);

  const [joinPassword, setJoinPassword] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupNumber, setNewGroupNumber] = useState("");
  const [newGroupRamoNames, setNewGroupRamoNames] = useState<RamoNames>({});
  const [joinError, setJoinError] = useState("");
  const [createError, setCreateError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const joinGroupFn = useConvexMutation(api.groups.joinGroup);
  const { mutate: joinGroup, isPending: joining } = useMutation({
    mutationFn: joinGroupFn,
  });

  const leaveGroupFn = useConvexMutation(api.groups.leaveGroup);
  const { mutate: leaveGroup, isPending: leaving } = useMutation({
    mutationFn: leaveGroupFn,
  });

  const createGroupFn = useConvexMutation(api.groups.createGroup);
  const { mutate: createGroup, isPending: creating } = useMutation({
    mutationFn: createGroupFn,
  });

  const handleJoin = () => {
    const pw = joinPassword.trim();
    if (!pw) return;
    setJoinError("");
    joinGroup(
      { password: pw },
      { onError: (err) => setJoinError(err.message) },
    );
  };

  const handleLeave = () => {
    leaveGroup({});
  };

  const handleCreate = () => {
    const name = newGroupName.trim();
    const number = newGroupNumber.trim();
    if (!name || !number) return;
    setCreateError("");
    createGroup(
      { name, number, ramoNames: newGroupRamoNames },
      {
        onSuccess: () => {
          setNewGroupName("");
          setNewGroupNumber("");
          setNewGroupRamoNames({});
          setShowCreate(false);
        },
        onError: (err) => setCreateError(err.message),
      },
    );
  };

  const handleCopyPassword = async () => {
    if (!group?.password) return;
    await navigator.clipboard.writeText(group.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-4 space-y-6 pb-20">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              void navigate({
                to: user.role === "escotista" ? "/escotista" : "/",
              })
            }
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </button>
          <AuthButton />
        </header>

        <h1 className="text-xl font-bold">Configurações</h1>

        {/* Role section */}
        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            {user.role === "escotista" ? (
              <Shield className="size-4 text-teal-600" />
            ) : (
              <Compass className="size-4 text-emerald-500" />
            )}
            Seu papel
          </h2>
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                user.role === "escotista"
                  ? "bg-teal-100 text-teal-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {user.role === "escotista" ? "Escotista" : "Escoteiro"}
            </div>
            <span className="text-xs text-muted-foreground">
              O papel não pode ser alterado
            </span>
          </div>
        </section>

        {/* Group section */}
        <section className="rounded-xl border bg-card p-4 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Users className="size-4" />
            Grupo
          </h2>

          {group ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{group.name}</span>
                  {group.password && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPassword}
                      className="h-7 text-xs gap-1"
                    >
                      {copiedPassword ? (
                        <Check className="size-3" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      {copiedPassword ? "Copiado!" : group.password}
                    </Button>
                  )}
                </div>
                {group.password && (
                  <p className="text-xs text-muted-foreground">
                    Compartilhe a senha acima para convidar membros.
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeave}
                disabled={leaving}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="size-4 mr-1" />
                {leaving ? "Saindo..." : "Sair do grupo"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Você não está em nenhum grupo.
              </p>

              {/* Join group */}
              <div className="space-y-2">
                <label className="text-xs font-medium">
                  Entrar em um grupo existente
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Senha do grupo"
                    value={joinPassword}
                    onChange={(e) => {
                      setJoinPassword(e.target.value.toUpperCase());
                      setJoinError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    className="font-mono tracking-widest text-center"
                    maxLength={6}
                  />
                  <Button
                    onClick={handleJoin}
                    disabled={!joinPassword.trim() || joining}
                    size="sm"
                  >
                    {joining ? "..." : "Entrar"}
                  </Button>
                </div>
                {joinError && (
                  <p className="text-xs text-destructive">{joinError}</p>
                )}
              </div>

              {/* Create group (escotista only) */}
              {user.role === "escotista" && (
                <>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex-1 border-t" />
                    <span>ou</span>
                    <div className="flex-1 border-t" />
                  </div>

                  {showCreate ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">
                          Número do novo grupo
                        </label>
                        <Input
                          placeholder="Ex: 123"
                          inputMode="numeric"
                          value={newGroupNumber}
                          onChange={(e) => {
                            setNewGroupNumber(
                              e.target.value.replace(/\D/g, ""),
                            );
                            setCreateError("");
                          }}
                          maxLength={6}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">
                          Nome do novo grupo
                        </label>
                        <Input
                          placeholder="Ex: Potiguara"
                          value={newGroupName}
                          onChange={(e) => {
                            setNewGroupName(e.target.value);
                            setCreateError("");
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">
                          Nomes das unidades (opcional)
                        </label>
                        <RamoNamesInputs
                          value={newGroupRamoNames}
                          onChange={setNewGroupRamoNames}
                          groupName={newGroupName}
                        />
                      </div>
                      <Button
                        onClick={handleCreate}
                        disabled={
                          !newGroupName.trim() ||
                          !newGroupNumber.trim() ||
                          creating
                        }
                        size="sm"
                        className="w-full"
                      >
                        {creating ? "Criando..." : "Criar grupo"}
                      </Button>
                      {createError && (
                        <p className="text-xs text-destructive">
                          {createError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreate(true)}
                      className="w-full"
                    >
                      <Plus className="size-4 mr-1" />
                      Criar novo grupo
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {group?.isAdmin && (
          <GroupAdminSection
            initialName={group.name}
            initialRamoNames={group.ramoNames ?? {}}
          />
        )}
      </div>
    </div>
  );
}

function GroupAdminSection({
  initialName,
  initialRamoNames,
}: {
  initialName: string;
  initialRamoNames: RamoNames;
}) {
  const [name, setName] = useState(initialName);
  const [ramoNames, setRamoNames] = useState<RamoNames>(initialRamoNames);
  const [saveError, setSaveError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const updateGroupFn = useConvexMutation(api.groups.updateGroup);
  const { mutate: updateGroup, isPending: saving } = useMutation({
    mutationFn: updateGroupFn,
  });

  const deleteGroupFn = useConvexMutation(api.groups.deleteGroup);
  const { mutate: deleteGroup, isPending: deleting } = useMutation({
    mutationFn: deleteGroupFn,
  });

  const dirty =
    name.trim() !== initialName ||
    JSON.stringify(ramoNames) !== JSON.stringify(initialRamoNames);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setSaveError("Nome do grupo é obrigatório");
      return;
    }
    setSaveError("");
    updateGroup(
      { name: trimmed, ramoNames },
      {
        onSuccess: () => {
          setSavedAt(Date.now());
        },
        onError: (err) => setSaveError(err.message),
      },
    );
  };

  const handleDelete = () => {
    setDeleteError("");
    deleteGroup(
      { confirmName: confirmText },
      { onError: (err) => setDeleteError(err.message) },
    );
  };

  return (
    <section className="rounded-xl border bg-card p-4 space-y-4">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <SettingsIcon className="size-4" />
        Gerenciar grupo
      </h2>

      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="admin-group-name" className="text-xs font-medium">
            Nome do grupo
          </label>
          <Input
            id="admin-group-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaveError("");
              setSavedAt(null);
            }}
            maxLength={100}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Nomes das unidades</label>
          <RamoNamesInputs
            value={ramoNames}
            onChange={(next) => {
              setRamoNames(next);
              setSaveError("");
              setSavedAt(null);
            }}
            groupName={name}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {savedAt && !dirty ? "Salvo." : ""}
          </div>
          <Button
            onClick={handleSave}
            disabled={!dirty || saving}
            size="sm"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
        {saveError && (
          <p className="text-xs text-destructive">{saveError}</p>
        )}
      </div>

      <div className="border-t pt-4 space-y-2">
        <h3 className="text-xs font-semibold text-destructive">
          Zona perigosa
        </h3>
        {confirmOpen ? (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs">
              Esta ação não pode ser desfeita pela interface. Para confirmar,
              digite o nome do grupo:{" "}
              <strong className="font-mono">{initialName}</strong>
            </p>
            <Input
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setDeleteError("");
              }}
              placeholder={initialName}
              autoFocus
            />
            {deleteError && (
              <p className="text-xs text-destructive">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmText("");
                  setDeleteError("");
                }}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={confirmText.trim() !== initialName || deleting}
              >
                <Trash2 className="size-4 mr-1" />
                {deleting ? "Excluindo..." : "Excluir definitivamente"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="text-destructive border-destructive/40 hover:bg-destructive/10"
          >
            <Trash2 className="size-4 mr-1" />
            Excluir grupo
          </Button>
        )}
      </div>
    </section>
  );
}
