---
"paxtools": patch
---

Agent safeguards: test-persona password now comes only from `TEST_AUTH_PASSWORD` (no hardcoded fallback), test functions refuse to run on the prod Convex deployment, prod releases abort if test auth is set there, portable `.mcp.json`, `AGENTS.md`, and committed `.playwright-cli/` artifacts removed.
