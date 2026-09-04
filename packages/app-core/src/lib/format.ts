const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function formatDateTime(value: string) {
  if (!value) return "—"
  return DATE_TIME_FORMATTER.format(new Date(value))
}

export function initials(name?: string) {
  return (name || "Utente")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}
