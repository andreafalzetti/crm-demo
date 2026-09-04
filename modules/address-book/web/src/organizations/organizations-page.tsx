import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Mail, Phone, Plus } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import {
  Can,
  EmptyState,
  PageHeader,
  TableLoader,
  formatDateTime,
  pb,
  useAuth,
} from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { DataSurface } from "../shared/data-surface"
import { RowMenu } from "../shared/row-menu"
import { SearchField } from "../shared/search-field"
import { StatusBadge } from "../shared/status-badge"
import type { Organization } from "../types"
import { OrganizationDialog } from "./organization-dialog"

export function OrganizationsPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Organization | null | undefined>(
    undefined
  )
  const result = useQuery({
    queryKey: ["organizations", search],
    queryFn: () =>
      pb.collection<Organization>("organizations").getList(1, 100, {
        sort: "name",
        filter: search
          ? pb.filter("name ~ {:search} || legal_name ~ {:search}", {
              search,
            })
          : "",
      }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => pb.collection("organizations").delete(id),
    onSuccess: () => {
      toast.success("Azienda eliminata")
      void queryClient.invalidateQueries({ queryKey: ["organizations"] })
    },
  })

  return (
    <>
      <PageHeader
        eyebrow="Rubrica"
        title="Clienti"
        description="Aziende, studi e organizzazioni con cui il team è in relazione."
        actions={
          <Can permission="addressbook.organizations.create">
            <Button onClick={() => setEditing(null)}>
              <Plus />
              Nuovo cliente
            </Button>
          </Can>
        }
      />
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Cerca per nome o ragione sociale…"
      />
      {result.isLoading ? (
        <TableLoader />
      ) : result.data?.items.length ? (
        <DataSurface>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Azienda</TableHead>
                <TableHead>Contatti</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Ultimo aggiornamento</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.items.map((organization) => (
                <TableRow key={organization.id}>
                  <TableCell>
                    <Link
                      className="font-medium hover:text-primary hover:underline"
                      to={`/organizations/${organization.id}`}
                    >
                      {organization.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {organization.legal_name ||
                        organization.vat_number ||
                        "Anagrafica essenziale"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      {organization.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="size-3.5 text-muted-foreground" />
                          {organization.email}
                        </p>
                      )}
                      {organization.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="size-3.5 text-muted-foreground" />
                          {organization.phone}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={organization.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(organization.updated)}
                  </TableCell>
                  <TableCell>
                    <RowMenu
                      onEdit={
                        can("addressbook.organizations.update")
                          ? () => setEditing(organization)
                          : undefined
                      }
                      onDelete={
                        can("addressbook.organizations.delete")
                          ? () => {
                              if (confirm(`Eliminare ${organization.name}?`))
                                remove.mutate(organization.id)
                            }
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataSurface>
      ) : (
        <EmptyState
          icon={Building2}
          title="Nessun cliente"
          description={
            search
              ? "Prova a modificare la ricerca."
              : "Aggiungi il primo cliente alle anagrafiche."
          }
        />
      )}
      {editing !== undefined && (
        <OrganizationDialog
          organization={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined)
            void queryClient.invalidateQueries({ queryKey: ["organizations"] })
          }}
        />
      )}
    </>
  )
}
