/**
 * Empty / locked states: dashed border, no fill, centred 14px copy with an
 * optional 15px bold title. Never a card with a shadow.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  children,
  icon,
  className,
  testId,
}: {
  title?: ReactNode;
  children?: ReactNode;
  /** Leading icon (e.g. a lock) — switches to a left-aligned row layout. */
  icon?: ReactNode;
  className?: string;
  testId?: string;
}) {
  if (icon) {
    return (
      <div
        data-testid={testId}
        className={cn(
          "flex items-center gap-3 rounded-[10px] border-2 border-dashed border-[#8A887F] p-3 text-[13px] text-[#4A4A44]",
          className,
        )}
      >
        <span className="shrink-0 [&_svg]:size-[22px]">{icon}</span>
        <span>
          {title && <b className="block text-[15px] text-[#141414]">{title}</b>}
          {children}
        </span>
      </div>
    );
  }
  return (
    <div
      data-testid={testId}
      className={cn(
        "rounded-[10px] border-2 border-dashed border-[#8A887F] p-5 text-center text-[14px] text-[#4A4A44]",
        className,
      )}
    >
      {title && <b className="mb-1 block text-[15px] text-[#141414]">{title}</b>}
      {children}
    </div>
  );
}
