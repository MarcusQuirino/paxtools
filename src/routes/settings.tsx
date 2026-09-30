import { useEffect, useState, type ReactNode } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { Input } from "@/components/ui/input";
import { HardButton } from "@/components/ui/hard-button";
import { ListRow } from "@/components/ui/list-row";
import { Card, ListBox, Section } from "@/components/ui/section";
import { Pill } from "@/components/ui/status-pill";
import { useAuthActions } from "@convex-dev/auth/react";
import { AppShell } from "@/components/layout/app-shell";
import { BackLink, PageHeader } from "@/components/layout/page-header";
import { EscoteiroShell } from "@/components/progression/escoteiro-shell";
import { RamoNamesInputs } from "@/components/onboarding/ramo-names-inputs";
import { RegiaoInput } from "@/components/onboarding/regiao-input";
import { FieldError, FieldLabel } from "@/components/settings/field";
import { SectionsManager } from "@/components/settings/sections-manager";
import { type RamoNames } from "@/lib/ramos";
import { formatGroupIdentity } from "@/lib/group-identity";
import {
  EMERALD_INK,
  EMERALD_TINT,
  INK,
  RED,
  RED_TINT,
} from "@/lib/design-tokens";
import {
  Users,
  LogOut,
  Plus,
  Copy,
  Check,
  Shield,
  Compass,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

/** 40px ink-bordered icon tile for a ListRow's leading slot. */
function IconTile({ children }: { children: ReactNode }) {
  return (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-md border-2 [&_svg]:size-5"
      style={{ borderColor: INK, background: EMERALD_TINT, color: EMERALD_INK }}
      aria-hidden
    >
      {children}
    </span>
  );
}

/** 12px muted helper/status line (the type floor). */
function Hint({ children }: { children: ReactNode }) {
  return <span className="text-[12px] font-semibold text-[#8A887F]">{children}</span>;
}

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
  const [newGroupRegiao, setNewGroupRegiao] = useState("");
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
    const regiao = newGroupRegiao.trim();
    if (!name || !number || !regiao) return;
    setCreateError("");
    createGroup(
      { name, number, regiao, ramoNames: newGroupRamoNames },
      {
        onSuccess: () => {
          setNewGroupName("");
          setNewGroupNumber("");
          setNewGroupRegiao("");
          setNewGroupRamoNames({});
          setShowCreate(false);
        },
        onError: (err) => setCreateError(err.message),
      },
    );
  };

  const groupIdentity = formatGroupIdentity(group?.number, group?.regiao);

  const handleCopyPassword = async () => {
    if (!group?.password) return;
    await navigator.clipboard.writeText(group.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  if (!user) return null;

  const isEscotista = user.role === "escotista";

  const sections = (
    <div>
      <UserNameSection currentName={user.name ?? ""} />

      <Section label="Seu papel">
        <Card className="flex flex-wrap items-center gap-3">
          {/* Emerald tint (not solid): it's an identity chip, not a state. */}
          <Pill
            tone="paper"
            className="bg-[#DDF3E8] px-2.5 py-1 text-[#08452F]"
            testId="settings-role-pill"
          >
            {isEscotista ? (
              <Shield className="size-3" strokeWidth={3} aria-hidden />
            ) : (
              <Compass className="size-3" strokeWidth={3} aria-hidden />
            )}
            <span>{isEscotista ? "Escotista" : "Escoteiro"}</span>
          </Pill>
          <Hint>O papel não pode ser alterado</Hint>
        </Card>
      </Section>

      <Section label="Grupo">
        {group ? (
          <div className="space-y-3">
            <ListBox>
              <ListRow
                leading={
                  <IconTile>
                    <Users />
                  </IconTile>
                }
                title={
                  <>
                    {/* Two things are load-bearing here. The name needs its own
                        element so a text query can match it exactly, and the
                        identity needs a LEADING SPACE inside its text: an
                        accessible name concatenates descendant text across
                        element boundaries, so without it the row announces
                        as "Grupo QA99999/RS". `ml-1` only fixes the pixels. */}
                    <span>{group.name}</span>
                    {groupIdentity ? (
                      <span className="ml-1 text-[12px] font-bold text-[#8A887F]">
                        {` ${groupIdentity}`}
                      </span>
                    ) : null}
                  </>
                }
              />
              {group.password && (
                <ListRow
                  onClick={() => void handleCopyPassword()}
                  leading={
                    <IconTile>{copiedPassword ? <Check /> : <Copy />}</IconTile>
                  }
                  title={
                    <span className="font-mono tracking-[0.2em]">
                      {group.password}
                    </span>
                  }
                  subtitle="Compartilhe a senha para convidar membros."
                  trailing={
                    <span className="shrink-0 text-[12px] font-extrabold text-[#0E6B4E]">
                      {copiedPassword ? "Copiado!" : "Copiar"}
                    </span>
                  }
                />
              )}
            </ListBox>
            <HardButton
              tone="danger"
              onClick={handleLeave}
              disabled={leaving}
            >
              <LogOut aria-hidden />
              {leaving ? "Saindo..." : "Sair do grupo"}
            </HardButton>
          </div>
        ) : (
          <Card className="space-y-4">
            <p className="text-[15px] text-[#4A4A44]">
              Você não está em nenhum grupo.
            </p>

            {/* Join group */}
            <div className="space-y-1.5">
              <FieldLabel htmlFor="join-group-password">
                Entrar em um grupo existente
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="join-group-password"
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
                <HardButton
                  className="min-h-12"
                  onClick={handleJoin}
                  disabled={!joinPassword.trim() || joining}
                >
                  {joining ? "..." : "Entrar"}
                </HardButton>
              </div>
              <FieldError>{joinError}</FieldError>
            </div>

            {/* Create group (escotista only) */}
            {isEscotista && (
              <>
                <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase text-[#8A887F]">
                  <div className="flex-1 border-t-[1.5px] border-[#D9D5C9]" />
                  <span>ou</span>
                  <div className="flex-1 border-t-[1.5px] border-[#D9D5C9]" />
                </div>

                {showCreate ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="new-group-number">
                        Número do novo grupo
                      </FieldLabel>
                      <Input
                        id="new-group-number"
                        placeholder="Ex: 123"
                        inputMode="numeric"
                        value={newGroupNumber}
                        onChange={(e) => {
                          setNewGroupNumber(e.target.value.replace(/\D/g, ""));
                          setCreateError("");
                        }}
                        maxLength={6}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="new-group-regiao">
                        Região escoteira (UF)
                      </FieldLabel>
                      <RegiaoInput
                        id="new-group-regiao"
                        value={newGroupRegiao}
                        onChange={(next) => {
                          setNewGroupRegiao(next);
                          setCreateError("");
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel htmlFor="new-group-name">
                        Nome do novo grupo
                      </FieldLabel>
                      <Input
                        id="new-group-name"
                        placeholder="Ex: Potiguara"
                        value={newGroupName}
                        onChange={(e) => {
                          setNewGroupName(e.target.value);
                          setCreateError("");
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>Seções iniciais (opcional)</FieldLabel>
                      <RamoNamesInputs
                        value={newGroupRamoNames}
                        onChange={setNewGroupRamoNames}
                        groupName={newGroupName}
                      />
                    </div>
                    <HardButton
                      full
                      onClick={handleCreate}
                      disabled={
                        !newGroupName.trim() ||
                        !newGroupNumber.trim() ||
                        !newGroupRegiao.trim() ||
                        creating
                      }
                    >
                      {creating ? "Criando..." : "Criar grupo"}
                    </HardButton>
                    <FieldError>{createError}</FieldError>
                  </div>
                ) : (
                  <HardButton
                    tone="paper"
                    full
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus aria-hidden />
                    Criar novo grupo
                  </HardButton>
                )}
              </>
            )}
          </Card>
        )}
      </Section>

      {group?.isAdmin && (
        <>
          <GroupAdminSection
            initialName={group.name}
            initialRegiao={group.regiao ?? ""}
          />
          <SectionsManager />
          <GroupDangerZone groupName={group.name} />
        </>
      )}

      <AccountSection />
    </div>
  );

  // The escoteiro reaches this page as the Perfil tab: tabbed shell, no
  // back button (the tab bar is the way out) and no avatar menu (sign-out
  // lives in AccountSection).
  if (user.role === "escoteiro") {
    return (
      <EscoteiroShell title="Perfil" onProfile>
        {sections}
      </EscoteiroShell>
    );
  }

  // Escotista "Ajustes": a pushed screen off the painel's "Mais" sheet. The
  // escotista tab bar lives in the /escotista layout (this route is outside
  // it), so the way back is the header's 44px back target.
  const eyebrow =
    [group?.name, groupIdentity].filter(Boolean).join(" · ") || "Escotista";
  return (
    <AppShell
      header={
        <PageHeader
          back={
            <BackLink
              link={<Link to={isEscotista ? "/escotista" : "/"} />}
              ariaLabel={isEscotista ? "Voltar ao painel" : "Voltar"}
            />
          }
          eyebrow={eyebrow}
          title="Ajustes"
        />
      }
    >
      {sections}
    </AppShell>
  );
}

function AccountSection() {
  const { signOut } = useAuthActions();
  return (
    <Section label="Conta">
      <HardButton tone="paper" full onClick={() => void signOut()}>
        <LogOut aria-hidden />
        Sair da conta
      </HardButton>
    </Section>
  );
}

function UserNameSection({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [saveError, setSaveError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const updateNameFn = useConvexMutation(api.users.updateName);
  const { mutate: updateName, isPending: saving } = useMutation({
    mutationFn: updateNameFn,
  });

  const dirty = name.trim() !== currentName && name.trim() !== "";

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setSaveError("Nome não pode ser vazio");
      return;
    }
    setSaveError("");
    updateName(
      { name: trimmed },
      {
        onSuccess: () => setSavedAt(Date.now()),
        onError: (err) => setSaveError(err.message),
      },
    );
  };

  return (
    <Section label="Seu nome" first>
      <Card className="space-y-2.5">
        <Input
          aria-label="Seu nome"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaveError("");
            setSavedAt(null);
          }}
          maxLength={100}
          placeholder="Seu nome"
        />
        <FieldError>{saveError}</FieldError>
        <div className="flex items-center justify-between gap-2">
          <Hint>{savedAt && !dirty ? "Salvo." : ""}</Hint>
          <HardButton onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Salvando..." : "Salvar nome"}
          </HardButton>
        </div>
      </Card>
    </Section>
  );
}

function GroupAdminSection({
  initialName,
  initialRegiao,
}: {
  initialName: string;
  initialRegiao: string;
}) {
  const [name, setName] = useState(initialName);
  const [regiao, setRegiao] = useState(initialRegiao);
  const [saveError, setSaveError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const updateGroupFn = useConvexMutation(api.groups.updateGroup);
  const { mutate: updateGroup, isPending: saving } = useMutation({
    mutationFn: updateGroupFn,
  });

  const dirty =
    name.trim() !== initialName || regiao.trim() !== initialRegiao;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setSaveError("Nome do grupo é obrigatório");
      return;
    }
    setSaveError("");
    updateGroup(
      { name: trimmed, regiao: regiao.trim() },
      {
        onSuccess: () => {
          setSavedAt(Date.now());
        },
        onError: (err) => setSaveError(err.message),
      },
    );
  };

  return (
    <Section label="Gerenciar grupo">
      <Card className="space-y-3">
        <div className="space-y-1.5">
          <FieldLabel htmlFor="admin-group-name">Nome do grupo</FieldLabel>
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

        <div className="space-y-1.5">
          <FieldLabel htmlFor="admin-group-regiao">
            Região escoteira (UF)
          </FieldLabel>
          <RegiaoInput
            id="admin-group-regiao"
            value={regiao}
            onChange={(next) => {
              setRegiao(next);
              setSaveError("");
              setSavedAt(null);
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Hint>{savedAt && !dirty ? "Salvo." : ""}</Hint>
          <HardButton onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </HardButton>
        </div>
        <FieldError>{saveError}</FieldError>
      </Card>
    </Section>
  );
}

/** Admin-only "Excluir grupo", typed-name confirmation. Red tint, no shadow. */
function GroupDangerZone({ groupName }: { groupName: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const deleteGroupFn = useConvexMutation(api.groups.deleteGroup);
  const { mutate: deleteGroup, isPending: deleting } = useMutation({
    mutationFn: deleteGroupFn,
  });

  const handleDelete = () => {
    setDeleteError("");
    deleteGroup(
      { confirmName: confirmText },
      { onError: (err) => setDeleteError(err.message) },
    );
  };

  return (
    <Section label={<span style={{ color: RED }}>Zona perigosa</span>}>
      <Card tint={RED_TINT} style={{ borderColor: RED }} className="space-y-3">
        {confirmOpen ? (
          <>
            <p className="text-[15px] text-[#141414]">
              Esta ação não pode ser desfeita pela interface. Para confirmar,
              digite o nome do grupo:{" "}
              <strong className="font-mono">{groupName}</strong>
            </p>
            <Input
              aria-label="Nome do grupo para confirmar"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setDeleteError("");
              }}
              placeholder={groupName}
              autoFocus
            />
            <FieldError>{deleteError}</FieldError>
            <div className="flex flex-wrap justify-end gap-2">
              <HardButton
                tone="paper"
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmText("");
                  setDeleteError("");
                }}
                disabled={deleting}
              >
                Cancelar
              </HardButton>
              <HardButton
                tone="danger"
                onClick={handleDelete}
                disabled={confirmText.trim() !== groupName || deleting}
              >
                <Trash2 aria-hidden />
                {deleting ? "Excluindo..." : "Excluir definitivamente"}
              </HardButton>
            </div>
          </>
        ) : (
          <HardButton tone="danger" onClick={() => setConfirmOpen(true)}>
            <Trash2 aria-hidden />
            Excluir grupo
          </HardButton>
        )}
      </Card>
    </Section>
  );
}
