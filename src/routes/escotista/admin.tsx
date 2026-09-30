import { useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Check,
  X,
  ShieldCheck,
  ShieldOff,
  Ban,
  UserCog,
  Lock,
  TreePine,
} from "lucide-react";
import { RamoPicker } from "@/components/onboarding/ramo-picker";
import { RAMO_LABELS, type Ramo } from "@/lib/ramos";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, Note, Section } from "@/components/ui/section";
import { ListRow } from "@/components/ui/list-row";
import { EmptyState } from "@/components/ui/empty-state";
import { HardButton } from "@/components/ui/hard-button";
import { Pill } from "@/components/ui/status-pill";
import { PersonAvatar } from "@/components/ui/person-avatar";

export const Route = createFileRoute("/escotista/admin")({
  component: AdminPage,
});

/**
 * A ListBox rendered as a <ul>: e2e reads rows as list items. Each <li>
 * carries the 1.5px line-soft divider (ListRow's own divider is off, since
 * every row is the first child of its <li>).
 */
function RowList({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <ul
      data-testid={testId}
      className="overflow-hidden rounded-[10px] border-2 border-[#141414] bg-white"
    >
      {children}
    </ul>
  );
}

/** Member action buttons: 44px, one line in a 2-col grid at 390px. */
const ACTION_BTN = "whitespace-nowrap px-2 text-[14px]";

const LI = "border-t-[1.5px] border-[#D9D5C9] first:border-t-0";

function AdminPage() {
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  const { data: myGroup } = useSuspenseQuery(
    convexQuery(api.groups.getMyGroup, {}),
  );
  const { data: pending } = useSuspenseQuery(
    convexQuery(api.groups.getPendingMemberships, {}),
  );
  const { data: members } = useSuspenseQuery(
    convexQuery(api.groups.getGroupMembers, {}),
  );
  const { data: sections } = useSuspenseQuery(
    convexQuery(api.groups.listSections, {}),
  );
  const navigate = useNavigate();

  if (!user || !myGroup?.isAdmin) {
    return (
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Lock className="size-6 shrink-0 text-[#4A4A44]" aria-hidden />
          <div>
            <h2 className="text-[16px] font-black">Acesso restrito</h2>
            <p className="text-[13px] text-[#4A4A44]">
              Apenas administradores do grupo podem ver esta página.
            </p>
          </div>
        </div>
        <HardButton tone="paper" size="md" full onClick={() => void navigate({ to: "/escotista" })}>
          Voltar ao painel
        </HardButton>
      </Card>
    );
  }

  return (
    <div>
      <PendingSection pending={pending} />
      <MembersSection members={members} sections={sections} selfId={user._id} />
    </div>
  );
}

type PendingMember = {
  _id: Id<"users">;
  name?: string | null;
  image?: string | null;
  email?: string | null;
  role?: "escoteiro" | "escotista";
  ramo?: Ramo;
  escotistaRamos?: Ramo[];
};

function PendingSection({ pending }: { pending: PendingMember[] }) {
  const approveFn = useConvexMutation(api.groups.approveMembership);
  const { mutate: approve, isPending: approving } = useMutation({
    mutationFn: approveFn,
  });
  const rejectFn = useConvexMutation(api.groups.rejectMembership);
  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: rejectFn,
  });

  return (
    <Section label="Solicitações pendentes" meta={pending.length} first>
      {pending.length === 0 ? (
        <EmptyState>Sem solicitações no momento.</EmptyState>
      ) : (
        <RowList testId="admin-pending">
          {pending.map((m) => {
            const name = m.name ?? "Sem nome";
            return (
              <li key={m._id} className={LI}>
                <ListRow
                  className="border-t-0"
                  leading={<PersonAvatar id={m._id} name={m.name} image={m.image} size={40} />}
                  title={<span className="block truncate">{name}</span>}
                  subtitle={`${m.role === "escotista" ? "Escotista" : "Escoteiro"} · ${ramosLabel(m)}`}
                  trailing={
                    <span className="flex shrink-0 gap-2">
                      <HardButton
                        tone="primary"
                        size="md"
                        className="w-11 px-0"
                        onClick={() => approve({ userId: m._id })}
                        disabled={approving}
                        aria-label={`Aprovar ${name}`}
                      >
                        <Check aria-hidden strokeWidth={3} />
                      </HardButton>
                      <HardButton
                        tone="paper"
                        size="md"
                        className="w-11 px-0"
                        onClick={() => reject({ userId: m._id })}
                        disabled={rejecting}
                        aria-label={`Rejeitar ${name}`}
                      >
                        <X aria-hidden strokeWidth={3} />
                      </HardButton>
                    </span>
                  }
                />
              </li>
            );
          })}
        </RowList>
      )}
    </Section>
  );
}

