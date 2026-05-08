# paxtools

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
