import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex flex-col items-center">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-5 w-32 mt-4" />
              <Skeleton className="h-4 w-24 mt-1" />
              <Skeleton className="h-6 w-20 rounded-full mt-2" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="rounded-lg border p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
