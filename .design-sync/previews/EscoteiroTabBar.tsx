import { EscoteiroTabBar } from "paxtools";

/**
 * EscoteiroTabBar takes no props — it reads the active tab from the router, so
 * the highlighted tab follows the current route. Only one state is renderable
 * per card (the preview router sits at "/", i.e. "Progressão"). The bar is
 * `position: fixed`; the transformed wrapper becomes its containing block so
 * it pins to the bottom of the card instead of the viewport.
 */
export const Navegacao = () => (
  <div className="relative h-28 max-w-md" style={{ transform: "translateZ(0)" }}>
    <EscoteiroTabBar />
  </div>
);
