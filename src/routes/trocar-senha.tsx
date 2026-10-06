import { useEffect } from "react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/trocar-senha")({
  component: ForcedPasswordChangePage,
});

/**
 * First sign-in of a conta gerenciada, or the first after an escotista issued
 * a new temporary password: the member picks their own before anything else.
 * `useAuthGate` sends them here while `mustChangePassword` is set.
 */
function ForcedPasswordChangePage() {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.viewer, {}));

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      void navigate({ to: "/signin" });
      return;
    }
    if (user && !user.mustChangePassword) void navigate({ to: "/" });
  }, [isLoading, isAuthenticated, user, navigate]);

  if (!user?.scoutId || !user.mustChangePassword) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm my-8 rounded-md border-2 border-black bg-card p-6 space-y-4 shadow-[6px_6px_0px_0px_#065f46]">
        <div className="flex items-center gap-3">
          <div className="rounded-md border-2 border-black bg-primary p-2">
            <KeyRound className="size-5 text-white" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase">Crie sua senha</h1>
            <p className="text-xs text-muted-foreground">
              Olá{user.name ? `, ${user.name}` : ""}! Escolha uma senha só sua
              para entrar com o registro{" "}
              <span className="font-mono font-bold">{user.scoutId}</span>.
            </p>
          </div>
        </div>
        <ChangePasswordForm scoutId={user.scoutId} forced />
        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full text-xs text-muted-foreground underline"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
