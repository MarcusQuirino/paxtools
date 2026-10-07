import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { MANAGED_PROVIDER, normalizeScoutId } from "./lib/managedAccounts";

// Conta gerenciada (see CONTEXT.md): registro escoteiro + password, for members
// without a Google account. Accounts are only ever created by an escotista
// (convex/managedAccounts.ts), so every flow but signIn is rejected: Password's
// signUp/reset would mint or take over accounts. The registro travels in the
// provider's `email` param; it is only the account id and never lands on the
// user doc. Test personas sign in through this same provider
// (convex/lib/testAccounts.ts).
const Managed = Password({
  id: MANAGED_PROVIDER,
  profile(params) {
    if (params.flow !== "signIn") {
      throw new Error("Este acesso só permite entrar");
    }
    const raw = typeof params.email === "string" ? params.email : "";
    const scoutId = normalizeScoutId(raw);
    if (!scoutId) throw new Error("InvalidAccountId");
    return { email: scoutId };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, Managed],
  // The registro is sequential, so failed attempts per account are capped;
  // a reset by an escotista clears the counter.
  signIn: { maxFailedAttempsPerHour: 10 },
});
