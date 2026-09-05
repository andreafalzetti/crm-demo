import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import type { RecordModel } from "pocketbase"

import {
  Can,
  EmptyState,
  PageHeader,
  TableLoader,
  pb,
  useAuth,
  useClientManifest,
} from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { AgendaEntryDialog } from "../components/agenda-entry-dialog"
import { addDays, dateTimeLabel, dayKey, startOfWeek } from "../lib/week"
import type { AgendaEntry, AgendaEvent, NamedRecord } from "../types"

type WorkSource = RecordModel & {
  title: string
  start_at: string
  organization: string
  code: string
}

type LeaveSource = RecordModel & {
  staff: string
  start_date: string
  end_date: string
  type: string
}

type Assignment = RecordModel & {
  work_item: string
  staff: string
}

function leaveEventsForWeek(
  requests: LeaveSource[],
  days: Date[],
  timeZone: string
) {
  const events: AgendaEvent[] = []
  for (const request of requests) {
    const requestStart = new Date(request.start_date)
    const requestEnd = new Date(request.end_date)
    requestStart.setHours(0, 0, 0, 0)
    requestEnd.setHours(23, 59, 59, 999)
    for (const day of days) {
      const value = day.getTime()
      if (value < requestStart.getTime() || value > requestEnd.getTime()) {
        continue
      }
      const member = request.expand?.staff as NamedRecord | undefined
      events.push({
        id: `leave-${request.id}-${dayKey(day, timeZone)}`,
        title: `${member?.first_name ?? "Personale"} · assenza`,
        start: day.toISOString(),
        source: "leave",
        staffId: request.staff,
        meta: request.type === "vacation" ? "Ferie" : "Assenza",
      })
    }
  }
  return events
}

