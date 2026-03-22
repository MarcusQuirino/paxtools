import { useAuthActions } from "@convex-dev/auth/react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { signOut } = useAuthActions();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      {user.image && (
        <img
          src={user.image}
          alt={user.name ?? ""}
          className="size-8 rounded-full"
        />
      )}
      <span className="text-sm font-medium">{user.name ?? user.email}</span>
      <Button variant="ghost" size="sm" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );
}
