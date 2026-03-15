import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-4 w-56 rounded-lg" />
      </div>

      {/* Avatar & Identity Card */}
      <div className="rounded-2xl border border-border/60 overflow-hidden">
        <Skeleton className="h-24 w-full rounded-none" />
        <div className="px-6 pb-6 -mt-10 relative z-10">
          <div className="flex items-end gap-5">
            <Skeleton className="h-24 w-24 rounded-2xl border-4 border-white shrink-0" />
            <div className="pb-1 space-y-2">
              <Skeleton className="h-6 w-40 rounded-lg" />
              <Skeleton className="h-4 w-48 rounded-lg" />
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-border/60 p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-lg" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded-lg" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <Skeleton className="h-11 w-52 rounded-xl" />
      </div>
    </div>
  );
}
