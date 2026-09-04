import { useMemo, useState } from "react"
import type { RecordModel } from "pocketbase"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

import { pb } from "../lib/pocketbase"

export function RoleDialog({
  role,
  permissions,
  onClose,
  onSaved,
}: {
  role: RecordModel
  permissions: RecordModel[]
  onClose: () => void
  onSaved: () => void
}) {
  const [selected, setSelected] = useState<string[]>(role.permissions ?? [])
  const [description, setDescription] = useState(String(role.description ?? ""))
  const [pending, setPending] = useState(false)
  const selectedIds = useMemo(() => new Set(selected), [selected])
  const grouped = permissions.reduce<Record<string, RecordModel[]>>(
    (result, permission) => {
      const module = String(permission.module)
      result[module] = [...(result[module] ?? []), permission]
      return result
    },
    {}
  )

  async function save() {
    setPending(true)
    try {
      await pb
        .collection("roles")
        .update(role.id, { description, permissions: selected })
      toast.success("Ruolo aggiornato")
      onSaved()
    } catch {
      toast.error("Impossibile aggiornare il ruolo")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-editorial text-3xl">
            {String(role.name)}
          </DialogTitle>
          <DialogDescription>
            Seleziona le azioni consentite a chi possiede questo ruolo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="role-description">Descrizione</Label>
            <Textarea
              id="role-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {Object.entries(grouped).map(([module, items]) => (
            <section key={module}>
              <h3 className="mb-2 text-xs font-semibold tracking-wider uppercase">
                {module}
              </h3>
              <div className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2">
                {items.map((permission) => {
                  const checked = selectedIds.has(permission.id)
                  return (
                    <label
                      key={permission.id}
                      className="flex items-start gap-3 rounded-lg p-2 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          setSelected((current) =>
                            value
                              ? [...current, permission.id]
                              : current.filter((id) => id !== permission.id)
                          )
                        }
                      />
                      <span>
                        <span className="block font-medium">
                          {String(permission.label)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {String(permission.key)}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Salvataggio…" : "Salva ruolo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
