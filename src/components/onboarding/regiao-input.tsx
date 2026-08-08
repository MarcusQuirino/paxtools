import { Input } from "@/components/ui/input";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
};

/**
 * The região escoteira of a grupo, as its two-letter UF — the "RS" in "38/RS".
 * Only letters get through, always uppercased; the backend rejects anything
 * that is not a real UF.
 */
export function RegiaoInput({ id, value, onChange }: Props) {
  return (
    <Input
      id={id}
      placeholder="Ex: RS"
      value={value}
      onChange={(e) =>
        onChange(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())
      }
      maxLength={2}
      autoCapitalize="characters"
      className="uppercase"
    />
  );
}
