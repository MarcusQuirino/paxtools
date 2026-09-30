/**
 * The one bottom tab bar (escoteiro and escotista): fixed, paper, 2px ink top
 * border, safe-area padding, 4 slots of ≥52px with a 24px icon and the FULL
 * 11/800 label. Active = emerald tint + ink border, icon emerald.
 *
 * Compose: <TabBar><TabLink …/><TabLink …/>{customTrigger}</TabBar>. A non-link
 * slot (e.g. a Sheet trigger) gets its classes from `tabItemClass(active)`.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string }>;

// Slots size to their label (`flex: 1 1 auto`) and share the leftover width,
// so a long label ("Especialidades") takes a wider slot instead of overflowing
// an equal quarter. With nowrap labels, all four fit a 360px screen.
const BASE =
  "group flex min-h-[52px] min-w-0 flex-[1_1_auto] flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-md border-2 px-1.5 text-[11px] font-extrabold leading-tight tracking-[-0.01em] transition-colors";
const INACTIVE = "border-transparent text-[#4A4A44] hover:bg-[#F4F1E8] hover:text-[#141414]";
const ACTIVE = "border-[#141414] bg-[#DDF3E8] text-[#141414]";

/** Classes for a non-Link tab slot (sheet trigger, button). */
export function tabItemClass(active: boolean) {
  return cn(BASE, active ? ACTIVE : INACTIVE);
}

export const TAB_ICON_CLASS = "size-6 shrink-0";
export const TAB_ICON_ACTIVE_CLASS = "size-6 shrink-0 text-[#0E6B4E]";

export function TabBar({
  children,
  ariaLabel = "Navegação principal",
  testId,
}: {
  children: ReactNode;
  ariaLabel?: string;
  testId?: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      data-testid={testId}
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#141414] bg-white px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-lg gap-0.5">{children}</div>
    </nav>
  );
}

/** One routed tab. The router sets aria-current="page" on the active one. */
export function TabLink({
  to,
  label,
  icon: Icon,
  exact,
}: {
  to: string;
  label: string;
  icon: IconType;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: exact ?? false }}
      className={BASE}
      activeProps={{ className: ACTIVE }}
      inactiveProps={{ className: INACTIVE }}
    >
      <Icon className={cn(TAB_ICON_CLASS, "group-data-[status=active]:text-[#0E6B4E]")} />
      {label}
    </Link>
  );
}
