import { Skeleton } from "@/components/ui/skeleton";

export default function ReferralLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Referral link card */}
      <div className="rounded-lg border p-6 bg-gradient-to-r from-muted to-muted/80">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-12 w-12 rounded-full bg-zinc-700" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48 bg-zinc-700" />
            <Skeleton className="h-3 w-72 bg-zinc-700" />
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-10 flex-1 bg-zinc-700" />
          <Skeleton className="h-10 w-24 bg-zinc-700" />
          <Skeleton className="h-10 w-10 bg-zinc-700" />
        </div>
        <Skeleton className="h-4 w-40 bg-zinc-700" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Invite */}
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="p-4 flex gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* History */}
      <div className="rounded-lg border">
        <div className="p-4 border-b flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded" />
            ))}
          </div>
        </div>
        <div className="p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 py-3 border-b last:border-b-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
