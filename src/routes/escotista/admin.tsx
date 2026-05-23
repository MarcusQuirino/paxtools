import { useState } from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  ShieldCheck,
  ShieldOff,
  Ban,
  UserCog,
  Inbox,
  Lock,
  TreePine,
} from "lucide-react";
import { RamoPicker } from "@/components/onboarding/ramo-picker";
import { RAMO_LABELS, type Ramo } from "@/lib/ramos";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export const Route = createFileRoute("/escotista/admin")({
  component: AdminPage,
});

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
  const navigate = useNavigate();

  if (!user || !myGroup?.isAdmin) {
    return (
      <div className="rounded-md border-2 border-black bg-card p-6 text-center space-y-2 shadow-[4px_4px_0px_0px_#000]">
        <Lock className="size-8 text-muted-foreground mx-auto" aria-hidden />
        <h2 className="font-black uppercase">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground">
          Apenas administradores do grupo podem ver esta página.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void navigate({ to: "/escotista" })}
        >
          Voltar ao painel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PendingSection pending={pending} />
      <MembersSection members={members} selfId={user._id} />
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
    <section className="rounded-md border-2 border-black bg-card p-4 space-y-3 shadow-[3px_3px_0px_0px_#065f46]">
      <div className="flex items-center justify-between">
        <h2 className="font-black uppercase text-sm">Solicitações pendentes</h2>
        <Badge variant="outline">{pending.length}</Badge>
      </div>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center py-4 text-center text-muted-foreground">
          <Inbox className="size-8 mb-2 opacity-50" aria-hidden />
          <p className="text-sm">Sem solicitações no momento.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {pending.map((m) => (
            <li
              key={m._id}
              className="flex items-center gap-3 rounded-md border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000]"
            >
              <Avatar className="size-9 border-2 border-black">
                <AvatarImage src={m.image ?? undefined} />
                <AvatarFallback className="text-xs font-bold">
                  {m.name?.charAt(0)?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">
                  {m.name ?? "Sem nome"}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground truncate">
                  {m.role === "escotista" ? "Escotista" : "Escoteiro"}
                  {" · "}
                  {ramosLabel(m)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="bg-emerald-700 text-white border-black hover:bg-emerald-800"
                onClick={() => approve({ userId: m._id })}
                disabled={approving}
              >
                <Check className="size-4" aria-hidden />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-destructive text-white border-black hover:bg-destructive/80"
                onClick={() => reject({ userId: m._id })}
                disabled={rejecting}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
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
};

function MembersSection({
  members,
  selfId,
}: {
  members: Member[];
  selfId: Id<"users">;
}) {
  return (
    <section className="rounded-md border-2 border-black bg-card p-4 space-y-3 shadow-[3px_3px_0px_0px_#065f46]">
      <h2 className="font-black uppercase text-sm">Membros</h2>
      <ul className="space-y-2">
        {members.map((m) => (
          <MemberRow key={m._id} member={m} isSelf={m._id === selfId} />
        ))}
      </ul>
    </section>
  );
}

function MemberRow({ member, isSelf }: { member: Member; isSelf: boolean }) {
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

  return (
    <li className="rounded-md border-2 border-black p-2 space-y-2 shadow-[2px_2px_0px_0px_#000]">
      <div className="flex items-center gap-3 flex-wrap">
        <Avatar className="size-9 border-2 border-black">
          <AvatarImage src={member.image ?? undefined} />
          <AvatarFallback className="text-xs font-bold">
            {member.name?.charAt(0)?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate">
            {member.name ?? "Sem nome"}
            {isSelf && (
              <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                (você)
              </span>
            )}
            {member.isAdmin && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                admin
              </Badge>
            )}
          </p>
          <p className="text-[11px] font-medium text-muted-foreground truncate">
            {member.role === "escotista" ? "Escotista" : "Escoteiro"}
            {" · "}
            {ramosLabel(member)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={editingRamos ? "default" : "outline"}
            onClick={() => setEditingRamos((v) => !v)}
            disabled={busyAction}
            title={
              member.role === "escotista"
                ? "Editar ramos atribuídos"
                : "Editar ramo do escoteiro"
            }
          >
            <TreePine className="size-4" aria-hidden />
          </Button>

          {member.role === "escotista" && !isSelf && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPendingAction("admin")}
              disabled={busyAction}
              title={member.isAdmin ? "Remover admin" : "Tornar admin"}
            >
              {member.isAdmin ? (
                <ShieldOff className="size-4" aria-hidden />
              ) : (
                <ShieldCheck className="size-4" aria-hidden />
              )}
            </Button>
          )}

          {!isSelf && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPendingAction("role")}
              disabled={busyAction}
              title="Trocar papel"
            >
              <UserCog className="size-4" aria-hidden />
            </Button>
          )}

          {!isSelf && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setPendingAction("ban")}
              disabled={busyAction}
              title="Banir do grupo"
            >
              <Ban className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>

      {editingRamos && (
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
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => { if (!open) setPendingAction(null); }}
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
            void runAction(() =>
              setAdmin({ userId: member._id, isAdmin: !member.isAdmin }),
            );
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
    <div className="border-t pt-2 space-y-2">
      {isEscotista ? (
        <RamoPicker mode="multi" value={ramos} onChange={setRamos} />
      ) : (
        <RamoPicker mode="single" value={ramo} onChange={setRamo} />
      )}
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            if (isEscotista) void onSaveRamos(ramos);
            else if (ramo) void onSaveRamo(ramo);
          }}
          disabled={!canSave || busy}
        >
          Salvar ramo{isEscotista ? "s" : ""}
        </Button>
      </div>
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
