import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Id } from "../../../convex/_generated/dataModel";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";
import { Dashboard } from "../index";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
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
      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-center gap-3">
        <div className="rounded-full bg-blue-100 p-2">
          <Eye className="size-4 text-blue-600" />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar className="size-7">
            <AvatarImage src={escoteiro?.image ?? undefined} />
            <AvatarFallback className="text-[10px]">
              {escoteiro?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-blue-900 truncate">
              {escoteiro?.name ?? "Escoteiro"}
            </p>
            <p className="text-[10px] text-blue-600">
              Visualizando como escotista — ações são aprovadas automaticamente
            </p>
          </div>
        </div>
      </div>

      <Dashboard targetUserId={escoteiroId} />
    </div>
  );
}
