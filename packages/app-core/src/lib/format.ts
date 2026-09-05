import { DEFAULT_TIME_ZONE } from "../manifest"

export function formatDateTime(
  value: string,
  timeZone: string = DEFAULT_TIME_ZONE
) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value))
}

export function initials(name?: string) {
  return (name || "Utente")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}
