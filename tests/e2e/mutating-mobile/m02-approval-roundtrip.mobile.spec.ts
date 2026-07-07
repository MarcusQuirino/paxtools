/**
 * M2 (mobile) — approval round-trip WITH a Pata Tenra→Saltador level-up
 * crossing. Mobile viewport variant of tests/e2e/mutating/m02-approval-
 * roundtrip.spec.ts; same two-context flow, lobinho personas.
 *
 * Davi Siqueira (sim-troop-lobinho-4) is seeded with `partialNext: true`: 3
 * completed blocos + frontier bloco "Cuidado com o Corpo" with all fixed and
 * 3/4 variable ações approved. Approving his ONE missing variable ação
 * completes bloco #4 (3→4 blocos), crossing the lobinho etapa boundary
 * pata-tenra(0)→saltador(4).
 *
 * Missing ação derivation (identical index math to the desktop spec; lobinho
 * index i=3): frontier bloco `cuidado-com-o-corpo`, seeded-approved variables
 * [variable:3, variable:4, variable:5], missing = the 4th needed id
 * `lobinho:cuidado-com-o-corpo:variable:6`. Verified empirically against the
 * running dev seed.
 *
 * Marina Solano (sim-escotista-lobinho-1) is the approver (shared login; row
 * never mutated, no global counts asserted).
 */

import { test } from "@playwright/test";
import { devices } from "@playwright/test";
import { runApprovalRoundtrip } from "../shared/approval-roundtrip-flow";

test("escoteiro marks final ação → escotista approves → bloco completes and etapa levels up (Pata Tenra→Saltador)", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  await runApprovalRoundtrip(browser, {
    scoutSlug: "sim-troop-lobinho-4",
    scoutName: "Davi Siqueira",
    approverSlug: "sim-escotista-lobinho-1--m02m",
    frontierBlocoName: /Cuidado com o Corpo/i,
    missingActionId: "lobinho:cuidado-com-o-corpo:variable:6",
    lowerEtapa: "Pata Tenra",
    upperEtapa: "Saltador",
    contextOptions: devices["Pixel 7"],
  });
});
