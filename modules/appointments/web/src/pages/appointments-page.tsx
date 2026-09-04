import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Route,
  Settings2,
  UserRoundCheck,
  UsersRound,
} from "lucide-react"
import { Link } from "react-router-dom"

import { PageHeader } from "@crm/app-core"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { PreviewBadge } from "../components/preview-badge"
import { appointments } from "../mock-data"
import type { AppointmentPreview } from "../types"

const FLOW = [
  { label: "Richiesta", detail: "Tipo visita", icon: CalendarDays },
  { label: "Regole", detail: "Vincoli e priorità", icon: Route },
  { label: "Persona", detail: "Disponibilità", icon: UsersRound },
  { label: "Agenda", detail: "Slot riservato", icon: CheckCircle2 },
  { label: "Pagamento", detail: "Se previsto", icon: CreditCard },
]

export function AppointmentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Studio medico · cabina operativa"
        title="Appuntamenti"
        description="Dalla richiesta del paziente all’assegnazione del professionista, con agenda e incasso nello stesso flusso."
        actions={<PreviewBadge />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Appuntamenti oggi"
          value="12"
          note="9 confermati · 1 in attesa"
          accent
        />
        <Metric
          label="Occupazione"
          value="76%"
          note="+8% sulla scorsa settimana"
        />
        <Metric
          label="Da assegnare"
          value="2"
          note="Regola manuale richiesta"
        />
        <Metric
          label="Da incassare"
          value="€ 225"
          note="3 pagamenti collegati"
        />
      </div>

      <Card className="mt-5 border-primary/20 bg-primary/[.035] surface-shadow">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
                Un solo flusso, moduli separati
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ogni passaggio conserva il proprio dato e comunica tramite
                eventi applicativi.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/appointments/rules">
                Apri le regole <Settings2 />
              </Link>
            </Button>
          </div>
          <div className="grid gap-2 lg:grid-cols-5">
            {FLOW.map(({ label, detail, icon: Icon }, index) => (
              <div key={label} className="relative flex items-center gap-3">
                <div className="flex min-h-20 flex-1 items-center gap-3 rounded-lg border bg-card p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {detail}
                    </p>
                  </div>
                </div>
                {index < FLOW.length - 1 && (
                  <ArrowRight className="hidden size-4 shrink-0 text-primary/50 lg:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="surface-shadow">
          <CardHeader>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
                  Oggi · venerdì 4 settembre
                </p>
                <h2 className="mt-1 font-editorial text-3xl">
                  Prossimi appuntamenti
                </h2>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/agenda">Vedi agenda</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ora</TableHead>
                  <TableHead>Paziente</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Assegnazione
                  </TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-editorial text-lg">
                      {appointment.time}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            appointment.status === "arrived"
                              ? "size-2 rounded-full bg-primary"
                              : appointment.status === "pending"
                                ? "size-2 rounded-full bg-amber-500"
                                : "size-2 rounded-full bg-sky-500"
                          }
                        />
                        <div>
                          <p className="font-medium">{appointment.patient}</p>
                          <p className="text-xs text-muted-foreground">
                            {appointment.type}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm">{appointment.professional}</p>
                      <p className="text-xs text-muted-foreground">
                        {appointment.room}
                      </p>
                    </TableCell>
                    <TableCell>
                      <PaymentBadge appointment={appointment} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-primary/25 bg-[#1d211e] text-stone-100 surface-shadow">
          <CardContent className="relative p-6">
            <div className="absolute -right-16 -bottom-24 size-56 rounded-full border border-emerald-300/15" />
            <UserRoundCheck className="size-6 text-emerald-300" />
            <p className="mt-8 text-[10px] font-semibold tracking-[.2em] text-emerald-300 uppercase">
              Prossimo ingresso
            </p>
            <p className="mt-2 font-editorial text-4xl">10:15 · Marco Riva</p>
            <p className="mt-2 text-sm text-stone-400">
              Visita di controllo con Dott. Romano
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <DarkDetail icon={Clock3} label="Durata" value="30 min" />
              <DarkDetail
                icon={CreditCard}
                label="Incasso"
                value="€ 75 dovuti"
              />
            </div>
            <Button
              asChild
              variant="secondary"
              className="relative mt-6 w-full"
            >
              <Link to="/appointments/types">Configura tipi di visita</Link>
            </Button>
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
  accent,
}: {
  label: string
  value: string
  note: string
  accent?: boolean
}) {
  return (
    <Card className={accent ? "border-primary/25 bg-primary/[.055]" : ""}>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-2 font-editorial text-4xl">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  )
}

function PaymentBadge({ appointment }: { appointment: AppointmentPreview }) {
  if (appointment.paymentStatus === "not-required") {
    return <Badge variant="outline">Non previsto</Badge>
  }
  if (appointment.paymentStatus === "paid") {
    return (
      <Badge>
        <span className="hidden sm:inline">Pagato · </span>€{" "}
        {appointment.amount}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">
      <span className="hidden sm:inline">Da incassare · </span>€{" "}
      {appointment.amount}
    </Badge>
  )
}

function DarkDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[.045] p-3">
      <Icon className="size-4 text-emerald-300" />
      <p className="mt-2 text-[10px] text-stone-500">{label}</p>
      <p className="mt-0.5 text-xs font-medium">{value}</p>
    </div>
  )
}
