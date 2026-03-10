import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded" />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
