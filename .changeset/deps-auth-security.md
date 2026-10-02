---
"paxtools": patch
---

fix(deps): upgrade `@auth/core` 0.37 → 0.41.3 and `@convex-dev/auth` 0.0.91 → 0.0.95

- Fixes GHSA-7rqj-j65f-68wh (critical: email normalizer homoglyph `@` bypass), GHSA-xmf8-cvqr-rfgj (high: `getToken()` crash on malformed Bearer header) and GHSA-x445-f3h2-j279 (moderate: OAuth state/nonce/PKCE cookies not bound to provider)
- `@convex-dev/auth` 0.0.95 is the release that peers on `@auth/core` ^0.41; also stops failed OTP sign-ins from consuming the code
