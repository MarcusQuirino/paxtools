/**
 * Mutation hooks + the relato block shared by the escotista especialidades
 * detail (older ramos) and the per-escoteiro ficha.
 */
import { useState, type ReactNode } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { notifyLevelUps } from "@/lib/level-up-toast";
import { PersonAvatar } from "./ui";

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

export function SmallButton({
  kind,
  onClick,
  disabled,
  children,
}: {
  kind: "primary" | "ghost";
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center rounded-[10px] border-2 border-[#141414] px-3.5 text-[14px] font-black shadow-[2px_2px_0_#141414] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 ${
        kind === "primary" ? "bg-[#0E6B4E] text-white" : "bg-white text-[#141414]"
      }`}
    >
      {children}
    </button>
  );
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
        <span className="ml-auto inline-flex items-center rounded-full border-2 border-[#141414] bg-[#F5B300] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide">
          Pendente
        </span>
      </div>
      <p
        className={`mb-2 whitespace-pre-line border-l-[3px] border-[#D9D5C9] pl-2.5 text-[13px] leading-snug text-[#4A4A44] ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        {text}
      </p>
      <div className="flex flex-wrap gap-2">
        <SmallButton
          kind="primary"
          disabled={review.busy}
          onClick={() => review.approve(reportId)}
        >
          Aprovar {stepLabel}
        </SmallButton>
        <SmallButton kind="ghost" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Recolher" : "Ler relato"}
        </SmallButton>
        <SmallButton
          kind="ghost"
          disabled={review.busy}
          onClick={() => review.reject(reportId)}
        >
          Rejeitar
        </SmallButton>
      </div>
    </div>
  );
}

/** Suggestions list: first three, then "Ver as N sugestões". */
export function Suggestions({ items }: { items: string[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 3);
  return (
    <>
      <ul className="list-disc py-2 pl-[30px] pr-3 text-[13px] leading-snug text-[#4A4A44]">
        {shown.map((s, i) => (
          <li key={i} className="my-1">
            {s}
          </li>
        ))}
      </ul>
      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="block min-h-11 w-full px-3 pb-2 text-left text-[13px] font-extrabold text-[#0E6B4E]"
        >
          {all ? "Mostrar menos" : `Ver as ${items.length} sugestões`}
        </button>
      )}
    </>
  );
}
