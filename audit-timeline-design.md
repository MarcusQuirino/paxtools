# Design: Audit Timeline + Level-up Toast

Outcome of a `/grill-me` design interview. These are the *decisions*, not an
implementation plan. Two features sharing one substrate.

## Locked decisions

### A. Audit timeline (escotista-only tab)
- New tab under `/escotista` (e.g. `/escotista/timeline`), guarded by `useAuthGate("escotista")` and a NavTab in `src/routes/escotista/route.tsx`.
- **One `events` table.** Level-up is just one event *type* in it.
- **Event types logged:** `approval`, `rejection`, `levelUp`, `lisDeOuro`, `memberJoin`, `memberBan`, `ramoChange`, `accessChange`. (Marks and plan edits are NOT logged.)
- **Paginated** via Convex `.paginate` / `usePaginatedQuery` — *net-new; no pagination exists in the app today.*
- **Scoping:**
  - Ramo-scoped events (`approval`, `rejection`, `levelUp`, `lisDeOuro`) carry the subject escoteiro's `ramo`. Non-admin escotista sees only their `escotistaRamos`; admin sees all.
  - Group-level events (`memberJoin`, `memberBan`, `ramoChange`, `accessChange`) are **admin-only**.
- **Index:** denormalize `{ groupId, ramo }` onto each event; compound index `[groupId, ramo, _creationTime]`. Admin paginates by group; non-admin paginates per-ramo (merge their ramos). Group-level events get an admin-only marker.

### B. Level-up toast (escotista-only)
- **No escoteiro-facing modal.** Escoteiro relies on the existing progress bar. (The original "next login / never again" requirement was cut.)
- **Backend detection.** At approval time, recompute the escoteiro's stage before vs after; if it advanced, the mutation **returns** the level-up(s) in its result, and the escotista's client shows a shadcn **toast** — *net-new; no toast component is installed (add sonner or build one).*
- **Rule: literal — log + toast on every upward threshold crossing.** No high-water-mark, no persisted "seen" state. Reject→re-approve re-fires by design (truthful record of churn).
- **Lis de Ouro is a distinct capstone event** (`lisDeOuro`), detected via `isLisDeOuroComplete` (independent of the 4 stages), earned through `approveLisDeOuroItem`. It fires its own toast + timeline entry, visually distinct from a normal stage level-up.
- Works from the pending queue and bulk approvals precisely because detection is server-side and returned in the mutation payload (the client has no progression context there).

## Required backend work (the real cost)
1. **Relocate stage computation to be reachable from `convex/`.** `src/lib/completion-logic.ts` + `src/data/progression-rules.ts` (`STAGES`) + static `src/data/progression-data` (`eixos`, per-ramo) currently power client-only stage derivation. A level-up at approval time needs that logic in a shared module both `src/` and `convex/` import. Duplication = drift risk.
2. **Emit events at every mutation site** (miss one → silent gap in audit + toast):
   - Approvals: `approveAction`, `approveSpecialty`, `approveLisDeOuroItem`, `approveCustomAction`, `bulkAction`, `approveAllForEscoteiro`, **and** the escotista-approve branch in `progression.toggleAction`.
   - Rejections: **log-before-delete**, **keyed on actor** — `approvals.rejectPendingCompletion` (hard delete at `approvals.ts:56`) is an escotista denying → log a `rejection`. The un-toggle delete in `progression.toggleAction` (`progression.ts:185`) is *also* hit by an escoteiro un-marking their **own** pending item — that is NOT a rejection and is out of scope. Log a `rejection` only when the actor is an escotista denying someone else's item.
   - Membership/admin: `memberJoin`, `memberBan`, `ramoChange`, `accessChange` in `groups.ts` / admin mutations.
3. **Level-up detection per approve path:** load the escoteiro's approved completions (4 tables), compute stage before/after; for bulk, compute **once** (initial vs final). Emit one `levelUp` event per stage boundary crossed; return them for the toast. Detection also evaluates `isLisDeOuroComplete` before/after — on a false→true transition, emit a distinct `lisDeOuro` event/toast.

## Open / assumed (lower-stakes — flag if wrong)
- **Bulk crossing multiple stages:** emit one `levelUp` per boundary crossed; toast summarizes (e.g. "João → Trilha → Rumo"). *Assumed.*
- **Concurrency:** two escotistas approving the same escoteiro could double-count a crossing under the literal rule. Accepted, or add a per-event idempotency key. *Open, low-stakes.*
- **Per-approval cost:** each approve reloads all of the escoteiro's approved completions and recomputes blocks. Fine at current scale (existing `.take` caps ~500–1000). Revisit if completion sets grow large.
- **Retention:** `events` grows unbounded (approvals are frequent). No TTL planned; pagination keeps reads cheap regardless. Flag if volume bites.
- **No backfill needed** (literal rule, no escoteiro modal): timeline starts empty and accrues forward.

## Testing
- **convex-test:** event emission on each approve/reject/membership path; level-up detection exactly at stage boundaries; ramo-scoping of the paginated query (admin vs non-admin vs cross-ramo isolation).
- **Playwright:** timeline tab visible to escotista, hidden from escoteiro; pagination loads more; an approval that crosses a stage shows the toast.

## Net-new primitives (none exist today)
- Convex pagination (`.paginate` / `usePaginatedQuery`).
- Toast component (add sonner).
- `events` table + compound index.
- Shared block/stage module importable from `convex/`.
