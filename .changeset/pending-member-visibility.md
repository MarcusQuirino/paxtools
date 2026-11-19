---
"paxtools": patch
---

Membros aguardando aprovação não veem mais as seções do grupo nem ganham poderes de administrador: `getMyGroup` devolve só a identidade do grupo (nome, número, região) e `listSections` volta vazio até a aprovação. O criador do grupo que sai e volta pela senha também precisa ser aprovado antes de agir como admin.
