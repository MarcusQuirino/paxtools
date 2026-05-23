# Paxtools Regression Test Plan (E2E)

## Overview

Paxtools is a personal-progression tracker for Brazilian scouts. Three user roles:

- **escoteiro** — the scout; tracks their own progression. One `ramo` (life stage).
- **escotista** — the leader; views/approves the progression of escoteiros in their group's `ramos`.
- **admin** — orthogonal `isAdmin: true` flag on an escotista; edits the group, manages members, approves new joins.

Lifecycle: **Google signin** → `/onboarding` (role → ramo → join or create group) → if escotista joined (not created) → `pending` → admin approves on `/escotista/admin` → user has full access. Escoteiros only get progression UI when `ramo === "escoteiro"` (other ramos see `ComingSoon`).

UX-breakage here means a journey is **visibly broken**: a user is stranded on a wrong page, a button does nothing, an approval doesn't propagate, a role can see/edit data it shouldn't, or a destructive action eats data without confirmation. Coverage breadth and edge enumeration are out of scope — this plan targets places where the journey collapses.

---

## Escoteiro

### P0 — Sign-in → onboarding → join group → progression dashboard

**Setup:** brand-new Google user with no Convex record; pre-seeded approved group with known password (created by another seeded escotista admin).
**Steps:**
1. Visit `/` while signed-out → expect redirect to `/signin`.
2. Sign in with Google.
3. On `/onboarding`, pick **Escoteiro**, pick ramo **escoteiro**, enter group password, submit.
4. Wait for redirect.
**Expected:** lands on `/` with the progression dashboard (StageBanner, OverallProgress, EixoSection, LisDeOuroSection).
**Key assertions:**
- Redirect chain `signin → onboarding → /` completes without a manual reload.
- `api.users.viewer` returns `onboardingComplete: true`, `ramo: "escoteiro"`, `groupId` set.
- StageBanner is visible (not the `ComingSoon` placeholder).

### P0 — Escoteiro marks an action; it shows as pending (clock badge)

**Setup:** approved escoteiro with ramo `escoteiro`, in a group, zero completions.
**Steps:**
1. Open `/`, expand an Eixo, expand a bloco.
2. Click the checkbox on a fixed action.
3. Reload the page.
**Expected:** the action stays checked with a "pending" indicator; persists after reload.
**Key assertions:**
- `api.progression.toggleAction` mutation succeeds (no error toast/console error).
- After reload the action ID appears in `pendingActionIds` (visible pending styling, not approved styling).
- The action is NOT visually treated as approved.

### P0 — Approved item is locked: escoteiro cannot un-check it

**Setup:** approved escoteiro with at least one `actionCompletions` row already `status: "approved"`.
**Steps:**
1. Open `/`, navigate to that approved action.
2. Click the checkbox to un-check.
**Expected:** the click is rejected with the message "Item já aprovado pelo escotista. Apenas um escotista pode desfazer." OR the UI prevents the click entirely (lock icon / disabled state).
**Key assertions:**
- The completion row still exists in DB with `status: "approved"` after the attempt.
- The user sees a clear error / disabled affordance (not silent failure).

### P1 — Non-`escoteiro` ramo sees ComingSoon, not a broken dashboard

**Setup:** approved escoteiro with `ramo: "lobinho"` (or senior/pioneiro).
**Steps:** open `/`.
**Expected:** the `ComingSoon` panel is rendered; PlanNav and Dashboard are NOT.
**Key assertions:**
- Text "em breve" (or similar from `ComingSoon`) is visible.
- No Eixo cards rendered.

### P1 — Plan page (`/plan`) reflects starred items only

**Setup:** approved escoteiro `ramo: "escoteiro"` with ≥2 plannedItems and ≥2 non-planned items.
**Steps:** open `/plan`, switch to "Por Área" view.
**Expected:** only the starred items appear in the per-area listing.
**Key assertions:**
- Items that are NOT in `api.plan.getMyPlan` do not appear under any area.
- Items currently planned are visible.

