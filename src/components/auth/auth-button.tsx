import { Suspense } from "react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { UserMenu } from "./user-menu";

const AvatarSkeleton = () => (
  <div className="size-8 animate-pulse rounded-full bg-muted" />
);

export function AuthButton() {
  return (
    <>
      <AuthLoading>
        <AvatarSkeleton />
      </AuthLoading>
      <Unauthenticated>
        <AvatarSkeleton />
      </Unauthenticated>
      <Authenticated>
        <Suspense fallback={<AvatarSkeleton />}>
          <UserMenu />
        </Suspense>
      </Authenticated>
    </>
  );
}
