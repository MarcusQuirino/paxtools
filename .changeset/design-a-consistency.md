---
"paxtools": minor
---

Design A foundation: shared primitives (PageHeader, AppShell, TabBar, Section/Card/ListBox, ListRow, SearchInput, FilterChips, SegmentedControl, StatusPill, KpiTile, ProgressRing/Bar, EmptyState, ActionCheck, HardButton, PersonAvatar) and a single eixo colour source of truth (`src/data/eixo-colors.ts`) used by progression data and every especialidades screen. Escoteiro Especialidades tab redesigned: KPIs, search (name + item text with snippet, shared `filterCatalog`), eixo filter chips, "Em andamento" / "Conquistadas" / "Explorar por eixo", and a pushed detail screen for both item checklists and sênior/pioneiro etapas. Escotista layout header and bottom nav now use PageHeader/TabBar (no more "PAXTOOLS" wordmark); escotista catalog/detail/ficha refactored onto the primitives.
