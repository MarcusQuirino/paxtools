/**
 * design-sync bundle entry.
 *
 * paxtools is an application, not a published component library — package.json
 * has no `main`/`module`/`exports` and there is no library `dist/`. This barrel
 * is the entry the converter bundles: it re-exports the repo's REAL components
 * (nothing is reimplemented here), scoped to the synced surface — the shadcn/ui
 * primitives and the progression components.
 *
 * Deliberately out of scope (Convex/auth/router-coupled feature screens):
 * components/auth, components/escotista, components/onboarding, components/footer.
 */

// ── ui primitives ────────────────────────────────────────────────────────
export * from "@/components/ui/accordion";
export * from "@/components/ui/avatar";
export * from "@/components/ui/badge";
export * from "@/components/ui/button";
export * from "@/components/ui/checkbox";
export * from "@/components/ui/collapsible";
export * from "@/components/ui/confirm-dialog";
export * from "@/components/ui/dialog";
export * from "@/components/ui/dropdown-menu";
export * from "@/components/ui/input";
export * from "@/components/ui/label";
export * from "@/components/ui/progress";
export * from "@/components/ui/select";
export * from "@/components/ui/sheet";
export * from "@/components/ui/sonner";
// `toast` must come from the SAME sonner instance as the bundled <Toaster/>,
// so it ships on window.PaxTools rather than being imported separately.
export { toast } from "sonner";

// ── progression ──────────────────────────────────────────────────────────
export * from "@/components/progression/action-checklist";
export * from "@/components/progression/action-item";
export * from "@/components/progression/bloco-card";
export * from "@/components/progression/coming-soon";
export * from "@/components/progression/custom-action-input";
export * from "@/components/progression/eixo-section";
export * from "@/components/progression/overall-progress";
export * from "@/components/progression/plan-nav";
export * from "@/components/progression/plan-star";
export * from "@/components/progression/recognition-section";
export * from "@/components/progression/specialty-section";
export * from "@/components/progression/stage-banner";

// ── preview scaffolding (cfg.provider target — not a synced component) ───
export { DesignPreviewProvider } from "./ds-provider";
