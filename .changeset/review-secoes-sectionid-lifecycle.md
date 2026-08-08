---
"paxtools": patch
---

review(groups): tidy up the seções slice (#72)

- `users.sectionId` is now dropped whenever a member leaves the grupo (sair, banir, recusar entrada, entrar em outro grupo) and when they stop being an escoteiro, so a seção pointer can no longer follow someone into another grupo or come back to block `removeSection` if they rejoin
- Removing a seção clears any leftover pointer at it before deleting the row, instead of leaving a reference to a row that no longer exists
- Removing a seção now asks for confirmation, like the grupo's other destructive admin actions
- The seção list is read with a bounded query, and the 60-character name limit has a single definition shared by the server and the form
