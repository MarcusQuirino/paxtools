---
status: accepted
---

# Older especialidade: unordered steps, binary grant, and bloco completion

An older especialidade (sênior/pioneiro) is a three-step project — conhecer, fazer, compartilhar. We are **dropping the sequential gate** between the steps: an escoteiro may write and submit the three reports in any order, an escotista approves each independently, and the especialidade is **earned only once all three are approved** (binary — there are no levels for older especialidades). Earning it now **completes any bloco that names it** as an alternative completion, closing a gap where older especialidades were tracked but never counted toward progression.

## Context

Shipped in #43, older especialidades enforced a strict order: `submitSpecialtyStep` rejected a step whose predecessor was not yet approved, and the UI locked later steps behind a "Bloqueado" badge. The intent was a guided narrative (know → do → share), but in QA it proved to be friction: a scout who had done all three activities still had to wait for each report to be individually approved before writing the next, serialising what is really three parallel pieces of writing.

Separately, `readEarnedSpecialtyBlocoIds` (`convex/lib/progression.ts`) hard-returned empty for any non-younger ramo group — so an older especialidade, even fully approved, never satisfied its bloco. Blocos like `autonomia-lideranca` in `senior.ts`/`pioneiro.ts` already list especialidades (e.g. "Empreendedorismo e Negócios", "Viagens") as `alternativeCompletions`, so the linkage data existed; only the read-side wiring was missing. Younger especialidades (#44) were already wired via `specialtyItemCompletions`.

## Decision

- **No ordering gate.** Remove the prerequisite check in `submitSpecialtyStep` and the `isLocked` logic + "Bloqueado" UI. The three steps are independent; conhecer → fazer → compartilhar remains only as display order.
- **Trickle, per-step approval.** Each report is its own `specialtyProjectReports` row and appears in the escotista's pending queue as soon as it is written. Approvals are independent and may arrive in any order; a step need not wait for the others to be written.
- **Binary grant = all three approved.** The specialty is earned the moment the third step reaches `approved`. Replace the `step === "compartilhar"` trigger for the level-up cascade with an "all three now approved" check, so the cascade fires on whichever approval completes the set. Older especialidades have no levels.
- **Bloco completion.** Teach `readEarnedSpecialtyBlocoIds` to build the earned-specialty set for older ramo groups from `specialtyProjectReports` (a specialty is earned when all three of its steps are `approved`), then feed the existing `getEarnedSpecialtyBlocoIds` machinery — the same path younger uses. It returns `specialtyIds` too, so the bloco card marks the exact especialidade. Every "earned" filter this touches compares `=== "approved"` explicitly.

## Considered options

- **Single specialty-level approval** (escotista approves the whole project in one action) instead of per-step approval. Rejected: the per-step pending queue already exists, and per-step approval lets an escotista bounce just the weak report rather than the whole project.
- **Batch gate** — allow approvals only once all three reports are written. Rejected: the grant condition ("all three approved") already guarantees all three were written, so the extra gate adds friction without changing the outcome.

## Consequences

- **Retroactive.** Bloco completion is derived on read, so any existing older escoteiro who already has all three steps approved (e.g. from #43 QA data) will have their bloco complete the moment this ships — no migration.
- **`completionStatus` stays `pending | approved`.** No `rejected` status is introduced; see the deferred decision below.
- The `!== "pending"` progression filters (`convex/lib/progression.ts`, `convex/lib/coverage.ts`) are untouched because they read `actionCompletions`/`specialtyItemCompletions`/`irrCompletions`, never `specialtyProjectReports`.

## Deferred: preserve text on rejection

We considered making a rejected project-step **keep its text** so the scout revises rather than rewrites from scratch — better UX, and the glossary already models a Conclusão as something that can be "rejected". **Deferred for now: rejection stays delete-based** (`rejectSpecialtyStep` deletes the row; the text is gone and the scout rewrites), consistent with every other completion type in the app.

The blocker is scope, not difficulty: preserving text needs a persistent "rejected" state, and the safe shape is a new `rejected` value on the **shared** `completionStatus` union written only to `specialtyProjectReports`. That is contained but non-trivial — many progression filters use `status !== "pending"` to mean "approved", so a persistent rejected row must never be read by them (today's plan keeps it out; a future change must re-audit). When revisited, decide whether preserve-text applies only to older project reports or becomes the app-wide rejection model.
