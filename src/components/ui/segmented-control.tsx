/**
 * Segmented control (Plano "Por área / Minha ordem", catalog ramo group):
 * sand well with an ink border; the active segment is paper + ink border +
 * 2px shadow (it's the one tappable "raised" thing). 44px segments.
 */
import { cn } from "@/lib/utils";

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "md",
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string; testId?: string }[];
  ariaLabel: string;
  /** md = 44px (default), sm = 40px for dense secondary switches. */
  size?: "md" | "sm";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-1 rounded-[10px] border-2 border-[#141414] bg-[#EEE9DC] p-1",
        className,
      )}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            data-testid={o.testId}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-md border-2 px-2 font-extrabold transition-colors",
              size === "md" ? "min-h-11 text-[15px]" : "min-h-10 text-[13px]",
              on
                ? "border-[#141414] bg-white text-[#141414] shadow-[2px_2px_0_#141414]"
                : "border-transparent text-[#4A4A44] hover:bg-white/50",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
