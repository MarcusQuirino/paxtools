import { RAMOS, RAMO_LABELS, RAMO_AGE, type Ramo } from "@/lib/ramos";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = (
  | {
      mode: "single";
      value: Ramo | null;
      onChange: (ramo: Ramo) => void;
    }
  | {
      mode: "multi";
      value: Ramo[];
      onChange: (ramos: Ramo[]) => void;
    }
) & {
  /** @deprecated no-op — there is a single (light) look now. */
  variant?: "dark" | "light";
};

/**
 * 2×2 ramo tiles. Selected = emerald tint + ink border + 2px shadow (the
 * SegmentedControl "active" treatment); unselected = paper, border only.
 */
export function RamoPicker(props: Props) {
  const isSelected = (r: Ramo) =>
    props.mode === "single" ? props.value === r : props.value.includes(r);

  const handleClick = (r: Ramo) => {
    if (props.mode === "single") {
      props.onChange(r);
    } else {
      const next = props.value.includes(r)
        ? props.value.filter((x) => x !== r)
        : [...props.value, r];
      props.onChange(next);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {RAMOS.map((r) => {
        const selected = isSelected(r);
        return (
          <button
            type="button"
            key={r}
            aria-pressed={selected}
            onClick={() => handleClick(r)}
            className={cn(
              "relative min-h-16 rounded-[10px] border-2 border-[#141414] px-3 py-2.5 text-left text-[#141414] transition-colors",
              selected
                ? "bg-[#DDF3E8] shadow-[2px_2px_0_#141414]"
                : "bg-white hover:bg-black/[0.02]",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-[15px] font-extrabold">{RAMO_LABELS[r]}</span>
              {selected && (
                <Check
                  className="size-5 shrink-0 text-[#0E6B4E]"
                  strokeWidth={3}
                  aria-hidden
                />
              )}
            </span>
            <span className="mt-0.5 block text-[12px] font-semibold text-[#4A4A44]">
              {RAMO_AGE[r]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
