/**
 * Revisão rápida card gestures: what a drag of (dx, dy) pixels means.
 * → já fiz, ← ainda não, ↑ pro Plano, ↓ desfazer — decided on the dominant
 * axis once it passes ~100px. Pure and browser-free.
 */
import type { SwipeKind } from "./revisao-session";

export type DragOffset = { dx: number; dy: number };
export type DragOutcome = SwipeKind | "undo";

/** Pixels on the dominant axis a release must pass to count as a swipe. */
export const SWIPE_THRESHOLD = 100;
/** Pixels of drag at which the preview stamp is fully opaque. */
const STAMP_FULL_AT = 110;

/** The outcome of releasing the card, or null to snap it back. */
export function resolveDrag(
  { dx, dy }: DragOffset,
  { planEnabled, canUndo }: { planEnabled: boolean; canUndo: boolean },
): DragOutcome | null {
  if (Math.abs(dx) > Math.abs(dy)) {
    if (Math.abs(dx) <= SWIPE_THRESHOLD) return null;
    return dx > 0 ? "done" : "skip";
  }
  if (dy < -SWIPE_THRESHOLD) return planEnabled ? "plan" : null;
  if (dy > SWIPE_THRESHOLD) return canUndo ? "undo" : null;
  return null;
}

/** The stamp to preview while dragging, or null for none. */
export function dragStamp(
  { dx, dy }: DragOffset,
  planEnabled: boolean,
): { kind: SwipeKind; opacity: number } | null {
  const opacity = (d: number) => Math.min(1, d / STAMP_FULL_AT);
  if (Math.abs(dx) > Math.abs(dy)) {
    return { kind: dx > 0 ? "done" : "skip", opacity: opacity(Math.abs(dx)) };
  }
  if (dy < 0 && planEnabled) return { kind: "plan", opacity: opacity(-dy) };
  return null;
}
