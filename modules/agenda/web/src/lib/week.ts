import { DEFAULT_TIME_ZONE } from "@crm/app-core"

export function startOfWeek(value: Date) {
  const result = new Date(value)
  const day = result.getDay() || 7
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() - day + 1)
  return result
}

export function addDays(value: Date, amount: number) {
  const result = new Date(value)
  result.setDate(result.getDate() + amount)
  return result
}

export function dayKey(
  value: string | Date,
  timeZone: string = DEFAULT_TIME_ZONE
) {
  const date = typeof value === "string" ? new Date(value) : value
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}`
}

export function dateTimeLabel(
  value: string,
  timeZone: string = DEFAULT_TIME_ZONE
) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value))
}
