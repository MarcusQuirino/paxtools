/**
 * Page chrome for every signed-in screen: cream page, max-w-lg column, 16px
 * gutters, the page header, content, Footer, and — when given — the fixed
 * TabBar with enough bottom padding that nothing hides behind it.
 */
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";

export function AppShell({
  header,
  tabBar,
  children,
  className,
  testId,
}: {
  header?: ReactNode;
  tabBar?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div className="min-h-screen bg-background text-[#141414]" data-testid={testId}>
      <div
        className={cn(
          "mx-auto max-w-lg space-y-4 px-4 pt-4",
          tabBar ? "pb-[calc(6rem+env(safe-area-inset-bottom))]" : "pb-8",
          className,
        )}
      >
        {header}
        {children}
        <Footer />
      </div>
      {tabBar}
    </div>
  );
}

/** Skeleton for the shell while auth/hydration settles. */
export function AppShellSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4 pb-24">
        <header className="flex items-end justify-between pt-1">
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-[#EEE9DC]" />
            <div className="h-7 w-40 animate-pulse rounded bg-[#EEE9DC]" />
          </div>
          <div className="size-11 animate-pulse rounded-full bg-[#EEE9DC]" />
        </header>
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-[10px] border-2 border-[#141414] bg-[#EEE9DC]"
          />
        ))}
      </div>
    </div>
  );
}
