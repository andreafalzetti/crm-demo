import { useMemo, useState } from "react"
import type { RecordModel } from "pocketbase"
import { toast } from "sonner"

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
import { cn } from "@workspace/ui/lib/utils"

import { pb } from "../lib/pocketbase"
import { PermissionPicker, SUPPORT_ROLE } from "./permission-picker"

/** Radix keeps the empty string for «nothing chosen». */
const NOTHING = "__none"

/**
 * A role and the permissions it holds (docs/ruoli.md). A new one starts
 * from another role («Parti da»); a new one, or one made here, also
 * changes name and can be deleted; the system ones only change what they
 * hold. The footer says what changes before saving.
 */
export function RoleDialog({
  role,
  roles,
  permissions,
  onClose,
  onSaved,
}: {
  role: RecordModel | null
  roles: RecordModel[]
  permissions: RecordModel[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(String(role?.name ?? ""))
  const [from, setFrom] = useState(NOTHING)
  const [selected, setSelected] = useState<string[]>(role?.permissions ?? [])
  const [description, setDescription] = useState(
    String(role?.description ?? "")
  )
  const [pending, setPending] = useState(false)
  const selectedIds = useMemo(() => new Set(selected), [selected])
  const system = Boolean(role?.system)
  // F2 Labs' support holds every permission, kept so by the server.
  const support = role?.key === SUPPORT_ROLE
  const startingFrom = roles.find((item) => item.id === from)
  const base: string[] = role
    ? (role.permissions ?? [])
    : (startingFrom?.permissions ?? [])
  const added = selected.filter((id) => !base.includes(id)).length
  const removed = base.filter((id) => !selectedIds.has(id)).length

  async function save() {
    setPending(true)
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        permissions: selected,
      }
      if (role) {
        await pb
          .collection("roles")
          .update(
            role.id,
            system ? { description, permissions: selected } : data
          )
      } else {
        await pb.collection("roles").create({
          ...data,
          key: roleKey(name, roles),
          system: false,
        })
      }
      toast.success(role ? "Ruolo aggiornato" : "Ruolo creato")
      onSaved()
    } catch {
      toast.error("Impossibile salvare il ruolo")
    } finally {
      setPending(false)
    }
  }

  async function remove() {
    if (!role) return
    setPending(true)
    try {
      const holders = await pb
        .collection("users")
        .getList(1, 1, { filter: pb.filter("roles ~ {:id}", { id: role.id }) })
      if (holders.totalItems > 0) {
        toast.error(
          holders.totalItems === 1
            ? "Una persona ha questo ruolo: toglielo prima da Persone e accessi."
            : `${holders.totalItems} persone hanno questo ruolo: toglielo prima da Persone e accessi.`
        )
        return
      }
      await pb.collection("roles").delete(role.id)
      toast.success("Ruolo eliminato")
      onSaved()
    } catch {
      toast.error("Impossibile eliminare il ruolo")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-editorial text-3xl">
            {role ? String(role.name) : "Nuovo ruolo"}
          </DialogTitle>
          <DialogDescription>
            {support
              ? "L'assistenza di F2 Labs ha sempre tutti i permessi: non si cambia da qui."
              : "Seleziona le azioni consentite a chi possiede questo ruolo."}
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-1 py-4">
          {!system && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role-name">Nome</Label>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              {!role && (
                <div className="space-y-2">
                  <Label htmlFor="role-from">Parti da</Label>
                  <Select
                    value={from}
                    onValueChange={(value) => {
                      setFrom(value)
                      setSelected(
                        roles.find((item) => item.id === value)?.permissions ??
                          []
                      )
                    }}
                  >
                    <SelectTrigger id="role-from" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NOTHING}>Nessun permesso</SelectItem>
                      {roles
                        .filter((item) => item.key !== SUPPORT_ROLE)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {String(item.name)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          {!support && (
            <div className="space-y-2">
              <Label htmlFor="role-description">Descrizione</Label>
              <Textarea
                id="role-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          )}
          <PermissionPicker
            permissions={permissions}
            selected={selectedIds}
            readOnly={support}
            onChange={setSelected}
          />
        </div>
        <DialogFooter>
          {role && !system && (
            <Button
              variant="ghost"
              className="text-destructive sm:mr-auto"
              onClick={() => void remove()}
              disabled={pending}
            >
              Elimina ruolo
            </Button>
          )}
          {!support && (
            <p
              aria-live="polite"
              className={cn(
                // On the phone the buttons go in a column, the action on
                // top: what changes stays above it.
                "order-last self-center text-xs text-muted-foreground tabular-nums sm:order-none",
                (!role || system) && "sm:mr-auto"
              )}
            >
              {changeSummary({
                added,
                removed,
                total: selected.length,
                role,
                startingFrom,
              })}
            </p>
          )}
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          {!support && (
            <Button onClick={save} disabled={pending || !name.trim()}>
              {pending ? "Salvataggio…" : role ? "Salva ruolo" : "Crea ruolo"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * What saving changes: «3 in più, 1 in meno rispetto al ruolo Manager», or
 * how many a new role from nothing holds.
 */
function changeSummary({
  added,
  removed,
  total,
  role,
  startingFrom,
}: {
  added: number
  removed: number
  total: number
  role: RecordModel | null
  startingFrom: RecordModel | undefined
}) {
  if (!role && !startingFrom)
    return total === 0
      ? "Nessun permesso"
      : total === 1
        ? "1 permesso"
        : `${total} permessi`
  if (added === 0 && removed === 0)
    return role
      ? "Nessuna modifica"
      : `Come il ruolo ${String(startingFrom?.name)}`
  const parts = [
    added > 0 && `${added} in più`,
    removed > 0 && `${removed} in meno`,
  ].filter(Boolean)
  return `${parts.join(", ")} ${role ? "rispetto a prima" : `rispetto al ruolo ${String(startingFrom?.name)}`}`
}

/**
 * The key of a new role, from its name: «Responsabile vendite» →
 * responsabile-vendite, with a number when another role has it.
 */
function roleKey(name: string, roles: RecordModel[]) {
  const base =
    name
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^[^a-z]+|-+$/g, "")
      .slice(0, 70) || "ruolo"
  const key = base.length < 2 ? `ruolo-${base}` : base
  const taken = new Set(roles.map((role) => String(role.key)))
  if (!taken.has(key)) return key
  let index = 2
  while (taken.has(`${key}-${index}`)) index++
  return `${key}-${index}`
}
