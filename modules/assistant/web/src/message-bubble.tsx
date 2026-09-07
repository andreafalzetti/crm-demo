import { ArrowUpRight, Bot } from "lucide-react"
import Markdown from "react-markdown"
import { Link } from "react-router-dom"

import { ConfirmationCard } from "./confirmation-card"
import type { ConversationMessage } from "./types"

function AssistantMessage({ children }: { children: string }) {
  return (
    <Markdown
      skipHtml
      components={{
        p: ({ children: paragraph }) => (
          <p className="mb-3 last:mb-0">{paragraph}</p>
        ),
        strong: ({ children: emphasis }) => (
          <strong className="font-semibold text-foreground">{emphasis}</strong>
        ),
        ol: ({ children: items }) => (
          <ol className="my-3 list-decimal space-y-1 pl-5 marker:font-medium marker:text-muted-foreground">
            {items}
          </ol>
        ),
        ul: ({ children: items }) => (
          <ul className="my-3 list-disc space-y-1 pl-5 marker:text-muted-foreground">
            {items}
          </ul>
        ),
        li: ({ children: item }) => <li className="pl-1">{item}</li>,
        code: ({ children: code }) => (
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.92em]">
            {code}
          </code>
        ),
        pre: ({ children: code }) => (
          <pre className="my-3 overflow-x-auto rounded-lg border bg-muted/60 p-3 text-xs leading-5">
            {code}
          </pre>
        ),
        a: ({ children: label }) => <span>{label}</span>,
      }}
    >
      {children}
    </Markdown>
  )
}

export function MessageBubble({
  message,
  busyConfirmation,
  onResolve,
}: {
  message: ConversationMessage
  busyConfirmation: string | null
  onResolve: (
    messageId: string,
    confirmationId: string,
    decision: "confirm" | "cancel"
  ) => void
}) {
  if (message.role === "user") {
    return (
      <div className="ml-10 rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm">
        {message.text}
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border bg-card text-primary shadow-sm">
        <Bot className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="min-w-0 break-words text-sm leading-6 text-foreground">
          <AssistantMessage>{message.text}</AssistantMessage>
        </div>
        {message.links && message.links.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.links.map((link) => (
              <Link
                key={`${link.to}:${link.label}`}
                to={link.to}
                className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
              >
                {link.label} <ArrowUpRight className="size-3" />
              </Link>
            ))}
          </div>
        ) : null}
        {message.confirmations?.map((confirmation) => (
          <ConfirmationCard
            key={confirmation.id}
            confirmation={confirmation}
            busy={busyConfirmation === confirmation.id}
            onResolve={(decision) =>
              onResolve(message.id, confirmation.id, decision)
            }
          />
        ))}
      </div>
    </div>
  )
}
