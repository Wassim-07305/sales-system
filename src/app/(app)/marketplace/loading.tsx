import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplaceLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border overflow-hidden">
            <Skeleton className="h-40 w-full" />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
