---
"paxtools": patch
---

Each PR now gets an isolated Convex preview backend (Vercel preview builds deploy the branch's functions and seed test personas), and the full Playwright suite runs on every PR against it as a required merge gate. Fix: opening Perfil/Ajustes or onboarding directly no longer bounces signed-in users through /signin while auth is still loading. E2E flake fixes: per-test sessions (no refresh-token reuse revocations), force-clicks no longer land on the fixed bottom nav, sign-in capture retries stalled handshakes.
