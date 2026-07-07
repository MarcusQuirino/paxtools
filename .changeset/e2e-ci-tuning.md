---
"paxtools": patch
---

E2E: cap workers at 4 on CI runners and relax the staging expect timeout to 15s — 8 workers oversubscribed GitHub's 2-core runners enough to blow hydration timeouts in the mobile readonly project.
