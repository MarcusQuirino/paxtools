import { Link } from "@tanstack/react-router";
import { Award, House, Star, UserRound } from "lucide-react";

type IconType = React.ComponentType<{ className?: string }>;

type Tab = {
  to: string;
  label: string;
  icon: IconType;
  exact?: boolean;
  /** `data-tour` anchor for the guided tour. */
  tour?: string;
};

// The escoteiro's four top-level destinations. Full labels (no "Esp."): at
// 11px/800 "Especialidades" fits a quarter of a 360px viewport.
const TABS: Tab[] = [
  { to: "/", label: "Progressão", icon: House, exact: true },
  { to: "/plan", label: "Plano", icon: Star, tour: "tab-plano" },
  {
    to: "/especialidades",
    label: "Especialidades",
    icon: Award,
    tour: "tab-especialidades",
  },
  { to: "/settings", label: "Perfil", icon: UserRound, tour: "tab-perfil" },
];

const TAB_BASE =
  "group flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-md border-2 px-0.5 text-[11px] font-extrabold leading-tight tracking-[0.01em] transition-colors";
// Link concatenates className with active/inactive props — keep them disjoint.
const TAB_INACTIVE = `border-transparent text-foreground/70 hover:bg-muted hover:text-foreground`;
const TAB_ACTIVE = `border-black bg-secondary text-foreground`;

/**
 * Fixed bottom tab bar for the escoteiro surface, in the thumb zone. The
 * router's Link sets `aria-current="page"` on the active tab. Pads for the
 * iOS home indicator via `env(safe-area-inset-bottom)` (needs
 * `viewport-fit=cover`, set in __root).
 */
export function EscoteiroTabBar() {
  return (
    <nav
      aria-label="Navegação principal"
      data-testid="escoteiro-tab-bar"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-black bg-card px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-lg gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              data-tour={tab.tour}
              activeOptions={{ exact: tab.exact ?? false }}
              className={TAB_BASE}
              activeProps={{ className: TAB_ACTIVE }}
              inactiveProps={{ className: TAB_INACTIVE }}
            >
              <Icon className="size-6 group-data-[status=active]:text-primary" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
