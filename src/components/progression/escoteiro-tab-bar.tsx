import { Award, House, Star, UserRound } from "lucide-react";
import { TabBar, TabLink } from "@/components/layout/tab-bar";

// The escoteiro's four top-level destinations. Full labels (no "Esp."): at
// 11px/800 "Especialidades" fits a quarter of a 360px viewport.
const TABS: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean }[] = [
  { to: "/", label: "Progressão", icon: House, exact: true },
  { to: "/plan", label: "Plano", icon: Star },
  { to: "/especialidades", label: "Especialidades", icon: Award },
  { to: "/settings", label: "Perfil", icon: UserRound },
];

/** Fixed bottom tab bar for the escoteiro surface (shared TabBar look). */
export function EscoteiroTabBar() {
  return (
    <TabBar testId="escoteiro-tab-bar">
      {TABS.map((tab) => (
        <TabLink key={tab.to} to={tab.to} label={tab.label} icon={tab.icon} exact={tab.exact} />
      ))}
    </TabBar>
  );
}
