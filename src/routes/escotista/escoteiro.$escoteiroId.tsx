import { Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { EscoteiroPlano } from "@/components/escotista/escoteiro-plano";

type EscoteiroView = "progressao" | "plano";

export const Route = createFileRoute("/escotista/escoteiro/$escoteiroId")({
  validateSearch: (search: Record<string, unknown>): { view?: EscoteiroView } => ({
    view: search.view === "plano" ? "plano" : undefined,
  }),
  component: ImpersonationView,
});

function ImpersonationView() {
  const { escoteiroId } = Route.useParams();
  const { view = "progressao" } = Route.useSearch();
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
      <ImpersonationContent escoteiroId={typedId} view={view} />
    </Suspense>
  );
}

function ImpersonationContent({
  escoteiroId,
  view,
}: {
  escoteiroId: Id<"users">;
  view: EscoteiroView;
}) {
  const { data: members } = useSuspenseQuery(
    convexQuery(api.groups.getGroupMembers, {}),
  );

  const escoteiro = members.find((m) => m._id === escoteiroId);
  // Same query the Dashboard below reads (shared cache); it only resolves for
  // escoteiros this escotista may act on, so the button inherits that rule.
  const progression = useProgression(escoteiroId);
  const revisaoCount = countRevisaoDeck(progression);
  const { data: planItems } = useSuspenseQuery(
    convexQuery(api.plan.getPlanForUser, { targetUserId: escoteiroId }),
  );

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

      <ViewToggle view={view} planCount={planItems.length} />

      {view === "plano" ? (
        <EscoteiroPlano
          escoteiroId={escoteiroId}
          name={escoteiro?.name ?? "Escoteiro"}
        />
      ) : (
        <Dashboard targetUserId={escoteiroId} />
      )}
    </div>
  );
}

/** Progressão ↔ Plano, kept in the URL so a reload stays on the same view. */
function ViewToggle({
  view,
  planCount,
}: {
  view: EscoteiroView;
  planCount: number;
}) {
  const base =
    "flex-1 flex items-center justify-center gap-1.5 text-sm h-9 rounded-md font-bold transition-all";
  const active =
    "bg-primary text-white border-2 border-black shadow-[2px_2px_0px_0px_#000]";
  const inactive =
    "text-foreground border-2 border-transparent hover:border-black hover:bg-white";
  return (
    <div
      className="flex gap-1 p-1 bg-muted rounded-md border-2 border-black"
      data-testid="escoteiro-view-toggle"
    >
      <Link
        from={Route.fullPath}
        search={{}}
        className={`${base} ${view === "progressao" ? active : inactive}`}
      >
        Progressão
      </Link>
      <Link
        from={Route.fullPath}
        search={{ view: "plano" }}
        className={`${base} ${view === "plano" ? active : inactive}`}
      >
        Plano
        {planCount > 0 && (
          <span className="rounded-sm border-2 border-black bg-yellow-400 px-1 text-[10px] font-black leading-tight text-black">
            {planCount}
          </span>
        )}
      </Link>
    </div>
  );
}
