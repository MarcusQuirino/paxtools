---
"paxtools": patch
---

fix(copy): ramo-specific empty state on stats page and correct Portuguese pluralization of "item" in especialidades (#49)

- Stats empty state now shows the ramo's member noun (lobinho/escoteiro/sênior/pioneiro) instead of always "escoteiro"
- Especialidade progress line uses whole-word forms: "item aprovado" (exactly 1) / "itens aprovados" (otherwise), eliminating the non-word "itemns"
- Updated Playwright assertions in r4, m07, m18, m19 specs to match the corrected text
