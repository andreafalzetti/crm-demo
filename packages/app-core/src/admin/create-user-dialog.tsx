import { type FormEvent, useState } from "react"
import { Users } from "lucide-react"
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
  DialogTrigger,
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

import { pb } from "../lib/pocketbase"

export function CreateUserDialog({
  roles,
  open,
  onOpenChange,
  onCreated,
}: {
  roles: RecordModel[]
  open: boolean
  onOpenChange: (value: boolean) => void
  onCreated: () => void
}) {
  const [role, setRole] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    try {
      await pb.collection("users").create({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        passwordConfirm: form.get("password"),
        active: true,
        must_change_password: true,
        roles: [role],
      })
      toast.success("Utente creato", {
        description:
          "Condividi la password temporanea tramite un canale sicuro.",
      })
      onOpenChange(false)
      onCreated()
    } catch {
      toast.error("Creazione non riuscita")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Users />
          Nuovo utente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-editorial text-2xl">
              Nuovo utente
            </DialogTitle>
            <DialogDescription>
              L’utente dovrà cambiare la password al primo accesso.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nome</Label>
              <Input id="user-name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input id="user-email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">Password temporanea</Label>
              <Input
                id="user-password"
                name="password"
                type="password"
                minLength={10}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Ruolo iniziale</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un ruolo" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {String(item.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !role}>
              {pending ? "Creazione…" : "Crea utente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
