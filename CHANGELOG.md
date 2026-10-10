# paxtools

## 1.10.0

### Minor Changes

- a524f84: Escotistas veem o Plano de cada escoteiro: aba Progressão | Plano na página do escoteiro, somente leitura, na ordem de prioridade do escoteiro (próximos passos, aguardando aprovação, concluídos).
- 177f19c: Especialidades tab gets an "Especialidades | Insígnias" switch. Escoteiros see their ramo's insígnias with progress and the requirement checklist. Escotistas see tropa stats per insígnia (conquistadas, em andamento, pendentes) and a roster ordered by closest to earning, plus the requirements.
- 177f19c: Insígnias de interesse especial (special interest badges): tapping an insígnia in a bloco opens its requirement checklist, grouped like the official UEB list. Groups can ask for only some items ("pelo menos duas", "sendo obrigatória a primeira", "Opção 1 ou 2"). Once every group is satisfied the insígnia is earned and substitutes the bloco's ações variáveis. Requirements go through the escotista's Pendentes queue.
- f22c5cf: Estatísticas: nova lista "Atividades" com busca e filtros (ordenar, área, tipo) que substitui Mais realizadas e Lacunas, mostrando feitas, aguardando e no plano; e nova seção "Planos da tropa" com o que vários escoteiros querem fazer (ações e especialidades em listas separadas, com busca e nomes de quem quer). Textos longos expandem ao tocar.

## 1.9.1

### Patch Changes

- Hotfix: registro escoteiro tem 7 dígitos, não 6. Login por registro + senha e criação de conta gerenciada agora exigem 7 dígitos; personas de teste migradas para `99xxxxx`.

## 1.9.0

### Minor Changes

- 9263b2a: Revisão rápida: um baralho de cartas com todas as ações ainda não marcadas do ramo. Arraste para a direita (já fiz), esquerda (ainda não), cima (pro Plano) ou baixo (desfazer), ou use os botões e as setas do teclado. O escoteiro abre pelo card amarelo na home e suas marcações vão para Pendentes; o escotista revisa por um escoteiro de cada vez, a partir do painel ou da página do escoteiro, e suas marcações já saem aprovadas.

### Patch Changes

- 0cfb3dd: Atualiza dependências para as versões mais recentes (AI SDK 7, lucide-react 1, changesets 3, concurrently 10) e corrige vulnerabilidades transitivas (shell-quote, source-map-js, braces, sprintf-js).
- 652b8c6: CI and deploys run on Node 24 LTS (pinned via `engines.node`), GitHub Actions bumped to their Node 24 majors (checkout v7, cache v6, upload-artifact v7, setup-node v7), runners pinned to ubuntu-24.04, and all lint warnings fixed.
- 50de70e: Tests: close unit/integration gaps left by recent features — admin promotion/demotion, member role/ramo changes, pending memberships, managed-account creation/reset rules and the managed sign-in provider (signUp/reset refused, registro check), IRR level-up events, audit labels, stats especialidades ordering, plan-view resolution, clipboard fallback, level-up toasts and error-message unwrapping. Two known bugs pinned as `test.failing`.
- cd64d42: Test personas now sign in as contas gerenciadas (registro `99xxxx` + senha) through the real sign-in form; the separate test-only login provider and hidden form are gone.

## 1.8.0

### Minor Changes

- c9f03b3: Contas gerenciadas: escotistas can create access for members without a Google account, who sign in with their registro escoteiro + password. Temporary password on creation and reset, forced change on first sign-in, and "Alterar senha" in the profile.
- e7e18c7: Guided tour for new members: on their first visit a step-by-step overlay spotlights the main screens — progressão, plano and especialidades for escoteiros; painel, pendentes and especialidades for escotistas (plus the Admin area for admins). Finishing or skipping it is saved on the user, and it can be replayed anytime from Perfil/Ajustes → "Ver tutorial".

### Patch Changes

- cdec8fa: Relicencia o projeto de MIT para AGPL-3.0-only e adiciona link "Código-fonte" no rodapé.
- e306383: Every approval and rejection — ações, ações personalizadas, IRR items, especialidade items and etapas — now goes through one review module that owns access checks, the level-up cascade and the audit line. Especialidade reviews now get readable timeline lines ("Aprovou: Administração — item 3") instead of raw ids, and the escoteiro's own especialidade writes are validated against the catalog. Removed unused mutations (approveAllForEscoteiro, approveSpecialtyItem) and the dead escotista branch of toggleSpecialtyItem.
- e306383: Especialidades: one standing module decides earned / level / progress everywhere. Duplicate or out-of-range item rows no longer complete a bloco, and bloco completion, the escotista roster, stats, the escoteiro page, the ficha and the plano now always agree. Two standing queries replace the four raw-row queries.
- b22771e: Botão "Copiar senha" na senha temporária (copia só a senha, com alternativa quando o navegador bloqueia a área de transferência); o tutorial agora abre para a conta nova mesmo depois de outra conta tê-lo fechado na mesma aba.
- e306383: The lista de jovens, the stats cohort and the especialidades tab now read "the escoteiros this escotista is observing" from one place (visibilidade de ramo, then the seção observada), with a test that they always count the same people.
- e306383: Progression is derived by one module on both sides: the server's level-up snapshot, coverage and the escotista dashboard, and the escoteiro's own view all go through it. The dashboard's per-escoteiro "aprovadas" now counts only the escoteiro's current ramo, so a past ramo no longer inflates it.

## 1.7.0

### Minor Changes

- 9e132ba: Stats: new Especialidades section (conquistadas, nível 2 / em andamento, aguardando aprovação, mais conquistadas, demanda do plano, blocos via especialidade) linking into the Especialidades tab and ficha. Stats now respects the seção observada, like Painel and Especialidades.

## 1.6.0

### Minor Changes

- 8ae4579: feat(especialidades): escoteiro search + filter chips. The escoteiro's Especialidades tab gets a simpler version of the escotista catalog's filters: a search over names and item/suggestion text, and chips Todas · Minhas (already started) · one per eixo. Any active search/filter shows a flat list of matching cards with a count and an empty state; with none, the page keeps its eixo sections. State lives in the URL (`?q=`, `?f=`). Search box and chips are now shared components used by both pages.
- ac004f4: Escoteiro can star any especialidade on /especialidades into the plano (new "No plano" filter chip); starred especialidades show in Plano with progress and link back to their card.

