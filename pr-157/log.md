# Verification log — pending-member-visibility (#107)

- Target: https://paxtools-m3mtyww1p-marcusquirinos-projects.vercel.app
- Commit verified: 4b7990433cf4a81914ae3f514a77cb9e117fbf6c
- Date: 2026-11-19T18:06:37.221Z
- Result: all passed (14 steps)

| # | Step | Persona | Result | Screenshots | Note |
|---|---|---|---|---|---|
| 1 | admin adds a seção on /settings | admin | ✅ pass | 01-admin-secao-added.png |  |
| 2 | admin (approved) server view: full grupo, seções, pending queue | admin | ✅ pass | 02-admin-api.png | listSections=1, pending queue=8 |
| 3 | pending escotista sees only the waiting screen | escotista-pending | ✅ pass | 03-pending-escotista-waiting.png |  |
| 4 | pending escotista server view: identity only, no seções/queue/admin | escotista-pending | ✅ pass | 04-pending-escotista-api.png |  |
| 5 | pending escotista sees only the waiting screen (mobile) | escotista-pending (mobile) | ✅ pass | 05-pending-escotista-waiting-mobile.png |  |
| 6 | pending escoteiro: own home still renders, server hides seções | escoteiro-pending | ✅ pass | 06-pending-escoteiro-home.png, 07-pending-escoteiro-api.png |  |
| 7 | approved escotista: painel renders, seções visible | escotista | ✅ pass | 08-escotista-painel.png, 09-escotista-api.png |  |
| 8 | approved escoteiro: home renders, seções visible | escoteiro-with-progression | ✅ pass | 10-escoteiro-home.png, 11-escoteiro-api.png |  |
| 9 | admin: Admin page lists members and the pending requests | admin | ✅ pass | 12-admin-members-pending.png |  |
| 10 | admin: Pendentes queue renders | admin | ✅ pass | 13-admin-pendentes.png |  |
| 11 | admin: Ajustes shows grupo + senha | admin | ✅ pass | 14-admin-settings.png |  |
| 12 | smoke: Histórico (timeline) | admin | ✅ pass | 15-smoke-timeline.png |  |
| 13 | smoke: Especialidades da tropa | admin | ✅ pass | 16-smoke-escotista-especialidades.png |  |
| 14 | smoke: escoteiro Plano + Especialidades | escoteiro-with-progression | ✅ pass | 17-smoke-plan.png, 18-smoke-especialidades.png |  |

## Console errors (0)

none
