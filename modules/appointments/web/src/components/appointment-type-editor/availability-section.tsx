import { CalendarClock, Route } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import type { AppointmentType } from "../../types"
import { EditorField, EditorToggle } from "./editor-field"

export function AvailabilitySection({
  item,
  onChange,
}: {
  item: AppointmentType
  onChange: () => void
}) {
  return (
    <div className="grid gap-5 p-5 md:grid-cols-2">
      <EditorField label="Preavviso minimo">
        <Select defaultValue="24" onValueChange={onChange}>
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
      </EditorField>
      <EditorField label="Finestra prenotabile">
        <Select defaultValue="90" onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 giorni</SelectItem>
            <SelectItem value="60">60 giorni</SelectItem>
            <SelectItem value="90">90 giorni</SelectItem>
          </SelectContent>
        </Select>
      </EditorField>
      <EditorField label="Buffer prima">
        <Input
          defaultValue={item.bufferBefore}
          type="number"
          onChange={onChange}
        />
      </EditorField>
      <EditorField label="Buffer dopo">
        <Input
          defaultValue={item.bufferAfter}
          type="number"
          onChange={onChange}
        />
      </EditorField>
      <EditorToggle
        icon={CalendarClock}
        title="Usa orari del personale"
        description="Compone turni, ferie, permessi e blocchi agenda."
        defaultChecked
        onChange={onChange}
      />
      <EditorToggle
        icon={Route}
        title="Evita sovrapposizioni"
        description="Esclude slot già occupati in agenda."
        defaultChecked
        onChange={onChange}
      />
    </div>
  )
}
