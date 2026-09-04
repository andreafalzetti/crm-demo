import { Badge } from "@workspace/ui/components/badge"

import type { StaffMember } from "../types"

export function StaffBadge({ staff }: { staff: StaffMember }) {
  return (
    <Badge variant={staff.status === "active" ? "default" : "outline"}>
      {staff.status === "active" ? "Attivo" : "Non attivo"}
    </Badge>
  )
}
