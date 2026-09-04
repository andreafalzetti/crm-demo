import { useState } from "react"
import {
  CalendarClock,
  Check,
  CreditCard,
  ExternalLink,
  Route,
  Save,
  UsersRound,
} from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import type { AppointmentType } from "../types"

export function AppointmentTypeEditor({ item }: { item: AppointmentType }) {
  const [saved, setSaved] = useState(true)
  const markChanged = () => setSaved(false)

  return (
    <div className="rounded-xl border bg-card surface-shadow">
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-editorial text-3xl">{item.name}</h2>
            <Badge variant="secondary">Attivo</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Configurazione simulata · nessun dato viene salvato
          </p>
        </div>
        <Button
          onClick={() => setSaved(true)}
          variant={saved ? "outline" : "default"}
        >
          {saved ? <Check /> : <Save />}
          {saved ? "Bozza allineata" : "Simula salvataggio"}
        </Button>
      </div>
      <Tabs defaultValue="setup" className="gap-0">
        <div className="overflow-x-auto border-b px-5">
          <TabsList variant="line" className="h-12">
            <TabsTrigger value="setup">Dettagli</TabsTrigger>
            <TabsTrigger value="availability">Disponibilità</TabsTrigger>
            <TabsTrigger value="assignment">Assegnazione</TabsTrigger>
            <TabsTrigger value="payment">Pagamento</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="setup" className="grid gap-5 p-5 md:grid-cols-2">
          <Field label="Nome appuntamento">
            <Input defaultValue={item.name} onChange={markChanged} />
          </Field>
          <Field label="Specialità / categoria">
            <Input defaultValue={item.specialty} onChange={markChanged} />
          </Field>
          <Field label="Durata">
            <div className="relative">
              <Input
                defaultValue={item.duration}
                type="number"
                onChange={markChanged}
                className="pr-16"
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                minuti
              </span>
            </div>
          </Field>
          <Field label="Canali di prenotazione">
            <Select defaultValue={item.bookingMode} onValueChange={markChanged}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Online e segreteria</SelectItem>
                <SelectItem value="public">Solo online</SelectItem>
                <SelectItem value="staff">Solo segreteria</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="rounded-lg border bg-muted/35 p-4 md:col-span-2">
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="font-medium">Pubblicazione nell’agenda</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Ogni prenotazione confermata genera una voce agenda collegata
                  al paziente, al professionista e al tipo di appuntamento.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="availability"
          className="grid gap-5 p-5 md:grid-cols-2"
        >
          <Field label="Preavviso minimo">
            <Select defaultValue="24" onValueChange={markChanged}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 ore</SelectItem>
                <SelectItem value="12">12 ore</SelectItem>
                <SelectItem value="24">24 ore</SelectItem>
                <SelectItem value="48">48 ore</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Finestra prenotabile">
            <Select defaultValue="90" onValueChange={markChanged}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 giorni</SelectItem>
                <SelectItem value="60">60 giorni</SelectItem>
                <SelectItem value="90">90 giorni</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Buffer prima">
            <Input
              defaultValue={item.bufferBefore}
              type="number"
              onChange={markChanged}
            />
          </Field>
          <Field label="Buffer dopo">
            <Input
              defaultValue={item.bufferAfter}
              type="number"
              onChange={markChanged}
            />
          </Field>
          <ToggleRow
            icon={CalendarClock}
            title="Usa orari del personale"
            description="Compone turni, ferie, permessi e blocchi agenda."
            defaultChecked
            onChange={markChanged}
          />
          <ToggleRow
            icon={Route}
            title="Evita sovrapposizioni"
            description="Esclude slot già occupati in agenda."
            defaultChecked
            onChange={markChanged}
          />
        </TabsContent>

        <TabsContent value="assignment" className="space-y-5 p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Regola di distribuzione">
              <Select defaultValue="balanced" onValueChange={markChanged}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Carico più basso</SelectItem>
                  <SelectItem value="round-robin">Rotazione equa</SelectItem>
                  <SelectItem value="priority">Ordine di priorità</SelectItem>
                  <SelectItem value="manual">
                    Scelta della segreteria
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Continuità assistenziale">
              <Select defaultValue="prefer" onValueChange={markChanged}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prefer">
                    Preferisci medico precedente
                  </SelectItem>
                  <SelectItem value="require">
                    Richiedi stesso medico
                  </SelectItem>
                  <SelectItem value="ignore">Non considerare</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <UsersRound className="size-5 text-primary" />
              <p className="font-medium">Pool professionisti</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.professionals.map((professional) => (
                <Badge key={professional} variant="secondary">
                  {professional}
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={markChanged}>
                + Aggiungi
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payment" className="space-y-5 p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Tariffa">
              <div className="relative">
                <Input
                  defaultValue={item.price ?? ""}
                  type="number"
                  placeholder="Nessuna tariffa"
                  onChange={markChanged}
                  className="pl-8"
                />
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                  €
                </span>
              </div>
            </Field>
            <Field label="Politica di pagamento">
              <Select
                defaultValue={item.paymentPolicy}
                onValueChange={markChanged}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun pagamento</SelectItem>
                  <SelectItem value="optional">Paga in studio</SelectItem>
                  <SelectItem value="deposit">
                    Acconto alla prenotazione
                  </SelectItem>
                  <SelectItem value="required">
                    Saldo alla prenotazione
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex flex-col gap-4 rounded-lg border border-dashed border-primary/35 bg-primary/[.045] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CreditCard className="mt-0.5 size-5 text-primary" />
              <div>
                <p className="font-medium">Modulo Pagamenti collegato</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Il tipo definisce il prezzo; il modulo Pagamenti gestisce
                  intenti, transazioni, POS e riconciliazione.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/payments/settings">
                Configura canali <ExternalLink />
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  defaultChecked,
  onChange,
}: {
  icon: typeof CalendarClock
  title: string
  description: string
  defaultChecked?: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 text-primary" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Switch defaultChecked={defaultChecked} onCheckedChange={onChange} />
    </div>
  )
}
