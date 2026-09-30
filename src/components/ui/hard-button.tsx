/**
 * Design A buttons: 2px ink border, hard shadow, brutalist press (translate +
 * shadow gone). `primary` = emerald (the screen's CTA, 4px shadow at size lg),
 * `paper` = white secondary, `ghost` = no border/shadow (tertiary, text only).
 * Sizes: sm 40px, md 44px, lg 52px. Use instead of ui/button for new work.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type HardButtonTone = "primary" | "paper" | "danger" | "ghost";
export type HardButtonSize = "sm" | "md" | "lg";

const TONE: Record<HardButtonTone, string> = {
  primary: "border-[#141414] bg-[#0E6B4E] text-white",
  paper: "border-[#141414] bg-white text-[#141414]",
  danger: "border-[#141414] bg-[#FCE4E4] text-[#C62828]",
  ghost: "border-transparent bg-transparent text-[#0E6B4E] shadow-none active:shadow-none",
};

const SIZE: Record<HardButtonSize, string> = {
  sm: "min-h-10 px-3.5 text-[14px] rounded-[10px]",
  md: "min-h-11 px-4 text-[15px] rounded-[10px]",
  lg: "min-h-[52px] px-5 text-[16px] rounded-[10px]",
};

export function HardButton({
  tone = "primary",
  size = "md",
  full,
  className,
  children,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: HardButtonTone;
  size?: HardButtonSize;
  /** Stretch to the container width. */
  full?: boolean;
  children: ReactNode;
}) {
  const heavy = tone === "primary" && size === "lg";
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 border-2 font-black transition-transform [&_svg]:size-5 [&_svg]:shrink-0",
        tone !== "ghost" &&
          (heavy
            ? "shadow-[4px_4px_0_#141414] active:translate-x-[3px] active:translate-y-[3px]"
            : "shadow-[2px_2px_0_#141414] active:translate-x-[2px] active:translate-y-[2px]"),
        "active:shadow-none disabled:pointer-events-none disabled:opacity-50",
        TONE[tone],
        SIZE[size],
        full && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
