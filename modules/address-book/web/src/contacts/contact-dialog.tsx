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
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { FormField } from "../shared/form-field"
import type { Contact, Organization } from "../types"

export function ContactDialog({
  contact,
  organizations,
  onClose,
  onSaved,
}: {
  contact: Contact | null
  organizations: Organization[]
  onClose: () => void
  onSaved: () => void
}) {
  const [organization, setOrganization] = useState(
    contact?.organization ?? "none"
  )
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      ...Object.fromEntries(form.entries()),
      organization: organization === "none" ? "" : organization,
    }
    setPending(true)
    try {
      if (contact) {
        await pb.collection("contacts").update(contact.id, payload)
      } else {
        await pb.collection("contacts").create(payload)
      }
      toast.success(contact ? "Contatto aggiornato" : "Contatto creato")
      onSaved()
    } catch {
      toast.error("Salvataggio non riuscito")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-editorial text-3xl">
              {contact ? "Modifica contatto" : "Nuovo contatto"}
            </DialogTitle>
            <DialogDescription>
              Collega la persona a un’azienda oppure mantienila indipendente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <FormField
              label="Nome"
              name="first_name"
              defaultValue={contact?.first_name}
              required
            />
            <FormField
              label="Cognome"
              name="last_name"
              defaultValue={contact?.last_name}
              required
            />
            <div className="space-y-2 sm:col-span-2">
              <Label>Azienda</Label>
              <Select
                value={organization}
                onValueChange={(value) => setOrganization(value ?? "none")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna azienda</SelectItem>
                  {organizations.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FormField
              label="Ruolo"
              name="position"
              defaultValue={contact?.position}
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              defaultValue={contact?.email}
            />
            <FormField
              label="Telefono"
              name="phone"
              defaultValue={contact?.phone}
            />
            <FormField
              label="Cellulare"
              name="mobile"
              defaultValue={contact?.mobile}
            />
            <div className="space-y-2">
              <Label>Stato</Label>
              <Select name="status" defaultValue={contact?.status ?? "active"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Attivo</SelectItem>
                  <SelectItem value="inactive">Non attivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
