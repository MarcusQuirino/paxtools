---
"paxtools": minor
---

feat(groups): a grupo now holds a list of seções (name + ramo) instead of one unit name per ramo (#72)

- Configurações' group management gained a "Seções" card where an admin escotista adds, renames and removes seções, choosing the ramo for each — two alcateias and no seção sênior are both expressible now
- Removing a seção that still has escoteiros in it is refused, in Portuguese, instead of silently unassigning them
- A migration converts every existing unit name into one seção of that ramo, so no grupo loses the names it had
