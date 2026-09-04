import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, Palmtree, UsersRound } from "lucide-react"
import { Link } from "react-router-dom"

import { pb, useAuth } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import { dateInputValue } from "../lib/date"

export function PersonnelWidget() {
  const { can } = useAuth()
  const canReadLeave = can("personnel.leave.read")
  const today = dateInputValue(new Date())
  const staff = useQuery({
    queryKey: ["dashboard", "active-staff"],
    queryFn: async () =>
      (
        await pb
          .collection("staff_members")
          .getList(1, 1, { filter: 'status = "active"', fields: "id" })
      ).totalItems,
  })
  const away = useQuery({
    queryKey: ["dashboard", "away-staff", today],
    queryFn: async () =>
      (
        await pb.collection("leave_requests").getList(1, 1, {
          filter: pb.filter(
            'status = "approved" && start_date <= {:end} && end_date >= {:start}',
            {
              start: `${today} 00:00:00.000Z`,
              end: `${today} 23:59:59.999Z`,
            }
          ),
          fields: "id",
        })
      ).totalItems,
    enabled: canReadLeave,
  })

  return (
    <Card className="surface-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
              Personale
            </p>
            <h2 className="mt-2 font-editorial text-3xl">Disponibilità</h2>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
            <UsersRound className="size-5" />
          </span>
        </div>
        <div className="mt-6 flex items-end gap-3">
          <span className="font-editorial text-5xl">
            {staff.isLoading || (canReadLeave && away.isLoading)
              ? "—"
              : Math.max((staff.data ?? 0) - (away.data ?? 0), 0)}
          </span>
          <span className="pb-1 text-sm text-muted-foreground">
            disponibili su {staff.isLoading ? "—" : (staff.data ?? 0)}
          </span>
        </div>
        <div className="mt-5 flex items-center justify-between border-t pt-4">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Palmtree className="size-4" />
            {canReadLeave && away.isLoading ? "—" : (away.data ?? 0)} fuori sede
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link to="/personnel">
              Gestisci <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
