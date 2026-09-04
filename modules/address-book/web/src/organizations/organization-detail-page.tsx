import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  ContactRound,
  Download,
  FileText,
  Mail,
  MapPin,
  Phone,
} from "lucide-react"
import type { RecordModel } from "pocketbase"
import { useNavigate, useParams } from "react-router-dom"

import {
  EmptyState,
  PageHeader,
  TableLoader,
  formatDateTime,
  pb,
  useAuth,
  useClientManifest,
} from "@crm/app-core"
import type { CustomerDetailContribution } from "@crm/app-core"
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
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

import { DataSurface } from "../shared/data-surface"
import { Detail } from "../shared/detail"
import { StatusBadge } from "../shared/status-badge"
import type { Contact, Organization } from "../types"
import { DocumentUploader } from "./document-uploader"
import { CustomerHistory } from "./customer-history"
import { downloadFile } from "./download-file"
import { NoteComposer } from "./note-composer"

export function OrganizationDetailPage() {
  const manifest = useClientManifest()
  const { can } = useAuth()
  const { organizationId = "" } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const organization = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: () =>
      pb.collection<Organization>("organizations").getOne(organizationId),
  })
  const contacts = useQuery({
    queryKey: ["organization-contacts", organizationId],
    queryFn: () =>
      pb.collection<Contact>("contacts").getFullList({
        filter: pb.filter("organization = {:id}", { id: organizationId }),
        sort: "last_name",
      }),
  })
  const notes = useQuery({
    queryKey: ["organization-notes", organizationId],
    queryFn: () =>
      pb.collection("notes").getFullList({
        filter: pb.filter("organization = {:id}", { id: organizationId }),
        sort: "-created",
        expand: "author",
      }),
  })
  const documents = useQuery({
    queryKey: ["organization-documents", organizationId],
    queryFn: () =>
      pb.collection("documents").getFullList({
        filter: pb.filter("organization = {:id}", { id: organizationId }),
        sort: "-created",
        expand: "uploaded_by",
      }),
  })
  const detailContributions: CustomerDetailContribution[] = []
  for (const module of manifest.modules) {
    for (const contribution of module.customerDetails ?? []) {
      if (can(contribution.permission)) detailContributions.push(contribution)
    }
  }

  if (organization.isLoading) return <TableLoader />
  if (!organization.data)
    return (
      <EmptyState
        title="Azienda non trovata"
        description="Il record potrebbe essere stato rimosso."
      />
    )
  const item = organization.data

  return (
    <>
      <Button
        variant="ghost"
        className="mb-4 -ml-2"
        onClick={() => navigate("/organizations")}
      >
        <ArrowLeft />
        Torna ai clienti
      </Button>
      <PageHeader
        eyebrow="Scheda cliente"
        title={item.name}
        description={item.legal_name || "Anagrafica cliente"}
        actions={<StatusBadge value={item.status} />}
      />
      <Tabs defaultValue="overview">
        <TabsList className="h-auto max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="history">Storico</TabsTrigger>
          <TabsTrigger value="contacts">
            Contatti{" "}
            <Badge variant="secondary">{contacts.data?.length ?? 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="notes">Note</TabsTrigger>
          <TabsTrigger value="documents">Documenti</TabsTrigger>
          {detailContributions.map((contribution) => (
            <TabsTrigger key={contribution.id} value={contribution.id}>
              {contribution.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="mt-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_.7fr]">
            <Card className="surface-shadow">
              <CardHeader>
                <CardTitle className="font-editorial text-2xl">
                  Dati essenziali
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <Detail label="Email" value={item.email} icon={<Mail />} />
                <Detail label="Telefono" value={item.phone} icon={<Phone />} />
                <Detail label="Partita IVA" value={item.vat_number} />
                <Detail label="Sito" value={item.website} />
                <Detail
                  label="Indirizzo"
                  value={item.address}
                  icon={<MapPin />}
                />
              </CardContent>
            </Card>
            <Card className="bg-[#e6ddc8] text-[#26251f] dark:bg-[#ddd0b4]">
              <CardHeader>
                <CardTitle className="font-editorial text-2xl">
                  Promemoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 opacity-75">
                  Usa le Note per conservare il contesto e gli Interventi per
                  trasformarlo in una prossima azione assegnabile.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="history" className="mt-5">
          <CustomerHistory
            organization={item}
            contacts={contacts.data ?? []}
            notes={notes.data ?? []}
            documents={documents.data ?? []}
          />
        </TabsContent>
        <TabsContent value="contacts" className="mt-5">
          {contacts.data?.length ? (
            <DataSurface>
              <Table>
                <TableBody>
                  {contacts.data.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </TableCell>
                      <TableCell>{contact.position || "—"}</TableCell>
                      <TableCell>
                        {contact.email || contact.mobile || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataSurface>
          ) : (
            <EmptyState
              icon={ContactRound}
              title="Nessun contatto collegato"
              description="Collega una persona a questa azienda dalla sezione Contatti."
            />
          )}
        </TabsContent>
        <TabsContent value="notes" className="mt-5">
          <NoteComposer
            organizationId={organizationId}
            onCreated={() =>
              void queryClient.invalidateQueries({
                queryKey: ["organization-notes", organizationId],
              })
            }
          />
          <div className="mt-5 space-y-3">
            {notes.data?.map((note) => (
              <Card key={note.id}>
                <CardContent className="p-5">
                  <p className="text-sm leading-6 whitespace-pre-wrap">
                    {String(note.body).replace(/<[^>]+>/g, "")}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {String(
                      (note.expand?.author as RecordModel)?.name ?? "Utente"
                    )}{" "}
                    · {formatDateTime(String(note.created))}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="documents" className="mt-5">
          <DocumentUploader
            organizationId={organizationId}
            onUploaded={() =>
              void queryClient.invalidateQueries({
                queryKey: ["organization-documents", organizationId],
              })
            }
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {documents.data?.map((document) => (
              <Card key={document.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="grid size-10 place-items-center rounded-lg bg-muted">
                    <FileText className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {String(document.title)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(String(document.created))}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void downloadFile(document)}
                  >
                    <Download />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        {detailContributions.map((contribution) => {
          const Contribution = contribution.component
          return (
            <TabsContent
              key={contribution.id}
              value={contribution.id}
              className="mt-5"
            >
              <Contribution organizationId={organizationId} />
            </TabsContent>
          )
        })}
      </Tabs>
    </>
  )
}
