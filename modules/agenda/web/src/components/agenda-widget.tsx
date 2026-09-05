import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, CalendarDays } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { pb, useAuth, useClientManifest } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import { addDays, dayKey } from "../lib/week"

export function AgendaWidget() {
  const manifest = useClientManifest()
  const { can } = useAuth()
  const [referenceDate] = useState(() => new Date())
  const today = dayKey(referenceDate, manifest.timeZone)
  const tomorrow = dayKey(addDays(referenceDate, 1), manifest.timeZone)
  const entries = useQuery({
    queryKey: ["dashboard", "agenda-today", today],
    queryFn: async () => {
      const agenda = await pb.collection("agenda_entries").getList(1, 1, {
        filter: pb.filter("start_at >= {:start} && start_at < {:end}", {
          start: `${today} 00:00:00.000Z`,
          end: `${tomorrow} 00:00:00.000Z`,
        }),
        fields: "id",
      })
      if (!can("workitems.items.read")) return agenda.totalItems
      const work = await pb.collection("work_items").getList(1, 1, {
        filter: pb.filter(
          'start_at >= {:start} && start_at < {:end} && status != "cancelled"',
          {
            start: `${today} 00:00:00.000Z`,
            end: `${tomorrow} 00:00:00.000Z`,
          }
        ),
        fields: "id",
      })
      return agenda.totalItems + work.totalItems
    },
  })

  return (
    <Card className="overflow-hidden border-primary/25 bg-[#1d211e] text-stone-100 surface-shadow">
      <CardContent className="relative p-6">
        <div className="absolute -right-10 -bottom-16 size-40 rounded-full border border-emerald-300/20" />
        <CalendarDays className="size-6 text-emerald-300" />
        <p className="mt-5 text-[10px] font-semibold tracking-[.2em] text-emerald-300 uppercase">
          Agenda di oggi
        </p>
        <p className="mt-1 font-editorial text-5xl">{entries.data ?? "—"}</p>
        <p className="mt-1 text-xs text-stone-400">impegni pianificati</p>
        <Button asChild variant="secondary" size="sm" className="relative mt-6">
          <Link to="/agenda">
            Apri la settimana <ArrowUpRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
