import { Checkbox } from "@/components/ui/checkbox";
import { Clock } from "lucide-react";
import type { CompletionStatus } from "@/data/types";

type ActionItemProps = {
  id: string;
  text: string;
  checked: boolean;
  status?: CompletionStatus;
  onToggle: () => void;
  color?: string;
};

export function ActionItem({
  id,
  text,
  checked,
  status,
  onToggle,
  color,
}: ActionItemProps) {
  const isPending = checked && status === "pending";

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
            ? {
                backgroundColor: color,
                borderColor: color,
                opacity: isPending ? 0.4 : 1,
              }
            : undefined
        }
      />
      <span
        className={`text-sm leading-relaxed flex-1 ${
          checked
            ? isPending
              ? "text-muted-foreground/60"
              : "line-through text-muted-foreground"
            : ""
        }`}
      >
        {text}
      </span>
      {isPending && (
        <Clock className="size-3.5 text-slate-400 mt-0.5 shrink-0" />
      )}
    </label>
  );
}
