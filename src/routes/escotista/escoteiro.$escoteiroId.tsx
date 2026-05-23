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
          <div className="h-16 animate-pulse rounded-sm bg-muted border-2 border-black/20" />
          <div className="h-32 animate-pulse rounded-sm bg-muted border-2 border-black/20" />
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
      <div className="rounded-sm bg-blue-100 border-2 border-black shadow-[3px_3px_0_0_#000] px-4 py-3 flex items-center gap-3">
        <div className="bg-blue-600 border-2 border-black p-2">
          <Eye className="size-4 text-white" />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar className="size-7 rounded-sm">
            <AvatarImage src={escoteiro?.image ?? undefined} />
            <AvatarFallback className="text-[10px] rounded-none">
              {escoteiro?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wide text-black truncate">
              {escoteiro?.name ?? "Escoteiro"}
            </p>
            <p className="text-[10px] text-blue-800 font-medium">
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
