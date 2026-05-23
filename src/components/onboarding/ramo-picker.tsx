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
          selected: "bg-emerald-600 border-white text-white shadow-[3px_3px_0_0_#fff]",
          unselected:
            "bg-black/20 border-white/40 text-white hover:bg-black/30",
          age: "text-green-200/80",
          check: "text-white",
        }
      : {
          selected:
            "bg-primary text-primary-foreground border-black shadow-[3px_3px_0_0_#000]",
          unselected: "bg-card border-black hover:bg-muted text-foreground",
          age: "text-muted-foreground",
          check: "text-primary-foreground",
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
            className={`relative rounded-sm border-2 p-3 text-left transition-all ${
              selected ? palette.selected : palette.unselected
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black uppercase tracking-wide">{RAMO_LABELS[r]}</span>
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
