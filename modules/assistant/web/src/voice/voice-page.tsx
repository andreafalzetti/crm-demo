import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  Check,
  LoaderCircle,
  Mic,
  Square,
  Wrench,
} from "lucide-react"

import { AccessDenied, PageHeader, useAuth } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { resolveConfirmation } from "../api"
import { ConfirmationCard } from "../confirmation-card"
import type {
  Confirmation,
  VoiceStatus,
  VoiceToolRun,
  VoiceTranscriptLine,
} from "../types"
import { VoiceSession, type VoiceHandlers } from "./live-client"

const statusLabels: Record<VoiceStatus, string> = {
  idle: "Pronto",
  connecting: "Connessione…",
  active: "In ascolto",
  closed: "Conclusa",
  error: "Errore",
}

const toolLabels: Record<string, string> = {
  search_customers: "Ricerca clienti",
  customer_context: "Scheda cliente",
  team_availability: "Disponibilità team",
  agenda: "Agenda",
  work_items: "Interventi",
  quotes: "Preventivi",
  prepare_action: "Proposta di modifica",
  weather_forecast: "Meteo",
  weather_alerts: "Allerte meteo",
}

const suggestions = [
  "Che appuntamenti ho domani?",
  "Cerca il cliente Officine Aurora e riassumi la scheda.",
  "Chi è assente questa settimana?",
  "Prepara una nota per il cantiere di Via Roma.",
]

