# Contribuindo para o Paxtools

Obrigado pelo interesse em contribuir! Este projeto ajuda escoteiros brasileiros a rastrear sua progressao pessoal. Toda contribuicao e bem-vinda.

## Como contribuir

### Reportar bugs

Abra uma [issue](../../issues) descrevendo:
- O que voce esperava que acontecesse
- O que realmente aconteceu
- Passos para reproduzir
- Capturas de tela (se aplicavel)
- Dispositivo e navegador usados

### Sugerir melhorias

Abra uma [issue](../../issues) com a tag `enhancement` descrevendo:
- O problema ou necessidade
- Sua proposta de solucao
- Alternativas consideradas

### Enviar codigo

1. **Fork** o repositorio
2. Crie uma **branch** para sua alteracao:
   ```bash
   git checkout -b minha-alteracao
   ```
3. Faca suas alteracoes seguindo as convencoes do projeto
4. Teste localmente com `bun dev`
5. Verifique se o build passa com `bun run build`
6. **Commit** suas alteracoes com uma mensagem clara:
   ```bash
   git commit -m "Adiciona funcionalidade X"
   ```
7. **Push** para sua branch:
   ```bash
   git push origin minha-alteracao
   ```
8. Abra um **Pull Request**

## Configuracao do ambiente de desenvolvimento

### Pre-requisitos

- [Bun](https://bun.sh) (v1.0+)
- [Node.js](https://nodejs.org) (v22.12+)
- Conta no [Convex](https://convex.dev)

### Instalacao

```bash
# Clone o repositorio
git clone https://github.com/SEU_USUARIO/paxtools.git
cd paxtools

# Instale dependencias
bun install

# Configure o Convex (cria o arquivo .env.local)
bunx convex dev --once

# Inicie o servidor de desenvolvimento
bun dev
```

### Configurando autenticacao Google OAuth

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com)
2. Ative a API Google OAuth 2.0
3. Crie credenciais OAuth 2.0 (tipo Web Application)
4. Configure as credenciais no dashboard do Convex seguindo a [documentacao do Convex Auth](https://labs.convex.dev/auth)

## Convencoes do projeto

### Codigo

- **Runtime**: Use Bun (nao Node.js) para executar scripts e instalar pacotes
- **Linguagem**: TypeScript strict
- **Estilizacao**: Tailwind CSS v4 com classes utilitarias
- **Componentes UI**: shadcn/ui — instale novos componentes com `bunx shadcn@latest add <componente>`
- **Backend**: Convex — sempre adicione validators nos args das funcoes
- **Idioma do codigo**: Variaveis e funcoes em ingles, textos do usuario em portugues brasileiro

### Estrutura de dados

- Dados estaticos da progressao ficam em `src/data/` (nao no banco de dados)
- Progresso do usuario fica no Convex (tabelas `actionCompletions`, `specialtyCompletions`, `customActions`)
- Logica de conclusao fica em `src/lib/completion-logic.ts` como funcoes puras

### Commits

- Use mensagens descritivas em portugues ou ingles
- Prefira mensagens que explicam o "porque" e nao o "o que"
- Exemplos:
  - `Corrige calculo de conclusao quando especialidade e conquistada`
  - `Adiciona suporte a modalidade do mar nos blocos`

### Pull Requests

- Descreva o que muda e por que
- Inclua capturas de tela para mudancas visuais
- Certifique-se de que `bun run build` passa sem erros
- PRs menores e focados sao preferidos

## Areas que precisam de ajuda

- Testes automatizados (unitarios e de integracao)
- Suporte a modalidades (Mar e Ar)
- PWA / modo offline
- Internacionalizacao (i18n) para outros idiomas
- Acessibilidade (a11y)
- Temas claro/escuro
- Exportacao de progresso em PDF
- Dashboard para escotistas (lideres)

## Codigo de conduta

Seja respeitoso e inclusivo. Este projeto segue a Lei Escoteira — trate todos com a mesma cortesia e respeito que voce gostaria de receber. Nao sera tolerado assedio, discriminacao ou comportamento desrespeitoso de qualquer tipo.
