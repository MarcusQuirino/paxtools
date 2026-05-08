import { useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthButton } from "@/components/auth/auth-button";
import {
  ArrowLeft,
  Users,
  LogOut,
  Plus,
  Copy,
  Check,
  Shield,
  Compass,
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

  const [joinPassword, setJoinPassword] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
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
    if (!name) return;
    setCreateError("");
    createGroup(
      { name },
      {
        onSuccess: () => {
          setNewGroupName("");
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
                </div>
                <p className="text-xs text-muted-foreground">
                  Compartilhe a senha acima para convidar membros.
                </p>
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
                    <div className="space-y-2">
                      <label className="text-xs font-medium">
                        Nome do novo grupo
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ex: Tropa Falcão"
                          value={newGroupName}
                          onChange={(e) => {
                            setNewGroupName(e.target.value);
                            setCreateError("");
                          }}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleCreate()
                          }
                        />
                        <Button
                          onClick={handleCreate}
                          disabled={!newGroupName.trim() || creating}
                          size="sm"
                        >
                          {creating ? "..." : "Criar"}
                        </Button>
                      </div>
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
      </div>
    </div>
  );
}
