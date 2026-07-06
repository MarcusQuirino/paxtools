import { Migrations, type MigrationStatus } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import schema from "./schema";

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
 * Append-only, ordered registry of every migration that must run before a
 * release's frontend goes live. The pre-component migrations (legacy
 * action-id prefixing, Lis de Ouro→IRR copy, ramo backfills, specialty
 * conversion — see git history before this file was rewritten) already ran
 * on prod and dev and are intentionally absent.
 */
const REGISTRY: Parameters<typeof migrations.runSerially>[1] = [
  // internal.migrations.<name>,
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
