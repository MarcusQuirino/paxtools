---
"paxtools": patch
---

review(groups): resolver as seções observáveis no servidor (#73)

- O seletor de seção observada agora vem de `getGroupStats`, pela mesma regra que `setObservedSection` aplica — o painel não repete mais a visibilidade de ramo no cliente
- Escolher uma seção que o servidor recusa mostra o motivo, em vez de o seletor voltar sozinho sem explicação
- CONTEXT.md: colocar um escoteiro numa seção é ação de admin (o verbete de seção ainda dizia escotista)
