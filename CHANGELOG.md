# paxtools

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
