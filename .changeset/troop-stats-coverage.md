---
"paxtools": minor
---

Add the escotista Stats page (/escotista/stats): per-eixo coverage bars, stage
distribution, most-done activities, a gap engine (fixed gaps + neglected
variables), and a per-scout acompanhamento list. Backed by a shared, PII-free
coverage contract (convex/lib/coverage.ts#computeRamoCoverage) and the
convex/stats.ts getRamoCoverage / getRamoScouts queries with ramo-scoped authz
(admins get a ramo switcher). No cross-ramo aggregation.
