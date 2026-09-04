import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, FileText, Plus } from "lucide-react"

import { Can, EmptyState, TableLoader, pb, useAuth } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { downloadQuotePdf } from "../lib/download-quote"
import { EURO_FORMATTER } from "../lib/format"
import type { Quote } from "../types"
import { QuoteDialog } from "./quote-dialog"
import { QuoteStatusBadge } from "./quote-status-badge"

export function CustomerQuotes({ organizationId }: { organizationId: string }) {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const quotes = useQuery({
    queryKey: ["customer-quotes", organizationId],
    queryFn: () =>
      pb.collection<Quote>("quotes").getFullList({
        filter: pb.filter("organization = {:organization}", {
          organization: organizationId,
        }),
        sort: "-created",
      }),
  })

  if (quotes.isLoading) return <TableLoader />
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Can permission="quotes.quotes.create">
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus /> Nuovo preventivo
          </Button>
        </Can>
      </div>
      {quotes.data?.length ? (
        <div className="overflow-hidden rounded-xl border bg-card surface-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Oggetto</TableHead>
                <TableHead>Totale</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.data.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-mono text-xs">
                    {quote.number}
                  </TableCell>
                  <TableCell className="font-medium">{quote.title}</TableCell>
                  <TableCell>{EURO_FORMATTER.format(quote.total)}</TableCell>
                  <TableCell>
                    <QuoteStatusBadge status={quote.status} />
                  </TableCell>
                  <TableCell>
                    {can("quotes.generate") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void downloadQuotePdf(quote.id, quote.number)
                        }
                      >
                        <Download /> PDF
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Nessun preventivo collegato"
          description="Crea un preventivo direttamente dalla scheda cliente."
        />
      )}
      {open && (
        <QuoteDialog
          initialOrganization={organizationId}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void queryClient.invalidateQueries({
              queryKey: ["customer-quotes", organizationId],
            })
          }}
        />
      )}
    </>
  )
}