## 1.5.0

### Minor Changes

- e9aa66a: feat(ui): escoteiro bottom tab bar + context header (redesign PR 1, "Design A — native-app brutalism")

  - The top segmented Tudo / Plano / Esp. nav is replaced by a fixed bottom tab bar with four full-label tabs — Progressão, Plano, Especialidades, Perfil — icon over label, 52px targets, `aria-current` on the active tab, safe-area padding for the iOS home indicator (`viewport-fit=cover`)
  - "Tudo" is renamed "Progressão" everywhere it named that tab (incl. the empty-plan hint)
  - Page header drops the "PAXTOOLS" wordmark for a context eyebrow (ramo · grupo, e.g. "Ramo Escoteiro · 38/RS"), a 28px page title and an avatar that opens Perfil
  - Perfil (/settings) is the escoteiro's fourth tab and gains a "Sair da conta" button, so sign-out stays reachable without the header avatar menu; the escotista settings page keeps its back button and menu
  - The escotista's views of a scout (impersonation Dashboard, read-only especialidades) never show the escoteiro tab bar
  - Calm brutalism: static containers (eixo sections, eixo summary cards, recognition, settings sections, especialidade detail panels, empty states) lose their hard shadow and keep the 2px border; interactive and hero elements keep theirs

- 8d60f44: Escotista Especialidades tab. The bottom bar is now Painel · Pendentes · Especialidades · Mais (Stats moved into Mais). New catalog (`/escotista/especialidades`) with Lobinhos e Escoteiros / Sêniores e Pioneiros, search over names and item text, eixo / "Com atividade na tropa" filters, and "Na tropa" signals; new consult detail (`/escotista/especialidades/$specialtyId`) with per-item "N têm" and a "Quem tem" list linking to each escoteiro's ficha. The per-escoteiro ficha (`/especialidades?escoteiroId=…`) is now actionable: tap marks/unmarks an item, pending items get Aprovar / Rejeitar, and older-ramo etapas can be approved/rejected or registered on the scout's behalf. Backend: `getGroupSpecialtySummary`, `getSpecialtyRoster`, `setSpecialtyItemApproved` (all scoped by visibilidade de ramo; reads also by seção observada); `submitSpecialtyStep` on-behalf now logs the approval, runs the level-up cascade and refuses to overwrite a scout's pending relato.
- cb63db9: Grupos agora têm região escoteira: o grupo é identificado como "38/RS" no painel do escotista, na tela de aprovação pendente e nas configurações, a região é pedida ao criar um grupo e pode ser editada por um administrador. Grupos sem região continuam identificados apenas pelo numeral.
- cb63db9: feat(groups): a grupo now holds a list of seções (name + ramo) instead of one unit name per ramo (#72)

  - Configurações' group management gained a "Seções" card where an admin escotista adds, renames and removes seções, choosing the ramo for each — two alcateias and no seção sênior are both expressible now
  - Removing a seção that still has escoteiros in it is refused, in Portuguese, instead of silently unassigning them
  - A migration converts every existing unit name into one seção of that ramo, so no grupo loses the names it had

- 558b993: chore(especialidades): purge the deprecated legacy `specialtyCompletions` system (#47)

  - Removed `progression.toggleSpecialty`, its reads (`getMyCompletions`/`getCompletionsForUser` no longer return `specialties`), and its approval path (`approvals.approveSpecialty`/`rejectSpecialty`, the `specialtyIds` arm of `bulkAction`, and the legacy branch of `approveAllForEscoteiro`/`getPendingForGroup`)
  - Bloco cards no longer offer a manual especialidade checkbox: an especialidade box is checked only when it is actually earned (level ≥ 1 younger, all three project steps older) and is read-only — marking happens on `/especialidades` via the "ver" link. Insígnias are listed without a box, since nothing tracks them
  - New migration `migrations:dropLegacySpecialtyCompletions` drains the table: rows whose name still resolves to a catalog entry are converted first (`toggleSpecialty` stayed live after the 2026-07-05 conversion run, so an especialidade marked since then would otherwise be lost), the rest — insígnias and retired especialidades — are dropped. The table definition goes in a follow-up, once the drain has run everywhere

- cb63db9: feat(groups): o escotista escolhe a seção observada e a lista de jovens filtra por ela (#73)

  - Em Admin, cada escoteiro pode ser colocado em uma seção do próprio ramo; seções de outro ramo são recusadas, e trocar o ramo tira o escoteiro da seção antiga
  - No painel, um seletor escolhe a seção observada ao lado da identidade do grupo ("38/RS"); a escolha fica salva e sobrevive ao recarregar
  - A lista de jovens (e as contagens que saem dela) mostra só a seção observada; um escoteiro ainda sem seção continua aparecendo, marcado com "sem seção", para não sumir de vista

- eb3efb7: Staging seed now simulates all four ramos, not just escoteiro. `testing:seedSimulatedTroop` (now an action, split into one mutation per ramo) creates a cohort-shaped troop per ramo — lobinho 16, escoteiro 15, sênior 13, pioneiro 5 — with varied bloco/eixo coverage and rotated variable-ação choices so the stats page shows real gaps. Every feature surface gets data: especialidades (earned/in-progress/pending, younger items + older project reports), one IRR holder per ramo (+ one partial), pending conclusões, ações personalizadas, planos, synthetic events, ≥2 single-ramo escotistas per ramo, pending join requests (escoteiros + escotistas), and multi-ramo history scouts (sênior since lobinho; pioneiro with full lobinho→sênior record) to pin ramo-bleed protection. All sim personas get test auth accounts for future Playwright flows. The sim wipe now cascades through the new specialty tables and events.
- 2dff093: Staging environment + tag-driven prod releases. Master merges now deploy to staging only (stable `paxtools-git-master-*` Vercel alias + dedicated staging Convex deployment with working Google OAuth); prod ships exclusively via the manual `deploy-prod.yml` workflow (`-f tag=vX.Y.Z`), which snapshots prod data, deploys the backend, runs pending migrations, and only then releases the frontend. Migrations move to `@convex-dev/migrations` (stateful, resumable, append-only registry; legacy one-off migrations removed). New staging data scripts: `staging:seed`, `staging:wipe-real`, `staging:reset`.
- ad1d29e: Unified E2E Playwright suite (#58): one suite targeting local or staging via `E2E_TARGET`, always-reseeded deterministic dataset (canonical users + simulated troop on both targets), parallel read-only phase in desktop + mobile viewports followed by a mutating phase parallelized through disjoint persona ownership, full R1–R6/M1–M20 scenario map coverage, and a manually-triggered `e2e-staging.yml` GitHub Actions workflow with failure artifacts.

### Patch Changes

- 2121e7a: fix(deps): upgrade `@auth/core` 0.37 → 0.41.3 and `@convex-dev/auth` 0.0.91 → 0.0.95

  - Fixes GHSA-7rqj-j65f-68wh (critical: email normalizer homoglyph `@` bypass), GHSA-xmf8-cvqr-rfgj (high: `getToken()` crash on malformed Bearer header) and GHSA-x445-f3h2-j279 (moderate: OAuth state/nonce/PKCE cookies not bound to provider)
  - `@convex-dev/auth` 0.0.95 is the release that peers on `@auth/core` ^0.41; also stops failed OTP sign-ins from consuming the code

- aade855: chore(deps): bump all dependencies to their latest minor/patch versions

  - TanStack Router/Start 1.170/1.168, React 19.3, Convex 1.46, Vite 8.3, Tailwind 4.3, zod 4.6, radix-ui 1.6, Playwright 1.63, oxlint 1.86 (+ oxlint-tsgolint 7, which it now requires), nitro beta 260903, convex-test 0.0.60
  - Replaced the deprecated `@tanstack/react-router-with-query` (frozen at 1.130, broke SSR on router 1.170 with `router.serverSsr.isDehydrated is not a function`) with its successor `@tanstack/react-router-ssr-query`. Server-side query results are not dehydrated: Convex Auth tokens are client-only, so the server always sees the signed-out view and hydrating it made `/settings` bounce to `/signin` on a hard load
  - Regenerated `bun.lock` so transitive deps pick up security fixes (postcss, nanoid, picomatch, ws, browserslist, @babel/core, js-yaml…) — `bun audit` 66 → 5 findings; the rest (`@auth/core`, `xlsx`) ship in follow-up PRs

- 2bbfdfb: fix(deps): move `xlsx` (dev-only) from the abandoned npm 0.18.5 to SheetJS 0.20.3 from the official CDN

  - Fixes GHSA-4r6h-8v6p-xvw6 (prototype pollution) and GHSA-5pgg-2g8v-p4x9 (ReDoS); `bun audit` now reports no vulnerabilities
  - `scripts/dump-ramo-sheet.ts` injects `fs` via `XLSX.set_fs` — the 0.20 ESM build no longer bundles it

- b149a31: Docs: record the deployment-protection decision and pipeline verification status in docs/deploy.md; document the staging/prod split in README (Ambientes e deploy) and CONTRIBUTING (Depois do merge).
- 069f93b: E2E: cap workers at 4 on CI runners and relax the staging expect timeout to 15s — 8 workers oversubscribed GitHub's 2-core runners enough to blow hydration timeouts in the mobile readonly project.
- 42ea242: Fix (#53): an escotista viewing an escoteiro's progression can now open a specialty detail ("ver") instead of being bounced to /escotista. The /especialidades route accepts an optional `escoteiroId` search param; when present it gates on the escotista role and renders that scout's especialidade data read-only via the visibility-checked `getSpecialtyItemsForEscoteiro` / `getSpecialtyReportsForEscoteiro` queries. The bloco "ver" link threads the target scout when rendered in the impersonation Dashboard. Escoteiro self-service is unchanged; an escoteiro or out-of-ramo escotista crafting the param gets no data (backend visibility rule).
- 9d8b98e: fix(copy): ramo-specific empty state on stats page and correct Portuguese pluralization of "item" in especialidades (#49)

  - Stats empty state now shows the ramo's member noun (lobinho/escoteiro/sênior/pioneiro) instead of always "escoteiro"
  - Especialidade progress line uses whole-word forms: "item aprovado" (exactly 1) / "itens aprovados" (otherwise), eliminating the non-word "itemns"
  - Updated Playwright assertions in r4, m07, m18, m19 specs to match the corrected text

- ace55ff: fix(ui): action rows highlight with their own eixo colour instead of the global green accent (#54)

  - Hover/active on progression rows is now a translucent overlay of the row's own eixo colour (12% hover, 22% active) via the new `rowTint` helper, so a pink or navy bloco no longer flashes the theme's green `--accent`
  - Applied to fixed/variable action rows, custom-action rows (which previously had no hover feedback at all) and IRR recognition items
  - Locked and disabled rows still get no tint; checked/pending visuals are unchanged

- 4083662: fix: add bottom padding to custom-action input row so it no longer touches the container border (#52)
- 955c78b: Fix M13 onboarding spec asserting a hardcoded localhost origin — now origin-agnostic so it passes on the staging target.
- 97d5910: Agents: add the `test-preview` skill and `docs/agents/preview-testing.md` — after opening a PR, resolve its Vercel preview by commit SHA and drive it in a real browser. Documents the frontend/backend skew rule (PR previews run the branch frontend against master's Convex), the read-only default on shared staging data, and where the step sits in the PR flow.
- ea80139: E2E: r6-settings self-heals a revoked session in its hydration gate — Convex Auth refresh rotation could revoke a shared session mid-run in CI, stranding the spec on /signin.
- cb63db9: Ajustes no campo de região escoteira: o placeholder do campo deixa de aparecer em caixa alta ("EX: RS"), os rótulos "Região escoteira (UF)" passam a estar associados aos seus campos, e "Região escoteira" entra no glossário do `CONTEXT.md`.
- cb63db9: review(groups): resolver as seções observáveis no servidor (#73)

  - O seletor de seção observada agora vem de `getGroupStats`, pela mesma regra que `setObservedSection` aplica — o painel não repete mais a visibilidade de ramo no cliente
  - Escolher uma seção que o servidor recusa mostra o motivo, em vez de o seletor voltar sozinho sem explicação
  - CONTEXT.md: colocar um escoteiro numa seção é ação de admin (o verbete de seção ainda dizia escotista)

- cb63db9: review(groups): tidy up the seções slice (#72)

  - `users.sectionId` is now dropped whenever a member leaves the grupo (sair, banir, recusar entrada, entrar em outro grupo) and when they stop being an escoteiro, so a seção pointer can no longer follow someone into another grupo or come back to block `removeSection` if they rejoin
  - Removing a seção clears any leftover pointer at it before deleting the row, instead of leaving a reference to a row that no longer exists
  - Removing a seção now asks for confirmation, like the grupo's other destructive admin actions
  - The seção list is read with a bounded query, and the 60-character name limit has a single definition shared by the server and the form

- cb63db9: Keep the grupo name and its numeral/região as separate text nodes so screen
  readers no longer announce them as one run ("Grupo QA99999/RS"), and cover the
  seções feature end to end with Playwright: group identity on the painel and in
  settings, plus seção create/rename/remove, scout placement, and the
  observed-seção filter on the escotista painel.
- f883ecc: Upgrade @tanstack/react-start to 1.168.60 to patch an XSS vulnerability that Vercel blocks deploys for.
- 88701fd: Import the design system into Claude Design, and make the diacritics regex encoding-safe.

  `toSpecialtySlug` stripped combining marks with a regex written using literal
  `U+0300–U+036F` characters. esbuild ASCII-escapes output everywhere except inside
  regex literals, so those raw bytes survived into bundled output — and any consumer
  serving that JS without `charset=utf-8` fails to parse the entire file. Rewritten
  with `\u` escapes; behaviour is byte-identical.

  Also adds the `.design-sync/` sync inputs (config, bundle entry, preview sources,
  conventions header) and excludes sync scaffolding from oxlint.

- 821851e: docs: record out-of-scope decision — completed items intentionally remain in the plano (#51)
- c6799e8: Agents: drop vendored third-party skills (TanStack, Vercel, shadcn, Playwright CLI, design guidelines, broken Convex symlinks), the stale `skills-lock.json`, the unused Vercel plugin setting, and the Sandcastle AFK loop. The project-specific `run-app` and `test-preview` skills move to `docs/agents/running-locally.md` and `docs/agents/preview-testing.md`, referenced from `CLAUDE.md`.

## 1.4.0

### Minor Changes

- 893ce8d: feat(especialidades): bloco deep-link & auto-completion via specialty level (#44)
  - Wire the younger specialty system into bloco progression: a bloco's ação
    variável section is now satisfied when a linked especialidade reaches level ≥ 1,
    computed purely on read from approved `specialtyItemCompletions` counts — no
    extra storage.
  - Pure logic (`src/lib/completion-logic.ts`): add `getEarnedSpecialtyIds` (approved
    item counts + catalog totals → earned specialty slugs at level ≥ 1) and
    `getEarnedSpecialtyBlocoIds` (earned slugs + eixos → satisfied blocoIds, matching
    `alternativeCompletions` names via `toSpecialtySlug`).
  - Backend: `readEarnedSpecialtyBlocoIds` + shared `ramoGroupForRamo` in
    `convex/lib/progression.ts`; `snapshotProgression` now populates
    `earnedSpecialtyBlocoIds` (previously an empty-set TODO), so `detectLevelUps`
    picks up etapa advances crossed by a specialty-completed bloco. `getMyCompletions`
    / `getCompletionsForUser` return `earnedSpecialtyBlocoIds` so the client agrees
    with the server. `convex/specialties.ts` now imports the shared `ramoGroupForRamo`.
  - Client: `use-progression` builds the earned-bloco set from the query and threads
    it through `Dashboard` → `EixoSection` → `BlocoCard`, so a bloco satisfied via
    especialidade shows as complete.
  - Deep-link: bloco cards with `alternativeCompletions` of type `"especialidade"`
    render a "ver →" link to `/especialidades?specialty=<slug>`; the route accepts the
    `specialty` search param and auto-opens, scrolls to, and highlights that specialty
    (younger and older catalogs).
  - Older (project-based) blocos are unchanged — auto-completion is derived from
    `specialtyItemCompletions` (younger) per the issue scope.

- 893ce8d: feat(especialidades): older group — project catalog, sequential steps & escotista approval (#43)
  - Add `src/data/specialty-data/older.ts` — full official older-group (sênior + pioneiro) catalog: 32 especialidades across the 4 eixos, each with `conhecerSuggestions` / `fazerSuggestions` / `compartilharSuggestions` (parsed from the 2025 Guia de Especialidades e Insígnias — Ramos Sênior e Pioneiro)
  - Backend (`convex/specialties.ts`): `submitSpecialtyStep` (create/replace a `specialtyProjectReports` row as pending; server-enforced sequential lock — a step is rejected until its predecessor is approved), `approveSpecialtyStep` (compartilhar approval fires the level-up cascade), `rejectSpecialtyStep` (deletes the row so the escoteiro rewrites), `getMySpecialtyReports`, `getSpecialtyReportsForEscoteiro`
  - `approvals:getPendingForGroup` now includes `pendingSpecialtyReports` and counts them in `totalPending`
  - Route `/especialidades` renders the older project-step UI for sênior/pioneiro: browse by eixo, per-especialidade Conhecer → Fazer → Compartilhar cards with suggestions, report text areas, submit/resubmit, and sequential locking (Fazer locked until Conhecer approved; Compartilhar until Fazer approved); specialty shown as conquered when Compartilhar is approved
  - Escotista pending queue renders one card per pending project step with the submitted text and approve/reject controls
  - `ramoGroup` is `"older"` on all written records; sênior and pioneiro share one catalog and completions
  - Tests: convex-test covers submit → pending, sequential lock (fazer before conhecer approved throws), approve → unlock next, full three-step approve → earned cascade, reject → row deleted + resubmit, resubmit replaces pending text, and approved-step overwrite protection

- 893ce8d: feat(especialidades): drop step blocking for older projects & complete blocos on earn

  Older-ramo (sênior/pioneiro) especialidades are three-step projects (conhecer →
  fazer → compartilhar). They previously enforced a strict order — a step could
  only be submitted once its predecessor was approved, and the UI locked later
  steps. In QA this proved to be friction, so we drop the gate (ADR 0002).
  - **Unordered steps.** `submitSpecialtyStep` no longer requires the predecessor
    to be approved; the escoteiro writes and submits the three reports in any
    order. The frontend `isLocked` / "Bloqueado" state and its copy are removed.
  - **Binary grant on all-three-approved.** Approvals stay per-step and independent
    (trickle into the escotista queue as written). The specialty is earned the
    moment the _third_ step reaches `approved` — whichever step that is —
    replacing the `compartilhar`-specific trigger for the level-up cascade.
  - **Older especialidades now complete their bloco.** `readEarnedSpecialtyBlocoIds`
    gains an older branch: a specialty earned (all three steps approved) satisfies
    any bloco that names it as an alternative completion, mirroring the younger
    path (#44). Previously this was hard-returned empty for older ramos, so a fully
    approved project never counted toward progression. Derived on read — retroactive,
    no migration.

  Rejection stays delete-based for now (preserving the report text on rejection is
  deferred; see ADR 0002).

- 893ce8d: feat(especialidades): schema, migration & pure-logic prefactor (#41)
  - Add `specialtyItemCompletions` table (younger ramoGroup item-level tracking)
  - Add `specialtyProjectReports` table (older ramoGroup project-step tracking)
  - Mark `specialtyCompletions` as deprecated (kept live during migration window; full purge deferred to #42–44)
  - Add `getSpecialtyLevel(approvedCount, totalItems): 0|1|2` pure function
  - Update `getCompletedBlockIds` to accept `earnedSpecialtyBlocoIds: Set<string>` (replaces raw specialtyCompletions array); callers now pass empty set until #44 wires the real computed set
  - Add `migrations:migrateSpecialtyCompletions` — converts approved older rows to 3-step project reports and younger rows to per-item completions; pending rows dropped; idempotent. Names resolve to canonical catalog ids and are validated against the catalog: unknown names (insígnias, retired/missing specialties) are left in place and reported in `unknownSpecialties` instead of being converted or deleted; item counts come from the catalog entry itself
  - Add `toSpecialtySlug(name)` and `toCanonicalSpecialtyId(name)` pure functions (exported from `src/lib/completion-logic.ts`; shared by migrations, earned-specialty matching and deep-links). `toCanonicalSpecialtyId` resolves 2025-guide renames via `LEGACY_SPECIALTY_SLUG_ALIASES` (Ciências da Terra → geologia, Tradições dos Povos Indígenas → tradicoes-dos-povos-originarios, Natureza e Ciências Ambientais → natureza-e-ciencias-naturais)

- 893ce8d: feat(especialidades): younger specialty catalog, item checklist & escotista approval (#42)
  - Adds full younger-group (lobinho + escoteiro) specialty catalog: 168 specialties with 6 or 8 items each, organised by eixo, parsed from the official 2025 Brazilian scout guide (Guia de Especialidades e Insígnias).
  - New `/especialidades` route: browse specialties by eixo, per-specialty collapsible checklist, level badges (0 / 1 / 2) derived from approved item count, progress bar per specialty.
  - New `convex/specialties.ts`: `toggleSpecialtyItem`, `approveSpecialtyItem`, `rejectSpecialtyItem`, `approveSpecialtyItems`, `rejectSpecialtyItems`, `getMySpecialtyItems`, `getSpecialtyItemsForEscoteiro`, `getPendingSpecialtyItemsForGroup`.
  - Escotista pending queue now shows pending specialty items grouped by specialty, with per-specialty approve/reject controls separate from the legacy bulk flow.
  - Navigation updated: `PlanNav` adds an "Esp." tab linking to `/especialidades`.

### Patch Changes

- 893ce8d: fix(especialidades): mark the specialty checkbox when a bloco is auto-completed via items

  A bloco satisfied by an earned especialidade (level ≥ 1 via `specialtyItemCompletions`, #44)
  showed 100% complete, but the especialidade's checkbox in the bloco view stayed empty — the
  escoteiro had to re-mark it by hand. The bloco's completion came from `earnedSpecialtyBlocoIds`
  while the checkbox only read legacy `specialtyCompletions` rows, so the two disagreed.
  - Backend: `readEarnedSpecialtyBlocoIds` now also returns `specialtyIds` (the earned canonical
    ids), and `getMyCompletions` / `getCompletionsForUser` return `earnedSpecialtyIds` alongside
    `earnedSpecialtyBlocoIds` — blocos list many alternatives, so the blocoId alone can't say which
    one to mark.
  - Pure logic: add `getSpecialtyMark` in `src/lib/completion-logic.ts` — resolves a specialty's
    checked/pending/locked state from both sources (earned-via-items wins: checked, approved, and
    read-only since toggling can't undo item completions).
  - Client: thread `earnedSpecialtyIds` through `use-progression` → `Dashboard` / plan view →
    `EixoSection` → `BlocoCard` → `SpecialtySection`, and through `resolvePlanItems` for the plan
    list view. An especialidade earned via items now renders checked, approved, and locked
    everywhere.

## 1.3.0

### Minor Changes

- dab223e: Per-ramo progression display (Workstream A, #35): a new `getRamoRules(ramo)` deep module in `src/data/progression-rules.ts` replaces the escoteiro-only `STAGES`/`LIS_DE_OURO_*` constants, returning each ramo's own etapas (variable count — three or four) and its IRR (name, colours, block threshold of 18, and the five recognition items). The pure progression helpers (`getCurrentStage`/`getNextStage`/`getBlocksToIrr`/`allBlocksCompleted`/`isIrrComplete`) now take the ramo and are count-agnostic, so sênior/pioneiro render exactly three etapas at 0/6/12 with no phantom fourth stage. The stage banner, recognition section, escotista pending view, stage-distribution stats, and the level-up toast/event all read the viewed escoteiro's ramo-correct names/colours/items. Escoteiro output is unchanged (regression-locked). No storage, schema, id (`lis_*`), table, or migration changes — those remain Workstream B (#36/#37).
- 11e93c8: Ramo-scope the remaining progression records (Workstream B, #37): especialidade completions, ações personalizadas, and planned items (plano) now carry a `ramo` field and their reads filter by `(userId, ramo)` via new combined indexes, closing the last of the cross-ramo bleed (recognition/IRR items were handled by #36; ação completions were already ramo-safe via their id). Because blocoIds are shared across ramos, `ramo` is part of the write-uniqueness lookups (toggle/reorder), and `snapshotProgression`'s block count is now ramo-scoped — the read that actually stops a past ramo's especialidades/ações from bleeding into the current ramo's stage. Writes stamp the acting escoteiro's current ramo; the per-bloco custom-action cap counts only the current ramo. A new in-place backfill migration `migrations:backfillRamoOnCompletions` stamps `ramo = "escoteiro"` on existing rows (asserting all-escoteiro action ids first, collision-safe merge for the two tables with unique lookups, idempotent). Prior ramos' rows are retained (nothing deleted) and reappear on switching ramo back. No user-visible change in prod (all escoteiros, no transitions); run and verify the migration on the dev deploy (handsome-walrus-236) before prod — schema deploy and backfill must run back-to-back.
- 7244f93: Ramo-scope the recognition (IRR) completions and rename "Lis de Ouro" → IRR in code and stored data (Workstream B, #36). Recognition rows now live in a new `irrCompletions` table keyed by `(userId, ramo, itemId)`: reads (`getMyCompletions`, `getCompletionsForUser`, `snapshotProgression`) return only the subject's current-ramo items via the `by_userId_and_ramo_and_itemId` index, and writes stamp the acting escoteiro's ramo — so a scout who changes ramos keeps a separate, retained recognition record per ramo with no cross-ramo bleed. Item ids are renamed `lis_* → irr_*` and the public mutations become `toggleIrrItem` / `approveIrrItem` / `rejectIrrItem` (bulk arg `irrIds`). "Lis de Ouro" survives only as escoteiro's display name via `getRamoRules("escoteiro").irr.name`; the `events` audit type is left unchanged.

  Migration `migrations:copyLisDeOuroToIrr` copies each `lisDeOuroCompletions` row forward into `irrCompletions` with `ramo = "escoteiro"` stamped and its id rewritten, after asserting every `actionCompletions` id is escoteiro-prefixed. It is copy-forward (the source table is left intact for verification/rollback), idempotent, and supports `dryRun`.

  Rollout: the app reads `irrCompletions`, which is empty until the migration runs — run `migrations:copyLisDeOuroToIrr` on the dev deploy (handsome-walrus-236) and verify `sourceCount === destCount` before prod, then run it immediately after the prod deploy. Dropping the deprecated `lisDeOuroCompletions` table is a follow-up once prod counts are verified.

- e97ae9d: Visibilidade de ramo: one module (`convex/lib/ramoVisibility.ts`) now owns the escotista→escoteiro authorization predicate; all six surfaces (write asserts, pending approvals, group members, timeline, stats, AI suggestions) consume it instead of restating the rule inline. Three deliberate behavior changes: writes on a banned escoteiro's records are rejected; an unstamped (undefined) membershipStatus counts as approved everywhere; the legacy grupo-creator admin fallback applies on every surface.

## 1.2.0

### Minor Changes

- d51c524: AI activity suggestions (beta) on the troop-stats page: an on-demand helper that, given a ramo's coverage, proposes one game/dynamic idea per development area (eixo) grounded in that area's most under-covered activities, plus a short plain-language overview — cached per group+ramo. Built on a Convex `"use node"` action calling Claude Sonnet via the AI SDK; the model is fed only PII-free coverage + activity texts (no scout names). Requires the `ANTHROPIC_API_KEY` Convex env var to be set on the deployment; until then the card surfaces a clear "not configured" message.
- 08915ad: Add an audit timeline tab for escotistas plus celebratory level-up toasts.
  - New `events` table records what happens in a group: approvals, rejections, level-ups, Lis de Ouro, and membership/admin actions (joins, bans, ramo and access changes). Rejection paths now log-before-delete so denials leave a trail.
  - New **Histórico** tab (`/escotista/timeline`) shows a paginated, newest-first feed. Progression events are scoped to each escotista's ramos; group/membership events are admin-only.
  - Backend level-up detection: approving completions now recomputes an escoteiro's stage (Pista→Trilha→Rumo→Travessia) and Lis de Ouro before/after and surfaces a toast to the approving escotista — works from the pending queue and bulk approvals. Detection reuses the same block/stage logic as the client (relocated to a shared, backend-importable module).

- 17b4ab1: Escotista navigation: replace the cramped top tab strip with a mobile-native fixed bottom bar (Painel, Pendentes, Mais). "Mais" opens an accessible bottom sheet listing Histórico, Ajustes, and Admin (admin-only). Adds a reusable bottom-anchored `Sheet` UI primitive (`src/components/ui/sheet.tsx`). Leaves a documented insertion point for a future Stats tab. Pure nav restructure — no behavior change to destinations.
- d51c524: Runtime feature-flag system on Convex (`featureFlags` table + `isEnabled` query + internal `setFlag` mutation; missing row = off) and the AI activity suggestions feature is now gated behind the `ai_suggestions` flag — toggleable without a deploy via `bunx convex run featureFlags:setFlag '{"key":"ai_suggestions","enabled":true}'` or the dashboard. Also hardens the AI path: the regen cooldown is now claimed atomically in a mutation before the LLM call (concurrent generate clicks can no longer race into duplicate paid calls), the LLM call gets a `maxOutputTokens` ceiling, and the suggestion schema bounds string/array sizes before anything is persisted.
- d51c524: Add the escotista Stats page (/escotista/stats): per-eixo coverage bars, stage
  distribution, most-done activities, a gap engine (fixed gaps + neglected
  variables), and a per-scout acompanhamento list. Backed by a shared, PII-free
  coverage contract (convex/lib/coverage.ts#computeRamoCoverage) and the
  convex/stats.ts getRamoCoverage / getRamoScouts queries with ramo-scoped authz
  (admins get a ramo switcher). No cross-ramo aggregation.

### Patch Changes

- e10a635: Add convex-test characterization tests for the backend mutation/query surface (groups, approvals, progression, plan, onboarding, users, authHelpers), pinning current behavior with a bias toward the security-critical paths: cross-group/ramo authorization, banned-user gating, the approval lock, and pending→approved transitions. Test-only change; no runtime behavior is modified.
- 50d6d06: Internal refactor: remove duplication in the backend approval/membership mutations with no behavior change.
  - `convex/approvals.ts`: the six single-item approve/reject mutations now delegate to `approvePendingCompletion` (auth-first) and `rejectPendingCompletion` (existence-first), preserving each path's exact check ordering. `bulkAction`'s three identical loops collapse into `bulkProcessSimple`, and `approveAllForEscoteiro`'s repeated patch loop into `approveRows` (per-table `.take` limits and the custom-action filter kept inline). Shared bulk timestamps preserved.
  - `convex/groups.ts`: the seven member-admin mutations share a `loadGroupMember` helper (assert admin → load target → verify same group). `banMember`/`changeMemberRole` no longer double-call `assertAdmin`.

  No exported function signatures or error messages changed. Verified by the full unit suite (268 pass), `oxlint` (0 errors), and `tsc --noEmit`.

- 9b87d62: Add end-to-end coverage for the core mutating user workflows, complementing the existing read-only specs:
  - `escoteiro/mark-action`: an escoteiro self-marks a progression action (pending) and unmarks it (self-cleaning).
  - `escoteiro/onboarding-complete`: the full role → ramo → skip-group onboarding flow lands a new escoteiro on the dashboard (repeatable — the seed resets this fixture each run).
  - `escotista/approval-workflow`: an escoteiro marks an action → it appears in the escotista's pending queue → the escotista rejects it → it is removed (two browser contexts; reject deletes the row so no approved/locked state leaks between runs).

  All specs follow the existing fixture/storageState conventions and pass against the dev backend (`bun test:e2e`, 13/13).

- c0f9706: Frontend cleanup: extract the route auth/onboarding guard into a shared `useAuthGate` hook, removing three near-identical copies.

  `/`, `/plan`, and the `/escotista` layout each carried their own `useConvexAuth` + viewer query + redirect `useEffect` + "ready" skeleton condition. They now call `useAuthGate("escoteiro" | "escotista")`, which centralizes the redirect rules (`/signin` when unauthenticated, `/onboarding` when incomplete, the other role's home on role mismatch) and returns `{ ready, user }`. Behavior preserved — verified by the full e2e routing suite (13/13). Also removes the dead `allActionIds` value that `useProgression` computed and returned but nothing consumed.

- 2bec4f2: Security hardening of the backend authorization surface (behavior-preserving for legitimate users; only abuse paths are now rejected):
  - **Block self privilege-escalation**: `setRole` can no longer change an existing role once the user is in a group (previously an approved member could self-promote escoteiro→escotista because the join flow never sets `onboardingComplete`).
  - **Lock the test-auth provider to `signIn`**: the env-gated test-password provider now rejects every non-`signIn` flow, closing the `signUp` path that could mint `@test.paxtools.local` sessions without the shared secret.
  - **Block ramo self-expansion**: `setEscoteiroRamo`/`setEscotistaRamos` now refuse to change ramos once the user is in a group (ramo changes go through the admin-gated member setters).
  - **Close cross-ramo IDOR**: `assertEscotistaInSameGroup` now fails the ramo boundary for a ramo-less escoteiro instead of skipping it, matching the read-path filters.
  - **Gate pending members**: `assertEscotistaInSameGroup` now rejects targets who are not yet approved members, so a pending member cannot be read/approved before admin approval.
  - **Banned-user self-reads**: `viewer`, `getMyCompletions`, and `getMyPlan` now return empty for banned users (mutations already blocked them).
  - **Preserve the last-admin invariant**: `joinGroup`/`createGroup` now refuse to strand a group whose sole admin is the caller.

## 1.1.0

### Minor Changes

- 649f0a3: Refactor progression data into per-ramo modules (lobinho, escoteiro, sênior, pioneiro) and add multi-ramo support. Action IDs now carry the ramo (`ramo:blocoId:type:index`), lookups resolve the correct ramo's eixos, and a migration converts legacy 3-part IDs. Includes a script to regenerate the data from the source spreadsheet.

### Patch Changes

- 5c55418: Add GitHub Actions CI workflow running lint, tests, and build on PRs and pushes to `master`. Pins Bun to 1.3.14.
- 3e9094c: Fix multi-ramo rollout breakage from the 3-part → 4-part action ID change:
  - `convex/plan.ts`: widen `ITEM_KEY_PATTERN` to accept 4-part action keys (`action:ramo:blocoId:type:index`) — previously it only accepted legacy 3-part keys, so starring/planning any action threw "Chave de item inválida". The pattern is transition-tolerant (accepts 3- and 4-part) so it works regardless of migration timing.
  - `convex/migrations.ts`: add `prefixLegacyPlannedItemKeys` to migrate `plannedItems.itemKey` action keys (the existing migration only covered `actionCompletions`), and make both migrations collision-safe — if a legacy row and an already-migrated 4-part row exist for the same `(userId, key)`, merge/drop the legacy one instead of creating a duplicate that would break `.unique()`.
  - `convex/testing.ts` seed data and the escoteiro e2e specs now use the 4-part ID format.

- 82c1a13: Fix long item text being cut off in the escotista "pendentes" tab. Each item's text is now a tappable control that toggles between a 2-line preview and the full text, so escotistas can read the whole entry. The checkbox keeps its own click target and accessible name.

## 1.0.0

### Major Changes

- Release v1.0 — first stable release of Paxtools, a progression tracker for Escoteiros do Brasil. Includes escoteiro progression tracking, escotista dashboard, group management, onboarding flow, and admin controls.

### Minor Changes

- 25730c1: Admins can now change ramo assignments for members, and unauthenticated visitors are redirected away from authenticated-only routes.
  - New `setMemberRamo` mutation lets admins change an escoteiro's ramo. Existing `setMemberRamos` (already wired) lets admins change an escotista's assigned ramos.
  - Admin members list now has an inline ramo editor: single-select for escoteiros, multi-select for escotistas, with a save button.
  - `/onboarding` and `/settings` now redirect to `/signin` when the viewer query resolves to null (was previously possible to view those routes signed out).
  - `RamoPicker` gained a `variant` prop (`"dark"` for onboarding's gradient background, `"light"` for in-app cards).

- f4418e4: Add group administrators, ramo assignments, and pending-approval flow.
  - New `admin` capability layered on top of escotista: group creators become admin automatically; admins can approve/reject pending join requests, ban members, change member roles, and promote/demote other admins.
  - New "ramo" step in onboarding: escoteiros pick one ramo (lobinho / escoteiro / sênior / pioneiro); escotistas pick one or more. Escotistas only see escoteiros from their ramos; admins see everyone.
  - Group create flow now requires a unique group number and shows the "Alcateia / Tropa / Clã" unit prefix during onboarding.
  - New "pending" membership state: escotistas joining a group via code wait on an approval screen until an admin approves them. Escoteiros can keep using the app but their progression items are filtered out of approval queues until approved.
  - Current progression data is tagged as the "escoteiro" ramo. Escoteiros from other ramos see a "coming soon" screen instead.
  - Legacy data is auto-backfilled on first read: group creators become admin, existing approved members get `membershipStatus: "approved"`, and existing escoteiros are prompted for their ramo on next login.

- 563ecd6: Add a personal progression plan for escoteiros. Each item (ação fixa, ação variável, especialidade, insígnia, custom action) now has a star to favorite it; the new `/plan` route shows only favorited items in two views — **Por Área** (collapsable per eixo/bloco, same progress bars as the main dashboard) and **Minha Ordem** (a flat, drag-and-drop reorderable list). Pending and completed items automatically sink to the bottom of the ordered list, with pending shown faded and approved-completed struck through.
- ae417cf: Escotista dashboard: the **Escoteiros** and **Escotistas** stat cards are now clickable and switch the list below between escoteiros (with progression stats and favorites) and escotistas (name + avatar). Also hide the group invite code from escoteiros — only escotistas see the password in `/settings`, and `groups.getMyGroup` now redacts it server-side for non-escotistas.
- ef35725: Admins can now manage the group's name, the per-ramo unit names ("Alcateia X" / "Tropa X" / "Clã X"), and soft-delete the group from settings.
  - `groups` schema gains optional `ramoNames` (per-ramo name overrides) and `deletedAt` (soft delete).
  - New admin mutations: `updateGroup` (name + ramoNames) and `deleteGroup` (requires typing the group's name to confirm).
  - `joinGroup`, `createGroup`, and `getMyGroup` filter out soft-deleted groups, so deletion immediately removes the group from members' views without touching their progression data.
  - Onboarding's "create group" step and the settings "create new group" form prompt for optional per-ramo unit names; empty fields fall back to the group name when displayed.
  - `unitLabel(ramo, groupName, ramoNames?)` now resolves the X portion from the per-ramo override when present.

- 3825585: feat: escoteiros can no longer uncheck or delete items already approved by an escotista. Backend mutations throw a clear error, and the UI disables the checkbox (and hides the trash icon for custom actions) so the action is unreachable. Escotistas viewing an escoteiro retain edit rights.
- ea3456a: feat: Playful Neo neobrutalism redesign (Variant B)

### Patch Changes

- 34d4e3a: feat: install shadcn Dialog component for future use in ConfirmDialog
- 9042113: feat(admin): require confirmation for all member admin actions (role change, admin toggle, ban)
- b09bf35: feat(ui): add reusable ConfirmDialog component
- a9d5811: fix: "Por Área" view in "Meu Plano" only shows starred items now (previously rendered every item in each planned bloco).
- 68abcc5: QA: add e2e coverage for two P0s on the group-admin/ramos PR — approved-action lock on the escoteiro dashboard, and "Por Área" plan view filtering to starred items only. Uses curriculum-shaped action IDs seeded in `convex/testing.ts`.
- 68abcc5: Add env-gated Convex testing module (`testing.ts`) with idempotent seed and predicate-bounded wipe for E2E test data, plus a hidden test-only credentials provider in `convex/auth.ts` and a matching test sign-in form on `/signin` — all gated by `TEST_AUTH` / `VITE_TEST_AUTH`.
- 68abcc5: Scaffold Playwright e2e infrastructure (config, tests/ tree with catalog/fixtures/setup, bun-spawn Convex CLI wrapper, and `test:e2e*` scripts) per Phase 2C of `docs/qa/infra-plan.md`.
- 68abcc5: QA: add E2E specs for PR #6 — pending escotista routing (no password leak), non-admin ramo-scoped dashboard visibility, non-admin blocked from admin page, admin sees pending escotista list.
- 935c78e: feat(settings): allow users to edit their display name in settings
- 925cb61: feat(users): add updateName mutation with trim and length validation

## 0.2.0

### Minor Changes

- d6a8cdc: Add footer with build version and bug report button linking to GitHub issues with a pre-filled template
- Allow escotistas without a group to create one directly from onboarding and the dashboard
- 7581816: Add escoteiro/escotista roles, groups, and approval workflow
  - Two user types: escoteiros (scouts) track progression with pending approval, escotistas (leaders) approve items
  - Groups: escotistas create groups with shareable passwords, members join by entering the code
  - Pending approval system: escoteiro completions show as ghost/faint progress bars until approved by an escotista
  - Onboarding flow: role selection + optional group join after first login
  - Escotista dashboard: group stats, escoteiro search with favorites, pending approvals page
  - Impersonation: escotistas can view/edit an escoteiro's progression with auto-approval
  - Settings page: group management (join, leave, create)

### Patch Changes

- 1d7bb94: Add disclaimer in footer stating this is not affiliated with UEB or Paxtu
- d68982d: Fix issues found in codebase review: add server-side input validation and rate limiting on Convex mutations, fix AuthButton dual loading state, add ErrorBoundary, migrate to unified radix-ui package, improve mobile UX for delete button, add meta description, remove unused components, and fix lint warnings
- Fix escotista approval of escoteiro-created items
  - Custom actions created and completed by escoteiros now appear in the pending approvals page
  - Escotista clicking a pending item in the impersonation view now approves it instead of deleting it
  - Added approve/reject mutations and bulk action support for custom actions
  - Added by_userId_and_status index to customActions table

- 33116f2: Make footer reusable with className prop and add it to the sign-in page
- f6e3993: Move stage images and labels into progression data, remove hardcoded maps from stage-banner, and optimize completion logic with pre-built Map
