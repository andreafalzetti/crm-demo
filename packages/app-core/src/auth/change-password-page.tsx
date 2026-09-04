import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { pb } from "../lib/pocketbase"
import { useAuth } from "./use-auth"

export function ChangePasswordPage() {
  const { user, refresh, logout } = useAuth()
  const navigate = useNavigate()
  const [oldPassword, setOldPassword] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    if (password.length < 10 || password !== confirm) {
      setError("Usa almeno 10 caratteri e conferma la stessa password.")
      return
    }
    setPending(true)
    setError("")
    try {
      await pb.collection("users").update(user.id, {
        oldPassword,
        password,
        passwordConfirm: confirm,
        must_change_password: false,
      })
      await refresh()
      toast.success("Password aggiornata")
      navigate("/", { replace: true })
    } catch {
      setError("Non è stato possibile cambiare la password.")
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="grid min-h-svh place-items-center p-5">
      <Card className="w-full max-w-md surface-shadow">
        <CardHeader>
          <CardTitle className="font-editorial text-3xl">
            Scegli una nuova password
          </CardTitle>
          <CardDescription>
            Prima di continuare, sostituisci la password temporanea.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old-password">Password temporanea</Label>
              <Input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nuova password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Conferma password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : "Salva e continua"}
            </Button>
            <Button
              className="w-full"
              type="button"
              variant="ghost"
              onClick={logout}
            >
              Esci
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
