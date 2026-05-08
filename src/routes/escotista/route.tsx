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
import { LayoutDashboard, Clock, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/escotista")({
  component: EscotistaLayout,
});

function EscotistaLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();

  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));

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

  if (isLoading || !isAuthenticated || !user || user.role !== "escotista") {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 py-4 space-y-4 pb-20">
          <div className="h-6 w-20 animate-pulse rounded bg-muted" />
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
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
            <h1 className="text-lg font-bold text-emerald-900">Paxtools</h1>
          )}
          <AuthButton />
        </header>

        {!isImpersonating && (
          <nav className="flex gap-1 rounded-lg bg-muted p-1">
            <NavTab to="/escotista" icon={LayoutDashboard} label="Painel" />
            <NavTab to="/escotista/pending" icon={Clock} label="Pendentes" />
          </nav>
        )}

        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-32 animate-pulse rounded-xl bg-muted" />
              <div className="h-24 animate-pulse rounded-xl bg-muted" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
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
      className="flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
      activeProps={{
        className:
          "bg-background text-foreground shadow-sm flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors",
      }}
      activeOptions={{ exact: true }}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
