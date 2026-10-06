---
"paxtools": patch
---

Every approval and rejection — ações, ações personalizadas, IRR items, especialidade items and etapas — now goes through one review module that owns access checks, the level-up cascade and the audit line. Especialidade reviews now get readable timeline lines ("Aprovou: Administração — item 3") instead of raw ids, and the escoteiro's own especialidade writes are validated against the catalog. Removed unused mutations (approveAllForEscoteiro, approveSpecialtyItem) and the dead escotista branch of toggleSpecialtyItem.
