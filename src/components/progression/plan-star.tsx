import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type PlanStarProps = {
  planned: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
};

/**
 * "Add to / remove from Plano" star: 44px target, 22px icon. Planned = gold
 * fill with an ink outline; not planned = muted outline.
 */
export function PlanStar({ planned, onToggle, label, className }: PlanStarProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "-my-2 grid size-11 shrink-0 place-items-center rounded-md transition-colors hover:bg-black/[0.04]",
        planned ? "text-[#141414]" : "text-[#8A887F]",
        className,
      )}
      aria-label={label ?? (planned ? "Remover do plano" : "Adicionar ao plano")}
      aria-pressed={planned}
    >
      <Star
        className="size-[22px]"
        fill={planned ? "#F4C430" : "none"}
        strokeWidth={2}
        aria-hidden
      />
    </button>
  );
}
