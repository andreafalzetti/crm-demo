import { type FormEvent, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle } from "lucide-react"
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

import type { OrganizationOption, StaffOption } from "../types"

function localDay(value: string) {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

type LeaveOption = {
  staff: string
  start_date: string
  end_date: string
}

export function WorkItemDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [organization, setOrganization] = useState("")
  const [staff, setStaff] = useState("none")
  const [kind, setKind] = useState("intervention")
  const [priority, setPriority] = useState("normal")
  const [startAt, setStartAt] = useState("")
  const [pending, setPending] = useState(false)
  const organizations = useQuery({
    queryKey: ["work-item", "organizations"],
    queryFn: () =>
      pb
        .collection<OrganizationOption>("organizations")
        .getFullList({ sort: "name", fields: "id,name" }),
  })
  const staffOptions = useQuery({
    queryKey: ["work-item", "staff"],
    queryFn: () =>
      pb.collection<StaffOption>("staff_members").getFullList({
        sort: "last_name,first_name",
        filter: 'status = "active"',
        fields: "id,first_name,last_name,job_title",
      }),
  })
  const leave = useQuery({
    queryKey: ["work-item", "approved-leave"],
    queryFn: () =>
      pb.collection<LeaveOption>("leave_requests").getFullList({
        filter: 'status = "approved"',
        fields: "staff,start_date,end_date",
      }),
  })
  const unavailable = useMemo(() => {
    if (staff === "none" || !startAt) return false
    const selectedDay = startAt.slice(0, 10)
    return leave.data?.some(
      (item) =>
        item.staff === staff &&
        selectedDay >= localDay(item.start_date) &&
        selectedDay <= localDay(item.end_date)
    )
  }, [leave.data, staff, startAt])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    try {
      const item = await pb.collection("work_items").create({
        code: `INT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        title: form.get("title"),
        kind,
        status: "planned",
        priority,
        organization,
        start_at: startAt ? new Date(startAt).toISOString() : "",
        end_at: form.get("end_at")
          ? new Date(String(form.get("end_at"))).toISOString()
          : "",
        location: form.get("location"),
        description: form.get("description"),
      })
      if (staff !== "none") {
        await pb.collection("work_item_assignments").create({
          work_item: item.id,
          staff,
          role: "Responsabile",
        })
      }
      toast.success("Intervento pianificato")
      onSaved()
    } catch {
      toast.error("Intervento non salvato")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-editorial text-3xl">
              Nuovo intervento
            </DialogTitle>
            <DialogDescription>
              Collega cliente, data e responsabile in un unico passaggio.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="work-title">Titolo</Label>
              <Input id="work-title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={organization}
                onValueChange={(value) => setOrganization(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona il cliente" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.data?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipologia</Label>
              <Select
                value={kind}
                onValueChange={(value) => setKind(value ?? "intervention")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intervention">Intervento</SelectItem>
                  <SelectItem value="assignment">Incarico</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="session">Seduta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="work-start">Inizio</Label>
              <Input
                id="work-start"
                name="start_at"
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work-end">Fine</Label>
              <Input id="work-end" name="end_at" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label>Responsabile</Label>
              <Select
                value={staff}
                onValueChange={(value) => setStaff(value ?? "none")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Da assegnare</SelectItem>
                  {staffOptions.data?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorità</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value ?? "normal")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Bassa</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="work-location">Luogo</Label>
              <Input id="work-location" name="location" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="work-description">Descrizione</Label>
              <Textarea id="work-description" name="description" />
            </div>
            {unavailable && (
              <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 text-sm sm:col-span-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                La persona selezionata risulta assente nel giorno scelto.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={pending || !organization}>
              {pending ? "Pianificazione…" : "Pianifica intervento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
