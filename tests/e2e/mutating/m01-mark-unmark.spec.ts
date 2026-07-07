/**
 * M1 (PRD #58 story 27) — desktop. Ana Lima (sim-troop-escoteiro-1) is an
 * escoteiro with 0 completed blocos, so the first fixed ação of her frontier
 * bloco ("Aprendizagem Contínua") starts unchecked. She marks it → a PENDING
 * completion (clock, checked, still enabled) → then unmarks it.
 *
 * Ownership: this spec owns Ana Lima's data (tests/utils/personas.ts). The
 * flow lives in tests/e2e/shared/mark-unmark-flow.ts; the mobile variant
 * (Alice Prado, lobinho) wraps the same helper.
 */

import { testAs } from "../../fixtures/auth";
import { runMarkUnmarkFlow } from "../shared/mark-unmark-flow";

const test = testAs("sim-troop-escoteiro-1");

test("escoteiro marks an ação as pending and can unmark it", async ({
  page,
}) => {
  await runMarkUnmarkFlow(page, {
    actionId: "escoteiro:aprendizagem-continua:fixed:0",
    blocoTrigger: /Aprendizagem Contínua/i,
  });
});
