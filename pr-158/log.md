# Verification log — auth-signin (pending-creator persona) + serverQuery harness

- Target: https://paxtools-8si12ef26-marcusquirinos-projects.vercel.app
- Commit verified: 2537b1320d1d352049e068d5719fc364b4bf64b1
- Date: 2026-11-19T19:32:24.205Z
- Result: all passed (6 steps)

| # | Step | Persona | Result | Screenshots | Note |
|---|---|---|---|---|---|
| 1 | pending grupo creator lands on the waiting screen | escotista-pending-creator | ✅ pass | 01-pending-creator-waiting.png |  |
| 2 | server gives the pending creator identity only, no admin powers | escotista-pending-creator | ✅ pass | 02-pending-creator-api.png |  |
| 3 | admin still signs in to the painel; server shows admin view | admin | ✅ pass | 03-admin-painel.png, 04-admin-api.png |  |
| 4 | existing pending escotista unchanged (waiting screen) | escotista-pending | ✅ pass | 05-escotista-pending-waiting.png |  |
| 5 | escoteiro home renders (auth-signin core path) | escoteiro-with-progression | ✅ pass | 06-escoteiro-home.png |  |
| 6 | adjacent: onboarding persona redirected to /onboarding (read only) | escoteiro-onboarding-incomplete | ✅ pass | 07-onboarding.png |  |

## Console errors (0)

none
