---
"paxtools": minor
---

Refactor progression data into per-ramo modules (lobinho, escoteiro, sênior, pioneiro) and add multi-ramo support. Action IDs now carry the ramo (`ramo:blocoId:type:index`), lookups resolve the correct ramo's eixos, and a migration converts legacy 3-part IDs. Includes a script to regenerate the data from the source spreadsheet.
