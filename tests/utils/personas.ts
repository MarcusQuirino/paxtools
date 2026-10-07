/**
 * Persona manifest — the suite's ownership registry (PRD #58, story 7).
 *
 * Every persona a spec signs in as OR mutates the data of MUST be listed
 * here. Global setup captures a storageState for each entry (and only these),
 * so adding a spec that needs a new login means adding a row here first.
 *
 * `ownedBy` is the data-ownership contract for the mutating phase:
 *   - null           → shared read-only persona. Any readonly spec may assert
 *                      on it; NO mutating spec may touch its data.
 *   - "<spec file>"  → exactly one mutating spec may mutate this persona's
 *                      data. Sharing a LOGIN across specs is fine (e.g. the
 *                      admin login drives M11–M20); sharing DATA is not —
 *                      each mutating spec asserts only on rows of personas it
 *                      owns.
 *
 * Every persona is a conta gerenciada: it signs in with its registro + the
 * shared test password through the real `/signin` form. Registros come from
 * `convex/lib/testAccounts.ts`; `login()` maps a persona's login name to it:
 *   canonical  admin, escotista, pending, …            → 990NNN
 *   scouts     sim-troop-<ramo>-<i+1>    (SIM_SPECS order)
 *   escotistas sim-escotista-<ramo>-<j+1>
 *   pending    sim-pending-<ramo>-1 / sim-pending-escotista-<ramo>-1
 * The `name` column mirrors SIM_SPECS and is what painel/search shows.
 *
 * KNOWN SHARED ROWS (not per-persona, still single-owner):
 *   - the test group row (name) → m17-group-rename.spec.ts.
 *     No other spec may assert on the group name.
 *   - the group's seções (#72) → m21-secoes.spec.ts. The seed creates NONE, so
 *     M21 creates its own and removes it in finally{}; no other spec may create
 *     a seção or assert on the seções list. R7 asserts the group IDENTITY
 *     (numeral/UF), which is a different field and safe to read.
 *   - `observedSectionId` on the shared admin row → m21-secoes.spec.ts. It is
 *     server-side state, so a leaked selection would silently filter the
 *     escotista painel for every later spec using the admin login.
 *   - membership queue rows → each membership spec asserts only on its own
 *     personas' cards, never on exact queue counts.
 *   - `tourSeenAt` on the escoteiro-approved and escotista rows →
 *     m23-guided-tour.spec.ts re-stamps it when closing the tour. The seed
 *     sets it on every persona so the tour never covers another spec's page;
 *     no other spec may assert on it.
 */

import {
  CANONICAL_SCOUT_IDS,
  simScoutId,
  type CanonicalSlug,
  type SimKind,
} from "../../convex/lib/testAccounts";

export interface ManifestEntry {
  /** storageState filename: tests/.auth/<slug>.json */
  readonly slug: string;
  /** Registro escoteiro the persona signs in with. */
  readonly scoutId: string;
  /** Display name as rendered in the app (painel, cards, search). */
  readonly name: string;
  /** Mutating spec (repo-relative path) that owns this persona's data. */
  readonly ownedBy: string | null;
  readonly notes?: string;
}

const M = (n: string) => `tests/e2e/mutating/${n}`;
const MM = (n: string) => `tests/e2e/mutating-mobile/${n}`;

const CANONICAL_LOGINS: Record<string, CanonicalSlug> = {
  admin: "admin",
  escotista: "escotista",
  "escotista-pending": "escotista_pending",
  pending: "escoteiro_pending",
  approved: "escoteiro_approved",
  progression: "escoteiro_with_progression",
  lobinho: "escoteiro_lobinho",
  onboarding: "escoteiro_onboarding_incomplete",
  "onboarding-m13": "onboarding_m13",
  banned: "banned_user",
};

const SIM_LOGIN =
  /^sim-(troop|escotista|pending|pending-escotista)-(lobinho|escoteiro|senior|pioneiro)-(\d+)$/;

/** Registro of a persona by its login name (`admin`, `sim-troop-senior-7`, …). */
export function login(name: string): string {
  const canonical = CANONICAL_LOGINS[name];
  if (canonical) return CANONICAL_SCOUT_IDS[canonical];
  const m = SIM_LOGIN.exec(name);
  if (!m) throw new Error(`unknown persona login: ${name}`);
  return simScoutId(
    m[2] as Parameters<typeof simScoutId>[0],
    m[1] as SimKind,
    Number(m[3]),
  );
}

