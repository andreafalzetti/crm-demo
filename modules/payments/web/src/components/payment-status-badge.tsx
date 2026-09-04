import { Badge } from "@workspace/ui/components/badge"

import type { PaymentPreview } from "../types"

export function PaymentStatusBadge({
  status,
}: {
  status: PaymentPreview["status"]
}) {
  if (status === "paid") return <Badge>Incassato</Badge>
  if (status === "pending") return <Badge variant="secondary">In attesa</Badge>
  if (status === "refunded") return <Badge variant="outline">Rimborsato</Badge>
  return <Badge variant="destructive">Fallito</Badge>
}
