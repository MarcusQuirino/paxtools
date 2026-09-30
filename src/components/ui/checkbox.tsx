import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Legacy form checkbox (Design A colours): 2px ink border, static (no shadow)
 * when unchecked; checked = emerald + 2px ink shadow. For ticking progression
 * items use `ActionCheck` (48px target) instead.
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-5 shrink-0 rounded-[5px] border-2 border-[#141414] bg-white transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#141414] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-[state=checked]:border-[#141414] data-[state=checked]:bg-[#0E6B4E] data-[state=checked]:text-white data-[state=checked]:shadow-[2px_2px_0_#141414]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
