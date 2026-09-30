import type { ReactNode } from "react";
import type { CompletionStatus } from "@/data/types";
import { ActionCheck, type CheckState } from "@/components/ui/action-check";
import { StatusText } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import { PlanStar } from "./plan-star";

/** Semantic check state of a marked/unmarked ação. */
export function actionCheckState(checked: boolean, status?: CompletionStatus): CheckState {
  if (!checked) return "open";
  return status === "pending" ? "pending" : "approved";
}

type ActionItemProps = {
  /** DOM id of the check (the action id / plan key — e2e selects on it). */
  id: string;
  text: ReactNode;
  /** Plain-text name for the check's aria-label (defaults to `text`). */
  label?: string;
  checked: boolean;
  status?: CompletionStatus;
  onToggle: () => void;
  planned?: boolean;
  onTogglePlanned?: () => void;
  /** Approved ações are locked for the escoteiro (escotistas can still undo). */
  lockApproved?: boolean;
  /** 12px caps line above the text ("Ação fixa", "Especialidade"…). */
  kind?: ReactNode;
  /** Before the check (plan grip). */
  leading?: ReactNode;
  /** After the star (delete button). */
  trailing?: ReactNode;
  className?: string;
};

/**
 * One ação row (Design A frame 2): 28px check in a 48px target, 15px text,
 * 12px status line ("Aprovado" / "Aguardando aprovação"), 44px plan star.
 * Approved = emerald + check, struck through in emerald, locked; pending =
 * amber + clock. Rows separate with 1.5px line-soft dividers.
 */
export function ActionItem({
  id,
  text,
  label,
  checked,
  status,
  onToggle,
  planned,
  onTogglePlanned,
  lockApproved,
  kind,
  leading,
  trailing,
  className,
}: ActionItemProps) {
  const state = actionCheckState(checked, status);
  const isLocked = !!lockApproved && state === "approved";
  return (
    <div
      data-action-row={id}
      data-state={state}
      className={cn(
        "flex min-h-14 items-start gap-3 border-t-[1.5px] border-[#D9D5C9] py-3 pr-1 pl-3 first:border-t-0",
        className,
      )}
    >
      {leading}
      <ActionCheck
        id={id}
        state={state}
        onClick={onToggle}
        disabled={isLocked}
        ariaLabel={label ?? (typeof text === "string" ? text : "Ação")}
      />
      <div
        className={cn("min-w-0 flex-1 pt-0.5", !isLocked && "cursor-pointer")}
        onClick={isLocked ? undefined : onToggle}
      >
        {kind && (
          <span className="mb-0.5 block text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#8A887F]">
            {kind}
          </span>
        )}
        <span
          className={cn(
            "block text-[15px] leading-[1.4]",
            state === "approved" && "text-[#8A887F] line-through decoration-[#0E6B4E]",
          )}
        >
          {text}
        </span>
        <StatusText state={state === "selected" ? "open" : state} />
      </div>
      {onTogglePlanned && <PlanStar planned={!!planned} onToggle={onTogglePlanned} />}
      {trailing}
    </div>
  );
}
