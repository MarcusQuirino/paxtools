import { useState } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CustomAction } from "@/data/types";
import type { Id } from "../../../convex/_generated/dataModel";

type CustomActionInputProps = {
  blocoId: string;
  customActions: CustomAction[];
  color: string;
  onAdd: (blocoId: string, text: string) => void;
  onToggle: (id: Id<"customActions">) => void;
  onDelete: (id: Id<"customActions">) => void;
};

export function CustomActionInput({
  blocoId,
  customActions,
  color,
  onAdd,
  onToggle,
  onDelete,
}: CustomActionInputProps) {
  const [text, setText] = useState("");

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(blocoId, trimmed);
    setText("");
  };

  const blocoCustom = customActions.filter((c) => c.blocoId === blocoId);

  return (
    <div className="space-y-1">
      {blocoCustom.map((action) => {
        const isPending = action.completed && action.status === "pending";
        return (
          <div
            key={action._id}
            className="flex items-start gap-3 rounded-lg p-3 min-h-[44px] group"
          >
            <Checkbox
              checked={action.completed}
              onCheckedChange={() => onToggle(action._id)}
              className="mt-0.5 size-5"
              style={
                action.completed
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
                action.completed
                  ? isPending
                    ? "text-muted-foreground/60"
                    : "line-through text-muted-foreground"
                  : ""
              }`}
            >
              {action.text}
            </span>
            {isPending && (
              <Clock className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
            )}
            <button
              type="button"
              onClick={() => onDelete(action._id)}
              className="text-muted-foreground hover:text-destructive transition-opacity p-1 sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="Remover"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        );
      })}
      <div className="flex gap-2 px-3 pt-2">
        <Input
          placeholder="Adicionar ação personalizada..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="text-sm h-9"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={!text.trim()}
          className="h-9 px-3"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
