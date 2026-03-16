import { Skeleton } from "@/components/ui/skeleton";

export default function KpisLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-4 w-56 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-card p-5 space-y-3 shadow-sm"
          >
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4 shadow-sm">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    </div>
  );
}
