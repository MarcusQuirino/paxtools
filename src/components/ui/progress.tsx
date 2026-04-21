import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  pendingValue,
  indicatorColor,
  pendingColor,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorColor?: string;
  pendingValue?: number;
  pendingColor?: string;
}) {
  const totalValue = (value || 0) + (pendingValue || 0);

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      {pendingValue && pendingValue > 0 ? (
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator-pending"
          className="absolute inset-0 h-full w-full flex-1 transition-all"
          style={{
            transform: `translateX(-${100 - Math.min(totalValue, 100)}%)`,
            backgroundColor: pendingColor || indicatorColor || undefined,
            opacity: 0.3,
          }}
        />
      ) : null}
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="absolute inset-0 h-full w-full flex-1 bg-primary transition-all"
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`,
          ...(indicatorColor ? { backgroundColor: indicatorColor } : {}),
        }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
