import type { ReactNode } from "react"

export function DataSurface({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card surface-shadow">
      {children}
    </div>
  )
}
