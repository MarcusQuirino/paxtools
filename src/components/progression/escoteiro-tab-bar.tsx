import { Award, House, Star, UserRound } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  TAB_ICON_ACTIVE_CLASS,
  TAB_ICON_CLASS,
  TabBar,
  TabLink,
  tabItemClass,
} from "@/components/layout/tab-bar";

// The escoteiro's four top-level destinations, full labels (no "Esp."). The
// TabBar sizes slots to their labels so all four fit a 360px screen.
const TABS: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { to: "/plan", label: "Plano", icon: Star },
  { to: "/especialidades", label: "Especialidades", icon: Award },
  { to: "/settings", label: "Perfil", icon: UserRound },
];

/**
 * Progressão owns "/" and its pushed bloco screens (/bloco/$id), so it's a
 * hand-rolled slot (tabItemClass) instead of an exact-match TabLink.
 */
function ProgressaoTab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === "/" || pathname.startsWith("/bloco/");
  return (
    <Link
      to="/"
      className={tabItemClass(active)}
      aria-current={active ? "page" : undefined}
      // The router only marks "/" itself active; aria-current above covers /bloco.
      activeOptions={{ exact: true }}
    >
      <House className={active ? TAB_ICON_ACTIVE_CLASS : TAB_ICON_CLASS} />
      Progressão
    </Link>
  );
}

/** Fixed bottom tab bar for the escoteiro surface (shared TabBar look). */
export function EscoteiroTabBar() {
  return (
    <TabBar testId="escoteiro-tab-bar">
      <ProgressaoTab />
      {TABS.map((tab) => (
        <TabLink key={tab.to} to={tab.to} label={tab.label} icon={tab.icon} />
      ))}
    </TabBar>
  );
}
