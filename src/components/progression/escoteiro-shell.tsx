import type { ReactNode } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { Footer } from "@/components/footer";
import { EscoteiroTabBar } from "@/components/progression/escoteiro-tab-bar";
import { avatarInitials, formatEscoteiroContext } from "@/lib/escoteiro-context";

/**
 * The viewer's avatar: photo when there is one, else initials on gold. Links
 * to Perfil except on Perfil itself.
 */
function HeaderAvatar({ linkToProfile }: { linkToProfile: boolean }) {
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  const face = user?.image ? (
    <img
      src={user.image}
      alt=""
      className="size-full rounded-full object-cover"
      referrerPolicy="no-referrer"
    />
  ) : (
    <span aria-hidden>{avatarInitials(user?.name, user?.email)}</span>
  );
  const cls =
    "grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-black bg-[#F4C430] text-[15px] font-black text-foreground";
  if (!linkToProfile) return <div className={cls}>{face}</div>;
  return (
    <Link to="/settings" aria-label="Abrir perfil" className={cls}>
      {face}
    </Link>
  );
}

/**
 * Page header for an escoteiro tab: a context eyebrow (ramo · grupo) over a
 * 28px title, avatar on the right. Replaces the old "PAXTOOLS" wordmark.
 */
export function EscoteiroHeader({
  title,
  onProfile = false,
}: {
  title: string;
  onProfile?: boolean;
}) {
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  // Non-suspending: the eyebrow is context, not worth blocking the page on.
  const { data: group } = useQuery(convexQuery(api.groups.getMyGroup, {}));
  const eyebrow = formatEscoteiroContext(user?.ramo, group?.number, group?.regiao);

  return (
    <header className="flex items-end justify-between gap-3 pt-1">
      <div className="min-w-0">
        <p
          data-testid="escoteiro-context"
          className="min-h-4 truncate text-xs font-extrabold uppercase tracking-[0.08em] text-muted-foreground"
        >
          {eyebrow}
        </p>
        <h1 className="text-[28px] font-black leading-[1.05] tracking-[-0.02em] text-foreground">
          {title}
        </h1>
      </div>
      <HeaderAvatar linkToProfile={!onProfile} />
    </header>
  );
}

/**
 * Page chrome shared by the escoteiro tabs (Progressão / Plano /
 * Especialidades / Perfil): header, content, footer, and the fixed tab bar —
 * with enough bottom padding that nothing hides behind the bar.
 *
 * Not used by the escotista's view of a scout (impersonation Dashboard,
 * read-only especialidades), which must not show the escoteiro tab bar.
 */
export function EscoteiroShell({
  title,
  onProfile,
  children,
}: {
  title: string;
  onProfile?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <EscoteiroHeader title={title} onProfile={onProfile} />
        {children}
        <Footer />
      </div>
      <EscoteiroTabBar />
    </div>
  );
}
