---
"paxtools": patch
---

Import the design system into Claude Design, and make the diacritics regex encoding-safe.

`toSpecialtySlug` stripped combining marks with a regex written using literal
`U+0300–U+036F` characters. esbuild ASCII-escapes output everywhere except inside
regex literals, so those raw bytes survived into bundled output — and any consumer
serving that JS without `charset=utf-8` fails to parse the entire file. Rewritten
with `\u` escapes; behaviour is byte-identical.

Also adds the `.design-sync/` sync inputs (config, bundle entry, preview sources,
conventions header) and excludes sync scaffolding from oxlint.
