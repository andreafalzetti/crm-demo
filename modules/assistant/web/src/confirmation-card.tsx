import { Check, ShieldCheck, X } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import type { Confirmation } from "./types"

export function ConfirmationCard({
  confirmation,
  busy,
  onResolve,
}: {
  confirmation: Confirmation
  busy: boolean
  onResolve: (decision: "confirm" | "cancel") => void
}) {
  const resolved = confirmation.status !== "pending"

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-amber-500/25 bg-amber-50/70 dark:bg-amber-950/15">
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[.14em] text-amber-800 uppercase dark:text-amber-200">
            {resolved ? "Decisione registrata" : "Conferma richiesta"}
          </p>
          <p className="mt-1 text-sm leading-5 text-foreground">
            {confirmation.summary}
          </p>
        </div>
      </div>
      {resolved ? (
        <div className="flex items-center gap-2 border-t border-amber-500/20 px-3.5 py-2.5 text-xs font-medium text-muted-foreground">
          {confirmation.status === "confirmed" ? (
            <Check className="size-3.5 text-emerald-600" />
          ) : (
            <X className="size-3.5" />
          )}
          {confirmation.status === "confirmed" ? "Eseguita" : "Annullata"}
        </div>
      ) : (
        <div className="flex gap-2 border-t border-amber-500/20 px-3.5 py-2.5">
          <Button
            size="sm"
            className="h-8"
            disabled={busy}
            onClick={() => onResolve("confirm")}
          >
            <Check /> Conferma
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            disabled={busy}
            onClick={() => onResolve("cancel")}
          >
            Annulla
          </Button>
        </div>
      )}
    </div>
  )
}
