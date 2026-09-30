import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { PENDING_STRIPES } from "@/lib/design-tokens"

/**
 * Legacy progress bar (Design A look): sand track, 2px ink border, approved
 * share in `indicatorColor` (default primary), pending share drawn as amber
 * stripes — pending is a semantic state, never the eixo colour faded. Prefer
 * `ProgressBar` from ./progress-ring for new work.
 *
 * `pendingColor` is still accepted for backward compatibility but ignored.
 */
function Progress({
  className,
  value,
  pendingValue,
  indicatorColor,
  pendingColor: _pendingColor,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorColor?: string;
  pendingValue?: number;
  /** @deprecated pending is always amber stripes now. */
  pendingColor?: string;
}) {
  const approved = Math.max(0, Math.min(value || 0, 100));
  const totalValue = Math.min(approved + (pendingValue || 0), 100);

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-3.5 w-full overflow-hidden rounded-md border-2 border-[#141414] bg-[#EEE9DC]",
        className
      )}
      {...props}
    >
      {pendingValue && pendingValue > 0 ? (
        <span
          data-slot="progress-indicator-pending"
          className="absolute inset-y-0 left-0 transition-all"
          style={{ width: `${totalValue}%`, background: PENDING_STRIPES }}
        />
      ) : null}
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="absolute inset-0 h-full w-full flex-1 bg-primary transition-all"
        style={{
          transform: `translateX(-${100 - approved}%)`,
          ...(indicatorColor ? { backgroundColor: indicatorColor } : {}),
        }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
