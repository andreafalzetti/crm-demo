import { type FormEvent, useState } from "react"
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

import { toPocketBaseDate } from "../lib/date"
import type { StaffMember } from "../types"

export function LeaveDialog({
  staff,
  onClose,
  onSaved,
}: {
  staff: StaffMember[]
  onClose: () => void
  onSaved: () => void
}) {
  const [staffId, setStaffId] = useState("")
  const [type, setType] = useState("vacation")
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    try {
      await pb.collection("leave_requests").create({
        staff: staffId,
        type,
        start_date: toPocketBaseDate(String(form.get("start_date"))),
        end_date: toPocketBaseDate(String(form.get("end_date"))),
        note: form.get("note"),
        status: "pending",
      })
      toast.success("Richiesta inserita")
      onSaved()
    } catch {
      toast.error("Richiesta non salvata")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-editorial text-3xl">
              Ferie o assenza
            </DialogTitle>
            <DialogDescription>
              Registra il periodo; un responsabile potrà approvarlo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Collaboratore</Label>
              <Select
                value={staffId}
                onValueChange={(value) => setStaffId(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona una persona" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Tipologia</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value ?? "vacation")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Ferie</SelectItem>
                  <SelectItem value="sick">Malattia</SelectItem>
                  <SelectItem value="permit">Permesso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-start">Dal</Label>
              <Input id="leave-start" name="start_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave-end">Al</Label>
              <Input id="leave-end" name="end_date" type="date" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="leave-note">Nota</Label>
              <Textarea id="leave-note" name="note" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={pending || !staffId}>
              {pending ? "Salvataggio…" : "Invia richiesta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
