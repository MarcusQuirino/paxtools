/**
 * Progress indicators in eixo colour. Ring (32px conic; full = check on solid
 * colour; pending = amber clock), Bar (12px, approved fill + striped amber
 * pending share), MiniBar (6px, inside list rows).
 */
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STRIPES = "repeating-linear-gradient(45deg,#F5B300 0 4px,#fff 4px 8px)";

export function ProgressRing({
  pct,
  color,
  state = "open",
  size = 32,
  className,
}: {
  /** 0–100. Ignored when state is full/pending. */
  pct: number;
  color: string;
  /** full = complete (solid + check); pending = aguardando (amber + clock). */
  state?: "open" | "full" | "pending";
  size?: number;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  const bg =
    state === "full"
      ? color
      : state === "pending"
        ? "#F5B300"
        : `conic-gradient(${color} ${p}%, #EEE9DC 0)`;
  const inner = Math.round(size * 0.625);
  return (
    <span
      role="img"
      aria-label={state === "full" ? "Completo" : state === "pending" ? "Aguardando aprovação" : `${p}%`}
      className={cn("grid shrink-0 place-items-center rounded-full border-2 border-[#141414]", className)}
      style={{ width: size, height: size, background: bg }}
    >
      {state === "open" ? (
        <span className="rounded-full bg-white" style={{ width: inner, height: inner }} />
      ) : state === "full" ? (
        <Check className="text-white" style={{ width: size / 2, height: size / 2 }} strokeWidth={3} />
      ) : (
        <Clock className="text-[#141414]" style={{ width: size / 2, height: size / 2 }} strokeWidth={3} />
      )}
    </span>
  );
}

export function ProgressBar({
  approvedPct,
  pendingPct = 0,
  color,
  className,
}: {
  approvedPct: number;
  /** Share (0–100) of approved + pending, drawn as amber stripes behind the fill. */
  pendingPct?: number;
  color: string;
  className?: string;
}) {
  const a = Math.max(0, Math.min(100, approvedPct));
  const ap = Math.max(a, Math.min(100, pendingPct));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(a)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative h-3 overflow-hidden rounded-md border-2 border-[#141414] bg-[#EEE9DC]",
        className,
      )}
    >
      {ap > a && (
        <span className="absolute inset-y-0 left-0" style={{ width: `${ap}%`, background: STRIPES }} />
      )}
      <span className="absolute inset-y-0 left-0" style={{ width: `${a}%`, background: color }} />
    </div>
  );
}

/** Thin bar for list rows (catalog, roster). */
export function MiniBar({
  pct,
  color,
  width = 120,
  className,
}: {
  pct: number;
  color: string;
  width?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative mt-1.5 block h-1.5 overflow-hidden rounded-[3px] border-[1.5px] border-[#141414] bg-[#EEE9DC]",
        className,
      )}
      style={{ width }}
      aria-hidden
    >
      <span
        className="absolute inset-y-0 left-0"
        style={{ width: `${Math.max(0, Math.min(100, Math.round(pct)))}%`, background: color }}
      />
    </span>
  );
}
