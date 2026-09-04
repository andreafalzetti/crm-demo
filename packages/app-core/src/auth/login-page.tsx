import { type CSSProperties, type FormEvent, useState } from "react"
import { ChevronRight } from "lucide-react"
import { Navigate, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { BrandMark } from "../components/brand-mark"
import { pb } from "../lib/pocketbase"
import type { ClientManifest } from "../types"
import { useAuth } from "./use-auth"

export function LoginPage({ manifest }: { manifest: ClientManifest }) {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [recovery, setRecovery] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setPending(true)
    try {
      if (recovery) {
        await pb.collection("users").requestPasswordReset(email)
        toast.success("Richiesta inviata", {
          description: "Controlla la casella email configurata per l’account.",
        })
        setRecovery(false)
      } else {
        await login(email, password)
        navigate("/", { replace: true })
      }
    } catch {
      setError(
        recovery
          ? "Invio non riuscito. Verifica la configurazione SMTP."
          : "Credenziali non valide o account disattivato."
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <main
      style={{ "--primary": manifest.accent } as CSSProperties}
      className="relative grid min-h-svh overflow-hidden bg-[#1d211e] lg:grid-cols-[1.1fr_.9fr]"
    >
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_20%_20%,rgba(52,211,153,.18),transparent_36%)] opacity-25" />
      <section className="relative hidden min-h-svh flex-col justify-between overflow-hidden border-r border-white/10 p-12 text-stone-100 lg:flex">
        <BrandMark manifest={manifest} />
        <div className="relative max-w-xl pb-10">
          <p className="mb-6 text-xs font-semibold tracking-[0.22em] text-emerald-300 uppercase">
            Workspace riservato
          </p>
          <h1 className="font-editorial text-6xl leading-[.98] font-medium tracking-[-0.035em] text-balance">
            Le relazioni contano.
            <br />
            Anche nei dati.
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-stone-300">
            Un CRM essenziale per seguire clienti, persone e prossime azioni
            senza perdere il filo.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span className="h-px w-10 bg-emerald-300/70" />
          {manifest.name} · accesso personale
        </div>
      </section>

      <section className="relative flex min-h-svh items-center justify-center bg-background px-5 py-12">
        <div className="w-full max-w-sm animate-in duration-500 fade-in slide-in-from-bottom-3">
          <div className="mb-9 lg:hidden">
            <BrandMark manifest={manifest} dark />
          </div>
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            {recovery ? "Recupero accesso" : "Bentornato"}
          </p>
          <h2 className="font-editorial text-4xl font-medium tracking-tight">
            {recovery ? "Ripristina la password" : "Entra nel CRM"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {recovery
              ? "Ti invieremo le istruzioni all’indirizzo associato."
              : "Usa le credenziali fornite dall’amministratore."}
          </p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-11 bg-card"
              />
            </div>
            {!recovery && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setRecovery(true)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Password dimenticata?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-11 bg-card"
                />
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={pending}
            >
              {pending ? "Attendi…" : recovery ? "Invia istruzioni" : "Accedi"}
              <ChevronRight />
            </Button>
            {recovery && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setRecovery(false)}
              >
                Torna al login
              </Button>
            )}
          </form>
        </div>
      </section>
    </main>
  )
}
