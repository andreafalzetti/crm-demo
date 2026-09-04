import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"

export function EditorField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function EditorToggle({
  icon: Icon,
  title,
  description,
  defaultChecked,
  onChange,
}: {
  icon: LucideIcon
  title: string
  description: string
  defaultChecked?: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 text-primary" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Switch defaultChecked={defaultChecked} onCheckedChange={onChange} />
    </div>
  )
}
