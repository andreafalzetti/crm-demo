import { useState } from "react"
import {
  CalendarCheck2,
  CheckCircle2,
  CreditCard,
  Link2,
  LockKeyhole,
  RefreshCcw,
  Webhook,
} from "lucide-react"

import { PageHeader } from "@crm/app-core"
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

import { PaymentChannelCard } from "../components/payment-channel-card"
import { PreviewBadge } from "../components/preview-badge"
import { paymentChannels } from "../mock-data"

export function PaymentSettingsPage() {
  const [policy, setPolicy] = useState("appointment")

  return (
    <>
      <PageHeader
        eyebrow="Provider e canali"
        title="Configurazione pagamenti"
        description="Il dominio resta indipendente dal provider: Mollie è un adapter per online e fisico, non il modello dati del CRM."
        actions={<PreviewBadge />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {paymentChannels.map((channel) => (
          <PaymentChannelCard key={channel.id} channel={channel} />
        ))}
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <Card className="surface-shadow">
          <CardHeader>
            <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
              Regole commerciali
            </p>
            <CardTitle className="mt-1 font-editorial text-3xl">
              Collegamento appuntamenti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="price-source">
                Origine dell’importo
              </label>
              <Select value={policy} onValueChange={setPolicy}>
                <SelectTrigger id="price-source" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment">
                    Tipo di appuntamento
                  </SelectItem>
                  <SelectItem value="manual">Importo libero</SelectItem>
                  <SelectItem value="quote">Preventivo collegato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PaymentToggle
              title="Crea intento alla prenotazione"
              description="Solo se la prestazione ha prezzo e policy online."
              defaultChecked
            />
            <PaymentToggle
              title="Consenti pagamento in studio"
              description="La reception può scegliere POS, contanti o bonifico."
              defaultChecked
            />
            <PaymentToggle
              title="Annulla slot se il pagamento scade"
              description="Libera la disponibilità dopo 15 minuti."
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-primary/25 bg-[#1d211e] text-stone-100 surface-shadow">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[.2em] text-emerald-300 uppercase">
                  Adapter proposto · Mollie Connect
                </p>
                <CardTitle className="mt-1 font-editorial text-3xl">
                  Ogni studio incassa a proprio nome
                </CardTitle>
              </div>
              <CreditCard className="size-5 text-emerald-300" />
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <ArchitecturePoint
                icon={Link2}
                title="OAuth dello studio"
                detail="Il cliente collega il proprio account merchant."
              />
              <ArchitecturePoint
                icon={Webhook}
                title="Webhook verificati"
                detail="Gli esiti aggiornano transazione e appuntamento."
              />
              <ArchitecturePoint
                icon={LockKeyhole}
                title="Nessun dato carta"
                detail="Nel CRM restano solo riferimenti e stato."
              />
              <ArchitecturePoint
                icon={RefreshCcw}
                title="Canali uniformi"
                detail="Online, terminale e manuale nello stesso registro."
              />
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-300/20 bg-emerald-300/8 p-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
              <p className="text-xs leading-5 text-stone-300">
                Per un SaaS dove ciascuno studio gestisce incassi, rimborsi e
                contestazioni, il modello concettuale è “Connect for Platforms”.
                La verifica commerciale viene prima dell’integrazione.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function PaymentToggle({
  title,
  description,
  defaultChecked,
}: {
  title: string
  description: string
  defaultChecked?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <CalendarCheck2 className="mt-0.5 size-4 text-primary" />
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

function ArchitecturePoint({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof CreditCard
  title: string
  detail: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[.04] p-4">
      <Icon className="size-4 text-emerald-300" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-[11px] leading-4 text-stone-400">{detail}</p>
    </div>
  )
}
