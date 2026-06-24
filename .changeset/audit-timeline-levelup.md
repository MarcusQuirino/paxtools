---
"paxtools": minor
---

Add an audit timeline tab for escotistas plus celebratory level-up toasts.

- New `events` table records what happens in a group: approvals, rejections, level-ups, Lis de Ouro, and membership/admin actions (joins, bans, ramo and access changes). Rejection paths now log-before-delete so denials leave a trail.
- New **Histórico** tab (`/escotista/timeline`) shows a paginated, newest-first feed. Progression events are scoped to each escotista's ramos; group/membership events are admin-only.
- Backend level-up detection: approving completions now recomputes an escoteiro's stage (Pista→Trilha→Rumo→Travessia) and Lis de Ouro before/after and surfaces a toast to the approving escotista — works from the pending queue and bulk approvals. Detection reuses the same block/stage logic as the client (relocated to a shared, backend-importable module).