export function AgendaPage() {
  const manifest = useClientManifest()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(() => startOfWeek(new Date()))
  const [staffFilter, setStaffFilter] = useState("all")
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(cursor, index)),
    [cursor]
  )
  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("it-IT", {
        month: "long",
        year: "numeric",
        timeZone: manifest.timeZone,
      }),
    [manifest.timeZone]
  )
  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("it-IT", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: manifest.timeZone,
      }),
    [manifest.timeZone]
  )
  const start = days[0]
  const end = addDays(days[6], 1)
  const range = {
    start: start.toISOString(),
    end: end.toISOString(),
  }
  const entries = useQuery({
    queryKey: ["agenda", "entries", range.start],
    queryFn: () =>
      pb.collection<AgendaEntry>("agenda_entries").getFullList({
        filter: pb.filter("start_at >= {:start} && start_at < {:end}", range),
        sort: "start_at",
        expand: "organization,staff",
      }),
  })
  const work = useQuery({
    queryKey: ["agenda", "work", range.start],
    queryFn: () =>
      pb.collection<WorkSource>("work_items").getFullList({
        filter: pb.filter(
          'start_at >= {:start} && start_at < {:end} && status != "cancelled"',
          range
        ),
        sort: "start_at",
        expand: "organization",
      }),
    enabled: can("workitems.items.read"),
  })
  const leave = useQuery({
    queryKey: ["agenda", "leave", range.start],
    queryFn: () =>
      pb.collection<LeaveSource>("leave_requests").getFullList({
        filter: pb.filter(
          'status = "approved" && start_date < {:end} && end_date >= {:start}',
          range
        ),
        expand: "staff",
      }),
    enabled: can("personnel.leave.read"),
  })
  const assignments = useQuery({
    queryKey: ["agenda", "assignments"],
    queryFn: () =>
      pb.collection<Assignment>("work_item_assignments").getFullList({
        fields: "id,work_item,staff",
      }),
    enabled: can("workitems.assignments.read"),
  })
  const staff = useQuery({
    queryKey: ["agenda", "staff-options"],
    queryFn: () =>
      pb.collection<NamedRecord>("staff_members").getFullList({
        sort: "last_name,first_name",
        fields: "id,first_name,last_name",
      }),
    enabled: can("personnel.staff.read"),
  })
  const events = useMemo(() => {
    const agendaEvents: AgendaEvent[] = (entries.data ?? []).map((entry) => ({
      id: `agenda-${entry.id}`,
      title: entry.title,
      start: entry.start_at,
      source: "agenda",
      staffId: entry.staff,
      meta: String(
        (entry.expand?.organization as NamedRecord | undefined)?.name ??
          (entry.expand?.staff as NamedRecord | undefined)?.first_name ??
          "Appuntamento"
      ),
    }))
    const workEvents: AgendaEvent[] = (work.data ?? []).map((item) => ({
      id: `work-${item.id}`,
      title: item.title,
      start: item.start_at,
      source: "work",
      staffId: assignments.data?.find(
        (assignment) => assignment.work_item === item.id
      )?.staff,
      meta: String(item.expand?.organization?.name ?? item.code),
    }))
    const leaveEvents = leaveEventsForWeek(
      leave.data ?? [],
      days,
      manifest.timeZone
    )
    return [...agendaEvents, ...workEvents, ...leaveEvents].filter(
      (event) => staffFilter === "all" || event.staffId === staffFilter
    )
  }, [
    assignments.data,
    days,
    entries.data,
    leave.data,
    manifest.timeZone,
    staffFilter,
    work.data,
  ])
  const loading = entries.isLoading || work.isLoading || leave.isLoading

  return (
    <>
      <PageHeader
        eyebrow="Pianificazione condivisa"
        title="Agenda"
        description="Interventi, appuntamenti e assenze composti in una sola settimana."
        actions={
          <Can permission="agenda.entries.create">
            <Button onClick={() => setOpen(true)}>
              <Plus /> Nuovo appuntamento
            </Button>
          </Can>
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor(addDays(cursor, -7))}
          >
            <ChevronLeft />
            <span className="sr-only">Settimana precedente</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setCursor(startOfWeek(new Date()))}
          >
            Oggi
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor(addDays(cursor, 7))}
          >
            <ChevronRight />
            <span className="sr-only">Settimana successiva</span>
          </Button>
          <p className="ml-2 hidden font-editorial text-xl sm:block">
            {monthFormatter.format(cursor)}
          </p>
        </div>
        <Select
          value={staffFilter}
          onValueChange={(value) => setStaffFilter(value ?? "all")}
        >
          <SelectTrigger className="w-full bg-card sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutto il personale</SelectItem>
            {staff.data?.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <TableLoader />
      ) : (
        <Card className="overflow-hidden surface-shadow">
          <CardContent className="overflow-x-auto p-0">
            <div className="grid min-w-[980px] grid-cols-7 divide-x">
              {days.map((day) => {
                const current = dayKey(day, manifest.timeZone)
                const dayEvents = events.filter(
                  (event) => dayKey(event.start, manifest.timeZone) === current
                )
                const isToday =
                  current === dayKey(new Date(), manifest.timeZone)
                return (
                  <section key={current} className="min-h-[430px] bg-card">
                    <header
                      className={
                        isToday
                          ? "border-b bg-primary px-3 py-3 text-primary-foreground"
                          : "border-b bg-muted/35 px-3 py-3"
                      }
                    >
                      <p className="text-xs font-semibold capitalize">
                        {dayFormatter.format(day)}
                      </p>
                    </header>
                    <div className="space-y-2 p-2">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className={
                            event.source === "work"
                              ? "rounded-lg border-l-2 border-l-primary bg-primary/8 p-3"
                              : event.source === "leave"
                                ? "rounded-lg border-l-2 border-l-amber-500 bg-amber-500/8 p-3"
                                : "rounded-lg border-l-2 border-l-sky-500 bg-sky-500/8 p-3"
                          }
                        >
                          <p className="text-xs leading-4 font-semibold">
                            {event.title}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {event.source === "leave"
                              ? event.meta
                              : `${dateTimeLabel(event.start, manifest.timeZone)} · ${event.meta}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {!loading && events.length === 0 && (
        <div className="mt-5">
          <EmptyState
            icon={CalendarDays}
            title="Settimana libera"
            description="Non ci sono impegni per i filtri selezionati."
          />
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Legend color="bg-primary" label="Intervento" />
        <Legend color="bg-sky-500" label="Appuntamento" />
        <Legend color="bg-amber-500" label="Ferie / assenza" />
      </div>
      {open && (
        <AgendaEntryDialog
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void queryClient.invalidateQueries({ queryKey: ["agenda"] })
          }}
        />
      )}
    </>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`size-2 rounded-full ${color}`} />
      {label}
    </span>
  )
}
