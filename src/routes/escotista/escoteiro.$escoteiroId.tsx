import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Id } from "../../../convex/_generated/dataModel";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";
import { Dashboard } from "../index";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ComingSoon } from "@/components/progression/coming-soon";
import { Eye } from "lucide-react";

export const Route = createFileRoute("/escotista/escoteiro/$escoteiroId")({
  component: ImpersonationView,
});

function ImpersonationView() {
  const { escoteiroId } = Route.useParams();
  const typedId = escoteiroId as Id<"users">;

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-md border-2 border-black bg-muted" />
          <div className="h-32 animate-pulse rounded-md border-2 border-black bg-muted" />
        </div>
      }
    >
      <ImpersonationContent escoteiroId={typedId} />
    </Suspense>
  );
}

function ImpersonationContent({
  escoteiroId,
}: {
  escoteiroId: Id<"users">;
}) {
  const { data: members } = useSuspenseQuery(
    convexQuery(api.groups.getGroupMembers, {}),
  );

  const escoteiro = members.find((m) => m._id === escoteiroId);

  return (
    <div className="space-y-4">
      {/* Impersonation banner */}
      <div className="rounded-md border-2 border-black bg-blue-50 px-4 py-3 flex items-center gap-3 shadow-[3px_3px_0px_0px_#000]">
        <div className="rounded-md border-2 border-black bg-blue-500 p-2">
          <Eye className="size-4 text-white" />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar className="size-7 border-2 border-black">
            <AvatarImage src={escoteiro?.image ?? undefined} />
            <AvatarFallback className="text-[10px] font-bold">
              {escoteiro?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-black text-blue-950 truncate uppercase">
              {escoteiro?.name ?? "Escoteiro"}
            </p>
            <p className="text-[10px] font-medium text-blue-700">
              Visualizando como escotista — ações são aprovadas automaticamente
            </p>
          </div>
        </div>
      </div>

      {escoteiro && escoteiro.ramo && escoteiro.ramo !== "escoteiro" ? (
        <ComingSoon ramo={escoteiro.ramo} />
      ) : (
        <Dashboard targetUserId={escoteiroId} />
      )}
    </div>
  );
}
