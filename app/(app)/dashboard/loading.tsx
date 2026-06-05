import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-425 flex-col gap-6 p-6 animate-in fade-in-0 duration-300">
      <header className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-44" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card px-5 py-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-32" />
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="ml-auto h-3 w-12" />
                <Skeleton className="ml-auto h-3 w-8" />
              </div>
            </div>
            <Skeleton className="mt-4 h-24 w-full" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-3 w-24" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-[3rem_2rem_1fr_repeat(7,minmax(0,1fr))] items-center gap-3 border-b bg-muted/40 px-3 py-3">
          <Skeleton className="h-3 w-4" />
          <span />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-14" />
          <Skeleton className="ml-auto h-3 w-12" />
          <Skeleton className="ml-auto h-3 w-12" />
          <Skeleton className="ml-auto h-3 w-8" />
          <Skeleton className="ml-auto h-3 w-8" />
          <Skeleton className="ml-auto h-3 w-8" />
          <Skeleton className="ml-auto h-3 w-8" />
        </div>

        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[3rem_2rem_1fr_repeat(7,minmax(0,1fr))] items-center gap-3 border-b px-3 py-3 last:border-0 animate-in fade-in-0 duration-500"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <Skeleton className="h-3 w-5" />
            <Skeleton className="size-4 rounded" />
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-6 shrink-0 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-10" />
              </div>
            </div>
            <Skeleton className="ml-auto h-3 w-12" />
            <Skeleton className="ml-auto h-3 w-16" />
            <Skeleton className="ml-auto h-3 w-12" />
            <Skeleton className="ml-auto h-3 w-10" />
            <Skeleton className="ml-auto h-3 w-10" />
            <Skeleton className="ml-auto h-3 w-10" />
            <Skeleton className="ml-auto h-3 w-10" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  )
}
