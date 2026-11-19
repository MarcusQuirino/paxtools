# Verification log — not-found (+ core-smoke via src/router.tsx)

- Target: https://paxtools-jphr0957y-marcusquirinos-projects.vercel.app
- Commit verified: b1b5c5d9138af940d7f19ec153e50d44babc9a23
- Date: 2026-11-19T15:08:05.976Z
- Result: all passed (17 steps)

| # | Step | Persona | Result | Screenshots | Note |
|---|---|---|---|---|---|
| 1 | BEFORE (staging, master build): unknown URL shows bare English 'Not Found' | signed out | ✅ pass | 01-before-staging-not-found.png | staging alias, signed out, no writes |
| 2 | signed out: /nao-existe → pt-BR 404 → "Voltar ao início" → /signin (desktop) | signed out | ✅ pass | 02-after-404-signed-out-desktop.png, 03-after-404-link-signin-desktop.png |  |
| 3 | signed out: /nao-existe → pt-BR 404 → "Voltar ao início" → /signin (mobile) | signed out | ✅ pass | 04-after-404-signed-out-mobile.png, 05-after-404-link-signin-mobile.png |  |
| 4 | escoteiro: /pagina/que/nao/existe → 404 → link → Progressão home | escoteiro-with-progression | ✅ pass | 06-after-404-escoteiro.png, 07-after-404-escoteiro-home.png |  |
| 5 | escoteiro under /escotista/*: role guard sends home (no 404) — unchanged behaviour | escoteiro-with-progression | ✅ pass |  |  |
| 6 | admin (mobile): /escotista/nao-existe → 404 → link → painel | admin | ✅ pass | 08-after-404-admin-mobile.png, 09-after-404-admin-painel.png |  |
| 7 | escoteiro-progression: home renders blocos/eixos | escoteiro-with-progression | ✅ pass |  |  |
| 8 | plan: /plan renders Por Área + starred bloco | escoteiro-with-progression | ✅ pass | 10-smoke-plan.png |  |
| 9 | especialidades: catalog + search box | escoteiro-with-progression | ✅ pass |  |  |
| 10 | revisao-rapida: deck opens | escoteiro-with-progression | ✅ pass |  |  |
| 11 | escotista-painel: lists escoteiros | admin | ✅ pass |  |  |
| 12 | approvals-queue: /escotista/pending shows pending count | admin | ✅ pass | 11-smoke-pending.png |  |
| 13 | timeline: Histórico renders events | admin | ✅ pass |  |  |
| 14 | settings/secoes: Ajustes shows Gerenciar grupo | admin | ✅ pass |  |  |
| 15 | auth-signin guard: pending escotista parked on 'Aguardando aprovação' | escotista-pending | ✅ pass | 12-smoke-pending-escotista-parked.png |  |
| 16 | auth-signin guard: pending escoteiro reaches own dashboard (not parked) | escoteiro-pending | ✅ pass |  |  |
| 17 | onboarding: incomplete user lands on /onboarding | escoteiro-onboarding-incomplete | ✅ pass |  |  |

## Console errors (3)

- [escoteiro-with-progression] Failed to load resource: the server responded with a status of 404 ()
- [escoteiro-with-progression] Failed to load resource: the server responded with a status of 404 ()
- [admin] Failed to load resource: the server responded with a status of 404 ()
