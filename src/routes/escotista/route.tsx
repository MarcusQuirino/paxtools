import { Suspense, useState } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useMatchRoute,
} from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { AuthButton } from "@/components/auth/auth-button";
import { Footer } from "@/components/footer";
import { PendingApprovalScreen } from "@/components/escotista/pending-approval-screen";
import {
  LayoutDashboard,
  Clock,
  ArrowLeft,
  Shield,
  ScrollText,
  MoreHorizontal,
  Settings,
  BarChart3,
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

type NavItem =
  | { kind: "link"; to: string; label: string; icon: IconType; exact?: boolean }
  | { kind: "sheet"; label: string; icon: IconType };

// Primary bottom-bar slots. Adding a tab = adding one entry here.
const NAV_ITEMS: NavItem[] = [
  { kind: "link", to: "/escotista", label: "Painel", icon: LayoutDashboard, exact: true },
  { kind: "link", to: "/escotista/pending", label: "Pendentes", icon: Clock },
  // PLAN B INSERTION POINT
  { kind: "link", to: "/escotista/stats", label: "Stats", icon: BarChart3 },
  { kind: "sheet", label: "Mais", icon: MoreHorizontal },
];

type SecondaryItem = {
  to: string;
  label: string;
  icon: IconType;
  adminOnly?: boolean;
};

// Destinations shown inside the "Mais" sheet.
const SECONDARY_ITEMS: SecondaryItem[] = [
  { to: "/escotista/timeline", label: "Histórico", icon: ScrollText },
  { to: "/escotista/admin", label: "Admin", icon: Shield, adminOnly: true },
  { to: "/settings", label: "Ajustes", icon: Settings },
];

function EscotistaLayout() {
  const navigate = useNavigate();
  const { ready, user } = useAuthGate("escotista");
  const { data: myGroup } = useSuspenseQuery(
    convexQuery(api.groups.getMyGroup, {}),
  );

  const matchRoute = useMatchRoute();
  const isImpersonating = matchRoute({
    to: "/escotista/escoteiro/$escoteiroId",
    fuzzy: true,
  });

  const isPending =
    !!user &&
    user.role === "escotista" &&
    !!myGroup &&
    myGroup.membershipStatus === "pending";

  if (!ready) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
          <div className="h-6 w-20 animate-pulse rounded-md border-2 border-black bg-muted" />
          <div className="h-32 animate-pulse rounded-md border-2 border-black bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
        <header className="flex items-center justify-between">
          {isImpersonating ? (
            <button
              type="button"
              onClick={() => void navigate({ to: "/escotista" })}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Voltar
            </button>
          ) : (
            <h1 className="text-lg font-black uppercase text-foreground">Paxtools</h1>
          )}
          <AuthButton />
        </header>

        {isPending && myGroup ? (
          <PendingApprovalScreen
            groupName={myGroup.name}
            groupNumber={myGroup.number}
          />
        ) : (
          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="h-32 animate-pulse rounded-md border-2 border-black bg-muted" />
                <div className="h-24 animate-pulse rounded-md border-2 border-black bg-muted" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        )}
        <Footer />
      </div>
      {!isImpersonating && !isPending && (
        <EscotistaBottomNav isAdmin={!!myGroup?.isAdmin} />
      )}
    </div>
  );
}

const PRIMARY_INACTIVE =
  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-white/50 hover:text-foreground";
const PRIMARY_ACTIVE =
  "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md border-2 border-black bg-primary py-2 text-xs font-bold text-white shadow-[2px_2px_0px_0px_#000] transition-all";

function EscotistaBottomNav({ isAdmin }: { isAdmin: boolean }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const matchRoute = useMatchRoute();
  const onSecondaryRoute = SECONDARY_ITEMS.some((item) =>
    Boolean(matchRoute({ to: item.to, fuzzy: true })),
  );
  const secondary = SECONDARY_ITEMS.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  return (
    <nav
      data-testid="escotista-bottom-nav"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-lg gap-1 border-t-2 border-black bg-muted p-1"
    >
      {NAV_ITEMS.map((item) => {
        if (item.kind === "link") {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              className={PRIMARY_INACTIVE}
              activeProps={{ className: PRIMARY_ACTIVE }}
              activeOptions={{ exact: item.exact ?? false }}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        }
        if (item.kind === "sheet") {
          const Icon = item.icon;
          const moreActive = sheetOpen || onSecondaryRoute;
          return (
            <Sheet key={item.label} open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger
                className={moreActive ? PRIMARY_ACTIVE : PRIMARY_INACTIVE}
              >
                <Icon className="size-5" />
                {item.label}
              </SheetTrigger>
              <SheetContent title="Mais opções">
                {secondary.map((dest) => {
                  const DestIcon = dest.icon;
                  return (
                    <SheetClose asChild key={dest.to}>
                      <Link
                        to={dest.to}
                        className="flex items-center gap-3 rounded-md border-2 border-black bg-white px-4 py-3 text-sm font-bold text-foreground shadow-[2px_2px_0px_0px_#000] transition-all hover:bg-muted"
                      >
                        <DestIcon className="size-5" />
                        {dest.label}
                      </Link>
                    </SheetClose>
                  );
                })}
              </SheetContent>
            </Sheet>
          );
        }
        const _exhaustive: never = item;
        return _exhaustive;
      })}
    </nav>
  );
}
