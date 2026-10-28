import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="size-10" />
      </div>
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ReviewSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-11/12" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-5">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Skeleton className="h-72 rounded-2xl" />
        <div className="space-y-4">
          <ReviewSkeleton />
          <ReviewSkeleton />
        </div>
      </div>
    </div>
  );
}
