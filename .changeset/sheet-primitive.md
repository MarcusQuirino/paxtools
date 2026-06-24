---
"paxtools": minor
---

Add a bottom-anchored `Sheet` UI primitive (`src/components/ui/sheet.tsx`).

A reusable Radix-Dialog-based sheet anchored to the bottom of the viewport, modeled on the existing `Dialog` primitive. Exports `Sheet`, `SheetTrigger`, `SheetClose`, and `SheetContent`. `SheetContent` renders an overlay plus bottom-anchored content (`max-w-lg`, rounded top, slide-in/out-from-bottom animations) and includes an sr-only `DialogTitle` (default `"Mais opções"`) for accessibility. Radix supplies focus-trap, Esc-to-close, and overlay-tap-close. Not yet wired into any screen — consumed by the escotista bottom-navigation in a later task.
