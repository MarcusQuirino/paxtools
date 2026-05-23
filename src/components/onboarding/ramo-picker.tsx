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
          selected:
            "bg-emerald-700 border-black text-white shadow-[3px_3px_0px_0px_#000] translate-x-[0px] translate-y-[0px]",
          unselected:
            "bg-white/[0.08] border-white/30 text-green-100 hover:bg-white/[0.14] hover:border-white/50",
          age: "text-green-200/70",
          check: "text-emerald-300",
        }
      : {
          selected:
            "bg-primary border-black text-white shadow-[3px_3px_0px_0px_#000]",
          unselected:
            "bg-white border-black text-foreground hover:bg-accent/40 shadow-[2px_2px_0px_0px_#000]",
          age: "text-muted-foreground",
          check: "text-white",
        };

  return (
    <div className="grid grid-cols-2 gap-3">
      {RAMOS.map((r) => {
        const selected = isSelected(r);
        return (
          <button
            type="button"
            key={r}
            onClick={() => handleClick(r)}
            className={`relative rounded-md border-2 p-3 text-left transition-all ${
              selected ? palette.selected : palette.unselected
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">{RAMO_LABELS[r]}</span>
              {selected && (
                <Check className={`size-4 ${palette.check}`} aria-hidden />
              )}
            </div>
            <span className={`text-xs font-medium ${palette.age}`}>{RAMO_AGE[r]}</span>
          </button>
        );
      })}
    </div>
  );
}
