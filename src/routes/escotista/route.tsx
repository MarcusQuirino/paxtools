import { Suspense, useEffect } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useMatchRoute,
} from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AuthButton } from "@/components/auth/auth-button";
import { Footer } from "@/components/footer";
import { PendingApprovalScreen } from "@/components/escotista/pending-approval-screen";
import { LayoutDashboard, Clock, ArrowLeft, Shield } from "lucide-react";

export const Route = createFileRoute("/escotista")({
  component: EscotistaLayout,
});

function EscotistaLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();

  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));
  const { data: myGroup } = useSuspenseQuery(
    convexQuery(api.groups.getMyGroup, {}),
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: "/signin" });
      return;
    }
    if (user && !user.onboardingComplete) {
      void navigate({ to: "/onboarding" });
      return;
    }
    if (user && user.role !== "escotista") {
      void navigate({ to: "/" });
    }
  }, [isLoading, isAuthenticated, user, navigate]);

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

  if (isLoading || !isAuthenticated || !user || user.role !== "escotista") {
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

        {!isImpersonating && !isPending && (
          <nav className="flex gap-1 rounded-md border-2 border-black bg-muted p-1">
            <NavTab to="/escotista" icon={LayoutDashboard} label="Painel" />
            <NavTab to="/escotista/pending" icon={Clock} label="Pendentes" />
            {myGroup?.isAdmin && (
              <NavTab to="/escotista/admin" icon={Shield} label="Admin" />
            )}
          </nav>
        )}

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
    </div>
  );
}

function NavTab({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-bold transition-all text-muted-foreground hover:text-foreground hover:bg-white/50"
      activeProps={{
        className:
          "bg-primary text-white border-2 border-black shadow-[2px_2px_0px_0px_#000] flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-bold transition-all",
      }}
      activeOptions={{ exact: true }}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
