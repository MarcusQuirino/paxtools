# Auto-removing completed items from the Plano

Ações, especialidades, and ações personalizadas that are completed/approved are **not** automatically removed from an escoteiro's plano. This is intentional, not an oversight.

## Why this is out of scope

Plan membership and completion state are deliberately separate concerns. The `plannedItems` table records only membership and ordering (`userId`, `ramo`, `itemKey`, `position`) — it has no status field. Completion lives in the conclusão tables and is joined in at read time. The only removal path is the escoteiro un-toggling the item themselves (`togglePlanned`); no approval mutation touches `plannedItems`.

The UI is built around retention rather than removal: completed items are marked done (strikethrough / faded / "• concluído"), locked against un-checking when approved, and sorted to the bottom of the linear view (`sortForLinearView`). The unit tests pin this contract explicitly — "moves approved-completed items to the bottom", "second toggle removes it".

Retention is the desired product behavior: the plano doubles as a record of what the escoteiro set out to do and accomplished, and silently deleting rows on approval would destroy that trail (and surprise users whose plan shrinks when an escotista approves something).

An "archive/hide concluded items" *view* toggle would be a compatible future enhancement — that would be a new issue, not a reversal of this decision.

## Prior requests

- #51 — "Ações realizadas permanecem no plano após aprovadas"
