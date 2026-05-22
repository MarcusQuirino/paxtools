---
"paxtools": minor
---

Admins can now manage the group's name, the per-ramo unit names ("Alcateia X" / "Tropa X" / "Clã X"), and soft-delete the group from settings.

- `groups` schema gains optional `ramoNames` (per-ramo name overrides) and `deletedAt` (soft delete).
- New admin mutations: `updateGroup` (name + ramoNames) and `deleteGroup` (requires typing the group's name to confirm).
- `joinGroup`, `createGroup`, and `getMyGroup` filter out soft-deleted groups, so deletion immediately removes the group from members' views without touching their progression data.
- Onboarding's "create group" step and the settings "create new group" form prompt for optional per-ramo unit names; empty fields fall back to the group name when displayed.
- `unitLabel(ramo, groupName, ramoNames?)` now resolves the X portion from the per-ramo override when present.
