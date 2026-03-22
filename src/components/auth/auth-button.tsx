import { Suspense } from "react";
import { AuthLoading } from "convex/react";
import { UserMenu } from "./user-menu";

export function AuthButton() {
  return (
    <>
      <AuthLoading>
        <div className="size-8 animate-pulse rounded-full bg-muted" />
      </AuthLoading>
      <Suspense
        fallback={
          <div className="size-8 animate-pulse rounded-full bg-muted" />
        }
      >
        <UserMenu />
      </Suspense>
    </>
  );
}
