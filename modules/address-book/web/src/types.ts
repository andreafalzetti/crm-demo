import type { RecordModel } from "pocketbase"

export type Organization = RecordModel & {
  name: string
  legal_name: string
  vat_number: string
  email: string
  phone: string
  website: string
  address: string
  status: "prospect" | "active" | "archived"
}

export type Contact = RecordModel & {
  first_name: string
  last_name: string
  position: string
  email: string
  phone: string
  mobile: string
  status: "active" | "inactive"
  organization: string
}

export type ActivityRecord = RecordModel & {
  subject: string
  type: "call" | "email" | "meeting" | "task"
  status: "open" | "done" | "cancelled"
  due_at: string
  organization: string
  contact: string
  assignee: string
}
