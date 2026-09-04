import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Clock3, House, UsersRound } from "lucide-react"

import { EmptyState, PageHeader, TableLoader, pb, useAuth } from "@crm/app-core"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { dateInputValue, toPocketBaseDate } from "../lib/date"
import type { AttendanceEntry, StaffMember } from "../types"

export function AttendancePage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const today = dateInputValue(new Date())
  const staff = useQuery({
    queryKey: ["staff"],
    queryFn: () =>
      pb.collection<StaffMember>("staff_members").getFullList({
        sort: "last_name,first_name",
        filter: 'status = "active"',
      }),
  })
  const entries = useQuery({
    queryKey: ["attendance", today],
    queryFn: () =>
      pb.collection<AttendanceEntry>("attendance_entries").getFullList({
        filter: pb.filter("day >= {:start} && day <= {:end}", {
          start: `${today} 00:00:00.000Z`,
          end: `${today} 23:59:59.999Z`,
        }),
      }),
  })
  const mark = useMutation({
    mutationFn: async ({
      member,
      kind,
    }: {
      member: StaffMember
      kind: string
    }) => {
      const existing = entries.data?.find((entry) => entry.staff === member.id)
      const payload = {
        staff: member.id,
        day: toPocketBaseDate(today),
        kind,
        clock_in: new Date().toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }
      return existing
        ? pb.collection("attendance_entries").update(existing.id, payload)
        : pb.collection("attendance_entries").create(payload)
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  })

  return (
    <>
      <PageHeader
        eyebrow="Personale · oggi"
        title="Presenze"
        description="Una fotografia operativa del team, aggiornata in tempo reale."
      />
      {staff.isLoading || entries.isLoading ? (
        <TableLoader />
      ) : staff.data?.length ? (
        <div className="overflow-hidden rounded-xl border bg-card surface-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collaboratore</TableHead>
                <TableHead>Situazione</TableHead>
                <TableHead>Ingresso</TableHead>
                <TableHead className="text-right">Registra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.data.map((member) => {
                const entry = entries.data?.find(
                  (item) => item.staff === member.id
                )
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <p className="font-medium">
                        {member.first_name} {member.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.job_title}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry?.kind === "present"
                            ? "default"
                            : entry?.kind === "remote"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {entry ? attendanceLabel(entry.kind) : "Non registrata"}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry?.clock_in || "—"}</TableCell>
                    <TableCell>
                      {can("personnel.attendance.create") && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              mark.mutate({ member, kind: "remote" })
                            }
                          >
                            <House /> Remoto
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              mark.mutate({ member, kind: "present" })
                            }
                          >
                            <CheckCircle2 /> Presente
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={UsersRound}
          title="Nessun collaboratore"
          description="Aggiungi il personale prima di registrare le presenze."
        />
      )}
      <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="size-4" /> Le presenze possono essere corrette dagli
        utenti autorizzati.
      </div>
    </>
  )
}

function attendanceLabel(value: string) {
  return (
    (
      { present: "In sede", remote: "Da remoto", absent: "Assente" } as Record<
        string,
        string
      >
    )[value] ?? value
  )
}
