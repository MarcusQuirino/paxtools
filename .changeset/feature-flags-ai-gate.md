---
"paxtools": minor
---

Runtime feature-flag system on Convex (`featureFlags` table + `isEnabled` query + internal `setFlag` mutation; missing row = off) and the AI activity suggestions feature is now gated behind the `ai_suggestions` flag — toggleable without a deploy via `bunx convex run featureFlags:setFlag '{"key":"ai_suggestions","enabled":true}'` or the dashboard. Also hardens the AI path: the regen cooldown is now claimed atomically in a mutation before the LLM call (concurrent generate clicks can no longer race into duplicate paid calls), the LLM call gets a `maxOutputTokens` ceiling, and the suggestion schema bounds string/array sizes before anything is persisted.
