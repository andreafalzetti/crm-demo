import { CalendarClock } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import type { AppointmentType } from "../../types"
import { EditorField } from "./editor-field"

export function SetupSection({
  item,
  onChange,
}: {
  item: AppointmentType
  onChange: () => void
}) {
  return (
    <div className="grid gap-5 p-5 md:grid-cols-2">
      <EditorField label="Nome appuntamento">
        <Input defaultValue={item.name} onChange={onChange} />
      </EditorField>
      <EditorField label="Specialità / categoria">
        <Input defaultValue={item.specialty} onChange={onChange} />
      </EditorField>
      <EditorField label="Durata">
        <div className="relative">
          <Input
            defaultValue={item.duration}
            type="number"
            onChange={onChange}
            className="pr-16"
          />
          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
            minuti
          </span>
        </div>
      </EditorField>
      <EditorField label="Canali di prenotazione">
        <Select defaultValue={item.bookingMode} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">Online e segreteria</SelectItem>
            <SelectItem value="public">Solo online</SelectItem>
            <SelectItem value="staff">Solo segreteria</SelectItem>
          </SelectContent>
        </Select>
      </EditorField>
      <div className="rounded-lg border bg-muted/35 p-4 md:col-span-2">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="font-medium">Pubblicazione nell’agenda</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Ogni prenotazione confermata genera una voce agenda collegata al
              paziente, al professionista e al tipo di appuntamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
