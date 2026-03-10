import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="flex gap-3 border-b pb-3">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-240px)]">
        <div className="rounded-lg border overflow-hidden">
          <div className="p-3 border-b">
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-3 border-b flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border overflow-hidden flex flex-col">
          <div className="p-3 border-b flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex-1 p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? "w-52" : "w-44"}`} />
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
