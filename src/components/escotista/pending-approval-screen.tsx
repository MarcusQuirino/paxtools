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
    <div className="rounded-md border-2 border-black bg-amber-50 p-6 space-y-4 shadow-[4px_4px_0px_0px_#000]">
      <div className="flex items-center gap-3">
        <div className="rounded-md border-2 border-black bg-amber-300 p-3">
          <Clock className="size-6 text-amber-900" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-black uppercase text-amber-950">
            Aguardando aprovação
          </h2>
          <p className="text-xs font-medium text-amber-800/80">
            Sua solicitação foi enviada ao administrador do grupo.
          </p>
        </div>
      </div>

      <div className="rounded-md border-2 border-amber-400 bg-white px-3 py-2 text-sm text-amber-900">
        <p>
          <strong>Grupo:</strong> {groupName}
          {groupNumber ? ` · nº ${groupNumber}` : ""}
        </p>
      </div>

      <p className="text-sm font-medium text-amber-900">
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
        className="w-full border-amber-600 text-amber-900 bg-white hover:bg-amber-50"
      >
        <LogOut className="size-4 mr-2" aria-hidden />
        Cancelar solicitação e escolher outro grupo
      </Button>
    </div>
  );
}
