---
"paxtools": patch
---

fix(ui): action rows highlight with their own eixo colour instead of the global green accent (#54)

- Hover/active on progression rows is now a translucent overlay of the row's own eixo colour (12% hover, 22% active) via the new `rowTint` helper, so a pink or navy bloco no longer flashes the theme's green `--accent`
- Applied to fixed/variable action rows, custom-action rows (which previously had no hover feedback at all) and IRR recognition items
- Locked and disabled rows still get no tint; checked/pending visuals are unchanged
