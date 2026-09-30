/**
 * KPI tiles: 26/900 number over a 12/800 caps label, static card (no shadow).
 * `tone="gold"` is the one highlighted tile of a pair ("Conquistadas").
 * `KpiGrid` lays 2–3 tiles side by side.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function KpiGrid({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode;
  cols?: 2 | 3;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", cols === 3 ? "grid-cols-3" : "grid-cols-2", className)}>
      {children}
    </div>
  );
}

export function KpiTile({
  value,
  label,
  tone = "paper",
  className,
  testId,
}: {
  value: ReactNode;
  label: ReactNode;
  tone?: "paper" | "gold" | "emerald" | "amber";
  className?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "rounded-[10px] border-2 border-[#141414] px-3 py-2.5",
        tone === "gold" && "bg-[#F4C430]",
        tone === "emerald" && "bg-[#0E6B4E] text-white",
        tone === "amber" && "bg-[#F5B300]",
        tone === "paper" && "bg-white",
        className,
      )}
    >
      <p className="text-[26px] font-black leading-none tabular-nums">{value}</p>
      <p
        className={cn(
          "mt-1 text-[12px] font-extrabold uppercase tracking-[0.06em]",
          tone === "emerald" ? "text-white/85" : "text-[#4A4A44]",
        )}
      >
        {label}
      </p>
    </div>
  );
}
