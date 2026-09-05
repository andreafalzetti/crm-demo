import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, FilePlus2, FileText, Plus } from "lucide-react"

import {
  Can,
  EmptyState,
  PageHeader,
  TableLoader,
  formatDateTime,
  pb,
  useAuth,
  useClientManifest,
} from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { QuoteDialog } from "../components/quote-dialog"
import { QuoteStatusBadge } from "../components/quote-status-badge"
import { downloadQuotePdf } from "../lib/download-quote"
import { EURO_FORMATTER } from "../lib/format"
import type { OrganizationOption, Quote } from "../types"

export function QuotesPage() {
  const manifest = useClientManifest()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const quotes = useQuery({
    queryKey: ["quotes"],
    queryFn: () =>
      pb.collection<Quote>("quotes").getList(1, 100, {
        sort: "-created",
        expand: "organization",
      }),
  })

  async function generate(quote: Quote) {
    await downloadQuotePdf(quote.id, quote.number)
    void queryClient.invalidateQueries({ queryKey: ["quotes"] })
  }

  return (
    <>
      <PageHeader
        eyebrow="Commerciale"
        title="Preventivi"
        description="Dalla composizione delle voci al PDF pronto da condividere."
        actions={
          <Can permission="quotes.quotes.create">
            <Button onClick={() => setOpen(true)}>
              <Plus /> Nuovo preventivo
            </Button>
          </Can>
        }
      />
      {quotes.isLoading ? (
        <TableLoader />
      ) : quotes.data?.items.length ? (
        <div className="overflow-hidden rounded-xl border bg-card surface-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preventivo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Importo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead className="w-36" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.data.items.map((quote) => {
                const organization = quote.expand?.organization as
                  | OrganizationOption
                  | undefined
                return (
                  <TableRow key={quote.id}>
                    <TableCell>
                      <p className="font-medium">{quote.title}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {quote.number}
                      </p>
                    </TableCell>
                    <TableCell>{organization?.name ?? "—"}</TableCell>
                    <TableCell className="font-editorial text-lg">
                      {EURO_FORMATTER.format(quote.total)}
                    </TableCell>
                    <TableCell>
                      <QuoteStatusBadge status={quote.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {quote.generated_at
                        ? formatDateTime(quote.generated_at, manifest.timeZone)
                        : "Da generare"}
                    </TableCell>
                    <TableCell className="text-right">
                      {can("quotes.generate") && (
                        <Button
                          size="sm"
                          variant={quote.pdf ? "outline" : "default"}
                          onClick={() => void generate(quote)}
                        >
                          <Download /> {quote.pdf ? "Rigenera" : "Genera PDF"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={FilePlus2}
          title="Nessun preventivo"
          description="Crea il primo documento economico per un cliente."
        />
      )}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="size-4" /> I PDF sono generati lato server e
        salvati nello storage protetto.
      </div>
      {open && (
        <QuoteDialog
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void queryClient.invalidateQueries({ queryKey: ["quotes"] })
          }}
        />
      )}
    </>
  )
}
