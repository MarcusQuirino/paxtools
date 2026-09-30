import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Legacy shadcn button, restyled to Design A: 2px ink border, 2px ink shadow,
 * press = translate 2px + shadow gone. Sizes are ≥40px (default 44px). New
 * work should prefer `HardButton` (src/components/ui/hard-button.tsx).
 */
const PRESS =
  "shadow-[2px_2px_0_#141414] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold transition-transform disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#141414] focus-visible:ring-offset-1 aria-invalid:ring-destructive/20 aria-invalid:border-destructive border-2 border-[#141414]",
  {
    variants: {
      variant: {
        default: `bg-primary text-white hover:brightness-95 ${PRESS}`,
        destructive: `bg-destructive text-white hover:brightness-95 ${PRESS}`,
        outline: `bg-white text-[#141414] hover:brightness-95 ${PRESS}`,
        secondary: `bg-secondary text-secondary-foreground hover:brightness-95 ${PRESS}`,
        ghost: "border-transparent shadow-none hover:bg-black/5 active:bg-black/10",
        link: "border-transparent shadow-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2 has-[>svg]:px-3",
        sm: "h-10 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-md px-6 text-base has-[>svg]:px-4",
        icon: "size-11",
        "icon-sm": "size-10",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
