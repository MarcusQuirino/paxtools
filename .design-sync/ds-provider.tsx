/**
 * Preview-only provider for design-sync.
 *
 * Two synced components read TanStack Router context — PlanNav (`useLocation`)
 * and SpecialtySection (`Link`). `RouterProvider` renders the matched route
 * tree instead of its children, so it can't wrap a preview; `RouterContextProvider`
 * is the low-level variant that puts a router in context and renders `children`
 * through. A memory-history router over a single catch-all route is enough for
 * `Link` to build hrefs and `useLocation` to report a pathname.
 *
 * This is preview scaffolding, not app code — it is wired via cfg.provider so
 * every card renders inside it. It ships as a bundle export because cfg.provider
 * can only name a `window.PaxTools.*` export.
 */
import * as React from "react";
import {
  RouterContextProvider,
  createRootRoute,
  createRouter,
  createMemoryHistory,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({ component: () => null });

const previewRouter = createRouter({
  routeTree: rootRoute,
  history: createMemoryHistory({ initialEntries: ["/"] }),
});

export function DesignPreviewProvider({ children }: { children?: React.ReactNode }) {
  return (
    <RouterContextProvider router={previewRouter as never}>
      {children}
    </RouterContextProvider>
  );
}
