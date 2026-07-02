---
"paxtools": minor
---

AI activity suggestions (beta) on the troop-stats page: an on-demand helper that, given a ramo's coverage, proposes one game/dynamic idea per development area (eixo) grounded in that area's most under-covered activities, plus a short plain-language overview — cached per group+ramo. Built on a Convex `"use node"` action calling Claude Sonnet via the AI SDK; the model is fed only PII-free coverage + activity texts (no scout names). Requires the `ANTHROPIC_API_KEY` Convex env var to be set on the deployment; until then the card surfaces a clear "not configured" message.
