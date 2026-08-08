---
"paxtools": minor
---

feat(groups): o escotista escolhe a seção observada e a lista de jovens filtra por ela (#73)

- Em Admin, cada escoteiro pode ser colocado em uma seção do próprio ramo; seções de outro ramo são recusadas, e trocar o ramo tira o escoteiro da seção antiga
- No painel, um seletor escolhe a seção observada ao lado da identidade do grupo ("38/RS"); a escolha fica salva e sobrevive ao recarregar
- A lista de jovens (e as contagens que saem dela) mostra só a seção observada; um escoteiro ainda sem seção continua aparecendo, marcado com "sem seção", para não sumir de vista
