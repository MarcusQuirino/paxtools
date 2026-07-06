# Paxtools - Progressao Pessoal Escoteira

Aplicativo web mobile-first para escoteiros brasileiros do Ramo Escoteiro rastrearem sua Progressao Pessoal rumo ao reconhecimento **Lis de Ouro**, seguindo o manual oficial de progressao dos Escoteiros do Brasil.

## Sobre o sistema de progressao

O sistema possui **4 etapas** de progressao:

| Etapa | Blocos necessarios | Acumulado |
|-------|-------------------|-----------|
| **Pista** | Inicio | 0 |
| **Trilha** | 4 blocos | 4 |
| **Rumo** | +4 blocos | 8 |
| **Travessia** | +5 blocos | 13 |
| **Lis de Ouro** | +5 blocos | 18 (todos) |

Os 18 blocos de aprendizagem estao organizados em **4 eixos de desenvolvimento**:

### Habilidades para a Vida (4 blocos)
- Aprendizagem Continua e Desenvolvimento Vocacional
- Autonomia e Lideranca
- Criatividade e Inovacao
- Inteligencia Emocional

### Meio Ambiente (4 blocos)
- Consumo Responsavel
- Mudancas Climaticas
- Preservacao da Biodiversidade
- Vida ao Ar Livre

### Paz e Desenvolvimento (5 blocos)
- Comunidade
- Democracia
- Heranca Cultural
- Promocao da Paz
- Valores

### Saude e Bem-estar (5 blocos)
- Cuidado com o Corpo
- Espiritualidade
- Habitos Saudaveis
- Saude Mental
- Vinculos Saudaveis

### Regras de conclusao de bloco

Cada bloco contem:
- **Acoes Fixas**: atividades obrigatorias (todas devem ser concluidas)
- **Acoes Variaveis**: atividades opcionais (o escoteiro escolhe um numero minimo da lista)
- **Acoes Personalizadas**: o escoteiro pode criar suas proprias acoes variaveis
- **Alternativas (Especialidades/Insignias)**: conquistar uma especialidade ou insignia relacionada substitui todas as acoes variaveis do bloco

Um bloco e considerado completo quando:
1. Todas as acoes fixas estao concluidas, **E**
2. O numero minimo de acoes variaveis foi cumprido **OU** uma especialidade/insignia alternativa foi conquistada

## Stack tecnologica

