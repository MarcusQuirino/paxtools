import { Suspense, useState } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
} from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import {
  BackLink,
  PageHeader,
  ViewerAvatar,
} from "@/components/layout/page-header";
import {
  TAB_ICON_ACTIVE_CLASS,
  TAB_ICON_CLASS,
  TabBar,
  TabLink,
  tabItemClass,
} from "@/components/layout/tab-bar";
import { PendingApprovalScreen } from "@/components/escotista/pending-approval-screen";
import { formatGroupIdentity } from "@/lib/group-identity";
import {
  LayoutDashboard,
  Clock,
  Shield,
  ScrollText,
  MoreHorizontal,
  Settings,
  BarChart3,
  Award,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/escotista")({
  component: EscotistaLayout,
});

type IconType = React.ComponentType<{ className?: string }>;

// Primary bottom-bar slots. Adding a tab = adding one entry here.
const NAV_ITEMS: { to: string; label: string; icon: IconType; exact?: boolean }[] = [
  { to: "/escotista", label: "Painel", icon: LayoutDashboard, exact: true },
  { to: "/escotista/pending", label: "Pendentes", icon: Clock },
  { to: "/escotista/especialidades", label: "Especialidades", icon: Award },
];

type SecondaryItem = { to: string; label: string; icon: IconType; adminOnly?: boolean };

// Destinations shown inside the "Mais" sheet.
const SECONDARY_ITEMS: SecondaryItem[] = [
  { to: "/escotista/stats", label: "Stats", icon: BarChart3 },
  { to: "/escotista/timeline", label: "Histórico", icon: ScrollText },
  { to: "/escotista/admin", label: "Admin", icon: Shield, adminOnly: true },
  { to: "/settings", label: "Ajustes", icon: Settings },
];

/**
 * Tab-screen titles by route. Routes not listed here (especialidade detail,
 * escoteiro impersonation) render their own pushed-screen PageHeader.
 */
const TAB_TITLES: { to: string; title: string; exact?: boolean }[] = [
  { to: "/escotista", title: "Painel", exact: true },
  { to: "/escotista/pending", title: "Pendentes" },
  { to: "/escotista/especialidades", title: "Especialidades", exact: true },
  { to: "/escotista/stats", title: "Stats" },
  { to: "/escotista/timeline", title: "Histórico" },
  { to: "/escotista/admin", title: "Admin" },
];

function EscotistaLayout() {
  const { ready, user } = useAuthGate("escotista");
  const { data: myGroup } = useSuspenseQuery(
    convexQuery(api.groups.getMyGroup, {}),
  );

  const matchRoute = useMatchRoute();
  const isImpersonating = !!matchRoute({
    to: "/escotista/escoteiro/$escoteiroId",
    fuzzy: true,
  });
  const tab = TAB_TITLES.find((t) => matchRoute({ to: t.to, fuzzy: !t.exact }));

  // Only the impersonation header needs the scout's name; non-suspending.
  const { data: members } = useQuery({
    ...convexQuery(api.groups.getGroupMembers, {}),
    enabled: isImpersonating,
  });
  const impersonated = isImpersonating
    ? (matchRoute({ to: "/escotista/escoteiro/$escoteiroId", fuzzy: true }) as
        | { escoteiroId: string }
        | false)
    : false;
  const escoteiroName = impersonated
    ? members?.find((m) => m._id === impersonated.escoteiroId)?.name
    : undefined;

  const isPending =
    !!user &&
    user.role === "escotista" &&
    !!myGroup &&
    myGroup.membershipStatus === "pending";

  if (!ready) return <AppShellSkeleton />;

  const eyebrow = [myGroup?.name, formatGroupIdentity(myGroup?.number, myGroup?.regiao)]
    .filter(Boolean)
    .join(" · ");

  const header = isImpersonating ? (
    <PageHeader
      back={<BackLink link={<Link to="/escotista" />} ariaLabel="Voltar ao painel" />}
      eyebrow="Visualizando como escotista"
      title={escoteiroName ?? "Escoteiro"}
    />
  ) : tab ? (
    <PageHeader
      eyebrow={eyebrow || (isPending ? "Escotista" : undefined)}
      eyebrowTestId="escotista-context"
      title={isPending ? "Paxtools" : tab.title}
      avatar={<ViewerAvatar />}
    />
  ) : null;

  return (
    <AppShell
      header={header}
      tabBar={
        !isImpersonating && !isPending ? (
          <EscotistaBottomNav isAdmin={!!myGroup?.isAdmin} />
        ) : undefined
      }
    >
      {isPending && myGroup ? (
        <PendingApprovalScreen
          groupName={myGroup.name}
          groupNumber={myGroup.number}
          groupRegiao={myGroup.regiao}
        />
      ) : (
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-32 animate-pulse rounded-[10px] border-2 border-[#141414] bg-[#EEE9DC]" />
              <div className="h-24 animate-pulse rounded-[10px] border-2 border-[#141414] bg-[#EEE9DC]" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      )}
    </AppShell>
  );
}

function EscotistaBottomNav({ isAdmin }: { isAdmin: boolean }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const matchRoute = useMatchRoute();
  const onSecondaryRoute = SECONDARY_ITEMS.some((item) =>
    Boolean(matchRoute({ to: item.to, fuzzy: true })),
  );
  const secondary = SECONDARY_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const moreActive = sheetOpen || onSecondaryRoute;

  return (
    <TabBar testId="escotista-bottom-nav">
      {NAV_ITEMS.map((item) => (
        <TabLink
          key={item.to}
          to={item.to}
          label={item.label}
          icon={item.icon}
          exact={item.exact}
        />
      ))}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger className={tabItemClass(moreActive)}>
          <MoreHorizontal className={moreActive ? TAB_ICON_ACTIVE_CLASS : TAB_ICON_CLASS} />
          Mais
        </SheetTrigger>
        <SheetContent title="Mais opções">
          {secondary.map((dest) => {
            const DestIcon = dest.icon;
            return (
              <SheetClose asChild key={dest.to}>
                <Link
                  to={dest.to}
                  className="flex min-h-[52px] items-center gap-3 rounded-[10px] border-2 border-[#141414] bg-white px-4 text-[15px] font-extrabold text-[#141414] shadow-[2px_2px_0_#141414] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  <DestIcon className="size-6" />
                  {dest.label}
                </Link>
              </SheetClose>
            );
          })}
        </SheetContent>
      </Sheet>
    </TabBar>
  );
}
