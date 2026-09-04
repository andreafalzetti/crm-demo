export type PaymentPreview = {
  id: string
  createdAt: string
  customer: string
  appointment: string | null
  amount: number
  method: "online" | "pos" | "cash" | "bank-transfer"
  status: "paid" | "pending" | "refunded" | "failed"
  provider: string
}

export type PaymentChannel = {
  id: string
  name: string
  description: string
  mode: "online" | "physical" | "manual"
  status: "available" | "enabled" | "planned"
  detail: string
}
