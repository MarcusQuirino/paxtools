/**
 * Mutation hooks + the relato block shared by the escotista especialidades
 * detail (older ramos) and the per-escoteiro ficha.
 */
import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { notifyLevelUps } from "@/lib/level-up-toast";
import { HardButton } from "@/components/ui/hard-button";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { StatusPill } from "@/components/ui/status-pill";

/** Strip Convex's "[CONVEX M(…)] … Uncaught Error: " wrapper for a toast. */
export function mutationErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const m = raw.match(/Uncaught Error:\s*([^\n]+)/);
  return (m?.[1] ?? raw).replace(/\s+at .*$/, "").trim();
}

function onError(err: unknown) {
  toast.error(mutationErrorMessage(err));
}

export function useStepReview() {
  const approveFn = useConvexMutation(api.specialties.approveSpecialtyStep);
  const rejectFn = useConvexMutation(api.specialties.rejectSpecialtyStep);
  const approve = useMutation({
    mutationFn: approveFn,
    onSuccess: notifyLevelUps,
    onError,
  });
  const reject = useMutation({ mutationFn: rejectFn, onError });
  return {
    approve: (reportId: Id<"specialtyProjectReports">) =>
      approve.mutate({ reportId }),
    reject: (reportId: Id<"specialtyProjectReports">) =>
      reject.mutate({ reportId }),
    busy: approve.isPending || reject.isPending,
  };
}

export function useItemReview() {
  const setFn = useConvexMutation(api.specialties.setSpecialtyItemApproved);
  const rejectFn = useConvexMutation(api.specialties.rejectSpecialtyItem);
  const set = useMutation({ mutationFn: setFn, onSuccess: notifyLevelUps, onError });
  const reject = useMutation({ mutationFn: rejectFn, onError });
  return {
    setApproved: (args: {
      escoteiroId: Id<"users">;
      specialtyId: string;
      itemIndex: number;
      approved: boolean;
    }) => set.mutate(args),
    reject: (completionId: Id<"specialtyItemCompletions">) =>
      reject.mutate({ completionId }),
    /** The item currently being written, so only its row shows as busy. */
    pendingItemIndex: set.isPending ? set.variables?.itemIndex : undefined,
    rejecting: reject.isPending,
  };
}

export function useRegisterStep() {
  const fn = useConvexMutation(api.specialties.submitSpecialtyStep);
  return useMutation({ mutationFn: fn, onSuccess: notifyLevelUps, onError });
}

/**
 * One pending relato: who sent it, the text (clamped until "Ler relato"), and
 * Aprovar / Rejeitar. `who` is omitted on the per-escoteiro ficha.
 */
export function PendingRelato({
  reportId,
  stepLabel,
  text,
  who,
  review,
}: {
  reportId: Id<"specialtyProjectReports">;
  stepLabel: string;
  text: string;
  who?: { id: string; name: string | null; image: string | null };
  review: ReturnType<typeof useStepReview>;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-t-2 border-[#D9D5C9] px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-2">
        {who && (
          <>
            <PersonAvatar id={who.id} name={who.name} image={who.image} size={28} />
            <span className="text-[14px] font-extrabold">{who.name ?? "Escoteiro"}</span>
          </>
        )}
        <StatusPill state="pending" className="ml-auto">
          Pendente
        </StatusPill>
      </div>
      <p
        className={`mb-2 whitespace-pre-line border-l-[3px] border-[#D9D5C9] pl-2.5 text-[13px] leading-snug text-[#4A4A44] ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {text}
      </p>
      <div className="flex flex-wrap gap-2">
        <HardButton size="sm" disabled={review.busy} onClick={() => review.approve(reportId)}>
          Aprovar {stepLabel}
        </HardButton>
        <HardButton size="sm" tone="paper" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Recolher" : "Ler relato"}
        </HardButton>
        <HardButton
          size="sm"
          tone="paper"
          disabled={review.busy}
          onClick={() => review.reject(reportId)}
        >
          Rejeitar
        </HardButton>
      </div>
    </div>
  );
}

export { Suggestions } from "@/components/especialidades/pieces";
