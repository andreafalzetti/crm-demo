import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronDown, Users } from "lucide-react"
import type { RecordModel } from "pocketbase"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Switch } from "@workspace/ui/components/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { useAuth } from "../auth/use-auth"
import { AccessDenied } from "../components/access-denied"
import { EmptyState } from "../components/empty-state"
import { PageHeader } from "../components/page-header"
import { TableLoader } from "../components/table-loader"
import { initials } from "../lib/format"
import { pb } from "../lib/pocketbase"
import type { UserRecord } from "../types"
import { CreateUserDialog } from "./create-user-dialog"
import { SUPPORT_ROLE } from "./permission-picker"

export function UsersPage() {
  const { can, user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () =>
      pb
        .collection<UserRecord>("users")
        .getFullList({ sort: "name", expand: "roles" }),
  })
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: () => pb.collection("roles").getFullList({ sort: "name" }),
    enabled: can("core.users.manage"),
  })
  const toggleUser = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      pb.collection("users").update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  })

  // F2 Labs' support stays at the bottom, closed: visible, since the
  // client must know who can enter its data, but not among the team
  // (docs/ruoli.md, «L'assistenza»). Its people are the support's to
  // manage: the server refuses the others.
  const iAmSupport = Boolean(currentUser?.support)
  const team = (users.data ?? []).filter((user) => !user.support)
  const helpers = (users.data ?? []).filter((user) => user.support)
  const row = (user: UserRecord) => (
    <TableRow key={user.id}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>{roleNames(user)}</TableCell>
      <TableCell>
        <Badge variant={user.must_change_password ? "secondary" : "outline"}>
          {user.must_change_password ? "Cambio password" : "Operativo"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Switch
          checked={user.active}
          disabled={
            !can("core.users.manage") ||
            user.id === currentUser?.id ||
            (Boolean(user.support) && !iAmSupport)
          }
          onCheckedChange={(active) =>
            toggleUser.mutate({ id: user.id, active })
          }
          aria-label={`Stato ${user.name}`}
        />
      </TableCell>
    </TableRow>
  )

  if (!can("core.users.read")) return <AccessDenied />
  return (
    <>
      <PageHeader
        eyebrow="Amministrazione"
        title="Persone e accessi"
        description="Account interni, stato e ruoli assegnati."
        actions={
          can("core.users.manage") ? (
            <CreateUserDialog
              roles={(roles.data ?? []).filter(
                (role) => iAmSupport || role.key !== SUPPORT_ROLE
              )}
              open={open}
              onOpenChange={setOpen}
              onCreated={() =>
                void queryClient.invalidateQueries({ queryKey: ["users"] })
              }
            />
          ) : undefined
        }
      />
      {users.isLoading ? (
        <TableLoader />
      ) : users.data?.length ? (
        <div className="overflow-hidden rounded-xl border bg-card surface-shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="w-24 text-right">Attivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map(row)}
              {helpers.length > 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-expanded={showSupport}
                      className="text-muted-foreground"
                      onClick={() => setShowSupport((open) => !open)}
                    >
                      <ChevronDown
                        className={cn(
                          "transition-transform",
                          !showSupport && "-rotate-90"
                        )}
                      />
                      Assistenza F2 Labs ·{" "}
                      {helpers.length === 1
                        ? "1 persona"
                        : `${helpers.length} persone`}
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {showSupport && helpers.map(row)}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="Nessun utente"
          description="Crea il primo account operativo del team."
          icon={Users}
        />
      )}
    </>
  )
}

function roleNames(user: UserRecord) {
  const roles = (user.expand?.roles as RecordModel[] | undefined) ?? []
  return roles.length ? roles.map((role) => String(role.name)).join(", ") : "—"
}
