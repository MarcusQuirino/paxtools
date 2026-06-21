import { useEffect } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

type RouteRole = "escoteiro" | "escotista";

/**
 * Shared auth/onboarding route guard, factored out of the escoteiro-facing
 * routes (`/`, `/plan`) and the escotista layout (`/escotista`), which all
 * carried a copy of this redirect + loading logic.
 *
 * Redirects (via effect) to:
 *   - `/signin` when unauthenticated,
 *   - `/onboarding` when onboarding is incomplete,
 *   - the other role's home when the role doesn't belong on this route.
 *
 * `requireRole`:
 *   - `"escoteiro"`: escotistas are sent to `/escotista`.
 *   - `"escotista"`: non-escotistas are sent to `/`.
 *
 * Returns `ready` (true only once the viewer is authenticated, onboarded and
 * of the right role — the route should render its skeleton until then) and the
 * loaded `user`.
 */
export function useAuthGate(requireRole: RouteRole): {
  ready: boolean;
  user: Doc<"users"> | null;
} {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));

  const roleMismatch =
    !!user &&
    (requireRole === "escotista"
      ? user.role !== "escotista"
      : user.role === "escotista");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      void navigate({ to: "/signin" });
      return;
    }
    if (!user) return;
    if (!user.onboardingComplete) {
      void navigate({ to: "/onboarding" });
      return;
    }
    if (roleMismatch) {
      void navigate({ to: requireRole === "escotista" ? "/" : "/escotista" });
    }
  }, [isLoading, isAuthenticated, user, roleMismatch, requireRole, navigate]);

  const ready =
    !isLoading &&
    isAuthenticated &&
    !!user &&
    user.onboardingComplete === true &&
    !roleMismatch;

  return { ready, user };
}
