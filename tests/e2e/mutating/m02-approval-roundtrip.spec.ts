/**
 * M2 (desktop) — approval round-trip WITH a Pista→Trilha level-up crossing.
 *
 * Diego Alves (sim-troop-escoteiro-4) is seeded with `partialNext: true`: 3
 * completed blocos + a frontier bloco "Cuidado com o Corpo" with all fixed
 * ações and 3/4 variable ações approved. Approving his ONE missing variable
 * ação completes bloco #4, taking him from 3→4 blocos which crosses the
 * escoteiro etapa boundary pista(0)→trilha(4).
 *
 * Missing ação derivation (convex/testing.ts seedSimRamo, Diego = escoteiro
 * index i=3): completedBlocosFor(order,3,3) → first 3 blocos; frontier bloco =
 * order[3] = "cuidado-com-o-corpo" (variableRequired 4, 8 variable ações).
 * partialNext approves variableIdsFor(bloco,3,0).slice(0,3) =
 * [variable:3, variable:4, variable:5]; the 4th needed id (index need-1=3 of
 * variableIdsFor, offset (3+0)%8=3) is `escoteiro:cuidado-com-o-corpo:variable:6`
 * — the single unapproved variable ação. Verified empirically against the
 * running dev seed.
 *
 * Renata Peçanha (sim-escotista-escoteiro-1) is the approver (shared login;
 * her own row is never mutated, no global queue/painel counts asserted).
 */

import { test } from "@playwright/test";
import { devices } from "@playwright/test";
import { runApprovalRoundtrip } from "../shared/approval-roundtrip-flow";

test("escoteiro marks final ação → escotista approves → bloco completes and etapa levels up (Pista→Trilha)", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  await runApprovalRoundtrip(browser, {
    scoutSlug: "sim-troop-escoteiro-4",
    scoutName: "Diego Alves",
    approverSlug: "sim-escotista-escoteiro-1--m02",
    frontierBlocoName: /Cuidado com o Corpo/i,
    missingActionId: "escoteiro:cuidado-com-o-corpo:variable:6",
    lowerEtapa: "Pista",
    upperEtapa: "Trilha",
    contextOptions: devices["Desktop Chrome"],
  });
});
