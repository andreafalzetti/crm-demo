import { useQuery } from "@tanstack/react-query"
import { ClipboardList } from "lucide-react"

import {
  EmptyState,
  TableLoader,
  formatDateTime,
  pb,
  useClientManifest,
} from "@crm/app-core"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { workKindLabel } from "../lib/labels"
import type { WorkItem } from "../types"
import { WorkStatusBadge } from "./work-status-badge"

export function CustomerWorkItems({
  organizationId,
}: {
  organizationId: string
}) {
  const manifest = useClientManifest()
  const items = useQuery({
    queryKey: ["customer-work-items", organizationId],
    queryFn: () =>
      pb.collection<WorkItem>("work_items").getFullList({
        filter: pb.filter("organization = {:organization}", {
          organization: organizationId,
        }),
        sort: "-start_at",
      }),
  })

  if (items.isLoading) return <TableLoader />
  if (!items.data?.length)
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nessun intervento collegato"
        description="Gli interventi creati per questo cliente appariranno qui."
      />
    )

  return (
    <div className="overflow-hidden rounded-xl border bg-card surface-shadow">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Codice</TableHead>
            <TableHead>Attività</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Stato</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.code}</TableCell>
              <TableCell>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {workKindLabel(item.kind)}
                </p>
              </TableCell>
              <TableCell>
                {item.start_at
                  ? formatDateTime(item.start_at, manifest.timeZone)
                  : "—"}
              </TableCell>
              <TableCell>
                <WorkStatusBadge status={item.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
