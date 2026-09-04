import { useState } from "react"
import { Check, Save } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import type { AppointmentType } from "../types"
import { AssignmentSection } from "./appointment-type-editor/assignment-section"
import { AvailabilitySection } from "./appointment-type-editor/availability-section"
import { PaymentSection } from "./appointment-type-editor/payment-section"
import { SetupSection } from "./appointment-type-editor/setup-section"

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
        <TabsContent value="setup">
          <SetupSection item={item} onChange={markChanged} />
        </TabsContent>
        <TabsContent value="availability">
          <AvailabilitySection item={item} onChange={markChanged} />
        </TabsContent>
        <TabsContent value="assignment">
          <AssignmentSection item={item} onChange={markChanged} />
        </TabsContent>
        <TabsContent value="payment">
          <PaymentSection item={item} onChange={markChanged} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
