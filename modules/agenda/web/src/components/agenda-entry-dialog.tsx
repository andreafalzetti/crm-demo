import { type FormEvent, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { pb } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"

import type { NamedRecord } from "../types"

export function AgendaEntryDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [organization, setOrganization] = useState("none")
  const [staff, setStaff] = useState("none")
  const [type, setType] = useState("appointment")
  const [pending, setPending] = useState(false)
  const organizations = useQuery({
    queryKey: ["agenda", "organizations"],
    queryFn: () =>
      pb
        .collection<NamedRecord>("organizations")
        .getFullList({ sort: "name", fields: "id,name" }),
  })
  const staffOptions = useQuery({
    queryKey: ["agenda", "staff"],
    queryFn: () =>
      pb.collection<NamedRecord>("staff_members").getFullList({
        sort: "last_name,first_name",
        fields: "id,first_name,last_name",
      }),
  })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    try {
      await pb.collection("agenda_entries").create({
        title: form.get("title"),
        type,
        start_at: new Date(String(form.get("start_at"))).toISOString(),
        end_at: form.get("end_at")
          ? new Date(String(form.get("end_at"))).toISOString()
          : "",
        organization: organization === "none" ? "" : organization,
        staff: staff === "none" ? "" : staff,
        notes: form.get("notes"),
      })
      toast.success("Appuntamento aggiunto")
      onSaved()
    } catch {
      toast.error("Appuntamento non salvato")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-editorial text-3xl">
              Nuovo appuntamento
            </DialogTitle>
            <DialogDescription>
              Aggiungi un impegno indipendente all’agenda condivisa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="agenda-title">Titolo</Label>
              <Input id="agenda-title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value ?? "appointment")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment">Appuntamento</SelectItem>
                  <SelectItem value="reminder">Promemoria</SelectItem>
                  <SelectItem value="block">Blocco agenda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Collaboratore</Label>
              <Select
                value={staff}
                onValueChange={(value) => setStaff(value ?? "none")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assegnato</SelectItem>
                  {staffOptions.data?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda-start">Inizio</Label>
              <Input
                id="agenda-start"
                name="start_at"
                type="datetime-local"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agenda-end">Fine</Label>
              <Input id="agenda-end" name="end_at" type="datetime-local" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Cliente</Label>
              <Select
                value={organization}
                onValueChange={(value) => setOrganization(value ?? "none")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun cliente</SelectItem>
                  {organizations.data?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="agenda-notes">Note</Label>
              <Textarea id="agenda-notes" name="notes" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : "Aggiungi all’agenda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
