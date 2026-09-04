const TIME_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
})

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

export function dayKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function dateTimeLabel(value: string) {
  return TIME_FORMATTER.format(new Date(value))
}
