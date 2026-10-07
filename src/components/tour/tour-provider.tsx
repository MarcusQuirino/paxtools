import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";
import { GuidedTour } from "@/components/tour/guided-tour";
import { shouldAutoStartTour, tourStepsFor } from "@/lib/tour";

const TourContext = createContext<{ startTour: () => void } | null>(null);

/** Replays the guided tour (the "Ver tutorial" button in Perfil/Ajustes). */
export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside TourProvider");
  return ctx;
}

/**
 * Hosts the guided tour above every route, so it survives the navigation
 * between steps. Opens it by itself on a member's first visit; finishing or
 * skipping marks it seen on their record, so it doesn't follow them to
 * another device.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  // Non-suspending: the tour must never hold up the page it sits on.
  const { data: user } = useQuery(convexQuery(api.users.viewer, {}));
  const { data: group } = useQuery(convexQuery(api.groups.getMyGroup, {}));
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [replaying, setReplaying] = useState(false);
  // Closed this session: don't reopen while markTourSeen is still landing.
  const [dismissed, setDismissed] = useState(false);

  const markSeenFn = useConvexMutation(api.users.markTourSeen);
  const { mutate: markSeen } = useMutation({ mutationFn: markSeenFn });

  const open =
    replaying || (!dismissed && shouldAutoStartTour(user ?? null, pathname));

  const startTour = useCallback(() => setReplaying(true), []);
  const closeTour = useCallback(() => {
    setDismissed(true);
    setReplaying(false);
    markSeen({});
  }, [markSeen]);

  const role = user?.role;
  const isAdmin = !!group?.isAdmin;
  const steps = useMemo(
    () => (role ? tourStepsFor(role, isAdmin) : null),
    [role, isAdmin],
  );

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
      {open && steps && <GuidedTour steps={steps} onClose={closeTour} />}
    </TourContext.Provider>
  );
}
