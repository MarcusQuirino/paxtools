import { RAMOS, RAMO_LABELS, RAMO_AGE, type Ramo } from "@/lib/ramos";
import { Check } from "lucide-react";

type Props =
  | {
      mode: "single";
      value: Ramo | null;
      onChange: (ramo: Ramo) => void;
    }
  | {
      mode: "multi";
      value: Ramo[];
      onChange: (ramos: Ramo[]) => void;
    };

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
    <div className="grid grid-cols-2 gap-2">
      {RAMOS.map((r) => {
        const selected = isSelected(r);
        return (
          <button
            type="button"
            key={r}
            onClick={() => handleClick(r)}
            className={`relative rounded-xl border p-3 text-left transition-colors ${
              selected
                ? "bg-emerald-500/20 border-emerald-400/60 text-white"
                : "bg-white/[0.05] border-white/10 text-green-100 hover:bg-white/[0.1]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{RAMO_LABELS[r]}</span>
              {selected && (
                <Check className="size-4 text-emerald-300" aria-hidden />
              )}
            </div>
            <span className="text-xs text-green-200/60">{RAMO_AGE[r]}</span>
          </button>
        );
      })}
    </div>
  );
}
