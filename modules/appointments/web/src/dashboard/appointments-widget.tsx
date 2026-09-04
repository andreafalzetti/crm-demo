import { ArrowUpRight, CalendarRange, Route } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

export function AppointmentsWidget() {
  return (
    <Card className="border-primary/20 bg-primary/[.045] surface-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <CalendarRange className="size-5" />
          </span>
          <span className="rounded-full border bg-card px-2 py-1 text-[10px] font-semibold tracking-[.14em] text-primary uppercase">
            Mock
          </span>
        </div>
        <p className="mt-5 text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
          Appuntamenti oggi
        </p>
        <div className="mt-1 flex items-end gap-3">
          <p className="font-editorial text-5xl">12</p>
          <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Route className="size-3.5" /> 2 assegnati automaticamente
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="mt-6 bg-card">
          <Link to="/appointments">
            Apri cabina operativa <ArrowUpRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
