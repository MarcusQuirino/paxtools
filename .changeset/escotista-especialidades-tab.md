---
"paxtools": minor
---

Escotista Especialidades tab. The bottom bar is now Painel · Pendentes · Especialidades · Mais (Stats moved into Mais). New catalog (`/escotista/especialidades`) with Lobinhos e Escoteiros / Sêniores e Pioneiros, search over names and item text, eixo / "Com atividade na tropa" filters, and "Na tropa" signals; new consult detail (`/escotista/especialidades/$specialtyId`) with per-item "N têm" and a "Quem tem" list linking to each escoteiro's ficha. The per-escoteiro ficha (`/especialidades?escoteiroId=…`) is now actionable: tap marks/unmarks an item, pending items get Aprovar / Rejeitar, and older-ramo etapas can be approved/rejected or registered on the scout's behalf. Backend: `getGroupSpecialtySummary`, `getSpecialtyRoster`, `setSpecialtyItemApproved` (all scoped by visibilidade de ramo; reads also by seção observada); `submitSpecialtyStep` on-behalf now logs the approval, runs the level-up cascade and refuses to overwrite a scout's pending relato.
