import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Design A text field — same look as `SearchInput`: 48px, 2px ink border, 10px
 * radius, 16px text (no iOS zoom on focus), ink focus ring, no shadow.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-[#8A887F] selection:bg-primary selection:text-primary-foreground h-12 w-full min-w-0 rounded-[10px] border-2 border-[#141414] bg-white px-3 py-1 text-base text-[#141414] outline-none transition-[color,box-shadow] file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-[#141414] focus-visible:ring-offset-1",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
