import { useState } from "react"
import { Layers3 } from "lucide-react"

import { PageHeader } from "@crm/app-core"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { AppointmentTypeEditor } from "../components/appointment-type-editor"
import { AppointmentTypeList } from "../components/appointment-type-list"
import { PreviewBadge } from "../components/preview-badge"
import { appointmentTypes } from "../mock-data"
import type { AppointmentType } from "../types"

export function AppointmentTypesPage() {
  const [selected, setSelected] = useState<AppointmentType>(appointmentTypes[0])

  return (
    <>
      <PageHeader
        eyebrow="Catalogo prenotabile"
        title="Tipi di appuntamento"
        description="Durata, professionisti, limiti, modalità di assegnazione e prezzo configurabili per ogni prestazione."
        actions={<PreviewBadge />}
      />
      <div className="grid items-start gap-5 xl:grid-cols-[360px_1fr]">
        <Card className="surface-shadow">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
                  Offerta dello studio
                </p>
                <CardTitle className="mt-1 font-editorial text-3xl">
                  Prestazioni
                </CardTitle>
              </div>
              <Badge variant="secondary">{appointmentTypes.length} tipi</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <AppointmentTypeList
              items={appointmentTypes}
              selectedId={selected.id}
              onSelect={setSelected}
            />
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
              <Layers3 className="size-4 shrink-0 text-primary" />
              Ogni studio parte da template verticali e può aggiungere tipi
              personalizzati.
            </div>
          </CardContent>
        </Card>
        <AppointmentTypeEditor key={selected.id} item={selected} />
      </div>
    </>
  )
}