### P2 — Add and toggle a custom action

**Setup:** approved escoteiro.
**Steps:** add custom action in a bloco; check it; reload.
**Expected:** custom action persists in pending state.
**Key assertions:** `api.progression.addCustomAction` returns an id; reload shows the item.

### P2 — Settings shows role, hides invite password for escoteiro

**Setup:** approved escoteiro in a group.
**Steps:** visit `/settings`.
**Expected:** role badge "Escoteiro", group name shown, password NOT shown (per `getMyGroup` returning `password: null` for non-escotistas).
**Key assertions:** no 6-char password string rendered next to group name.

---

## Escotista

### P0 — Escotista who joined a group sits on the pending screen until approved

**Setup:** newly approved-onboarding escotista with `escotistaRamos: ["escoteiro"]` who has just called `joinGroup` (not `createGroup`). Group exists with an admin who has NOT approved them yet.
**Steps:**
1. Visit `/escotista`.
**Expected:** `PendingApprovalScreen` is shown ("Aguardando aprovação"); the dashboard tabs (Painel / Pendentes / Admin) are NOT rendered.
**Key assertions:**
- The group password is NOT visible to this pending escotista (only approved escotistas see it via `getMyGroup`).
- "Cancelar solicitação" button is visible and, when clicked, calls `leaveGroup` and navigates to `/onboarding`.
- `api.approvals.getGroupStats` returns null (no dashboard data leaks).

### P0 — Escotista creates a group and is auto-approved as admin

**Setup:** signed-in user mid-onboarding, role `escotista`, `escotistaRamos: ["escoteiro"]`, not in any group.
**Steps:**
1. On `/onboarding` group step, click "Criar novo grupo".
2. Enter unique group number + name, submit.
**Expected:** redirected to `/escotista` with full dashboard (no pending screen). Admin tab is visible. Group password is shown.
**Key assertions:**
- The creator's `membershipStatus === "approved"` and `isAdmin === true`.
- Admin tab appears in nav.
- 6-char password badge is rendered in the group header.

### P0 — Escotista approves a pending action; escoteiro sees it locked

**Setup:** approved escotista (with `ramo` of target escoteiro in `escotistaRamos`) + approved escoteiro in same group with ≥1 pending `actionCompletions`.
**Steps:**
1. Visit `/escotista/pending`.
2. Expand the escoteiro card; leave all items selected.
3. Click "Aprovar".
**Expected:** the entry disappears from the pending list. The escoteiro (in a second session) sees the action with approved styling and cannot un-check.
**Key assertions:**
- DB row transitions to `status: "approved"` with `approvedBy` set to escotista's id.
- After approval, `getPendingForGroup` no longer includes this completion.
- `getMyCompletions` for the escoteiro returns the row as approved.

### P0 — Escotista only sees escoteiros in their assigned ramos (non-admin)

**Setup:** approved non-admin escotista with `escotistaRamos: ["escoteiro"]`, in a group containing escoteiros of `ramo: "escoteiro"` AND `ramo: "lobinho"`.
**Steps:** open `/escotista`.
**Expected:** only the "escoteiro"-ramo escoteiros appear in the list. Lobinho escoteiros do NOT.
**Key assertions:**
- `getGroupStats.escoteiroStats` length matches the number of seeded escoteiro-ramo escoteiros only.
- `getPendingForGroup` doesn't include pending items from lobinho escoteiros.

### P1 — Impersonation view: escotista marks an item, it goes straight to approved

**Setup:** approved escotista + approved escoteiro (escotista has access to that ramo).
**Steps:** from `/escotista`, click eye icon on escoteiro → `/escotista/escoteiro/$id`. Toggle an unchecked action.
**Expected:** blue impersonation banner visible. The toggle creates an immediately-approved completion (escotista-as-caller).
**Key assertions:**
- New `actionCompletions` row has `status: "approved"`, `approvedBy` = escotista id.
- Back arrow returns to `/escotista`.

