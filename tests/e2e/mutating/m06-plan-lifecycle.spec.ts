/**
 * M6 (story 29) — Plan star / drag-reorder / unstar, DESKTOP.
 *
 * Íris Campos (`sim-troop-escoteiro-9`, escoteiro) has a seeded 4-item plano in
 * her frontier bloco ("Democracia"). This spec stars a NEW action from a
 * different, already-worked bloco ("Aprendizagem Contínua"), drag-reorders the
 * ordered view and asserts the new order persists across a reload, then
 * restores the order and unstars the added item. Self-cleaning and retry-safe —
 * see tests/e2e/shared/plan-lifecycle-flow.ts.
 *
 * OWNERSHIP: mutates only Íris Campos; asserts only on her own plan.
 */

import { testAs } from "../../fixtures/auth";
import { runPlanLifecycleFlow } from "../shared/plan-lifecycle-flow";

const test = testAs("sim-troop-escoteiro-9");

test("escoteiro stars a new item, reorders (persists), restores and unstars", async ({
  page,
}, testInfo) => {
  // The flow navigates the heavy dashboard/plan several times; give it room.
  testInfo.setTimeout(120_000);
  await runPlanLifecycleFlow(page, {
    newItemActionId: "escoteiro:aprendizagem-continua:fixed:0",
    blocoTrigger: /Aprendizagem Contínua/i,
    includeDrag: true,
  });
});
