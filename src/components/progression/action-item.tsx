import { Checkbox } from "@/components/ui/checkbox";

type ActionItemProps = {
  id: string;
  text: string;
  checked: boolean;
  onToggle: () => void;
  color?: string;
};

export function ActionItem({
  id,
  text,
  checked,
  onToggle,
  color,
}: ActionItemProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 rounded-lg p-3 min-h-[44px] cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-0.5 size-5"
        style={
          checked && color
            ? { backgroundColor: color, borderColor: color }
            : undefined
        }
      />
      <span
        className={`text-sm leading-relaxed ${checked ? "line-through text-muted-foreground" : ""}`}
      >
        {text}
      </span>
    </label>
  );
}
