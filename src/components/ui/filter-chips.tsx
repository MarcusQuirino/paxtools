/**
 * Horizontal-scroll filter strip (bleeds to the screen edges inside the
 * max-w-lg/px-4 shell) and its 40px chips. Active chip = ink fill. An eixo
 * chip carries a 10px colour dot. `EixoFilterChips` is the ready-made
 * "Todas + four eixos" strip both Especialidades tabs use.
 */
import type { ReactNode } from "react";
import { EIXO_COLORS } from "@/data/eixo-colors";
import { cn } from "@/lib/utils";

export function FilterChips({
  children,
  className,
  ariaLabel = "Filtros",
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FilterChip({
  on,
  onClick,
  dot,
  children,
  testId,
}: {
  on: boolean;
  onClick: () => void;
  /** Eixo colour → 10px dot before the label. */
  dot?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[#141414] px-3 text-[14px] font-extrabold transition-colors",
        on ? "bg-[#141414] text-white" : "bg-white text-[#141414] hover:bg-[#F4F1E8]",
      )}
    >
      {dot && (
        <span
          className="size-2.5 shrink-0 rounded-full border-2 border-current"
          style={{ background: dot }}
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}

/**
 * "Todas" + one chip per eixo. `value` is the selected eixo id or null.
 * Tapping the selected eixo again clears it. `before` renders extra chips
 * between "Todas" and the eixos (e.g. "Com atividade na tropa").
 */
export function EixoFilterChips({
  value,
  onChange,
  before,
  allLabel = "Todas",
  className,
}: {
  value: string | null | undefined;
  onChange: (eixoId: string | null) => void;
  before?: ReactNode;
  allLabel?: string;
  className?: string;
}) {
  return (
    <FilterChips className={className} ariaLabel="Filtrar por eixo">
      <FilterChip on={!value} onClick={() => onChange(null)} testId="chip-todas">
        {allLabel}
      </FilterChip>
      {before}
      {EIXO_COLORS.map((e) => (
        <FilterChip
          key={e.id}
          on={value === e.id}
          dot={e.color}
          onClick={() => onChange(value === e.id ? null : e.id)}
          testId={`chip-${e.id}`}
        >
          {e.name}
        </FilterChip>
      ))}
    </FilterChips>
  );
}
