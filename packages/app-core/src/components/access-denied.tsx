import { KeyRound } from "lucide-react"

import { EmptyState } from "./empty-state"

export function AccessDenied() {
  return (
    <EmptyState
      icon={KeyRound}
      title="Accesso non consentito"
      description="Il tuo ruolo non include il permesso necessario per questa sezione."
    />
  )
}
