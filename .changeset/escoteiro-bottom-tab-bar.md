---
"paxtools": minor
---

feat(ui): escoteiro bottom tab bar + context header (redesign PR 1, "Design A — native-app brutalism")

- The top segmented Tudo / Plano / Esp. nav is replaced by a fixed bottom tab bar with four full-label tabs — Progressão, Plano, Especialidades, Perfil — icon over label, 52px targets, `aria-current` on the active tab, safe-area padding for the iOS home indicator (`viewport-fit=cover`)
- "Tudo" is renamed "Progressão" everywhere it named that tab (incl. the empty-plan hint)
- Page header drops the "PAXTOOLS" wordmark for a context eyebrow (ramo · grupo, e.g. "Ramo Escoteiro · 38/RS"), a 28px page title and an avatar that opens Perfil
- Perfil (/settings) is the escoteiro's fourth tab and gains a "Sair da conta" button, so sign-out stays reachable without the header avatar menu; the escotista settings page keeps its back button and menu
- The escotista's views of a scout (impersonation Dashboard, read-only especialidades) never show the escoteiro tab bar
- Calm brutalism: static containers (eixo sections, eixo summary cards, recognition, settings sections, especialidade detail panels, empty states) lose their hard shadow and keep the 2px border; interactive and hero elements keep theirs
