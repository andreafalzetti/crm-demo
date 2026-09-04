import { UsersRound } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import type { AppointmentType } from "../../types"
import { EditorField } from "./editor-field"

export function AssignmentSection({
  item,
  onChange,
}: {
  item: AppointmentType
  onChange: () => void
}) {
  return (
    <div className="space-y-5 p-5">
      <div className="grid gap-5 md:grid-cols-2">
        <EditorField label="Regola di distribuzione">
          <Select defaultValue="balanced" onValueChange={onChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balanced">Carico più basso</SelectItem>
              <SelectItem value="round-robin">Rotazione equa</SelectItem>
              <SelectItem value="priority">Ordine di priorità</SelectItem>
              <SelectItem value="manual">Scelta della segreteria</SelectItem>
            </SelectContent>
          </Select>
        </EditorField>
        <EditorField label="Continuità assistenziale">
          <Select defaultValue="prefer" onValueChange={onChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prefer">
                Preferisci medico precedente
              </SelectItem>
              <SelectItem value="require">Richiedi stesso medico</SelectItem>
              <SelectItem value="ignore">Non considerare</SelectItem>
            </SelectContent>
          </Select>
        </EditorField>
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
          <Button variant="ghost" size="sm" onClick={onChange}>
            + Aggiungi
          </Button>
        </div>
      </div>
    </div>
  )
}