export const MANIFEST: readonly ManifestEntry[] = [
  // ── Canonical catalog users (tests/utils/catalog.ts) ─────────────────────
  { slug: "admin", scoutId: login("admin"), name: "admin", ownedBy: null,
    notes: "login shared by admin-actor specs; own row never mutated" },
  { slug: "escotista", scoutId: login("escotista"), name: "escotista", ownedBy: null,
    notes: "multi-ramo (escoteiro+senior) visibility edge case" },
  { slug: "escotista-pending", scoutId: login("escotista-pending"), name: "escotista-pending", ownedBy: null,
    notes: "R1 parked-on-waiting persona; M15 uses Olga instead" },
  { slug: "escoteiro-pending", scoutId: login("pending"), name: "pending", ownedBy: null },
  { slug: "escoteiro-approved", scoutId: login("approved"), name: "approved", ownedBy: null,
    notes: "zero-progress escoteiro; also empty-plan persona" },
  { slug: "escoteiro-with-progression", scoutId: login("progression"), name: "progression", ownedBy: null,
    notes: "approved-locked + plan por-área readonly fixtures" },
  { slug: "escoteiro-lobinho", scoutId: login("lobinho"), name: "lobinho", ownedBy: null },
  { slug: "escoteiro-onboarding-incomplete", scoutId: login("onboarding"), name: "onboarding", ownedBy: null,
    notes: "R1 forced-to-onboarding persona (readonly)" },
  { slug: "banned-user", scoutId: login("banned"), name: "banned", ownedBy: null },
  { slug: "onboarding-m13", scoutId: login("onboarding-m13"), name: "onboarding-m13",
    ownedBy: M("m13-onboarding.spec.ts"),
    notes: "dedicated M13 persona; spec resets it via testing:resetOnboardingUser" },

  // ── Sim troop: escoteiro ramo ────────────────────────────────────────────
  { slug: "sim-troop-escoteiro-1", scoutId: login("sim-troop-escoteiro-1"), name: "Ana Lima",
    ownedBy: M("m01-mark-unmark.spec.ts"), notes: "0 blocos; R2 empty-dashboard reads it first" },
  { slug: "sim-troop-escoteiro-2", scoutId: login("sim-troop-escoteiro-2"), name: "Bruno Sá",
    ownedBy: M("m03-reject-flow.spec.ts"), notes: "2 seeded pendings; R2 pending rendering reads first" },
  { slug: "sim-troop-escoteiro-3", scoutId: login("sim-troop-escoteiro-3"), name: "Carla Reis",
    ownedBy: M("m05-acao-personalizada.spec.ts") },
  { slug: "sim-troop-escoteiro-4", scoutId: login("sim-troop-escoteiro-4"), name: "Diego Alves",
    ownedBy: M("m02-approval-roundtrip.spec.ts"),
    notes: "3 blocos + partialNext → approving the final missing ação level-ups" },
  { slug: "sim-troop-escoteiro-7", scoutId: login("sim-troop-escoteiro-7"), name: "Gabriela Pinto",
    ownedBy: M("m19-advance-escoteiro-senior.spec.ts"), notes: "earned younger especialidade" },
  { slug: "sim-troop-escoteiro-9", scoutId: login("sim-troop-escoteiro-9"), name: "Íris Campos",
    ownedBy: M("m06-plan-lifecycle.spec.ts"), notes: "seeded plano" },
  { slug: "sim-troop-escoteiro-10", scoutId: login("sim-troop-escoteiro-10"), name: "João Mendes",
    ownedBy: M("m21-secoes.spec.ts"),
    notes: "level2 younger especialidade (R4 reads it); M21 mutates ONLY sectionId, which no readonly spec asserts" },
  { slug: "sim-troop-escoteiro-11", scoutId: login("sim-troop-escoteiro-11"), name: "Kelly Faria",
    ownedBy: M("m22-plan-especialidade.spec.ts"), notes: "11 blocos, empty plano, no especialidades" },
  { slug: "sim-troop-escoteiro-15", scoutId: login("sim-troop-escoteiro-15"), name: "Otávio Freitas",
    ownedBy: null, notes: "18 blocos, IRR full — Lis de Ouro trophy (R2)" },

  // ── Sim troop: lobinho ramo ──────────────────────────────────────────────
  { slug: "sim-troop-lobinho-1", scoutId: login("sim-troop-lobinho-1"), name: "Alice Prado",
    ownedBy: MM("m01-mark-unmark.mobile.spec.ts") },
  { slug: "sim-troop-lobinho-3", scoutId: login("sim-troop-lobinho-3"), name: "Cecília Moraes",
    ownedBy: null, notes: "younger especialidade pending (R4)" },
  { slug: "sim-troop-lobinho-4", scoutId: login("sim-troop-lobinho-4"), name: "Davi Siqueira",
    ownedBy: MM("m02-approval-roundtrip.mobile.spec.ts"), notes: "3 blocos + partialNext" },
  { slug: "sim-troop-lobinho-6", scoutId: login("sim-troop-lobinho-6"), name: "Felipe Duarte",
    ownedBy: M("m07-younger-especialidade.spec.ts"),
    notes: "younger especialidade one item short of level 1" },
  { slug: "sim-troop-lobinho-7", scoutId: login("sim-troop-lobinho-7"), name: "Gael Monteiro",
    ownedBy: M("m14-profile-rename.spec.ts") },
  { slug: "sim-troop-lobinho-8", scoutId: login("sim-troop-lobinho-8"), name: "Helena Braga",
    ownedBy: M("m18-advance-lobinho-escoteiro.spec.ts"), notes: "earned younger especialidade (R4 reads first)" },
  { slug: "sim-troop-lobinho-10", scoutId: login("sim-troop-lobinho-10"), name: "Júlia Sales",
    ownedBy: MM("m06-plan-lifecycle.mobile.spec.ts"), notes: "seeded plano" },
  { slug: "sim-troop-lobinho-11", scoutId: login("sim-troop-lobinho-11"), name: "Kaique Neves",
    ownedBy: null, notes: "level2 younger especialidade (R4)" },
  { slug: "sim-troop-lobinho-15", scoutId: login("sim-troop-lobinho-15"), name: "Otto Vilela",
    ownedBy: null, notes: "18 blocos, IRR full — Cruzeiro do Sul trophy (R2)" },
  { slug: "sim-troop-lobinho-16", scoutId: login("sim-troop-lobinho-16"), name: "Pilar Antunes",
    ownedBy: M("m09-irr-completion.spec.ts"), notes: "18 blocos, IRR partial (R2 reads first)" },

  // ── Sim troop: sênior ramo ───────────────────────────────────────────────
  { slug: "sim-troop-senior-2", scoutId: login("sim-troop-senior-2"), name: "Quésia Torres",
    ownedBy: M("m04-bulk-approve.spec.ts"), notes: "2 seeded pendings" },
  { slug: "sim-troop-senior-3", scoutId: login("sim-troop-senior-3"), name: "Rafael Bastos",
    ownedBy: null, notes: "older especialidade pending (R4)" },
  { slug: "sim-troop-senior-6", scoutId: login("sim-troop-senior-6"), name: "Úrsula Mattos",
    ownedBy: M("m08-older-etapa-report.spec.ts"),
    notes: "older especialidade in progress: conhecer approved, fazer pending" },
  { slug: "sim-troop-senior-7", scoutId: login("sim-troop-senior-7"), name: "Vitor Sampaio",
    ownedBy: M("m20-advance-senior-pioneiro.spec.ts"), notes: "earned older especialidade (R4 reads first)" },
  { slug: "sim-troop-senior-9", scoutId: login("sim-troop-senior-9"), name: "Xavier Dutra",
    ownedBy: null, notes: "seeded plano + approved ação personalizada (R3)" },
  { slug: "sim-troop-senior-11", scoutId: login("sim-troop-senior-11"), name: "Zeca Amorim",
    ownedBy: M("m12-admin-member-mgmt.spec.ts"), notes: "M12b role flip target" },
  { slug: "sim-troop-senior-12", scoutId: login("sim-troop-senior-12"), name: "Aurora Linhares",
    ownedBy: null, notes: "multi-ramo history (lobinho+escoteiro completed) — R2 no-bleed" },

  // ── Sim troop: pioneiro ramo ─────────────────────────────────────────────
  { slug: "sim-troop-pioneiro-1", scoutId: login("sim-troop-pioneiro-1"), name: "Clara Estevão",
    ownedBy: null, notes: "3-ramo history — R2 no-bleed" },
  { slug: "sim-troop-pioneiro-2", scoutId: login("sim-troop-pioneiro-2"), name: "Dante Meireles",
    ownedBy: M("m10-impersonation.spec.ts") },
  { slug: "sim-troop-pioneiro-3", scoutId: login("sim-troop-pioneiro-3"), name: "Eloá Pacheco",
    ownedBy: M("m12-admin-member-mgmt.spec.ts"), notes: "M12c ban target" },

  // ── Sim escotistas (approver logins; single-ramo) ────────────────────────
  { slug: "sim-escotista-escoteiro-1", scoutId: login("sim-escotista-escoteiro-1"), name: "Renata Peçanha",
    ownedBy: null, notes: "approver login for M2/M3 (login shared, row untouched)" },
  { slug: "sim-escotista-escoteiro-2", scoutId: login("sim-escotista-escoteiro-2"), name: "Bruno Valente",
    ownedBy: M("m12-admin-member-mgmt.spec.ts"), notes: "M12a promote-to-admin target (row mutated)" },
  { slug: "sim-escotista-lobinho-1", scoutId: login("sim-escotista-lobinho-1"), name: "Marina Solano",
    ownedBy: null, notes: "single-ramo painel persona (R5); approver login for M7/M9 + mobile M2" },
  { slug: "sim-escotista-senior-1", scoutId: login("sim-escotista-senior-1"), name: "Talita Novaes",
    ownedBy: null, notes: "approver login for M4/M8" },
  { slug: "sim-escotista-pioneiro-1", scoutId: login("sim-escotista-pioneiro-1"), name: "Vera Lacerda",
    ownedBy: null, notes: "pioneiro painel persona (R5); impersonator login for M10" },
  { slug: "sim-escotista-pioneiro-2", scoutId: login("sim-escotista-pioneiro-2"), name: "Hugo Tavares",
    ownedBy: M("m12-admin-member-mgmt.spec.ts"), notes: "M12d edit-ramos target (row mutated)" },

  // ── Sim pending personas ─────────────────────────────────────────────────
  { slug: "sim-pending-escotista-lobinho-1", scoutId: login("sim-pending-escotista-lobinho-1"), name: "Olga Ventura",
    ownedBy: M("m15-pending-cancel.spec.ts"),
    notes: "cancel is refused (conta gerenciada can't leave); row untouched" },
  // M11 targets (no login needed — admin drives; listed for data ownership):
  { slug: "sim-pending-senior-1", scoutId: login("sim-pending-senior-1"), name: "Ivan Queiroga",
    ownedBy: M("m11-membership.spec.ts"), notes: "approved by M11" },
  { slug: "sim-pending-escoteiro-1", scoutId: login("sim-pending-escoteiro-1"), name: "Manu Setúbal",
    ownedBy: M("m11-membership.spec.ts"), notes: "rejected by M11" },

  // ── Session aliases for shared logins (one per mutating spec) ────────────
  // Convex Auth's refresh token is single-use and rotates per session. Two
  // concurrent browser contexts booting from the SAME storageState file
  // double-spend the token; reuse detection then revokes the session and
  // strands both specs on /signin (bit m09/m17/m20 in full parallel runs).
  // "Sharing a login is safe" therefore means sharing the EMAIL, not the
  // session file: every mutating spec that drives a shared login gets its
  // own captured session below. Readonly specs keep the base slugs (their
  // phase is short-lived and read-only, empirically unaffected).
  ...(["m11", "m12", "m17", "m18", "m19", "m20", "m21"] as const).map((tag) => ({
    slug: `admin--${tag}`, scoutId: login("admin"), name: "admin",
    ownedBy: null, notes: `dedicated admin session for ${tag}`,
  })),
  ...(["m02", "m03", "m18", "m19"] as const).map((tag) => ({
    slug: `sim-escotista-escoteiro-1--${tag}`, scoutId: login("sim-escotista-escoteiro-1"), name: "Renata Peçanha",
    ownedBy: null, notes: `dedicated Renata session for ${tag}`,
  })),
  ...(["m02m", "m07", "m09", "m16", "m18"] as const).map((tag) => ({
    slug: `sim-escotista-lobinho-1--${tag}`, scoutId: login("sim-escotista-lobinho-1"), name: "Marina Solano",
    ownedBy: null, notes: `dedicated Marina session for ${tag}`,
  })),
  ...(["m04", "m08", "m19", "m20"] as const).map((tag) => ({
    slug: `sim-escotista-senior-1--${tag}`, scoutId: login("sim-escotista-senior-1"), name: "Talita Novaes",
    ownedBy: null, notes: `dedicated Talita session for ${tag}`,
  })),
  ...(["m10", "m20"] as const).map((tag) => ({
    slug: `sim-escotista-pioneiro-1--${tag}`, scoutId: login("sim-escotista-pioneiro-1"), name: "Vera Lacerda",
    ownedBy: null, notes: `dedicated Vera session for ${tag}`,
  })),
  { slug: "escoteiro-approved--m17", scoutId: login("approved"), name: "approved",
    ownedBy: null, notes: "dedicated member session for m17's propagation check" },
] as const;

/** Personas that need a captured storageState (everything in the manifest). */
export const LOGIN_PERSONAS: readonly ManifestEntry[] = MANIFEST;

export function authFile(slug: string): string {
  return `tests/.auth/${slug}.json`;
}

export function personaBySlug(slug: string): ManifestEntry {
  const p = MANIFEST.find((m) => m.slug === slug);
  if (!p) throw new Error(`persona not in manifest: ${slug}`);
  return p;
}
