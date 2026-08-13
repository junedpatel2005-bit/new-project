"use client";

import Skeleton, { SkeletonTheme } from "react-loading-skeleton";

export function AppSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <SkeletonTheme baseColor="var(--color-muted)" highlightColor="var(--color-card)">
      {children}
    </SkeletonTheme>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <AppSkeleton>
      <div className="space-y-3" aria-label="Loading content" role="status">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex gap-4">
              <Skeleton circle width={44} height={44} />
              <div className="min-w-0 flex-1">
                <Skeleton width="42%" height={20} />
                <div className="mt-3 flex gap-3"><Skeleton width={115} /><Skeleton width={145} /></div>
              </div>
              <Skeleton className="hidden sm:block" width={105} height={36} borderRadius={9} />
            </div>
          </div>
        ))}
      </div>
    </AppSkeleton>
  );
}

export function DashboardSkeleton() {
  return (
    <AppSkeleton>
      <div className="space-y-6" aria-label="Loading dashboard" role="status">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height={142} borderRadius={16} />)}
        </div>
        <Skeleton height={360} borderRadius={16} />
      </div>
    </AppSkeleton>
  );
}
