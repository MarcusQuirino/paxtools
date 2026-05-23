import { Suspense } from "react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { UserMenu } from "./user-menu";

const AvatarSkeleton = () => (
  <div className="size-8 animate-pulse rounded-sm bg-muted border-2 border-black" />
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
