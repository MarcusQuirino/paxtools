/**
 * M6 (story 29) — Plan star / drag-reorder / unstar, MOBILE (Pixel 7).
 *
 * Júlia Sales (`sim-troop-lobinho-10`, lobinho) has a seeded 4-item plano. Same
 * shared flow as the desktop spec: star a NEW action from an already-worked
 * bloco, (attempt to) drag-reorder with persistence, restore, and unstar.
 *
 * Drag on mobile: @dnd-kit's PointerSensor activates from the synthetic pointer
 * events Playwright's mouse emits, so the same grip-drag works on the touch
 * viewport. `includeDrag` is kept a single switch here so that, if a future
 * device/engine change makes the touch drag unreliable, the drag leg can be
 * dropped while the star/unstar + persistence coverage stays green (the desktop
 * spec always covers drag).
 *
 * OWNERSHIP: mutates only Júlia Sales; asserts only on her own plan.
 */

import { testAs } from "../../fixtures/auth";
import { runPlanLifecycleFlow } from "../shared/plan-lifecycle-flow";

const test = testAs("sim-troop-lobinho-10");

test("lobinho stars a new item, reorders (persists), restores and unstars", async ({
  page,
}, testInfo) => {
  // The flow navigates the heavy dashboard/plan several times; give it room.
  testInfo.setTimeout(120_000);
  await runPlanLifecycleFlow(page, {
    newItemActionId: "lobinho:aprendizagem-continua:fixed:0",
    blocoTrigger: /Aprendizagem Contínua/i,
    includeDrag: true,
  });
});
