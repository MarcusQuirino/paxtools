import { Migrations, type MigrationStatus } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import schema from "./schema";
import { drainLegacySpecialtyRow } from "./lib/legacySpecialty";

/**
 * Stateful migrations via @convex-dev/migrations.
 *
 * The component tracks per-deployment which migrations have run, so
 * `runPending` is safe to invoke on every deploy: completed migrations are
 * skipped, interrupted ones resume from their cursor, and pending ones run
 * in registry order.
 *
 * Lifecycle of a migration:
 * 1. Define it with `migrations.define` and APPEND it to `REGISTRY` (never
 *    reorder; never edit an entry that has run anywhere — fix mistakes with
 *    a new migration).
 * 2. Merge to master — the deploy-staging workflow runs it on staging.
 *    Verify the result there.
 * 3. Release — the deploy-prod workflow snapshots prod, then runs it there
 *    before the new frontend ships.
 *
 * Manual dry-run of a single migration:
 *   bunx convex run migrations:run '{"fn": "migrations:<name>", "dryRun": true}'
 */
export const migrations = new Migrations(components.migrations, { schema });

/** Generic one-off runner: bunx convex run migrations:run '{"fn": "migrations:<name>"}' */
export const run = migrations.runner();

/**
 * Drain the deprecated `specialtyCompletions` table (#47): convert what still
 * resolves to a catalog entry, delete every row either way.
 *
 * `migrations:migrateSpecialtyCompletions` (already run and verified on prod)
 * converted the rows that existed on 2026-07-05 and deliberately LEFT the
 * unresolvable ones in place: insígnias (e.g. "Insígnia do Aprender") and
 * retired especialidades ("Noções Desportivas"), which have no catalog id.
 * But `toggleSpecialty` stayed live through the whole additive-rollout window,
 * so rows written AFTER that run may still be convertible — hence the
 * convert-then-delete in `drainLegacySpecialtyRow`, which reuses the original
 * migration's rules and is idempotent.
 *
 * Decision (#47): insígnias are out of scope for the especialidades catalog by
 * design — there is no insígnias mechanism to migrate them into, and no code
 * reads them anymore (the legacy path was purged in this same change), so they
 * are dropped rather than carried. Losing them is accepted and recorded here:
 * prod holds 1 such row, dev 6. "Diálogo Inter-religioso" is catalogued as an
 * insígnia (`type: "insignia"` in every ramo's progression data), so it has no
 * especialidade id either and is an insígnia-class leftover too.
 *
 * The table DEFINITION stays in `schema.ts` for one more release: Convex
 * rejects a push that removes a table still holding documents, so the drop can
 * only land after this migration has run everywhere.
 */
export const dropLegacySpecialtyCompletions = migrations.define({
  table: "specialtyCompletions",
  migrateOne: async (ctx, doc) => {
    await drainLegacySpecialtyRow(ctx, doc);
  },
});

/**
 * Append-only, ordered registry of every migration that must run before a
 * release's frontend goes live. The pre-component migrations (legacy
 * action-id prefixing, Lis de Ouro→IRR copy, ramo backfills, specialty
 * conversion — see git history before this file was rewritten) already ran
 * on prod and dev and are intentionally absent.
 */
const REGISTRY: Parameters<typeof migrations.runSerially>[1] = [
  internal.migrations.dropLegacySpecialtyCompletions,
];

/** Run every registered migration in order. Invoked by the deploy workflows. */
export const runPending = internalMutation({
  args: {},
  handler: async (ctx) => {
    await migrations.runSerially(ctx, REGISTRY);
  },
});

/** Status of registered migrations; polled by scripts/wait-for-migrations.ts. */
export const status = internalQuery({
  args: {},
  handler: async (ctx): Promise<MigrationStatus[]> => {
    return await migrations.getStatus(ctx, { migrations: REGISTRY });
  },
});
