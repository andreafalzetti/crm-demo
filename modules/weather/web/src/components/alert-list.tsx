import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Check, Info, TriangleAlert } from "lucide-react"

import { Can } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"

import { acknowledgeAlert } from "../lib/api"
import type { WeatherAlert } from "../types"

const SEVERITY = {
  info: { icon: Info, tone: "border-sky-500/30 bg-sky-500/5 text-sky-700" },
  warning: {
    icon: TriangleAlert,
    tone: "border-amber-500/35 bg-amber-500/5 text-amber-700",
  },
  critical: {
    icon: AlertTriangle,
    tone: "border-red-500/35 bg-red-500/5 text-red-700",
  },
} as const

export function AlertList({ alerts }: { alerts: WeatherAlert[] }) {
  const queryClient = useQueryClient()
  const acknowledge = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weather", "alerts"] }),
  })

  if (alerts.length === 0) return null

  return (
    <ul className="space-y-2">
      {alerts.map((alert) => {
        const severity = SEVERITY[alert.severity] ?? SEVERITY.info
        const Icon = severity.icon
        return (
          <li
            key={alert.id}
            className={`flex items-start gap-3 rounded-xl border p-3 ${severity.tone}`}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="flex-1 text-sm">{alert.headline}</p>
            <Can permission="weather.alerts.acknowledge">
              <Button
                size="sm"
                variant="ghost"
                disabled={acknowledge.isPending}
                onClick={() => acknowledge.mutate(alert.id)}
              >
                <Check className="size-4" aria-hidden />
                <span className="sr-only">Segna come gestita</span>
              </Button>
            </Can>
          </li>
        )
      })}
    </ul>
  )
}
