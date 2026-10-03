---
"paxtools": minor
---

feat(especialidades): escoteiro search + filter chips. The escoteiro's Especialidades tab gets a simpler version of the escotista catalog's filters: a search over names and item/suggestion text, and chips Todas · Minhas (already started) · one per eixo. Any active search/filter shows a flat list of matching cards with a count and an empty state; with none, the page keeps its eixo sections. State lives in the URL (`?q=`, `?f=`). Search box and chips are now shared components used by both pages.
