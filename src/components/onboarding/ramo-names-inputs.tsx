import { Input } from "@/components/ui/input";
import {
  RAMOS,
  RAMO_LABELS,
  RAMO_UNIT_PREFIX,
  type Ramo,
  type RamoNames,
} from "@/lib/ramos";

type Props = {
  value: RamoNames;
  onChange: (next: RamoNames) => void;
  variant?: "dark" | "light";
  groupName?: string;
};

export function RamoNamesInputs({
  value,
  onChange,
  variant = "light",
  groupName,
}: Props) {
  const isDark = variant === "dark";

  const setRamo = (r: Ramo, v: string) => {
    const next: RamoNames = { ...value };
    if (v.trim()) next[r] = v;
    else delete next[r];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {RAMOS.map((r) => {
        const placeholder = (groupName ?? "").trim() || "Nome da unidade";
        const id = `ramo-name-${r}`;
        return (
          <div key={r} className="space-y-1">
            <label
              htmlFor={id}
              className={`text-xs ${
                isDark ? "text-green-200/70" : "text-muted-foreground"
              }`}
            >
              {RAMO_UNIT_PREFIX[r]}{" "}
              <span className={isDark ? "text-green-200/40" : ""}>
                ({RAMO_LABELS[r]})
              </span>
            </label>
            <Input
              id={id}
              value={value[r] ?? ""}
              onChange={(e) => setRamo(r, e.target.value)}
              placeholder={placeholder}
              maxLength={60}
              className={
                isDark
                  ? "bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  : ""
              }
            />
          </div>
        );
      })}
      <p
        className={`text-[11px] ${
          isDark ? "text-green-200/50" : "text-muted-foreground"
        }`}
      >
        Opcional. Se vazio, usamos o nome do grupo.
      </p>
    </div>
  );
}
