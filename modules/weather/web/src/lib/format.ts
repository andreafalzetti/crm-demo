/**
 * Forecast days arrive as `YYYY-MM-DD` already expressed in the place's own
 * timezone, so they must be rendered as plain calendar dates. Passing them
 * through `new Date()` would reinterpret them as UTC midnight and, for any
 * viewer west of Greenwich, shift the label back by a day.
 */
function parseCalendarDay(date: string) {
  const [year, month, day] = date.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(Date.UTC(year, month - 1, day))
}

export function dayLabel(date: string, locale = "it-IT") {
  const parsed = parseCalendarDay(date)
  if (!parsed) return date
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parsed)
}

export function weekdayLabel(date: string, locale = "it-IT") {
  const parsed = parseCalendarDay(date)
  if (!parsed) return date
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  }).format(parsed)
}

/** `todayKey` must be computed in the place's timezone, not the browser's. */
export function todayKey(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function relativeDayLabel(date: string, timeZone: string) {
  const today = todayKey(timeZone)
  if (date === today) return "oggi"
  const parsed = parseCalendarDay(today)
  if (parsed) {
    parsed.setUTCDate(parsed.getUTCDate() + 1)
    if (date === parsed.toISOString().slice(0, 10)) return "domani"
  }
  return dayLabel(date)
}

/** Hourly steps are real instants, so they are formatted in the place's zone. */
export function hourLabel(iso: string, timeZone: string) {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return "—"
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(parsed)
}

export function temperature(value?: number) {
  return value === undefined || value === null ? "—" : `${Math.round(value)}°`
}

export function millimetres(value: number) {
  if (value <= 0) return "—"
  return `${value < 1 ? value.toFixed(1) : Math.round(value)} mm`
}

/** MET publishes wind in m/s; operators read km/h. */
export function windKmh(value: number) {
  return `${Math.round(value * 3.6)} km/h`
}
