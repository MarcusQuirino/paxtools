import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

const TEST_AUTH_ENABLED = process.env.TEST_AUTH === "1";

// Env-gated test-only credentials provider. Wrapped behind TEST_AUTH=1 so
// production builds never register it. Only the `signIn` flow is allowed: the
// underlying Password provider's `signUp`/`reset` flows route through
// createAccount() WITHOUT consulting crypto.verifySecret, so leaving them open
// would let anyone mint a `@test.paxtools.local` session without the shared
// secret. We reject every non-signIn flow here (profile() runs for all flows),
// and the shared secret is verified in crypto.verifySecret on signIn.
const TestPassword = Password({
  id: "test-password",
  profile(params) {
    if (params.flow !== "signIn") {
      throw new Error("test-password provider only supports the signIn flow");
    }
    const email = params.email as string;
    if (!email || !email.endsWith("@test.paxtools.local")) {
      throw new Error("test-password provider only accepts @test.paxtools.local");
    }
    const name = email.split("@")[0] ?? email;
    return { email, name };
  },
  crypto: {
    // Identity hash — we never trust the stored secret; verifySecret is
    // the gate.
    async hashSecret(password: string) {
      return password;
    },
    async verifySecret(password: string, _hash: string) {
      const expected = process.env.TEST_AUTH_PASSWORD;
      if (!expected) return false;
      return password === expected;
    },
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: TEST_AUTH_ENABLED ? [Google, TestPassword] : [Google],
});
