import { Star } from "lucide-react";

type PlanStarProps = {
  planned: boolean;
  onToggle: () => void;
  color?: string;
  label?: string;
};

export function PlanStar({ planned, onToggle, color, label }: PlanStarProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className="p-1.5 -m-1.5 shrink-0 rounded-md hover:bg-muted/70 transition-colors"
      aria-label={label ?? (planned ? "Remover do plano" : "Adicionar ao plano")}
      aria-pressed={planned}
    >
      <Star
        className="size-4"
        fill={planned ? color ?? "currentColor" : "none"}
        stroke={planned ? color ?? "currentColor" : "currentColor"}
        strokeWidth={1.75}
      />
    </button>
  );
}
