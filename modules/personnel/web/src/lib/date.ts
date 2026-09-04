const DAY_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

export function toPocketBaseDate(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : ""
}

export function dateInputValue(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function formatDay(value: string) {
  if (!value) return "—"
  return DAY_FORMATTER.format(new Date(value))
}
