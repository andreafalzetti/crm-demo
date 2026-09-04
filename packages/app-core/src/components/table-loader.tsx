import { Skeleton } from "@workspace/ui/components/skeleton"

export function TableLoader() {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  )
}
