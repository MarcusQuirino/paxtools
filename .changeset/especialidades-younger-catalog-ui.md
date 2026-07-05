---
"paxtools": minor
---

feat(especialidades): younger specialty catalog, item checklist & escotista approval (#42)

- Adds full younger-group (lobinho + escoteiro) specialty catalog: 168 specialties with 6 or 8 items each, organised by eixo, parsed from the official 2025 Brazilian scout guide (Guia de Especialidades e Insígnias).
- New `/especialidades` route: browse specialties by eixo, per-specialty collapsible checklist, level badges (0 / 1 / 2) derived from approved item count, progress bar per specialty.
- New `convex/specialties.ts`: `toggleSpecialtyItem`, `approveSpecialtyItem`, `rejectSpecialtyItem`, `approveSpecialtyItems`, `rejectSpecialtyItems`, `getMySpecialtyItems`, `getSpecialtyItemsForEscoteiro`, `getPendingSpecialtyItemsForGroup`.
- Escotista pending queue now shows pending specialty items grouped by specialty, with per-specialty approve/reject controls separate from the legacy bulk flow.
- Navigation updated: `PlanNav` adds an "Esp." tab linking to `/especialidades`.
