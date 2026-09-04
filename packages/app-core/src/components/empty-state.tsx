import { Search, type LucideIcon } from "lucide-react"

export function EmptyState({
  title,
  description,
  icon: Icon = Search,
}: {
  title: string
  description: string
  icon?: LucideIcon
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-xl border border-dashed bg-card/55 p-8 text-center">
      <div>
        <span className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </span>
        <h3 className="font-editorial text-xl font-medium">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )
}
