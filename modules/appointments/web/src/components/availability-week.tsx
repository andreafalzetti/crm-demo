import { CalendarOff, Clock3 } from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"

import { availability } from "../mock-data"

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven"]

export function AvailabilityWeek() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card surface-shadow">
      <div className="flex flex-col gap-2 border-b p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
            Disponibilità composta
          </p>
          <h2 className="mt-1 font-editorial text-3xl">Settimana tipo</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Turni</Badge>
          <Badge variant="secondary">Ferie</Badge>
          <Badge variant="secondary">Agenda</Badge>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[220px_repeat(5,1fr)] border-b bg-muted/35 text-[10px] font-semibold tracking-[.14em] text-muted-foreground uppercase">
            <div className="px-4 py-3">Professionista</div>
            {DAYS.map((day) => (
              <div key={day} className="border-l px-3 py-3 text-center">
                {day}
              </div>
            ))}
          </div>
          {availability.map((member) => (
            <div
              key={member.professional}
              className="grid grid-cols-[220px_repeat(5,1fr)] border-b last:border-0"
            >
              <div className="flex items-center gap-3 p-4">
                <Avatar className="size-9">
                  <AvatarFallback>{member.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{member.professional}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {member.role}
                  </p>
                </div>
              </div>
              {DAYS.map((day) => {
                const blocked = day === "Gio" && Boolean(member.exception)
                return (
                  <div
                    key={day}
                    className="flex min-h-20 items-center justify-center border-l p-2"
                  >
                    {blocked ? (
                      <div className="w-full rounded-lg border border-amber-500/25 bg-amber-500/8 p-2 text-center text-[11px] text-amber-800 dark:text-amber-300">
                        <CalendarOff className="mx-auto mb-1 size-3.5" />
                        Ferie
                      </div>
                    ) : (
                      <div className="w-full rounded-lg border border-primary/15 bg-primary/[.055] p-2 text-center text-[11px]">
                        <Clock3 className="mx-auto mb-1 size-3.5 text-primary" />
                        {member.days[day]}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
