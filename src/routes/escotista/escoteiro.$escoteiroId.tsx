import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Id } from "../../../convex/_generated/dataModel";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";
import { Dashboard } from "../index";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye } from "lucide-react";
import { ResetManagedPasswordButton } from "@/components/escotista/managed-access";
import { useProgression } from "@/hooks/use-progression";
import { countRevisaoDeck } from "@/lib/revisao-deck";
import { revisaoButtonLabel } from "@/lib/revisao-entry";
import { RevisaoRapidaLink } from "@/components/escotista/revisao-rapida-link";

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
  // Same query the Dashboard below reads (shared cache); it only resolves for
  // escoteiros this escotista may act on, so the button inherits that rule.
  const progression = useProgression(escoteiroId);
  const revisaoCount = countRevisaoDeck(progression);

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
        {escoteiro?.scoutId && (
          <ResetManagedPasswordButton
            userId={escoteiro._id}
            name={escoteiro.name ?? "Escoteiro"}
            compact
          />
        )}
      </div>

      {revisaoCount > 0 ? (
        <RevisaoRapidaLink
          escoteiroId={escoteiroId}
          data-testid="revisao-rapida-entry"
          className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-black bg-yellow-400 px-4 py-2.5 text-sm font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000]"
        >
          <span aria-hidden>🃏</span>
          {revisaoButtonLabel(revisaoCount)}
        </RevisaoRapidaLink>
      ) : (
        <p
          data-testid="revisao-rapida-em-dia"
          className="rounded-md border-2 border-dashed border-black/30 px-4 py-2 text-center text-xs font-bold text-muted-foreground"
        >
          {revisaoButtonLabel(revisaoCount)}
        </p>
      )}

      <Dashboard targetUserId={escoteiroId} />
    </div>
  );
}
