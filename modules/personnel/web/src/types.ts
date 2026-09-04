import type { RecordModel } from "pocketbase"

export type StaffMember = RecordModel & {
  employee_code: string
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  status: "active" | "inactive"
  user: string
}

export type AttendanceEntry = RecordModel & {
  staff: string
  day: string
  kind: "present" | "remote" | "absent"
  clock_in: string
  clock_out: string
  note: string
}

export type LeaveRequest = RecordModel & {
  staff: string
  type: "vacation" | "sick" | "permit"
  start_date: string
  end_date: string
  status: "pending" | "approved" | "rejected"
  note: string
}
