import { Skeleton } from "@/components/ui/skeleton";

export default function ChallengesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="rounded-2xl border-0 bg-gradient-to-r from-muted to-muted/80 p-6">
        <div className="flex items-center gap-6">
          <Skeleton className="h-16 w-16 rounded-full bg-zinc-700" />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-36 bg-zinc-700" />
              <Skeleton className="h-5 w-14 rounded-full bg-zinc-700" />
            </div>
            <Skeleton className="h-4 w-28 bg-zinc-700" />
            <div className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16 bg-zinc-700" />
                <Skeleton className="h-3 w-16 bg-zinc-700" />
              </div>
              <Skeleton className="h-2 w-full bg-zinc-700" />
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-12 mx-auto bg-zinc-700" />
              <Skeleton className="h-3 w-16 bg-zinc-700" />
            </div>
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-12 mx-auto bg-zinc-700" />
              <Skeleton className="h-3 w-16 bg-zinc-700" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-40 rounded-lg" />
        <div className="lg:col-span-2">
          <Skeleton className="h-40 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/40 p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-2.5 w-full" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border/40 p-4 space-y-4">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
