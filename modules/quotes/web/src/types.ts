import type { RecordModel } from "pocketbase"

export type Quote = RecordModel & {
  number: string
  title: string
  status: "draft" | "sent" | "accepted" | "rejected"
  organization: string
  work_item: string
  valid_until: string
  subtotal: number
  tax_total: number
  total: number
  notes: string
  pdf: string
  generated_at: string
}

export type OrganizationOption = RecordModel & {
  name: string
}

export type DraftLine = {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
}
