---
"paxtools": patch
---

Frontend cleanup: extract the route auth/onboarding guard into a shared `useAuthGate` hook, removing three near-identical copies.

`/`, `/plan`, and the `/escotista` layout each carried their own `useConvexAuth` + viewer query + redirect `useEffect` + "ready" skeleton condition. They now call `useAuthGate("escoteiro" | "escotista")`, which centralizes the redirect rules (`/signin` when unauthenticated, `/onboarding` when incomplete, the other role's home on role mismatch) and returns `{ ready, user }`. Behavior preserved — verified by the full e2e routing suite (13/13). Also removes the dead `allActionIds` value that `useProgression` computed and returned but nothing consumed.
