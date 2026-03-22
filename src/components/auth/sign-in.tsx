import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

export function SignInWithGoogle() {
  const { signIn } = useAuthActions();

  return (
    <Button
      variant="outline"
      onClick={() => void signIn("google")}
    >
      Sign in with Google
    </Button>
  );
}
