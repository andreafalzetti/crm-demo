import { useState } from "react"
import {
  CalendarCheck2,
  CalendarOff,
  RefreshCcw,
  Route,
  Scale,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react"

import { PageHeader } from "@crm/app-core"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"

import { AvailabilityWeek } from "../components/availability-week"
import { PreviewBadge } from "../components/preview-badge"
import { RoutingPreview } from "../components/routing-preview"

export function SchedulingRulesPage() {
  const [simulation, setSimulation] = useState(0)
  const [strategy, setStrategy] = useState("balanced")

  return (
    <>
      <PageHeader
        eyebrow="Disponibilità e distribuzione"
        title="Regole di prenotazione"
        description="Il motore compone orari contrattuali, eccezioni del personale, impegni in agenda e criteri di assegnazione."
        actions={<PreviewBadge />}
      />

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <FlowStep
          number="01"
          title="Filtra competenze"
          detail="Tipo visita e sede"
          icon={UserRoundCheck}
        />
        <FlowStep
          number="02"
          title="Calcola gli slot"
          detail="Turni meno eccezioni"
          icon={CalendarCheck2}
        />
        <FlowStep
          number="03"
          title="Distribuisce"
          detail="Strategia configurata"
          icon={Scale}
        />
        <FlowStep
          number="04"
          title="Popola l’agenda"
          detail="Slot e riferimenti"
          icon={Route}
        />
      </div>

      <AvailabilityWeek />

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[.75fr_1.25fr]">
        <Card className="surface-shadow">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
                  Policy dello studio
                </p>
                <CardTitle className="mt-1 font-editorial text-3xl">
                  Distribuzione
                </CardTitle>
              </div>
              <ShieldCheck className="size-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="routing-strategy">
                Strategia principale
              </label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger id="routing-strategy" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Carico più basso</SelectItem>
                  <SelectItem value="round-robin">Round robin</SelectItem>
                  <SelectItem value="priority">Priorità configurata</SelectItem>
                  <SelectItem value="manual">Scelta manuale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <RuleToggle
              title="Escludi ferie e assenze"
              description="Legge solo richieste approvate dal modulo Personale."
              defaultChecked
              icon={CalendarOff}
            />
            <RuleToggle
              title="Preferisci continuità"
              description="Se possibile propone il professionista precedente."
              defaultChecked
              icon={UserRoundCheck}
            />
            <RuleToggle
              title="Bilancia il carico"
              description="Considera ore e appuntamenti già assegnati."
              defaultChecked={strategy === "balanced"}
              icon={Scale}
            />
            <Button
              className="w-full"
              onClick={() => setSimulation((current) => current + 1)}
            >
              <RefreshCcw /> Simula assegnazione
            </Button>
            <p className="text-center text-[10px] text-muted-foreground">
              Interazione dimostrativa, nessun record viene creato.
            </p>
          </CardContent>
        </Card>
        <RoutingPreview simulation={simulation} />
      </div>
    </>
  )
}

function FlowStep({
  number,
  title,
  detail,
  icon: Icon,
}: {
  number: string
  title: string
  detail: string
  icon: typeof Route
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <Badge variant="outline" className="mb-2 h-4 px-1.5 text-[9px]">
            {number}
          </Badge>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function RuleToggle({
  title,
  description,
  defaultChecked,
  icon: Icon,
}: {
  title: string
  description: string
  defaultChecked?: boolean
  icon: typeof Route
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 text-primary" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  )
}
