import { Suspense } from "react";
import { AuthLoading } from "convex/react";
import { UserMenu } from "./user-menu";

export function AuthButton() {
  return (
    <>
      <AuthLoading>
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
      </AuthLoading>
      <Suspense
        fallback={
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
        }
      >
        <UserMenu />
      </Suspense>
    </>
  );
}
