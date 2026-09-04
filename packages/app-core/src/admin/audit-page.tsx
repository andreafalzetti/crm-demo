import { useQuery } from "@tanstack/react-query"
import { History } from "lucide-react"
import type { RecordModel } from "pocketbase"

import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { useAuth } from "../auth/use-auth"
import { AccessDenied } from "../components/access-denied"
import { EmptyState } from "../components/empty-state"
import { PageHeader } from "../components/page-header"
import { TableLoader } from "../components/table-loader"
import { formatDateTime } from "../lib/format"
import { pb } from "../lib/pocketbase"

export function AuditPage() {
  const { can } = useAuth()
  const audit = useQuery({
    queryKey: ["audit"],
    queryFn: () =>
      pb
        .collection("audit_events")
        .getList(1, 100, { sort: "-created", expand: "actor" }),
  })

  if (!can("core.audit.read")) return <AccessDenied />
  return (
    <>
      <PageHeader
        eyebrow="Amministrazione"
        title="Registro attività"
        description="Traccia immutabile delle modifiche effettuate tramite il CRM."
      />
      {audit.isLoading ? (
        <TableLoader />
      ) : audit.data?.items.length ? (
        <div className="overflow-hidden rounded-xl border bg-card surface-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Persona</TableHead>
                <TableHead>Azione</TableHead>
                <TableHead>Risorsa</TableHead>
                <TableHead>Record</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.data.items.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDateTime(String(event.created))}
                  </TableCell>
                  <TableCell>
                    {String(
                      (event.expand?.actor as RecordModel)?.name ?? "Sistema"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        event.action === "delete" ? "destructive" : "secondary"
                      }
                    >
                      {actionLabel(String(event.action))}
                    </Badge>
                  </TableCell>
                  <TableCell>{String(event.collection)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {String(event.record_id)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={History}
          title="Registro vuoto"
          description="Le prossime modifiche appariranno qui."
        />
      )}
    </>
  )
}

function actionLabel(action: string) {
  return (
    (
      {
        create: "Creazione",
        update: "Modifica",
        delete: "Eliminazione",
      } as Record<string, string>
    )[action] ?? action
  )
}
