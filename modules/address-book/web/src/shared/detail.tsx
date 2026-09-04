import type { ReactNode } from "react"

export function Detail({
  label,
  value,
  icon,
}: {
  label: string
  value?: string
  icon?: ReactNode
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 flex items-center gap-2 text-sm">
        {icon && <span className="text-primary [&_svg]:size-4">{icon}</span>}
        {value || "—"}
      </p>
    </div>
  )
}
