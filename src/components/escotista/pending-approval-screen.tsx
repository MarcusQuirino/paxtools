import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "../../../convex/_generated/api";

type Props = {
  groupName: string;
  groupNumber: string | null;
};

export function PendingApprovalScreen({ groupName, groupNumber }: Props) {
  const navigate = useNavigate();
  const leaveFn = useConvexMutation(api.groups.leaveGroup);
  const { mutate: leave, isPending } = useMutation({ mutationFn: leaveFn });

  return (
    <div className="rounded-2xl border border-amber-300/40 bg-amber-50/60 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-200 p-3">
          <Clock className="size-6 text-amber-700" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-amber-900">
            Aguardando aprovação
          </h2>
          <p className="text-xs text-amber-800/70">
            Sua solicitação foi enviada ao administrador do grupo.
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-white/70 px-3 py-2 text-sm text-amber-900">
        <p>
          <strong>Grupo:</strong> {groupName}
          {groupNumber ? ` · nº ${groupNumber}` : ""}
        </p>
      </div>

      <p className="text-sm text-amber-800/80">
        Entre em contato com o administrador do grupo para acelerar a aprovação.
        Você poderá usar o painel assim que for aprovado.
      </p>

      <Button
        variant="outline"
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
        className="w-full border-amber-300 text-amber-900 hover:bg-amber-100"
      >
        <LogOut className="size-4 mr-2" aria-hidden />
        Cancelar solicitação e escolher outro grupo
      </Button>
    </div>
  );
}
