import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Settings2, ShieldCheck } from "lucide-react"
import type { RecordModel } from "pocketbase"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { useAuth } from "../auth/use-auth"
import { AccessDenied } from "../components/access-denied"
import { PageHeader } from "../components/page-header"
import { TableLoader } from "../components/table-loader"
import { pb } from "../lib/pocketbase"
import { SUPPORT_ROLE } from "./permission-picker"
import { RoleDialog } from "./role-dialog"

export function RolesPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const roles = useQuery({
    queryKey: ["roles", "permissions"],
    queryFn: () =>
      pb
        .collection("roles")
        .getFullList({ sort: "name", expand: "permissions" }),
  })
  const permissions = useQuery({
    queryKey: ["permissions"],
    queryFn: () =>
      pb.collection("permissions").getFullList({ sort: "module,label" }),
    enabled: can("core.roles.manage"),
  })
  // undefined: closed; null: a new role.
  const [editing, setEditing] = useState<RecordModel | null | undefined>(
    undefined
  )
  // F2 Labs' support is a line at the bottom, not one of the roles of the
  // team (docs/ruoli.md, «L'assistenza»).
  const supportRole = roles.data?.find((role) => role.key === SUPPORT_ROLE)
  const holders = useQuery({
    queryKey: ["users", "support"],
    queryFn: () =>
      pb.collection("users").getList(1, 1, { filter: "support = true" }),
    enabled: Boolean(supportRole) && can("core.users.read"),
  })

  if (!can("core.roles.read") && !can("core.roles.manage"))
    return <AccessDenied />
  return (
    <>
      <PageHeader
        eyebrow="Amministrazione"
        title="Ruoli e permessi"
        description="Le capability arrivano dai moduli; i ruoli le combinano senza cambiare codice."
        actions={
          can("core.roles.manage") ? (
            <Button onClick={() => setEditing(null)}>
              <Plus />
              Nuovo ruolo
            </Button>
          ) : undefined
        }
      />
      {roles.isLoading ? (
        <TableLoader />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {roles.data
            ?.filter((role) => role.key !== SUPPORT_ROLE)
            .map((role) => (
              <Card key={role.id} className="surface-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="font-editorial text-2xl">
                        {String(role.name)}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {String(role.description)}
                      </CardDescription>
                    </div>
                    {role.system && <Badge variant="outline">Sistema</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {role.permissions?.length ?? 0} permessi
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {((role.expand?.permissions as RecordModel[]) ?? [])
                      .slice(0, 5)
                      .map((permission) => (
                        <Badge variant="secondary" key={permission.id}>
                          {String(permission.label)}
                        </Badge>
                      ))}
                    {(role.permissions?.length ?? 0) > 5 && (
                      <Badge variant="outline">
                        +{role.permissions.length - 5}
                      </Badge>
                    )}
                  </div>
                  {can("core.roles.manage") && (
                    <Button
                      variant="outline"
                      className="mt-5 w-full"
                      onClick={() => setEditing(role)}
                    >
                      <Settings2 />
                      Configura
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
      {supportRole && (
        <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <ShieldCheck className="size-4" />
          <span>
            <span className="font-medium text-foreground">
              {String(supportRole.name)}
            </span>{" "}
            · ha sempre tutti i permessi
            {holders.data &&
              ` · ${holders.data.totalItems === 1 ? "1 persona" : `${holders.data.totalItems} persone`}`}
          </span>
          {can("core.roles.manage") && (
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0"
              onClick={() => setEditing(supportRole)}
            >
              Vedi i permessi
            </Button>
          )}
        </p>
      )}
      {editing !== undefined && (
        <RoleDialog
          role={editing}
          roles={roles.data ?? []}
          permissions={permissions.data ?? []}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined)
            void queryClient.invalidateQueries({
              queryKey: ["roles", "permissions"],
            })
          }}
        />
      )}
    </>
  )
}