### P1 — Bulk reject removes pending items (and un-checks custom actions)

**Setup:** approved escotista; one escoteiro with ≥1 pending action + ≥1 pending custom action.
**Steps:** `/escotista/pending`, deselect nothing, click "Rejeitar".
**Expected:** action row is deleted; custom action row is reset to `completed: false, status: undefined` (not deleted).
**Key assertions:** counts above match in DB after the call; the entry disappears from the pending list.

### P1 — Search and favorite-filter on dashboard work together

**Setup:** approved escotista with ≥3 visible escoteiros, one favorited.
**Steps:** `/escotista` → toggle star filter, then type partial name in search.
**Expected:** list narrows to favorites that also match the name.
**Key assertions:** result count consistent with intersection.

### P2 — Copy group password button copies and confirms

**Setup:** approved escotista in own group.
**Steps:** click password chip on dashboard header.
**Expected:** clipboard contains the password; UI shows "Copiado!" for ~2s.

---

## Admin

### P0 — Admin approves a pending escotista join request

**Setup:** approved escotista with `isAdmin: true` + a pending escotista in the same group (`membershipStatus: "pending"`).
**Steps:**
1. Visit `/escotista/admin`.
2. In "Solicitações pendentes", click check on the pending entry.
**Expected:** entry leaves the pending list. The approved user (in a second session) loads `/escotista` and sees the full dashboard, not the pending screen.
**Key assertions:**
- Target user has `membershipStatus: "approved"`.
- `getPendingMemberships` no longer includes them.
- The newly approved user's `PendingApprovalScreen` is replaced by the dashboard on next render.

### P0 — Non-admin cannot reach admin page

**Setup:** approved escotista with `isAdmin: false`, in a group.
**Steps:** navigate directly to `/escotista/admin`.
**Expected:** "Acesso restrito" panel; "Voltar ao painel" button visible. The Admin nav tab is NOT shown in `/escotista`.
**Key assertions:**
- No pending-membership rows are leaked in the DOM.
- `api.groups.getPendingMemberships` returns `[]` for this caller.

### P0 — Single admin cannot remove their own admin / leave / be banned

**Setup:** group with exactly ONE admin (the test user); ≥1 non-admin escotista; ≥1 escoteiro.
**Steps (run each):**
1. `/settings` → "Sair do grupo" while sole admin.
2. `/escotista/admin` → click shield-off on self (if rendered).
3. (Server) attempt to ban self.
**Expected:** all three are blocked with a message indicating "único administrador".
**Key assertions:** group still has exactly one admin after each attempt; admin still in group.

### P1 — Admin edits group name and ramo names; changes appear for members

**Setup:** admin in a group with ≥1 approved escoteiro of ramo `escoteiro`.
**Steps:**
1. `/settings` → "Gerenciar grupo" section. Change name and a ramo unit name. Save.
2. In a second session, the escoteiro reloads.
**Expected:** "Salvo." indicator; the new name + unit name surface where they're rendered (dashboard headers, unit prefix preview, etc.).
**Key assertions:**
- `api.groups.updateGroup` runs without error; `getMyGroup` returns updated `name` and `ramoNames`.
- "Salvar alterações" disabled until form is dirty.

### P1 — Admin bans a member; banned user loses group access

**Setup:** admin + a non-self approved member.
**Steps:** `/escotista/admin` → click ban on that member → confirm.
**Expected:** member disappears from member list; their `groupId` is cleared and `bannedAt` is set. If they have an open session and reload `/escotista`, they should land on a no-group state (or onboarding) — not a broken page.
**Key assertions:**
- Target's `bannedAt` populated, `groupId: undefined`.
- Banned user's next render of `/` or `/escotista` does not crash.

### P1 — Admin deletes group with name confirmation; members handled gracefully

