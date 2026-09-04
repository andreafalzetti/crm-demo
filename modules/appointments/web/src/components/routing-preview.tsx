import { Check, ShieldAlert, Sparkles, UserRoundCheck, X } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"

const CANDIDATES = [
  {
    name: "Dott.ssa Bianchi",
    load: "78%",
    outcome: "excluded",
    reason: "Ferie approvate",
  },
  {
    name: "Dott. Romano",
    load: "62%",
    outcome: "selected",
    reason: "Disponibile · carico minore",
  },
  {
    name: "Dott.ssa Neri",
    load: "71%",
    outcome: "eligible",
    reason: "Disponibile · seconda scelta",
  },
] as const

export function RoutingPreview({ simulation }: { simulation: number }) {
  const selected = simulation % 2 === 0 ? "Dott. Romano" : "Dott.ssa Neri"

  return (
    <div className="overflow-hidden rounded-xl border bg-[#1d211e] text-stone-100 surface-shadow">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[.2em] text-emerald-300 uppercase">
              Routing trace · simulazione {simulation + 1}
            </p>
            <h2 className="mt-1 font-editorial text-3xl">
              Prima visita · domani 10:15
            </h2>
          </div>
          <Sparkles className="size-5 text-emerald-300" />
        </div>
      </div>
      <div className="space-y-2 p-3">
        {CANDIDATES.map((candidate) => {
          const outcome =
            candidate.outcome === "excluded"
              ? "excluded"
              : candidate.name === selected
                ? "selected"
                : "eligible"
          return (
            <div
              key={candidate.name}
              className={
                outcome === "selected"
                  ? "flex items-center gap-3 rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-3"
                  : "flex items-center gap-3 rounded-lg border border-white/8 bg-white/[.035] p-3"
              }
            >
              <span
                className={
                  outcome === "selected"
                    ? "grid size-8 place-items-center rounded-full bg-emerald-300 text-stone-950"
                    : outcome === "excluded"
                      ? "grid size-8 place-items-center rounded-full bg-amber-400/15 text-amber-300"
                      : "grid size-8 place-items-center rounded-full bg-white/8 text-stone-300"
                }
              >
                {outcome === "selected" ? (
                  <Check className="size-4" />
                ) : outcome === "excluded" ? (
                  <X className="size-4" />
                ) : (
                  <UserRoundCheck className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{candidate.name}</p>
                <p className="mt-0.5 text-[11px] text-stone-400">
                  {outcome === "selected"
                    ? "Scelto · carico compatibile"
                    : candidate.reason}
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-white/10 text-stone-300"
              >
                Carico {candidate.load}
              </Badge>
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 border-t border-white/10 p-4 text-xs text-stone-400">
        <ShieldAlert className="size-4 shrink-0 text-emerald-300" />
        Ogni decisione conserva una traccia leggibile: regole applicate,
        esclusioni e criterio finale.
      </div>
    </div>
  )
}
