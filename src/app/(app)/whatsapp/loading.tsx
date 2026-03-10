import { Skeleton } from "@/components/ui/skeleton";

export default function WhatsappLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-[350px_1fr] gap-4 h-[calc(100vh-280px)]">
        <div className="rounded-lg border overflow-hidden">
          <div className="p-3 border-b">
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 border-b flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex-1 p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <Skeleton className={`h-14 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-40"}`} />
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
