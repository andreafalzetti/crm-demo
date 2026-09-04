export const EURO_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
})

export function quoteStatusLabel(value: string) {
  return (
    (
      {
        draft: "Bozza",
        sent: "Inviato",
        accepted: "Accettato",
        rejected: "Rifiutato",
      } as Record<string, string>
    )[value] ?? value
  )
}
