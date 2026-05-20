---
"paxtools": minor
---

feat: escoteiros can no longer uncheck or delete items already approved by an escotista. Backend mutations throw a clear error, and the UI disables the checkbox (and hides the trash icon for custom actions) so the action is unreachable. Escotistas viewing an escoteiro retain edit rights.
