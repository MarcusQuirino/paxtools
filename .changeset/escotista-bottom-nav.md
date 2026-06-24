---
"paxtools": minor
---

Escotista navigation: replace the cramped top tab strip with a mobile-native fixed bottom bar (Painel, Pendentes, Mais). "Mais" opens an accessible bottom sheet listing Histórico, Ajustes, and Admin (admin-only). Adds a reusable bottom-anchored `Sheet` UI primitive (`src/components/ui/sheet.tsx`). Leaves a documented insertion point for a future Stats tab. Pure nav restructure — no behavior change to destinations.
