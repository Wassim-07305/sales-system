import { Skeleton } from "@/components/ui/skeleton";

export default function BookingsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="rounded-lg border">
        <div className="grid grid-cols-7 border-b">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="p-3 text-center border-r last:border-r-0">
              <Skeleton className="h-4 w-12 mx-auto" />
            </div>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, week) => (
          <div key={week} className="grid grid-cols-7 border-b last:border-b-0">
            {Array.from({ length: 7 }).map((_, day) => (
              <div key={day} className="p-2 min-h-[100px] border-r last:border-r-0">
                <Skeleton className="h-4 w-6 mb-2" />
                {Math.random() > 0.7 && (
                  <Skeleton className="h-8 w-full rounded" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
