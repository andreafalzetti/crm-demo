import { FlaskConical } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"

export function PreviewBadge() {
  return (
    <Badge variant="outline" className="gap-1.5 bg-card">
      <FlaskConical /> Demo concettuale
    </Badge>
  )
}
