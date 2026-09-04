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

export function StaffDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setPending(true)
    try {
      await pb
        .collection("staff_members")
        .create({ ...values, status: "active" })
      toast.success("Collaboratore aggiunto")
      onSaved()
    } catch {
      toast.error("Impossibile salvare il collaboratore")
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
              Nuovo collaboratore
            </DialogTitle>
            <DialogDescription>
              Crea l’anagrafica operativa del personale. L’account CRM resta
              facoltativo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <Field label="Matricola" name="employee_code" required />
            <Field label="Mansione" name="job_title" required />
            <Field label="Nome" name="first_name" required />
            <Field label="Cognome" name="last_name" required />
            <Field label="Email" name="email" type="email" />
            <Field label="Telefono" name="phone" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? "Salvataggio…" : "Aggiungi al team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`staff-${name}`}>{label}</Label>
      <Input id={`staff-${name}`} name={name} type={type} required={required} />
    </div>
  )
}
