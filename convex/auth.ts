import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

const TEST_AUTH_ENABLED = process.env.TEST_AUTH === "1";

// Env-gated test-only credentials provider. Wrapped behind TEST_AUTH=1 so
// production builds never register it. The single shared secret is checked
// inside crypto.verifySecret — the password stored on the authAccount row
// is irrelevant (seed writes a constant placeholder).
const TestPassword = Password({
  id: "test-password",
  profile(params) {
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
