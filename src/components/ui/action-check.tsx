/**
 * The checkbox of an action / especialidade item: 28px box inside a 48px
 * target. States are semantic — open = paper, pending = amber + clock,
 * approved = emerald + check, selected (escotista multi-select) = paz + check.
 * Marked states get the 2px hard shadow (they are the tappable "raised" thing).
 */
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckState = "open" | "pending" | "approved" | "selected";

export function ActionCheck({
  state,
  onClick,
  disabled,
  ariaLabel,
  testId,
  id,
  className,
}: {
  state: CheckState;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  testId?: string;
  /** DOM id (progression ações use the action id — e2e selects on it). */
  id?: string;
  className?: string;
}) {
  const checked = state !== "open";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "pending" ? "mixed" : checked}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      id={id}
      data-testid={testId}
      data-state={state}
      className={cn(
        "-my-2.5 -ml-2.5 grid size-12 shrink-0 place-items-center rounded-md disabled:cursor-default",
        !disabled && "hover:bg-black/[0.04]",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-7 place-items-center rounded-[7px] border-2 border-[#141414] transition-transform",
          state === "open" && "bg-white",
          state === "approved" && "bg-[#0E6B4E] text-white shadow-[2px_2px_0_#141414]",
          state === "pending" && "bg-[#F5B300] text-[#141414] shadow-[2px_2px_0_#141414]",
          state === "selected" && "bg-[#1E3A8A] text-white shadow-[2px_2px_0_#141414]",
        )}
      >
        {(state === "approved" || state === "selected") && (
          <Check className="size-[18px]" strokeWidth={3} aria-hidden />
        )}
        {state === "pending" && <Clock className="size-[18px]" strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );
}
