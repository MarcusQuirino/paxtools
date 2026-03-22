import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInWithGoogle } from "./sign-in";
import { UserMenu } from "./user-menu";

export function AuthButton() {
  return (
    <>
      <AuthLoading>
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
      </AuthLoading>
      <Unauthenticated>
        <SignInWithGoogle />
      </Unauthenticated>
      <Authenticated>
        <UserMenu />
      </Authenticated>
    </>
  );
}
