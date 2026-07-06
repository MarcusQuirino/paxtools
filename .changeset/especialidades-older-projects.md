---
"paxtools": minor
---

feat(especialidades): older group — project catalog, sequential steps & escotista approval (#43)

- Add `src/data/specialty-data/older.ts` — full official older-group (sênior + pioneiro) catalog: 32 especialidades across the 4 eixos, each with `conhecerSuggestions` / `fazerSuggestions` / `compartilharSuggestions` (parsed from the 2025 Guia de Especialidades e Insígnias — Ramos Sênior e Pioneiro)
- Backend (`convex/specialties.ts`): `submitSpecialtyStep` (create/replace a `specialtyProjectReports` row as pending; server-enforced sequential lock — a step is rejected until its predecessor is approved), `approveSpecialtyStep` (compartilhar approval fires the level-up cascade), `rejectSpecialtyStep` (deletes the row so the escoteiro rewrites), `getMySpecialtyReports`, `getSpecialtyReportsForEscoteiro`
- `approvals:getPendingForGroup` now includes `pendingSpecialtyReports` and counts them in `totalPending`
- Route `/especialidades` renders the older project-step UI for sênior/pioneiro: browse by eixo, per-especialidade Conhecer → Fazer → Compartilhar cards with suggestions, report text areas, submit/resubmit, and sequential locking (Fazer locked until Conhecer approved; Compartilhar until Fazer approved); specialty shown as conquered when Compartilhar is approved
- Escotista pending queue renders one card per pending project step with the submitted text and approve/reject controls
- `ramoGroup` is `"older"` on all written records; sênior and pioneiro share one catalog and completions
- Tests: convex-test covers submit → pending, sequential lock (fazer before conhecer approved throws), approve → unlock next, full three-step approve → earned cascade, reject → row deleted + resubmit, resubmit replaces pending text, and approved-step overwrite protection
