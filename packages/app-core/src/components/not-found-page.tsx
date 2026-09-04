import { Link } from "react-router-dom"

import { Button } from "@workspace/ui/components/button"

export function NotFoundPage() {
  return (
    <div className="grid min-h-[65svh] place-items-center text-center">
      <div>
        <p className="font-editorial text-8xl font-medium text-primary italic">
          404
        </p>
        <h1 className="mt-2 font-editorial text-3xl">Pagina non trovata</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Il percorso richiesto non appartiene a questo CRM.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Torna alla panoramica</Link>
        </Button>
      </div>
    </div>
  )
}
