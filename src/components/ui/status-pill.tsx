/**
 * Pills (11/800 caps, 999px radius, 2px border). States are semantic, never
 * per-eixo: aprovado = emerald, aguardando = amber + clock, rejeitado = red
 * tint. Level pills: Nível 1 = paz tint, Nível 2 = gold.
 */
import type { ReactNode } from "react";
import { Check, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ApprovalState = "approved" | "pending" | "rejected";

export type PillTone =
  | "paper"
  | "ink"
  | "emerald"
  | "amber"
  | "red"
  | "gold"
  | "paz"
  | "lock";

const TONE: Record<PillTone, string> = {
  paper: "border-[#141414] bg-white text-[#141414]",
  ink: "border-[#141414] bg-[#141414] text-white",
  emerald: "border-[#141414] bg-[#0E6B4E] text-white",
  amber: "border-[#141414] bg-[#F5B300] text-[#141414]",
  red: "border-[#C62828] bg-[#FCE4E4] text-[#C62828]",
  gold: "border-[#141414] bg-[#F4C430] text-[#141414]",
  paz: "border-[#1E3A8A] bg-[#E3E8F8] text-[#1E3A8A]",
  lock: "border-[#141414] bg-[#EEE9DC] text-[#4A4A44]",
};

export function Pill({
  tone = "paper",
  children,
  className,
  testId,
}: {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[11px] font-extrabold uppercase leading-[1.3] tracking-[0.04em]",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_LABEL: Record<ApprovalState, string> = {
  approved: "Aprovado",
  pending: "Aguardando",
  rejected: "Rejeitado",
};

/** Aprovado / Aguardando / Rejeitado with its icon. Override the text via children. */
export function StatusPill({
  state,
  children,
  className,
  testId,
}: {
  state: ApprovalState;
  children?: ReactNode;
  className?: string;
  testId?: string;
}) {
  const tone: PillTone = state === "approved" ? "emerald" : state === "pending" ? "amber" : "red";
  const Icon = state === "approved" ? Check : state === "pending" ? Clock : X;
  return (
    <Pill tone={tone} className={className} testId={testId}>
      <Icon className="size-3" strokeWidth={3} aria-hidden />
      {children ?? STATUS_LABEL[state]}
    </Pill>
  );
}

/** Nível 1 (paz tint) / Nível 2 (gold); nothing at level 0. */
export function LevelPill({ level, className }: { level: 0 | 1 | 2; className?: string }) {
  if (level === 0) return null;
  return (
    <Pill tone={level === 2 ? "gold" : "paz"} className={className}>
      Nível {level}
    </Pill>
  );
}

/** Text colour for a 12px status line under an item ("Aprovado · …", "Aguardando aprovação"). */
export function statusTextColor(state: ApprovalState | "open"): string {
  return state === "approved"
    ? "#0E6B4E"
    : state === "pending"
      ? "#6B4A00"
      : state === "rejected"
        ? "#C62828"
        : "#8A887F";
}

/** 12/800 status line under an action/item. Hidden when `state` is "open" and no children. */
export function StatusText({
  state,
  children,
  className,
}: {
  state: ApprovalState | "open";
  children?: ReactNode;
  className?: string;
}) {
  const text =
    children ??
    (state === "approved"
      ? "Aprovado"
      : state === "pending"
        ? "Aguardando aprovação"
        : state === "rejected"
          ? "Rejeitado"
          : null);
  if (text == null) return null;
  return (
    <span
      className={cn("mt-0.5 block text-[12px] font-extrabold", className)}
      style={{ color: statusTextColor(state) }}
    >
      {text}
    </span>
  );
}
