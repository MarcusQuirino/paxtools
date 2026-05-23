# Design: Name Editing + Admin Confirm Modals

**Date:** 2026-05-22

## Overview

Two independent features:
1. Any authenticated user (escoteiro or escotista) can edit their display name in Settings, overriding the name pulled from Google OAuth.
2. Every destructive admin action in the Members panel requires an explicit confirmation via a modal dialog before firing.

---

## Feature 1: User Name Editing

### Backend

New mutation in `convex/users.ts`:

```ts
export const updateName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const trimmed = args.name.trim();
    if (!trimmed) throw new Error("Nome não pode ser vazio");
    if (trimmed.length > 100) throw new Error("Nome muito longo");
    await ctx.db.patch(user._id, { name: trimmed });
  },
});
```

No schema change needed — `users.name` is already `v.optional(v.string())`.

### Frontend

New card section in `src/routes/settings.tsx`, inserted **above** the role section:

- Heading: "Seu nome" with a `User` icon
- `Input` pre-filled with `user.name ?? ""`
- Save button, disabled when value matches current name or is empty
- On success: shows "Salvo." feedback (same pattern as GroupAdminSection)
- On error: shows error message below input
- Implemented as a `UserNameSection` component inside `settings.tsx`, co-located with the other section components

This section is visible to **all roles** — no role gate needed.

---

## Feature 2: Admin Confirm Modals

### New component: `ConfirmDialog`

Location: `src/components/ui/confirm-dialog.tsx`

Wraps shadcn `Dialog`. Props:

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controls visibility |
| `onOpenChange` | `(open: boolean) => void` | Close handler |
| `title` | `string` | Dialog heading |
| `description` | `string` | Body text |
| `confirmLabel` | `string` | Label for the confirm button |
| `onConfirm` | `() => void` | Called when user clicks confirm |
| `destructive` | `boolean` | If true, confirm button uses red/destructive styling |
| `busy` | `boolean` | Disables buttons while action is in flight |

Requires installing `@radix-ui/react-dialog` via shadcn CLI (`bunx shadcn@latest add dialog`).

### Changes to `MemberRow` in `src/routes/escotista/admin.tsx`

Replace `busy: string | null` state with:

```ts
const [pendingAction, setPendingAction] = useState<"role" | "admin" | "ban" | null>(null);
```

Each button sets `pendingAction` instead of calling the mutation directly. A single `<ConfirmDialog>` at the bottom of `MemberRow` renders conditionally based on `pendingAction`.

#### Per-action dialog content

| Action | Title | Description | Confirm label | Destructive |
|--------|-------|-------------|---------------|-------------|
| Role change | "Trocar papel" | "Trocar o papel de **[name]** para **[new role]**?" | "Confirmar" | false |
| Admin toggle (grant) | "Tornar admin" | "Tornar **[name]** administrador do grupo?" | "Confirmar" | false |
| Admin toggle (revoke) | "Remover admin" | "Remover as permissões de admin de **[name]**?" | "Confirmar" | false |
| Ban | "Banir membro" | "Banir **[name]** do grupo? Esta ação não pode ser desfeita pela interface." | "Banir" | true |

Confirming closes the dialog and fires the existing mutation. The `ban` action's `window.confirm()` call is removed entirely.

A separate `busyAction` state tracks in-flight mutations (for disabling buttons and the dialog confirm). Opening a new `pendingAction` while one is in flight is blocked by disabling all buttons during `busyAction !== null`.

---

## Implementation Order

1. `bun` install shadcn Dialog
2. Create `ConfirmDialog` component
3. Add `updateName` mutation to `convex/users.ts`
4. Add `UserNameSection` to `settings.tsx`
5. Refactor `MemberRow` in `admin.tsx` to use `ConfirmDialog`
6. Run `bun test` + `bun run lint`

---

## Out of Scope

- Admin editing another member's name (not requested)
- Name validation beyond trim + length (e.g., no profanity filter)
- Confirm on ramo/unit edits (uses an explicit Save button already)
- Confirm on approve/reject pending members (those have distinct approve/reject buttons, not accidental)
