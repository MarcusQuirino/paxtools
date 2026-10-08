import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { MANAGED_PROVIDER } from "./managedAccounts";
import { widenLegacyTestScoutId } from "./testAccounts";

/**
 * Re-key a 6-digit test persona to its 7-digit registro: the user's `scoutId`
 * and its `managed` authAccounts row, so the shared test password keeps
 * working. Real users and already-widened personas are left alone.
 */
export async function widenLegacyTestRegistro(
  ctx: Pick<MutationCtx, "db">,
  user: Doc<"users">,
): Promise<void> {
  const oldId = user.scoutId;
  const newId = oldId && widenLegacyTestScoutId(oldId);
  if (!oldId || !newId) return;
  const account = await ctx.db
    .query("authAccounts")
    .withIndex("providerAndAccountId", (q) =>
      q.eq("provider", MANAGED_PROVIDER).eq("providerAccountId", oldId),
    )
    .unique();
  if (account) await ctx.db.patch(account._id, { providerAccountId: newId });
  await ctx.db.patch(user._id, { scoutId: newId });
}