export function VoicePage() {
  const { can } = useAuth()
  const audioRef = useRef<HTMLAudioElement>(null)
  const sessionRef = useRef<VoiceSession | null>(null)
  const transcriptViewport = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<VoiceStatus>("idle")
  const [statusDetail, setStatusDetail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lines, setLines] = useState<VoiceTranscriptLine[]>([])
  const [tools, setTools] = useState<VoiceToolRun[]>([])
  const [confirmations, setConfirmations] = useState<Confirmation[]>([])
  const [busyConfirmation, setBusyConfirmation] = useState<string | null>(null)

  useEffect(() => {
    if (lines.length === 0) return
    const viewport = transcriptViewport.current
    if (!viewport) return
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    })
  }, [lines])

  useEffect(() => {
    return () => {
      void sessionRef.current?.close()
    }
  }, [])

  function appendTranscript(role: "user" | "assistant", delta: string) {
    setLines((current) => {
      const last = current[current.length - 1]
      if (last?.role === role) {
        return [...current.slice(0, -1), { ...last, text: last.text + delta }]
      }
      return [...current, { id: crypto.randomUUID(), role, text: delta }]
    })
  }

  function handleTool(run: VoiceToolRun) {
    setTools((current) => {
      if (run.phase === "start") return [run, ...current].slice(0, 12)
      const exists = current.some((item) => item.id === run.id)
      if (!exists) return [run, ...current].slice(0, 12)
      return current.map((item) => (item.id === run.id ? run : item))
    })
  }

  function handleConfirmation(confirmation: Confirmation) {
    setConfirmations((current) =>
      current.some((item) => item.id === confirmation.id)
        ? current
        : [confirmation, ...current]
    )
  }

  async function startCall() {
    const audio = audioRef.current
    if (!audio) return
    setError(null)
    setStatusDetail(null)
    const handlers: VoiceHandlers = {
      onStatus: (next, detail) => {
        setStatus(next)
        setStatusDetail(detail ?? null)
      },
      onTranscript: appendTranscript,
      onTool: handleTool,
      onConfirmation: handleConfirmation,
    }
    const session = new VoiceSession(audio, handlers)
    sessionRef.current = session
    try {
      await session.start()
    } catch (cause) {
      sessionRef.current = null
      setStatus("error")
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossibile avviare la sessione vocale."
      )
    }
  }

  async function stopCall() {
    await sessionRef.current?.close()
  }

  async function resolve(
    confirmation: Confirmation,
    decision: "confirm" | "cancel"
  ) {
    setBusyConfirmation(confirmation.id)
    setError(null)
    try {
      const response = await resolveConfirmation(confirmation.id, decision)
      setConfirmations((current) =>
        current.map((item) =>
          item.id === confirmation.id
            ? { ...item, status: response.status }
            : item
        )
      )
      sessionRef.current?.sendThinking(
        decision === "confirm"
          ? `L'utente ha confermato: ${confirmation.summary}`
          : `L'utente ha annullato: ${confirmation.summary}`
      )
    } catch {
      setError("Non è stato possibile registrare la decisione.")
    } finally {
      setBusyConfirmation(null)
    }
  }

  if (!can("assistant.use")) {
    return <AccessDenied />
  }

  const active = status === "active" || status === "connecting"

  return (
    <>
      <PageHeader
        eyebrow="Sperimentale · GPT-Live"
        title="Assistente vocale"
        description="Parla con il CRM a microfono aperto: l'assistente delega al backend, che legge e prepara le modifiche con i tuoi permessi. Le scritture restano in attesa di conferma."
        actions={
          active ? (
            <Button variant="outline" onClick={() => void stopCall()}>
              <Square /> Termina
            </Button>
          ) : (
            <Button onClick={() => void startCall()}>
              <Mic /> Avvia chiamata
            </Button>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="surface-shadow">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span
                aria-hidden
                className={
                  status === "active"
                    ? "size-2 rounded-full bg-emerald-500"
                    : status === "connecting"
                      ? "size-2 animate-pulse rounded-full bg-amber-500"
                      : status === "error"
                        ? "size-2 rounded-full bg-destructive"
                        : "size-2 rounded-full bg-muted-foreground/40"
                }
              />
              {statusLabels[status]}
            </CardTitle>
            {statusDetail ? (
              <p className="text-xs text-muted-foreground">{statusDetail}</p>
            ) : null}
          </CardHeader>
          <CardContent>
            <div
              ref={transcriptViewport}
              className="h-[380px] overflow-y-auto rounded-xl border bg-muted/20 p-4"
              aria-live="polite"
            >
              {lines.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <span className="grid size-11 place-items-center rounded-2xl border bg-card text-primary shadow-sm">
                    {status === "connecting" ? (
                      <LoaderCircle className="size-5 animate-spin" />
                    ) : (
                      <Mic className="size-5" />
                    )}
                  </span>
                  <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                    Avvia la chiamata e parla normalmente. Puoi provare con:
                  </p>
                  <ul className="grid max-w-sm gap-1.5">
                    {suggestions.map((suggestion) => (
                      <li
                        key={suggestion}
                        className="rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground"
                      >
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="space-y-4">
                  {lines.map((line) => (
                    <div
                      key={line.id}
                      className={
                        line.role === "user" ? "text-right" : "text-left"
                      }
                    >
                      <p className="mb-1 text-[10px] font-semibold tracking-[.14em] text-muted-foreground uppercase">
                        {line.role === "user" ? "Tu" : "Assistente"}
                      </p>
                      <p
                        className={
                          line.role === "user"
                            ? "ml-auto inline-block max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-left text-sm leading-6 text-primary-foreground"
                            : "inline-block max-w-[85%] rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2 text-sm leading-6"
                        }
                      >
                        {line.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <audio ref={audioRef} autoPlay controls className="mt-3 w-full" />
            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-xs leading-5 text-destructive"
              >
                {error}
              </p>
            ) : null}
            <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
              Il microfono richiede localhost o HTTPS. La chiave API resta sul
              server PocketBase; ogni strumento eseguito qui passa dai tuoi
              permessi.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="surface-shadow">
            <CardHeader>
              <CardTitle className="text-base">Strumenti usati</CardTitle>
            </CardHeader>
            <CardContent>
              {tools.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Durante la chiamata compaiono qui le operazioni delegate al
                  backend.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {tools.map((tool) => (
                    <li key={tool.id} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border bg-card text-muted-foreground">
                        {tool.phase === "start" ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : tool.error ? (
                          <AlertTriangle className="size-3.5 text-destructive" />
                        ) : (
                          <Check className="size-3.5 text-emerald-600" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-semibold">
                          <Wrench className="size-3 text-muted-foreground" />
                          {toolLabels[tool.name] ?? tool.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {tool.phase === "start"
                            ? "In corso…"
                            : (tool.error ?? summarizeResult(tool.result))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="surface-shadow">
            <CardHeader>
              <CardTitle className="text-base">Conferme in attesa</CardTitle>
            </CardHeader>
            <CardContent>
              {confirmations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nessuna modifica proposta. Quando l'assistente prepara una
                  scrittura, la trovi qui da confermare.
                </p>
              ) : (
                <div className="space-y-1">
                  {confirmations.map((confirmation) => (
                    <ConfirmationCard
                      key={confirmation.id}
                      confirmation={confirmation}
                      busy={busyConfirmation === confirmation.id}
                      onResolve={(decision) =>
                        void resolve(confirmation, decision)
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function summarizeResult(result: unknown) {
  if (result === undefined || result === null) return "Completato"
  try {
    const text = JSON.stringify(result)
    if (!text) return "Completato"
    return text.length > 180 ? `${text.slice(0, 180)}…` : text
  } catch {
    return "Completato"
  }
}
