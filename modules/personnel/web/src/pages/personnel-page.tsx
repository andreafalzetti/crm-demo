import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarDays, Plus, UserRoundCheck, UsersRound } from "lucide-react"

import {
  Can,
  EmptyState,
  PageHeader,
  TableLoader,
  pb,
  useAuth,
  useClientManifest,
} from "@crm/app-core"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { LeaveDialog } from "../components/leave-dialog"
import { StaffBadge } from "../components/staff-badge"
import { StaffDialog } from "../components/staff-dialog"
import { formatDay } from "../lib/date"
import type { LeaveRequest, StaffMember } from "../types"

export function PersonnelPage() {
  const manifest = useClientManifest()
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [staffOpen, setStaffOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const staff = useQuery({
    queryKey: ["staff"],
    queryFn: () =>
      pb.collection<StaffMember>("staff_members").getFullList({
        sort: "last_name,first_name",
      }),
  })
  const leave = useQuery({
    queryKey: ["leave-requests"],
    queryFn: () =>
      pb.collection<LeaveRequest>("leave_requests").getList(1, 20, {
        sort: "-created",
        expand: "staff",
      }),
  })
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      pb.collection("leave_requests").update(id, { status }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["leave-requests"] }),
  })

  return (
    <>
      <PageHeader
        eyebrow="Organizzazione"
        title="Personale"
        description="Anagrafiche interne, disponibilità e richieste del team."
        actions={
          <>
            <Can permission="personnel.leave.create">
              <Button variant="outline" onClick={() => setLeaveOpen(true)}>
                <CalendarDays />
                Ferie o assenza
              </Button>
            </Can>
            <Can permission="personnel.staff.create">
              <Button onClick={() => setStaffOpen(true)}>
                <Plus />
                Nuova persona
              </Button>
            </Can>
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="surface-shadow">
          <CardHeader>
            <CardTitle className="font-editorial text-3xl">Il team</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {staff.isLoading ? (
              <div className="p-5">
                <TableLoader />
              </div>
            ) : staff.data?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead>Mansione</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.data.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback>
                              {member.first_name[0]}
                              {member.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.employee_code} · {member.email || "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{member.job_title || "—"}</TableCell>
                      <TableCell>
                        <StaffBadge staff={member} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-5">
                <EmptyState
                  icon={UsersRound}
                  title="Team ancora vuoto"
                  description="Aggiungi le persone da assegnare agli interventi."
                />
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="surface-shadow">
          <CardHeader>
            <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
              Da gestire
            </p>
            <CardTitle className="font-editorial text-3xl">
              Ferie e assenze
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leave.data?.items.length ? (
              <div className="space-y-3">
                {leave.data.items.map((request) => {
                  const member = request.expand?.staff as
                    | StaffMember
                    | undefined
                  return (
                    <div key={request.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {member
                              ? `${member.first_name} ${member.last_name}`
                              : "Collaboratore"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {leaveType(request.type)} ·{" "}
                            {formatDay(request.start_date, manifest.timeZone)}–
                            {formatDay(request.end_date, manifest.timeZone)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            request.status === "approved"
                              ? "default"
                              : request.status === "rejected"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {leaveStatus(request.status)}
                        </Badge>
                      </div>
                      {request.status === "pending" &&
                        can("personnel.leave.update") && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                decide.mutate({
                                  id: request.id,
                                  status: "approved",
                                })
                              }
                            >
                              Approva
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                decide.mutate({
                                  id: request.id,
                                  status: "rejected",
                                })
                              }
                            >
                              Rifiuta
                            </Button>
                          </div>
                        )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <UserRoundCheck className="mx-auto size-7 text-primary" />
                <p className="mt-3 text-sm font-medium">
                  Nessuna richiesta aperta
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {staffOpen && (
        <StaffDialog
          onClose={() => setStaffOpen(false)}
          onSaved={() => {
            setStaffOpen(false)
            void queryClient.invalidateQueries({ queryKey: ["staff"] })
          }}
        />
      )}
      {leaveOpen && (
        <LeaveDialog
          staff={staff.data ?? []}
          onClose={() => setLeaveOpen(false)}
          onSaved={() => {
            setLeaveOpen(false)
            void queryClient.invalidateQueries({ queryKey: ["leave-requests"] })
          }}
        />
      )}
    </>
  )
}

function leaveType(value: string) {
  return (
    (
      { vacation: "Ferie", sick: "Malattia", permit: "Permesso" } as Record<
        string,
        string
      >
    )[value] ?? value
  )
}

function leaveStatus(value: string) {
  return (
    (
      {
        pending: "Da approvare",
        approved: "Approvata",
        rejected: "Rifiutata",
      } as Record<string, string>
    )[value] ?? value
  )
}
