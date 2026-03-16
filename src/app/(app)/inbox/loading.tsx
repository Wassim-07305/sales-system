import { Skeleton } from "@/components/ui/skeleton";

export default function InboxLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <div className="grid md:grid-cols-[350px_1fr] gap-4 h-[calc(100dvh-200px)]">
        <div className="rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="p-3 border-b">
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="p-3 border-b flex items-center gap-3 hover:bg-secondary/50 transition-colors"
              >
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          </div>
          <div className="flex-1 p-4 space-y-3">
            <div className="flex justify-start">
              <Skeleton className="h-16 w-48 rounded-2xl" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-12 w-40 rounded-2xl" />
            </div>
            <div className="flex justify-start">
              <Skeleton className="h-20 w-56 rounded-2xl" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-14 w-44 rounded-2xl" />
            </div>
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
