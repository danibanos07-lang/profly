import { CardGridSkeleton } from "@/components/catalog/card-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-5 h-10 max-w-2xl" />
      <div className="mt-14 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <Skeleton className="hidden h-96 rounded-2xl lg:block" />
        <CardGridSkeleton />
      </div>
    </div>
  );
}
