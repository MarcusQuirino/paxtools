import { RAMOS, RAMO_LABELS, RAMO_AGE, type Ramo } from "@/lib/ramos";
import { Check } from "lucide-react";

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
  variant?: "dark" | "light";
};

export function RamoPicker(props: Props) {
  const variant = props.variant ?? "light";
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

  const palette =
    variant === "dark"
      ? {
          selected: "bg-emerald-500/20 border-emerald-400/60 text-white",
          unselected:
            "bg-white/[0.05] border-white/10 text-green-100 hover:bg-white/[0.1]",
          age: "text-green-200/60",
          check: "text-emerald-300",
        }
      : {
          selected:
            "bg-emerald-500/15 border-emerald-500/60 text-emerald-950",
          unselected: "bg-card hover:bg-muted border-input text-foreground",
          age: "text-muted-foreground",
          check: "text-emerald-600",
        };

  return (
    <div className="grid grid-cols-2 gap-2">
      {RAMOS.map((r) => {
        const selected = isSelected(r);
        return (
          <button
            type="button"
            key={r}
            onClick={() => handleClick(r)}
            className={`relative rounded-xl border p-3 text-left transition-colors ${
              selected ? palette.selected : palette.unselected
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{RAMO_LABELS[r]}</span>
              {selected && (
                <Check className={`size-4 ${palette.check}`} aria-hidden />
              )}
            </div>
            <span className={`text-xs ${palette.age}`}>{RAMO_AGE[r]}</span>
          </button>
        );
      })}
    </div>
  );
}
