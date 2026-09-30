import type { ReactNode } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader, ViewerAvatar } from "@/components/layout/page-header";
import { EscoteiroTabBar } from "@/components/progression/escoteiro-tab-bar";
import { formatEscoteiroContext } from "@/lib/escoteiro-context";

/**
 * Page header for an escoteiro tab: a context eyebrow (ramo · grupo) over a
 * 28px title, avatar on the right.
 */
export function EscoteiroHeader({
  title,
  onProfile = false,
  actions,
}: {
  title: string;
  onProfile?: boolean;
  actions?: ReactNode;
}) {
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  // Non-suspending: the eyebrow is context, not worth blocking the page on.
  const { data: group } = useQuery(convexQuery(api.groups.getMyGroup, {}));
  const eyebrow = formatEscoteiroContext(user?.ramo, group?.number, group?.regiao);
  return (
    <PageHeader
      eyebrow={eyebrow}
      eyebrowTestId="escoteiro-context"
      title={title}
      actions={actions}
      avatar={<ViewerAvatar link={!onProfile} />}
    />
  );
}

/**
 * Page chrome shared by the escoteiro tabs (Progressão / Plano /
 * Especialidades / Perfil): header, content, footer, and the fixed tab bar.
 *
 * Not used by the escotista's view of a scout (impersonation Dashboard,
 * per-escoteiro ficha), which must not show the escoteiro tab bar.
 * Pass `header` to replace the default tab header (e.g. a pushed-screen
 * PageHeader with a back button).
 */
export function EscoteiroShell({
  title,
  onProfile,
  header,
  children,
}: {
  title: string;
  onProfile?: boolean;
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppShell
      header={header ?? <EscoteiroHeader title={title} onProfile={onProfile} />}
      tabBar={<EscoteiroTabBar />}
    >
      {children}
    </AppShell>
  );
}
