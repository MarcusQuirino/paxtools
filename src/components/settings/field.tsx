/**
 * Form bits shared by Perfil/Ajustes, Seções and Onboarding: a 12/800 field
 * label (the type floor) and a 12px red error line. Inputs themselves are
 * `ui/input` (48px).
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FieldLabel({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-[12px] font-extrabold text-[#4A4A44]", className)}
    >
      {children}
    </label>
  );
}

export function FieldError({ children }: { children: ReactNode }) {
  if (children == null || children === "") return null;
  return (
    <p role="alert" className="text-[12px] font-bold text-[#C62828]">
      {children}
    </p>
  );
}