| Camada | Tecnologia |
|--------|-----------|
| Runtime | [Bun](https://bun.sh) |
| Frontend | [React 19](https://react.dev) |
| Roteamento | [TanStack Router](https://tanstack.com/router) + [TanStack Start](https://tanstack.com/start) |
| Backend | [Convex](https://convex.dev) (serverless, real-time) |
| Autenticacao | [Convex Auth](https://labs.convex.dev/auth) com Google OAuth |
| UI Components | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://www.radix-ui.com) |
| Estilizacao | [Tailwind CSS v4](https://tailwindcss.com) |
| Icones | [Lucide React](https://lucide.dev) |
| State Management | [TanStack Query](https://tanstack.com/query) + Convex real-time |
| Build | [Vite 8](https://vite.dev) |

## Estrutura do projeto

```
paxtools/
├── convex/                         # Backend Convex
│   ├── schema.ts                   # Schema do banco de dados
│   ├── auth.ts                     # Configuracao de autenticacao
│   ├── auth.config.ts              # Config JWT
│   ├── http.ts                     # Rotas HTTP (auth callbacks)
│   ├── users.ts                    # Query do usuario autenticado
│   ├── progression.ts              # Queries e mutations de progressao
│   └── _generated/                 # Tipos e API gerados automaticamente
│
├── src/
│   ├── data/                       # Dados estaticos da progressao
│   │   ├── types.ts                # Tipos TypeScript (Eixo, Bloco, Action, etc.)
│   │   ├── progression-rules.ts    # Constantes de etapas e limiares
│   │   └── progression-data.ts     # Todos os 18 blocos com atividades do PDF
│   │
│   ├── lib/
│   │   ├── utils.ts                # Utilitario cn() para Tailwind
│   │   └── completion-logic.ts     # Logica pura de conclusao de blocos
│   │
│   ├── hooks/
│   │   └── use-progression.ts      # Hook customizado com estado derivado
│   │
│   ├── components/
│   │   ├── auth/                   # Componentes de autenticacao
│   │   │   ├── auth-button.tsx     # Botao login/logout condicional
│   │   │   ├── sign-in.tsx         # Botao Google Sign-In
│   │   │   └── user-menu.tsx       # Menu do usuario com avatar e sign-out
│   │   │
│   │   ├── ui/                     # Componentes shadcn/ui
│   │   │   ├── accordion.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── progress.tsx        # Com prop indicatorColor customizada
│   │   │   ├── select.tsx
│   │   │   └── textarea.tsx
│   │   │
│   │   └── progression/            # Componentes da progressao
│   │       ├── stage-banner.tsx     # Banner da etapa atual + progresso Lis de Ouro
│   │       ├── overall-progress.tsx # Grid 2x2 com progresso por eixo
│   │       ├── eixo-section.tsx     # Secao de um eixo com accordion de blocos
│   │       ├── bloco-card.tsx       # Card de bloco com progresso e checklist
│   │       ├── action-checklist.tsx # Lista de acoes fixas e variaveis
│   │       ├── action-item.tsx      # Item individual com checkbox
│   │       ├── custom-action-input.tsx # Input para acoes personalizadas
│   │       └── specialty-section.tsx   # Secao de especialidades alternativas
│   │
│   ├── routes/
│   │   ├── __root.tsx              # Layout raiz (HTML, head, body)
│   │   └── index.tsx               # Dashboard principal (pagina unica)
│   │
│   ├── router.tsx                  # Setup do router com Convex + React Query
│   ├── entry-client.tsx            # Hidratacao no cliente
│   ├── entry-server.tsx            # SSR no servidor
│   └── ssr.tsx                     # Utilitarios SSR
│
├── styles/
│   └── globals.css                 # Tailwind CSS + variaveis de tema
│
├── vite.config.ts                  # Configuracao Vite + plugins
├── tsconfig.json                   # TypeScript config
├── components.json                 # Configuracao shadcn/ui
├── package.json
└── CLAUDE.md                       # Instrucoes para o Claude Code
```

## Schema do banco de dados (Convex)

### `users`
Tabela de usuarios gerenciada pelo Convex Auth.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| name | string? | Nome do usuario |
| email | string? | Email |
| image | string? | URL do avatar |

### `actionCompletions`
Cada linha representa uma acao concluida por um usuario.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| userId | Id\<users\> | Referencia ao usuario |
| actionId | string | ID composto da acao (ex: `"vida-ao-ar-livre:fixed:0"`) |
| completedAt | number | Timestamp da conclusao |

Indices: `by_userId`, `by_userId_and_actionId`

### `specialtyCompletions`
Especialidades ou insignias conquistadas que substituem acoes variaveis.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| userId | Id\<users\> | Referencia ao usuario |
| blocoId | string | ID do bloco (ex: `"comunidade"`) |
| specialtyName | string | Nome da especialidade/insignia |
| completedAt | number | Timestamp |

Indices: `by_userId`, `by_userId_and_blocoId`

### `customActions`
Acoes personalizadas criadas pelo usuario.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| userId | Id\<users\> | Referencia ao usuario |
| blocoId | string | ID do bloco |
| text | string | Texto da acao |
| completed | boolean | Se foi concluida |
| createdAt | number | Timestamp de criacao |

Indices: `by_userId`, `by_userId_and_blocoId`

## API do backend (Convex functions)

### Queries
| Funcao | Descricao |
|--------|-----------|
| `progression.getMyCompletions` | Retorna todas as conclusoes (acoes, especialidades, acoes customizadas) do usuario autenticado |
| `users.viewer` | Retorna o perfil do usuario autenticado |

### Mutations
| Funcao | Args | Descricao |
|--------|------|-----------|
| `progression.toggleAction` | `actionId: string` | Marca/desmarca uma acao |
| `progression.toggleSpecialty` | `blocoId: string, specialtyName: string` | Marca/desmarca uma especialidade |
| `progression.addCustomAction` | `blocoId: string, text: string` | Cria acao personalizada |
| `progression.toggleCustomAction` | `customActionId: Id` | Marca/desmarca acao personalizada |
| `progression.deleteCustomAction` | `customActionId: Id` | Remove acao personalizada |

## Arquitetura de dados

Os dados de atividades (todos os 18 blocos com suas acoes) sao **dados estaticos** definidos em `src/data/progression-data.ts`. Eles sao compilados junto com o frontend e nao estao no banco de dados. Somente o **progresso do usuario** (quais checkboxes estao marcados) e armazenado no Convex.

Formato do `actionId`: `{blocoId}:{tipo}:{indice}`
- Exemplo: `"vida-ao-ar-livre:fixed:0"` (primeira acao fixa do bloco Vida ao Ar Livre)
- Exemplo: `"comunidade:variable:2"` (terceira acao variavel do bloco Comunidade)

A logica de conclusao e calculada no cliente via funcoes puras em `src/lib/completion-logic.ts`, usando os IDs das acoes concluidas retornados pela query do Convex.

## Desenvolvimento

### Pre-requisitos
- [Bun](https://bun.sh) (v1.0+)
- [Node.js](https://nodejs.org) (v22.12+)
- Conta no [Convex](https://convex.dev)

### Instalacao

```bash
# Clone o repositorio
git clone https://github.com/MarcusQuirino/paxtools.git
cd paxtools

# Instale dependencias
bun install

# Configure o Convex (cria .env.local automaticamente)
bunx convex dev --once
```

Ou copie o `.env.example` e preencha manualmente:
```bash
cp .env.example .env.local
```

### Configurando Google OAuth

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com)
2. Ative a API Google OAuth 2.0
3. Crie credenciais OAuth (tipo Web Application)
4. Configure no dashboard do Convex: [documentacao Convex Auth](https://labs.convex.dev/auth)

### Servidor de desenvolvimento

```bash
bun dev
```

Inicia simultaneamente o backend Convex e o frontend Vite na porta 3000.

### Build para producao

```bash
bun run build
```

## Ambientes e deploy

- **Staging** — todo merge em `master` publica automaticamente em
  [`paxtools-git-master-marcusquirinos-projects.vercel.app`](https://paxtools-git-master-marcusquirinos-projects.vercel.app)
  (frontend via Vercel + backend Convex de staging via GitHub Actions).
- **Producao** — publicada apenas manualmente, via workflow com tag:
  `gh workflow run deploy-prod.yml -f tag=vX.Y.Z`.

Runbook completo (migracoes, rollback, seed de staging): [docs/deploy.md](docs/deploy.md).

## Cores dos eixos

| Eixo | Cor | Hex |
|------|-----|-----|
| Habilidades para a Vida | Rosa/Carmesim | `#E91E63` |
| Meio Ambiente | Verde | `#4CAF50` |
| Paz e Desenvolvimento | Azul Escuro | `#1A237E` |
| Saude e Bem-estar | Salmao | `#E57373` |
| Tema geral | Verde Escoteiro | `#4CAF50` |

## Contribuindo

Contribuicoes sao bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre como contribuir.

### Areas que precisam de ajuda

- Testes automatizados
- Suporte a modalidades (Mar e Ar)
- PWA / modo offline
- Temas claro/escuro
- Exportacao de progresso em PDF
- Dashboard para escotistas (lideres)
- Acessibilidade (a11y)

## Licenca

Este projeto esta licenciado sob a [MIT License](LICENSE).
