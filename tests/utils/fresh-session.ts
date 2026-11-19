/**
 * A brand-new, independent Convex Auth session per test.
 *
 * Why: the Convex client rotates the refresh token on EVERY page load
 * (`initialAuthTokenReuse` defaults to false). When many contexts boot from
 * one shared storageState file, one context's second rotation makes another
 * context's replay of the original token a reuse outside Convex Auth's 10s
 * window — the server then revokes the whole session and every context of
 * that persona bounces to /signin mid-test. Intermittent, load-dependent.
 *
 * So each fixture-backed test signs the persona in through the same
 * `managed` provider the /signin form uses (auth:signIn, password flow) and
 * gets its own session. The captured storageState from global setup supplies
 * the origin and storage keys, and its JWT's `iss` (the deployment's
 * .convex.site URL) tells us which deployment to call — no extra config per
 * target. Global setup still captures through the real form, so the UI login
 * path stays covered.
 */

import { readFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { authFile, personaBySlug } from "./personas";
import { TEST_PASSWORD } from "./signin";

type StorageState = {
  cookies: never[];
  origins: { origin: string; localStorage: { name: string; value: string }[] }[];
};

const JWT_PREFIX = "__convexAuthJWT_";
const REFRESH_PREFIX = "__convexAuthRefreshToken_";

function convexUrlFromJwt(jwt: string): string {
  const payload = JSON.parse(
    Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8"),
  ) as { iss?: string };
  if (!payload.iss) throw new Error("captured JWT has no iss");
  const url = new URL(payload.iss);
  url.hostname = url.hostname.replace(/\.convex\.site$/, ".convex.cloud");
  return url.origin;
}

export async function freshStorageState(slug: string): Promise<StorageState> {
  const captured = JSON.parse(readFileSync(authFile(slug), "utf8")) as StorageState;
  const origin = captured.origins[0];
  const jwtEntry = origin?.localStorage.find((e) => e.name.startsWith(JWT_PREFIX));
  if (!origin || !jwtEntry) {
    throw new Error(`no captured session for ${slug} — run global setup`);
  }
  const namespace = jwtEntry.name.slice(JWT_PREFIX.length);
  const client = new ConvexHttpClient(convexUrlFromJwt(jwtEntry.value));
  const res = (await client.action(api.auth.signIn, {
    provider: "managed",
    params: {
      email: personaBySlug(slug).scoutId,
      password: TEST_PASSWORD,
      flow: "signIn",
    },
  })) as { tokens?: { token: string; refreshToken: string } | null };
  if (!res.tokens) throw new Error(`fresh sign-in failed for ${slug}`);
  return {
    cookies: [],
    origins: [
      {
        origin: origin.origin,
        localStorage: [
          { name: JWT_PREFIX + namespace, value: res.tokens.token },
          { name: REFRESH_PREFIX + namespace, value: res.tokens.refreshToken },
        ],
      },
    ],
  };
}
