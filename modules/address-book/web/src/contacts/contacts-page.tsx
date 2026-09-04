import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ContactRound, Plus } from "lucide-react"
import { toast } from "sonner"

import {
  Can,
  EmptyState,
  PageHeader,
  TableLoader,
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
import type { Contact, Organization } from "../types"
import { ContactDialog } from "./contact-dialog"

export function ContactsPage() {
  const { can } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Contact | null | undefined>(undefined)
  const result = useQuery({
    queryKey: ["contacts", search],
    queryFn: () =>
      pb.collection<Contact>("contacts").getList(1, 100, {
        sort: "last_name,first_name",
        expand: "organization",
        filter: search
          ? pb.filter(
              "first_name ~ {:search} || last_name ~ {:search} || email ~ {:search}",
              { search }
            )
          : "",
      }),
  })
  const organizations = useQuery({
    queryKey: ["organization-options"],
    queryFn: () =>
      pb
        .collection<Organization>("organizations")
        .getFullList({ sort: "name", fields: "id,name" }),
  })
  const remove = useMutation({
    mutationFn: (id: string) => pb.collection("contacts").delete(id),
    onSuccess: () => {
      toast.success("Contatto eliminato")
      void queryClient.invalidateQueries({ queryKey: ["contacts"] })
    },
  })

  return (
    <>
      <PageHeader
        eyebrow="Rubrica"
        title="Contatti"
        description="Le persone, il loro ruolo e il contesto della relazione."
        actions={
          <Can permission="addressbook.contacts.create">
            <Button onClick={() => setEditing(null)}>
              <Plus />
              Nuovo contatto
            </Button>
          </Can>
        }
      />
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Cerca nome, cognome o email…"
      />
      {result.isLoading ? (
        <TableLoader />
      ) : result.data?.items.length ? (
        <DataSurface>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Azienda</TableHead>
                <TableHead>Recapiti</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.items.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <p className="font-medium">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {contact.position || "Ruolo non indicato"}
                    </p>
                  </TableCell>
                  <TableCell>
                    {String(
                      (contact.expand?.organization as Organization)?.name ??
                        "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {contact.email || contact.mobile || contact.phone || "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={contact.status} />
                  </TableCell>
                  <TableCell>
                    <RowMenu
                      onEdit={
                        can("addressbook.contacts.update")
                          ? () => setEditing(contact)
                          : undefined
                      }
                      onDelete={
                        can("addressbook.contacts.delete")
                          ? () => {
                              if (
                                confirm(
                                  `Eliminare ${contact.first_name} ${contact.last_name}?`
                                )
                              )
                                remove.mutate(contact.id)
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
          icon={ContactRound}
          title="Nessun contatto"
          description={
            search
              ? "Nessun risultato per questa ricerca."
              : "Aggiungi la prima persona alla rubrica."
          }
        />
      )}
      {editing !== undefined && (
        <ContactDialog
          contact={editing}
          organizations={organizations.data ?? []}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined)
            void queryClient.invalidateQueries({ queryKey: ["contacts"] })
          }}
        />
      )}
    </>
  )
}
