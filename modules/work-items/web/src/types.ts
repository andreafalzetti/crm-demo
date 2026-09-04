import type { RecordModel } from "pocketbase"

export type WorkItem = RecordModel & {
  code: string
  title: string
  kind: "intervention" | "assignment" | "event" | "session"
  status: "planned" | "in_progress" | "done" | "cancelled"
  priority: "low" | "normal" | "high"
  organization: string
  start_at: string
  end_at: string
  location: string
  description: string
}

export type StaffOption = RecordModel & {
  first_name: string
  last_name: string
  job_title: string
}

export type OrganizationOption = RecordModel & {
  name: string
}
