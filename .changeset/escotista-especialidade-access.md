---
"paxtools": patch
---

Fix (#53): an escotista viewing an escoteiro's progression can now open a specialty detail ("ver") instead of being bounced to /escotista. The /especialidades route accepts an optional `escoteiroId` search param; when present it gates on the escotista role and renders that scout's especialidade data read-only via the visibility-checked `getSpecialtyItemsForEscoteiro` / `getSpecialtyReportsForEscoteiro` queries. The bloco "ver" link threads the target scout when rendered in the impersonation Dashboard. Escoteiro self-service is unchanged; an escoteiro or out-of-ramo escotista crafting the param gets no data (backend visibility rule).
