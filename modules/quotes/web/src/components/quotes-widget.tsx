import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, FileText } from "lucide-react"
import { Link } from "react-router-dom"

import { pb } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import { EURO_FORMATTER } from "../lib/format"
import type { Quote } from "../types"

export function QuotesWidget() {
  const quotes = useQuery({
    queryKey: ["dashboard", "quotes"],
    queryFn: () =>
      pb.collection<Quote>("quotes").getList(1, 100, {
        filter: 'status = "draft" || status = "sent"',
        fields: "id,total,status",
      }),
  })
  const value =
    quotes.data?.items.reduce((sum, quote) => sum + quote.total, 0) ?? 0

  return (
    <Card className="surface-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
              Preventivi
            </p>
            <h2 className="mt-2 font-editorial text-3xl">Pipeline</h2>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-muted">
            <FileText className="size-5" />
          </span>
        </div>
        <p className="mt-7 font-editorial text-4xl">
          {quotes.isLoading ? "—" : EURO_FORMATTER.format(value)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {quotes.isLoading ? "—" : (quotes.data?.totalItems ?? 0)} documenti
          aperti
        </p>
        <Button asChild variant="ghost" size="sm" className="mt-5 -ml-3">
          <Link to="/quotes">
            Apri preventivi <ArrowUpRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
