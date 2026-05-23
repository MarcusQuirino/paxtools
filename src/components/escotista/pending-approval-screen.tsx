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
    <div className="rounded-sm border-2 border-black bg-amber-100 p-6 space-y-4 shadow-[3px_3px_0_0_#000]">
      <div className="flex items-center gap-3">
        <div className="bg-amber-400 border-2 border-black p-3">
          <Clock className="size-6 text-black" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-black uppercase tracking-wide text-black">
            Aguardando aprovação
          </h2>
          <p className="text-xs text-black/70 font-medium">
            Sua solicitação foi enviada ao administrador do grupo.
          </p>
        </div>
      </div>

      <div className="border-2 border-black bg-white px-3 py-2 text-sm text-black font-medium">
        <p>
          <strong>Grupo:</strong> {groupName}
          {groupNumber ? ` · nº ${groupNumber}` : ""}
        </p>
      </div>

      <p className="text-sm text-black/80 font-medium">
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
        className="w-full"
      >
        <LogOut className="size-4 mr-2" aria-hidden />
        Cancelar solicitação e escolher outro grupo
      </Button>
    </div>
  );
}
