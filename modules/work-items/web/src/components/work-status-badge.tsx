import { Badge } from "@workspace/ui/components/badge"

import { workStatusLabel } from "../lib/labels"

export function WorkStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === "in_progress"
          ? "default"
          : status === "planned"
            ? "secondary"
            : "outline"
      }
    >
      {workStatusLabel(status)}
    </Badge>
  )
}
