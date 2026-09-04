import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ClipboardList, MapPin, Plus } from "lucide-react"

import {
  Can,
  EmptyState,
  PageHeader,
  TableLoader,
  formatDateTime,
  pb,
  useAuth,
} from "@crm/app-core"
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

import { WorkItemDialog } from "../components/work-item-dialog"
import { WorkStatusBadge } from "../components/work-status-badge"
import { workKindLabel } from "../lib/labels"
import type { OrganizationOption, WorkItem } from "../types"

export function WorkItemsPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("active")
  const items = useQuery({
    queryKey: ["work-items", filter],
    queryFn: () =>
      pb.collection<WorkItem>("work_items").getList(1, 100, {
        sort: filter === "done" ? "-updated" : "start_at",
        filter:
          filter === "all"
            ? ""
            : filter === "active"
              ? 'status = "planned" || status = "in_progress"'
              : pb.filter("status = {:status}", { status: filter }),
        expand: "organization",
      }),
  })
  const complete = useMutation({
    mutationFn: (id: string) =>
      pb.collection("work_items").update(id, { status: "done" }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["work-items"] }),
  })

  return (
    <>
      <PageHeader
        eyebrow="Esecuzione"
        title="Interventi"
        description="Incarichi, eventi e sedute dalla pianificazione alla chiusura."
        actions={
          <Can permission="workitems.items.create">
            <Button onClick={() => setOpen(true)}>
              <Plus /> Nuovo intervento
            </Button>
          </Can>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          ["active", "Da fare"],
          ["done", "Completati"],
          ["all", "Tutti"],
        ].map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {items.isLoading ? (
        <TableLoader />
      ) : items.data?.items.length ? (
        <div className="overflow-hidden rounded-xl border bg-card surface-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intervento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.data.items.map((item) => {
                const organization = item.expand?.organization as
                  | OrganizationOption
                  | undefined
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-muted">
                          <ClipboardList className="size-4" />
                        </span>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{item.code}</span>
                            <span>·</span>
                            <span>{workKindLabel(item.kind)}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{organization?.name ?? "—"}</TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {item.start_at
                          ? formatDateTime(item.start_at)
                          : "Da pianificare"}
                      </p>
                      {item.location && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" /> {item.location}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <WorkStatusBadge status={item.status} />
                        {item.priority === "high" && (
                          <Badge variant="destructive">Urgente</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {can("workitems.items.update") &&
                        item.status !== "done" &&
                        item.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => complete.mutate(item.id)}
                          >
                            <Check /> Chiudi
                          </Button>
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
          icon={ClipboardList}
          title="Nessun intervento"
          description="Pianifica il primo lavoro collegato a un cliente."
        />
      )}
      {open && (
        <WorkItemDialog
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void queryClient.invalidateQueries({ queryKey: ["work-items"] })
          }}
        />
      )}
    </>
  )
}
