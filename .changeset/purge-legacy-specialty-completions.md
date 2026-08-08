---
"paxtools": minor
---

chore(especialidades): purge the deprecated legacy `specialtyCompletions` system (#47)

- Removed `progression.toggleSpecialty`, its reads (`getMyCompletions`/`getCompletionsForUser` no longer return `specialties`), and its approval path (`approvals.approveSpecialty`/`rejectSpecialty`, the `specialtyIds` arm of `bulkAction`, and the legacy branch of `approveAllForEscoteiro`/`getPendingForGroup`)
- Bloco cards no longer offer a manual especialidade checkbox: an especialidade box is checked only when it is actually earned (level ≥ 1 younger, all three project steps older) and is read-only — marking happens on `/especialidades` via the "ver" link. Insígnias are listed without a box, since nothing tracks them
- New migration `migrations:dropLegacySpecialtyCompletions` drains the table: rows whose name still resolves to a catalog entry are converted first (`toggleSpecialty` stayed live after the 2026-07-05 conversion run, so an especialidade marked since then would otherwise be lost), the rest — insígnias and retired especialidades — are dropped. The table definition goes in a follow-up, once the drain has run everywhere