type Member = {
  _id: Id<"users">;
  name?: string | null;
  image?: string | null;
  email?: string | null;
  role?: "escoteiro" | "escotista";
  ramo?: Ramo;
  escotistaRamos?: Ramo[];
  isAdmin: boolean;
  sectionId: Id<"sections"> | null;
};

type SectionRow = { _id: Id<"sections">; name: string; ramo: Ramo };

function MembersSection({
  members,
  sections,
  selfId,
}: {
  members: Member[];
  sections: SectionRow[];
  selfId: Id<"users">;
}) {
  return (
    <Section label="Membros" meta={members.length}>
      <RowList testId="admin-members">
        {members.map((m) => (
          <MemberRow key={m._id} member={m} sections={sections} isSelf={m._id === selfId} />
        ))}
      </RowList>
      <Note>Toque em um membro para ver as ações.</Note>
    </Section>
  );
}

function MemberRow({
  member,
  sections,
  isSelf,
}: {
  member: Member;
  sections: SectionRow[];
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"role" | "admin" | "ban" | null>(null);
  const [busyAction, setBusyAction] = useState(false);
  const [editingRamos, setEditingRamos] = useState(false);

  const banFn = useConvexMutation(api.groups.banMember);
  const { mutateAsync: ban } = useMutation({ mutationFn: banFn });

  const setAdminFn = useConvexMutation(api.groups.setMemberAdmin);
  const { mutateAsync: setAdmin } = useMutation({ mutationFn: setAdminFn });

  const changeRoleFn = useConvexMutation(api.groups.changeMemberRole);
  const { mutateAsync: changeRole } = useMutation({
    mutationFn: changeRoleFn,
  });

  const setRamoFn = useConvexMutation(api.groups.setMemberRamo);
  const { mutateAsync: setRamo } = useMutation({ mutationFn: setRamoFn });

  const setRamosFn = useConvexMutation(api.groups.setMemberRamos);
  const { mutateAsync: setRamos } = useMutation({ mutationFn: setRamosFn });

  const runAction = async (fn: () => Promise<unknown>) => {
    setBusyAction(true);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    } finally {
      setBusyAction(false);
      setPendingAction(null);
    }
  };

  const dlg = dialogProps(pendingAction, member);
  const isEscotista = member.role === "escotista";
  const sectionName =
    !isEscotista && sections.length > 0
      ? ` · ${sections.find((s) => s._id === member.sectionId)?.name ?? "sem seção"}`
      : "";

  return (
    <li className={LI} data-testid="admin-member">
      <ListRow
        className="border-t-0"
        onClick={() => setOpen((v) => !v)}
        testId="member-toggle"
        data={{ open: String(open) }}
        leading={<PersonAvatar id={member._id} name={member.name} image={member.image} size={40} />}
        title={
          <>
            {member.name ?? "Sem nome"}
            {isSelf && (
              <span className="ml-1.5 text-[12px] font-bold text-[#8A887F]">(você)</span>
            )}
          </>
        }
        subtitle={`${isEscotista ? "Escotista" : "Escoteiro"} · ${ramosLabel(member)}${sectionName}`}
        trailing={member.isAdmin ? <Pill tone="ink">admin</Pill> : undefined}
        chevron
      />

      {open && (
        <div className="space-y-3 border-t-[1.5px] border-[#D9D5C9] bg-[#F4F1E8] p-3">
          <div className="grid grid-cols-2 gap-2">
            <HardButton
              tone={editingRamos ? "primary" : "paper"}
              size="md"
              className={ACTION_BTN}
              onClick={() => setEditingRamos((v) => !v)}
              disabled={busyAction}
              aria-pressed={editingRamos}
              aria-label={
                isEscotista ? "Editar ramos atribuídos" : "Editar ramo e seção do escoteiro"
              }
            >
              <TreePine aria-hidden />
              {isEscotista ? "Ramos" : "Ramo e seção"}
            </HardButton>

            {isEscotista && !isSelf && (
              <HardButton
                tone="paper"
                size="md"
                className={ACTION_BTN}
                onClick={() => setPendingAction("admin")}
                disabled={busyAction}
              >
                {member.isAdmin ? <ShieldOff aria-hidden /> : <ShieldCheck aria-hidden />}
                {member.isAdmin ? "Remover admin" : "Tornar admin"}
              </HardButton>
            )}

            {!isSelf && (
              <HardButton
                tone="paper"
                size="md"
                className={ACTION_BTN}
                onClick={() => setPendingAction("role")}
                disabled={busyAction}
              >
                <UserCog aria-hidden />
                Trocar papel
              </HardButton>
            )}

            {!isSelf && (
              <HardButton
                tone="danger"
                size="md"
                className={ACTION_BTN}
                onClick={() => setPendingAction("ban")}
                disabled={busyAction}
                aria-label="Banir do grupo"
              >
                <Ban aria-hidden />
                Banir
              </HardButton>
            )}
          </div>

          {editingRamos && (
            <>
              <RamoEditor
                member={member}
                busy={busyAction}
                onSaveRamo={(ramo) =>
                  runAction(async () => {
                    await setRamo({ userId: member._id, ramo });
                    setEditingRamos(false);
                  })
                }
                onSaveRamos={(ramos) =>
                  runAction(async () => {
                    await setRamos({ userId: member._id, ramos });
                    setEditingRamos(false);
                  })
                }
              />
              {!isEscotista && <SectionPicker member={member} sections={sections} />}
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(o) => {
          if (!o) setPendingAction(null);
        }}
        title={dlg?.title ?? ""}
        description={dlg?.description ?? ""}
        confirmLabel={dlg?.confirmLabel ?? "Confirmar"}
        destructive={dlg?.destructive ?? false}
        busy={busyAction}
        onConfirm={() => {
          if (!pendingAction) return;
          if (pendingAction === "role") {
            void runAction(() =>
              changeRole({
                userId: member._id,
                role: member.role === "escotista" ? "escoteiro" : "escotista",
              }),
            );
          } else if (pendingAction === "admin") {
            void runAction(() => setAdmin({ userId: member._id, isAdmin: !member.isAdmin }));
          } else if (pendingAction === "ban") {
            void runAction(() => ban({ userId: member._id }));
          }
        }}
      />
    </li>
  );
}

function dialogProps(
  action: "role" | "admin" | "ban" | null,
  member: Member,
): { title: string; description: string; confirmLabel: string; destructive: boolean } | null {
  if (!action) return null;
  const name = member.name ?? "este membro";
  switch (action) {
    case "role": {
      const newRole = member.role === "escotista" ? "Escoteiro" : "Escotista";
      return {
        title: "Trocar papel",
        description: `Trocar o papel de ${name} para ${newRole}?`,
        confirmLabel: "Confirmar",
        destructive: false,
      };
    }
    case "admin":
      return member.isAdmin
        ? {
            title: "Remover admin",
            description: `Remover as permissões de admin de ${name}?`,
            confirmLabel: "Confirmar",
            destructive: false,
          }
        : {
            title: "Tornar admin",
            description: `Tornar ${name} administrador do grupo?`,
            confirmLabel: "Confirmar",
            destructive: false,
          };
    case "ban":
      return {
        title: "Banir membro",
        description: `Banir ${name} do grupo? Esta ação não pode ser desfeita pela interface.`,
        confirmLabel: "Banir",
        destructive: true,
      };
  }
}

function RamoEditor({
  member,
  busy,
  onSaveRamo,
  onSaveRamos,
}: {
  member: Member;
  busy: boolean;
  onSaveRamo: (ramo: Ramo) => Promise<void> | void;
  onSaveRamos: (ramos: Ramo[]) => Promise<void> | void;
}) {
  const [ramo, setRamo] = useState<Ramo | null>(member.ramo ?? null);
  const [ramos, setRamos] = useState<Ramo[]>(member.escotistaRamos ?? []);

  const isEscotista = member.role === "escotista";
  const canSave = isEscotista ? ramos.length > 0 : !!ramo;

  return (
    <div className="space-y-2">
      {isEscotista ? (
        <RamoPicker mode="multi" value={ramos} onChange={setRamos} />
      ) : (
        <RamoPicker mode="single" value={ramo} onChange={setRamo} />
      )}
      <HardButton
        tone="primary"
        size="md"
        full
        onClick={() => {
          if (isEscotista) void onSaveRamos(ramos);
          else if (ramo) void onSaveRamo(ramo);
        }}
        disabled={!canSave || busy}
      >
        Salvar ramo{isEscotista ? "s" : ""}
      </HardButton>
    </div>
  );
}

/**
 * Place an escoteiro in one of the grupo's seções. Only seções of the
 * escoteiro's own ramo are offered — a seção belongs to exactly one ramo, and
 * the server refuses a mismatch — so the ramo has to be set first.
 */
function SectionPicker({
  member,
  sections,
}: {
  member: Member;
  sections: SectionRow[];
}) {
  const [error, setError] = useState("");
  const setSectionFn = useConvexMutation(api.groups.setMemberSection);
  const { mutate: setSection, isPending } = useMutation({
    mutationFn: setSectionFn,
  });

  const options = member.ramo
    ? sections.filter((s) => s.ramo === member.ramo)
    : [];
  const selectId = `member-section-${member._id}`;

  return (
    <div className="space-y-1 border-t-[1.5px] border-[#D9D5C9] pt-3">
      <label
        htmlFor={selectId}
        className="block text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#4A4A44]"
      >
        Seção
      </label>
      <select
        id={selectId}
        className="min-h-11 w-full rounded-md border-2 border-[#141414] bg-white px-3 text-[15px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B4E]/40 disabled:opacity-50"
        value={member.sectionId ?? ""}
        disabled={!member.ramo || isPending}
        onChange={(e) => {
          setError("");
          setSection(
            {
              userId: member._id,
              sectionId: (e.target.value || null) as Id<"sections"> | null,
            },
            { onError: (err) => setError(err.message) },
          );
        }}
      >
        <option value="">Sem seção</option>
        {options.map((s) => (
          <option key={s._id} value={s._id}>
            {s.name}
          </option>
        ))}
      </select>
      {!member.ramo && (
        <p className="text-[12px] text-[#4A4A44]">
          Defina o ramo antes de escolher a seção.
        </p>
      )}
      {member.ramo && options.length === 0 && (
        <p className="text-[12px] text-[#4A4A44]">
          Nenhuma seção deste ramo. Crie uma em Ajustes.
        </p>
      )}
      {error && <p className="text-[12px] font-bold text-[#C62828]">{error}</p>}
    </div>
  );
}

function ramosLabel(m: {
  role?: "escoteiro" | "escotista";
  ramo?: Ramo;
  escotistaRamos?: Ramo[];
}): string {
  if (m.role === "escotista") {
    const ramos = m.escotistaRamos ?? [];
    if (ramos.length === 0) return "sem ramo";
    return ramos.map((r) => RAMO_LABELS[r]).join(", ");
  }
  return m.ramo ? RAMO_LABELS[m.ramo] : "sem ramo";
}
