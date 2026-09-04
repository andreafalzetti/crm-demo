import { Badge } from "@workspace/ui/components/badge"

import { quoteStatusLabel } from "../lib/format"

export function QuoteStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === "accepted"
          ? "default"
          : status === "draft"
            ? "secondary"
            : "outline"
      }
    >
      {quoteStatusLabel(status)}
    </Badge>
  )
}
