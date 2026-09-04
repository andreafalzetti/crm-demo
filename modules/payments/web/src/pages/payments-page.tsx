import {
  ArrowDownLeft,
  ArrowRight,
  CalendarCheck2,
  CreditCard,
  Landmark,
  ReceiptText,
  RefreshCcw,
} from "lucide-react"
import { Link } from "react-router-dom"

import { PageHeader } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { PaymentStatusBadge } from "../components/payment-status-badge"
import { PreviewBadge } from "../components/preview-badge"
import { payments } from "../mock-data"
import type { PaymentPreview } from "../types"

const MONEY = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
})

export function PaymentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Incassi e riconciliazione"
        title="Pagamenti"
        description="Un registro unico per pagamenti online e fisici, collegabile ad appuntamenti, clienti e documenti."
        actions={<PreviewBadge />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Incassato oggi" value="€ 860" note="8 transazioni" />
        <Metric label="Da incassare" value="€ 225" note="3 appuntamenti" />
        <Metric label="Online" value="64%" note="Mollie · ultimi 30 giorni" />
        <Metric
          label="Da riconciliare"
          value="2"
          note="1 POS · 1 bonifico"
          warning
        />
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="surface-shadow">
          <CardHeader>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
                  Registro contabile operativo
                </p>
                <h2 className="mt-1 font-editorial text-3xl">
                  Ultimi movimenti
                </h2>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/payments/settings">Configura canali</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Riferimento</TableHead>
                  <TableHead>Cliente / appuntamento</TableHead>
                  <TableHead className="hidden md:table-cell">Canale</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <p className="font-mono text-xs font-medium">
                        {payment.id}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {payment.createdAt}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{payment.customer}</p>
                      <p className="mt-1 max-w-56 truncate text-xs text-muted-foreground">
                        {payment.appointment ?? "Movimento non collegato"}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2 text-xs">
                        <MethodIcon method={payment.method} />
                        {methodLabel(payment.method)}
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {payment.provider}
                      </p>
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {payment.status === "refunded" ? "−" : ""}
                      {MONEY.format(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="surface-shadow">
          <CardHeader>
            <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
              Lifecycle normalizzato
            </p>
            <CardTitle className="mt-1 font-editorial text-3xl">
              Dal prezzo all’incasso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LifecycleStep
              icon={CalendarCheck2}
              title="Appuntamento valorizzato"
              detail="Il tipo di visita propone importo e policy."
            />
            <Connector />
            <LifecycleStep
              icon={CreditCard}
              title="Intento di pagamento"
              detail="Online, POS oppure registrazione manuale."
            />
            <Connector />
            <LifecycleStep
              icon={ReceiptText}
              title="Transazione immutabile"
              detail="Esito, provider e riferimenti esterni."
            />
            <Connector />
            <LifecycleStep
              icon={RefreshCcw}
              title="Riconciliazione"
              detail="Stato riportato su appuntamento e cliente."
            />
            <div className="mt-5 rounded-lg border border-dashed border-primary/30 bg-primary/[.045] p-4 text-xs leading-5 text-muted-foreground">
              Il modulo non conserva dati carta: registra soltanto
              identificativi, stato e importo restituiti dal provider.
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function Metric({
  label,
  value,
  note,
  warning,
}: {
  label: string
  value: string
  note: string
  warning?: boolean
}) {
  return (
    <Card className={warning ? "border-amber-500/25 bg-amber-500/[.045]" : ""}>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-2 font-editorial text-4xl">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  )
}

function MethodIcon({ method }: { method: PaymentPreview["method"] }) {
  const Icon =
    method === "cash"
      ? ArrowDownLeft
      : method === "bank-transfer"
        ? Landmark
        : CreditCard
  return <Icon className="size-3.5 text-primary" />
}

function methodLabel(method: PaymentPreview["method"]) {
  return {
    online: "Online",
    pos: "POS",
    cash: "Contanti",
    "bank-transfer": "Bonifico",
  }[method]
}

function LifecycleStep({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof CreditCard
  title: string
  detail: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
          {detail}
        </p>
      </div>
      <ArrowRight className="ml-auto size-4 text-muted-foreground/40" />
    </div>
  )
}

function Connector() {
  return <div className="mx-7 h-3 w-px bg-border" />
}
