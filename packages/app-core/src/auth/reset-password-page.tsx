import { type FormEvent, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
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

/**
 * Where the link of «Password dimenticata?» leads (docs/email.md):
 * PocketBase's own page is in the console, which a public deployment keeps
 * closed. The new password twice, then back to the login.
 */
export function ResetPasswordPage() {
  const { token = "" } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 10 || password !== confirm) {
      setError("Usa almeno 10 caratteri e conferma la stessa password.")
      return
    }
    setPending(true)
    setError("")
    try {
      await pb
        .collection("users")
        .confirmPasswordReset(token, password, confirm)
      toast.success("Password aggiornata", {
        description: "Entra con la password nuova.",
      })
      navigate("/login", { replace: true })
    } catch {
      setError(
        "Il link è scaduto o è già stato usato. Chiedine uno nuovo dalla pagina di accesso."
      )
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
            Almeno 10 caratteri. Vale da subito, da qualunque dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nuova password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Conferma password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : "Salva la password"}
            </Button>
            <Button className="w-full" variant="ghost" asChild>
              <Link to="/login">Torna al login</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
