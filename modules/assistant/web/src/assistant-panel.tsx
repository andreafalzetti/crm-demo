import { type FormEvent, useRef, useState } from "react"
import {
  ArrowUp,
  Bot,
  CalendarDays,
  LoaderCircle,
  MessageSquarePlus,
  Sparkles,
  UsersRound,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { Textarea } from "@workspace/ui/components/textarea"

import { resolveConfirmation, sendMessage } from "./api"
import { MessageBubble } from "./message-bubble"
import type { ConversationMessage } from "./types"

const suggestions = [
  {
    icon: UsersRound,
    label: "Clienti",
    prompt:
      "Cerca il cliente Bianchi e riassumi note, interventi e preventivi.",
  },
  {
    icon: CalendarDays,
    label: "Agenda",
    prompt:
      "Quali appuntamenti e interventi sono previsti nei prossimi 7 giorni?",
  },
  {
    icon: Sparkles,
    label: "Disponibilità",
    prompt: "Chi del personale è disponibile nei prossimi 7 giorni?",
  },
]

function newSessionId() {
  return `crm-${crypto.randomUUID()}`
}

export function AssistantPanel() {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [draft, setDraft] = useState("")
  const sessionId = useRef<string | undefined>(undefined)
  const [sending, setSending] = useState(false)
  const [busyConfirmation, setBusyConfirmation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function currentSessionId() {
    sessionId.current ??= newSessionId()
    return sessionId.current
  }

  async function submit(text: string) {
    const value = text.trim()
    if (!value || sending) return
    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: value,
    }
    setMessages((current) => [...current, userMessage])
    setDraft("")
    setError(null)
    setSending(true)
    try {
      const response = await sendMessage(value, currentSessionId())
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: response.message,
          confirmations: response.confirmations,
          links: response.links,
        },
      ])
    } catch {
      setError(
        "L’assistente non ha completato la richiesta. Puoi riprovare senza perdere la conversazione."
      )
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit(draft)
  }

  async function handleResolve(
    messageId: string,
    confirmationId: string,
    decision: "confirm" | "cancel"
  ) {
    setBusyConfirmation(confirmationId)
    setError(null)
    try {
      const response = await resolveConfirmation(confirmationId, decision)
      setMessages((current) =>
        current.map((message) =>
          message.id !== messageId
            ? message
            : {
                ...message,
                confirmations: message.confirmations?.map((confirmation) =>
                  confirmation.id === confirmationId
                    ? { ...confirmation, status: response.status }
                    : confirmation
                ),
              }
        )
      )
    } catch {
      setError("Non è stato possibile registrare la decisione. Riprova.")
    } finally {
      setBusyConfirmation(null)
    }
  }

  function resetConversation() {
    setMessages([])
    setDraft("")
    setError(null)
    sessionId.current = newSessionId()
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="sm" className="gap-2 shadow-sm" aria-label="Assistente">
          <Sparkles className="size-4" />
          <span className="hidden md:inline">Assistente</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[500px]">
        <SheetHeader className="border-b px-5 py-5 text-left">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
                Assistente operativo
              </p>
              <SheetTitle className="font-editorial text-2xl font-normal tracking-tight">
                Taccuino di studio
              </SheetTitle>
              <SheetDescription className="mt-1.5 text-xs leading-5">
                Legge i dati consentiti dal tuo ruolo. Ogni modifica richiede
                una tua conferma.
              </SheetDescription>
            </div>
            {messages.length > 0 ? (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={resetConversation}
                title="Nuova conversazione"
              >
                <MessageSquarePlus />
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-col justify-center py-8">
              <div className="grid size-11 place-items-center rounded-2xl border bg-primary/5 text-primary shadow-sm">
                <Bot className="size-5" />
              </div>
              <h2 className="mt-5 font-editorial text-3xl tracking-tight">
                Da dove iniziamo?
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Posso incrociare anagrafiche, personale, interventi, agenda e
                preventivi della demo.
              </p>
              <div className="mt-6 grid gap-2">
                {suggestions.map((suggestion) => {
                  const Icon = suggestion.icon
                  return (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => void submit(suggestion.prompt)}
                      className="group flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/[.035]"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground group-hover:text-primary">
                        <Icon className="size-4" />
                      </span>
                      <span>
                        <span className="block text-xs font-semibold">
                          {suggestion.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                          {suggestion.prompt}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6" aria-live="polite">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  busyConfirmation={busyConfirmation}
                  onResolve={handleResolve}
                />
              ))}
              {sending ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="grid size-7 place-items-center rounded-full border bg-card text-primary">
                    <LoaderCircle className="size-3.5 animate-spin" />
                  </span>
                  Sto consultando il CRM…
                </div>
              ) : null}
            </div>
          )}
          {error ? (
            <p
              className="mt-4 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-xs leading-5 text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t bg-background px-4 py-4"
        >
          <div className="relative rounded-xl border bg-card shadow-sm focus-within:border-primary/55 focus-within:ring-2 focus-within:ring-primary/10">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void submit(draft)
                }
              }}
              maxLength={2000}
              placeholder="Chiedi o prepara un’operazione…"
              aria-label="Messaggio per l’assistente"
              className="min-h-24 resize-none border-0 bg-transparent pr-14 shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2.5 bottom-2.5 size-9 rounded-lg"
              disabled={!draft.trim() || sending}
              title="Invia"
            >
              {sending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <ArrowUp />
              )}
            </Button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            POC AI · verifica sempre i dati prima di confermare
          </p>
        </form>
      </SheetContent>
    </Sheet>
  )
}
