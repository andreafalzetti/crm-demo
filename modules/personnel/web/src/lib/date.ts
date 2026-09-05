import { DEFAULT_TIME_ZONE } from "@crm/app-core"

export function toPocketBaseDate(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : ""
}

export function dateInputValue(
  value: Date,
  timeZone: string = DEFAULT_TIME_ZONE
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value)
  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `${valueFor("year")}-${valueFor("month")}-${valueFor("day")}`
}

export function formatDay(value: string, timeZone: string = DEFAULT_TIME_ZONE) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(new Date(value))
}
