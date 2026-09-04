import type { RecordModel } from "pocketbase"

export type AgendaEntry = RecordModel & {
  title: string
  type: "appointment" | "reminder" | "block"
  start_at: string
  end_at: string
  organization: string
  staff: string
  work_item: string
  notes: string
}

export type AgendaEvent = {
  id: string
  title: string
  start: string
  source: "agenda" | "work" | "leave"
  meta: string
  staffId?: string
}

export type NamedRecord = RecordModel & {
  name: string
  first_name: string
  last_name: string
}
