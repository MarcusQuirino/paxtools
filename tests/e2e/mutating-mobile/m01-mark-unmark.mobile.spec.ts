/**
 * M1 (PRD #58 story 27) — mobile viewport. Alice Prado (sim-troop-lobinho-1)
 * is a lobinho with 0 completed blocos, so the first fixed ação of her frontier
 * bloco ("Aprendizagem Contínua") starts unchecked. Same mark→pending→unmark
 * flow as the desktop M1, driven through the shared helper in a Pixel 7
 * viewport to cover the mobile layout.
 *
 * Ownership: this spec owns Alice Prado's data (tests/utils/personas.ts).
 */

import { testAs } from "../../fixtures/auth";
import { runMarkUnmarkFlow } from "../shared/mark-unmark-flow";

const test = testAs("sim-troop-lobinho-1");

test("escoteiro marks an ação as pending and can unmark it (mobile)", async ({
  page,
}) => {
  await runMarkUnmarkFlow(page, {
    actionId: "lobinho:aprendizagem-continua:fixed:0",
    blocoTrigger: /Aprendizagem Contínua/i,
  });
});
