import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Clock, LogOut, Users } from "lucide-react";
import { Card, ListBox, Note } from "@/components/ui/section";
import { ListRow } from "@/components/ui/list-row";
import { HardButton } from "@/components/ui/hard-button";
import { formatGroupIdentity } from "@/lib/group-identity";
import { AMBER_TINT } from "@/lib/design-tokens";
import { api } from "../../../convex/_generated/api";

type Props = {
  groupName: string;
  groupNumber: string | null;
  groupRegiao: string | null;
};

/**
 * Escotista waiting for the grupo admin. Semantic "aguardando" = amber tint +
 * clock; the group is a static row; the only action is a secondary
 * (paper) button — nothing here is a primary CTA.
 */
export function PendingApprovalScreen({
  groupName,
  groupNumber,
  groupRegiao,
}: Props) {
  const identity = formatGroupIdentity(groupNumber, groupRegiao);
  const navigate = useNavigate();
  const leaveFn = useConvexMutation(api.groups.leaveGroup);
  const { mutate: leave, isPending } = useMutation({ mutationFn: leaveFn });

  return (
    <div className="space-y-3" data-testid="pending-approval-screen">
      <Card tint={AMBER_TINT} className="space-y-2 p-4">
        <h2 className="flex items-center gap-2 text-[22px] font-black leading-tight">
          <Clock className="size-6 shrink-0 text-[#6B4A00]" strokeWidth={2.5} aria-hidden />
          Aguardando aprovação
        </h2>
        <p className="text-[15px] leading-snug text-[#4A4A44]">
          Sua solicitação foi enviada ao administrador do grupo. Você poderá usar o painel
          assim que for aprovado.
        </p>
      </Card>

      <ListBox>
        <ListRow
          leading={
            <span className="grid size-10 shrink-0 place-items-center rounded-md border-2 border-[#141414] bg-[#EEE9DC]">
              <Users className="size-5" aria-hidden />
            </span>
          }
          title={groupName}
          subtitle={identity ? `Grupo · ${identity}` : "Grupo"}
        />
      </ListBox>
      <Note className="mt-0">
        Fale com o administrador do grupo para acelerar a aprovação — ou cancele para
        escolher outro grupo.
      </Note>

      <HardButton
        tone="paper"
        size="md"
        full
        onClick={() =>
          leave(
            {},
            {
              onSuccess: () => {
                void navigate({ to: "/onboarding" });
              },
            },
          )
        }
        disabled={isPending}
      >
        <LogOut aria-hidden />
        Cancelar solicitação
      </HardButton>
    </div>
  );
}
