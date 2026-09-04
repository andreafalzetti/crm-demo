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
import type { Organization } from "../types"

export function OrganizationDialog({
  organization,
  onClose,
  onSaved,
}: {
  organization: Organization | null
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    setPending(true)
    try {
      if (organization) {
        await pb.collection("organizations").update(organization.id, payload)
      } else {
        await pb.collection("organizations").create(payload)
      }
      toast.success(organization ? "Cliente aggiornato" : "Cliente creato")
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
              {organization ? "Modifica cliente" : "Nuovo cliente"}
            </DialogTitle>
            <DialogDescription>
              Inserisci i dati utili al lavoro quotidiano; potrai completarli in
              seguito.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <FormField
              label="Nome breve"
              name="name"
              defaultValue={organization?.name}
              required
            />
            <FormField
              label="Ragione sociale"
              name="legal_name"
              defaultValue={organization?.legal_name}
            />
            <FormField
              label="Partita IVA"
              name="vat_number"
              defaultValue={organization?.vat_number}
            />
            <FormField
              label="Email"
              name="email"
              type="email"
              defaultValue={organization?.email}
            />
            <FormField
              label="Telefono"
              name="phone"
              defaultValue={organization?.phone}
            />
            <FormField
              label="Sito web"
              name="website"
              type="url"
              defaultValue={organization?.website}
            />
            <FormField
              className="sm:col-span-2"
              label="Indirizzo"
              name="address"
              defaultValue={organization?.address}
            />
            <div className="space-y-2">
              <Label htmlFor="organization-status">Stato</Label>
              <Select
                name="status"
                defaultValue={organization?.status ?? "prospect"}
              >
                <SelectTrigger id="organization-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Cliente attivo</SelectItem>
                  <SelectItem value="archived">Archiviato</SelectItem>
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
