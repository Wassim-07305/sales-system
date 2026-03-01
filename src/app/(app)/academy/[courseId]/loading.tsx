import { Skeleton } from "@/components/ui/skeleton";

export default function CourseLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] -m-5 md:-m-8">
      {/* Sidebar skeleton */}
      <aside className="hidden md:flex w-[300px] shrink-0 border-r border-border bg-card flex-col">
        <div className="px-5 py-4 border-b border-border space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="px-5 py-4 border-b border-border space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="p-2 space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-10 w-full rounded-md" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-9 w-full ml-4 rounded-md" />
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* Content skeleton */}
      <div className="flex-1 p-6 md:p-8 space-y-6">
        <Skeleton className="aspect-video w-full max-w-4xl rounded-xl" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-3/4 max-w-2xl" />
      </div>
    </div>
  );
}
