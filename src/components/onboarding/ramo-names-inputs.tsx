import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/settings/field";
import { Note } from "@/components/ui/section";
import {
  RAMOS,
  RAMO_LABELS,
  RAMO_UNIT_PREFIX,
  type Ramo,
  type RamoNames,
} from "@/lib/ramos";

/**
 * One unit name per ramo, collected at group creation. `createGroup` turns each
 * name it receives into a seção of that ramo; the full seções list (several per
 * ramo, none for a ramo) is managed in Configurações after the grupo exists.
 */
type Props = {
  value: RamoNames;
  onChange: (next: RamoNames) => void;
  /** @deprecated no-op — there is a single (light) look now. */
  variant?: "dark" | "light";
  groupName?: string;
};

export function RamoNamesInputs({ value, onChange, groupName }: Props) {
  const setRamo = (r: Ramo, v: string) => {
    const next: RamoNames = { ...value };
    if (v.trim()) next[r] = v;
    else delete next[r];
    onChange(next);
  };

  return (
    <div className="space-y-2.5">
      {RAMOS.map((r) => {
        const placeholder = (groupName ?? "").trim() || "Nome da seção";
        const id = `ramo-name-${r}`;
        return (
          <div key={r} className="space-y-1">
            <FieldLabel htmlFor={id}>
              {RAMO_UNIT_PREFIX[r]}{" "}
              <span className="font-semibold text-[#8A887F]">
                ({RAMO_LABELS[r]})
              </span>
            </FieldLabel>
            <Input
              id={id}
              value={value[r] ?? ""}
              onChange={(e) => setRamo(r, e.target.value)}
              placeholder={placeholder}
              maxLength={60}
            />
          </div>
        );
      })}
      <Note className="mt-0">Opcional. Se vazio, usamos o nome do grupo.</Note>
    </div>
  );
}
