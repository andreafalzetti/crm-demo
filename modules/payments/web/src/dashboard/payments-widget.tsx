import { ArrowUpRight, CircleDollarSign, CreditCard } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

export function PaymentsWidget() {
  return (
    <Card className="surface-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <CircleDollarSign className="size-5" />
          </span>
          <span className="rounded-full border px-2 py-1 text-[10px] font-semibold tracking-[.14em] text-muted-foreground uppercase">
            Mock
          </span>
        </div>
        <p className="mt-5 text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
          Incassi di oggi
        </p>
        <div className="mt-1 flex items-end gap-3">
          <p className="font-editorial text-5xl">€ 860</p>
          <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <CreditCard className="size-3.5" /> 64% online
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="mt-6">
          <Link to="/payments">
            Apri movimenti <ArrowUpRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
