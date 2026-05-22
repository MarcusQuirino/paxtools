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
} from "lucide-react";
import { RAMO_LABELS, type Ramo } from "@/lib/ramos";

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
      <div className="rounded-xl border bg-card p-6 text-center space-y-2">
        <Lock className="size-8 text-muted-foreground mx-auto" aria-hidden />
        <h2 className="font-semibold">Acesso restrito</h2>
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
    <section className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Solicitações pendentes</h2>
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
              className="flex items-center gap-3 rounded-lg border p-2"
            >
              <Avatar className="size-9">
                <AvatarImage src={m.image ?? undefined} />
                <AvatarFallback className="text-xs">
                  {m.name?.charAt(0)?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.name ?? "Sem nome"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {m.role === "escotista" ? "Escotista" : "Escoteiro"}
                  {" · "}
                  {ramosLabel(m)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => approve({ userId: m._id })}
                disabled={approving}
              >
                <Check className="size-4" aria-hidden />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
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
    <section className="rounded-xl border bg-card p-4 space-y-3">
      <h2 className="font-semibold">Membros</h2>
      <ul className="space-y-2">
        {members.map((m) => (
          <MemberRow key={m._id} member={m} isSelf={m._id === selfId} />
        ))}
      </ul>
    </section>
  );
}

function MemberRow({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);

  const banFn = useConvexMutation(api.groups.banMember);
  const { mutateAsync: ban } = useMutation({ mutationFn: banFn });

  const setAdminFn = useConvexMutation(api.groups.setMemberAdmin);
  const { mutateAsync: setAdmin } = useMutation({ mutationFn: setAdminFn });

  const changeRoleFn = useConvexMutation(api.groups.changeMemberRole);
  const { mutateAsync: changeRole } = useMutation({
    mutationFn: changeRoleFn,
  });

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="flex items-center gap-3 rounded-lg border p-2 flex-wrap">
      <Avatar className="size-9">
        <AvatarImage src={member.image ?? undefined} />
        <AvatarFallback className="text-xs">
          {member.name?.charAt(0)?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {member.name ?? "Sem nome"}
          {isSelf && (
            <span className="ml-2 text-[11px] text-muted-foreground">
              (você)
            </span>
          )}
          {member.isAdmin && (
            <Badge variant="outline" className="ml-2 text-[10px]">
              admin
            </Badge>
          )}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {member.role === "escotista" ? "Escotista" : "Escoteiro"}
          {" · "}
          {ramosLabel(member)}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {member.role === "escotista" && !isSelf && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void run(`admin-${member._id}`, () =>
                setAdmin({ userId: member._id, isAdmin: !member.isAdmin }),
              )
            }
            disabled={busy !== null}
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
            onClick={() =>
              void run(`role-${member._id}`, () =>
                changeRole({
                  userId: member._id,
                  role:
                    member.role === "escotista" ? "escoteiro" : "escotista",
                }),
              )
            }
            disabled={busy !== null}
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
            onClick={() => {
              if (!confirm(`Banir ${member.name ?? "este usuário"}?`)) return;
              void run(`ban-${member._id}`, () => ban({ userId: member._id }));
            }}
            disabled={busy !== null}
            title="Banir do grupo"
          >
            <Ban className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </li>
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
