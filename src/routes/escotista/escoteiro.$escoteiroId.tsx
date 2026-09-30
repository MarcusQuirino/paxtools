import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Id } from "../../../convex/_generated/dataModel";
import { Eye } from "lucide-react";
import { Dashboard } from "../index";

export const Route = createFileRoute("/escotista/escoteiro/$escoteiroId")({
  component: ImpersonationView,
});

/**
 * Escotista viewing one escoteiro. The layout (route.tsx) already renders the
 * pushed-screen PageHeader (back chevron, "Visualizando como escotista"
 * crumb, scout's name as title), so this wrapper only adds a calm context
 * strip — border-only, no shadow, no colour — above the scout's own
 * Dashboard. It must not repeat the name or the crumb (e2e reads each once).
 */
function ImpersonationView() {
  const { escoteiroId } = Route.useParams();

  return (
    <div className="space-y-4">
      <ContextStrip />
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-[10px] border-2 border-[#141414] bg-[#EEE9DC]" />
            <div className="h-28 animate-pulse rounded-[10px] border-2 border-[#141414] bg-[#EEE9DC]" />
          </div>
        }
      >
        <Dashboard targetUserId={escoteiroId as Id<"users">} />
      </Suspense>
    </div>
  );
}

function ContextStrip() {
  return (
    <div
      className="flex items-center gap-2.5 rounded-[10px] border-2 border-dashed border-[#8A887F] px-3 py-2.5 text-[13px] leading-snug text-[#4A4A44]"
      data-testid="impersonation-strip"
      role="note"
    >
      <Eye className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />
      <span>
        <b className="font-extrabold text-[#141414]">Modo escotista.</b> O que você marcar aqui
        fica aprovado na hora.
      </span>
    </div>
  );
}