**Setup:** admin in a small disposable group with ≥1 other member.
**Steps:** `/settings` → "Zona perigosa" → "Excluir grupo". Type the group name exactly. Confirm.
**Expected:** group soft-deleted (`deletedAt` set). Reload — group no longer appears anywhere.
**Key assertions:**
- "Excluir definitivamente" disabled until typed name matches.
- After delete, `getMyGroup` returns `null` for admin AND for other members on next render.

### P2 — Admin changes a member's role escotista↔escoteiro

**Setup:** admin + a target non-self escotista (non-admin).
**Steps:** click role-toggle in member row.
**Expected:** role flips. If flipped to escoteiro, `isAdmin` becomes false; `escotistaRamos` cleared.

### P2 — Admin edits a member's ramo / ramos via TreePine icon

**Setup:** admin + target escoteiro and target escotista.
**Steps:** edit ramo for each, save.
**Expected:** new ramo persists; ramo label in row reflects change.

---

## Cross-role scenarios

### CR-P0 — Approval round trip (escoteiro → escotista → escoteiro)

**Setup:** approved escoteiro session + approved escotista session in same group (escotista has the escoteiro's ramo).
**Steps:**
1. Escoteiro: mark an action on `/` — appears pending.
2. Escotista: open `/escotista/pending` — escoteiro card shows the item; bulk-approve.
3. Escoteiro: reload `/`.
**Expected:** Item changes from pending styling → approved styling on the escoteiro side. Pending count on escotista dashboard decrements.
**Key assertions:**
- Convex live query updates the escoteiro view without a hard reload (subscription works).
- DB row final state: `status: "approved"`, `approvedBy: <escotista._id>`.

### CR-P1 — Escotista creates group, escoteiro joins with that password

**Setup:** seeded escotista who just created a group; password captured from `/escotista` header chip.
**Steps:** in a new escoteiro session, enter the password during onboarding.
**Expected:** join succeeds; escoteiro appears in escotista's dashboard list (if ramo matches escotista's `escotistaRamos`).

### CR-P1 — Admin rejects pending escotista; rejected user is sent back to onboarding

**Setup:** admin session + pending escotista session.
**Steps:** admin clicks ✗ on the pending request. Pending escotista's `/escotista` re-renders.
**Expected:** rejected user's `groupId` cleared, `membershipStatus` cleared. On next render they hit no-group state and can join again or are routed to onboarding.
**Key assertions:** rejected user's `PendingApprovalScreen` no longer applies (group is null).

### CR-P2 — Two sessions: starring an escoteiro is per-escotista

**Setup:** two escotistas in same group, one escoteiro.
**Steps:** escotista A favorites escoteiro. Escotista B reloads.
**Expected:** escotista B's view does NOT show the escoteiro as favorited (favorite stored on escotista A only).

---

## Out of scope

- **Google OAuth provider internals.** We assume `@convex-dev/auth` Google flow is working; tests treat sign-in as a single happy-path step (or use a seeded session token).
- **Pixel-level styling, dark/light variants, animations.** Visual regression is a separate concern.
- **Validation enumeration.** Things like "group number must be digits", "name 100 char limit", "password length" — covered by Convex validators and unit tests, not user-journey tests. Only one validation case (delete-group confirm) is in the plan because the journey is destructive.
- **`lobinho/senior/pioneiro` ramo progression UI.** App shows `ComingSoon`; no progression data exists for these ramos.
- **Plan reorder via drag-and-drop fine-grained positioning.** P1 covers visibility; ordering precision is a separate test.
- **Banned user re-onboarding.** Their `bannedAt` flag is persistent; reuse flow not specified yet.
- **Performance, Convex read-amplification, OCC contention.** Belongs to a perf audit, not E2E QA.
- **Convex backfill / migration paths.** `maybeBackfillUser` runs invisibly; not user-visible behavior to assert.
