---
"paxtools": minor
---

Add group administrators, ramo assignments, and pending-approval flow.

- New `admin` capability layered on top of escotista: group creators become admin automatically; admins can approve/reject pending join requests, ban members, change member roles, and promote/demote other admins.
- New "ramo" step in onboarding: escoteiros pick one ramo (lobinho / escoteiro / sênior / pioneiro); escotistas pick one or more. Escotistas only see escoteiros from their ramos; admins see everyone.
- Group create flow now requires a unique group number and shows the "Alcateia / Tropa / Clã" unit prefix during onboarding.
- New "pending" membership state: escotistas joining a group via code wait on an approval screen until an admin approves them. Escoteiros can keep using the app but their progression items are filtered out of approval queues until approved.
- Current progression data is tagged as the "escoteiro" ramo. Escoteiros from other ramos see a "coming soon" screen instead.
- Legacy data is auto-backfilled on first read: group creators become admin, existing approved members get `membershipStatus: "approved"`, and existing escoteiros are prompted for their ramo on next login.
