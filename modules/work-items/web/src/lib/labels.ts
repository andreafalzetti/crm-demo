export function workStatusLabel(value: string) {
  return (
    (
      {
        planned: "Pianificato",
        in_progress: "In corso",
        done: "Completato",
        cancelled: "Annullato",
      } as Record<string, string>
    )[value] ?? value
  )
}

export function workKindLabel(value: string) {
  return (
    (
      {
        intervention: "Intervento",
        assignment: "Incarico",
        event: "Evento",
        session: "Seduta",
      } as Record<string, string>
    )[value] ?? value
  )
}
