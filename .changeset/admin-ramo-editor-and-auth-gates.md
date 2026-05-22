---
"paxtools": minor
---

Admins can now change ramo assignments for members, and unauthenticated visitors are redirected away from authenticated-only routes.

- New `setMemberRamo` mutation lets admins change an escoteiro's ramo. Existing `setMemberRamos` (already wired) lets admins change an escotista's assigned ramos.
- Admin members list now has an inline ramo editor: single-select for escoteiros, multi-select for escotistas, with a save button.
- `/onboarding` and `/settings` now redirect to `/signin` when the viewer query resolves to null (was previously possible to view those routes signed out).
- `RamoPicker` gained a `variant` prop (`"dark"` for onboarding's gradient background, `"light"` for in-app cards).
