---
"paxtools": minor
---

Staging seed now simulates all four ramos, not just escoteiro. `testing:seedSimulatedTroop` (now an action, split into one mutation per ramo) creates a cohort-shaped troop per ramo — lobinho 16, escoteiro 15, sênior 13, pioneiro 5 — with varied bloco/eixo coverage and rotated variable-ação choices so the stats page shows real gaps. Every feature surface gets data: especialidades (earned/in-progress/pending, younger items + older project reports), one IRR holder per ramo (+ one partial), pending conclusões, ações personalizadas, planos, synthetic events, ≥2 single-ramo escotistas per ramo, pending join requests (escoteiros + escotistas), and multi-ramo history scouts (sênior since lobinho; pioneiro with full lobinho→sênior record) to pin ramo-bleed protection. All sim personas get test auth accounts for future Playwright flows. The sim wipe now cascades through the new specialty tables and events.
