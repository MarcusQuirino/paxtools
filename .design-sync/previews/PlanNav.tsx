import { PlanNav } from "paxtools";

/**
 * PlanNav takes no props — it reads the active tab from the router via
 * `useLocation`, so the highlighted tab follows the current route. Only one
 * state is renderable per card (the preview router sits at "/", i.e. "Tudo").
 */
export const Navegacao = () => (
  <div className="max-w-md">
    <PlanNav />
  </div>
);
