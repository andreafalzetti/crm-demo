import { Building2, ContactRound, FileText, StickyNote } from "lucide-react"
import type { RecordModel } from "pocketbase"

import { EmptyState, formatDateTime, useClientManifest } from "@crm/app-core"
import { Card, CardContent } from "@workspace/ui/components/card"

type HistoryEvent = {
  id: string
  created: string
  title: string
  description: string
  icon: typeof Building2
}

type CustomerHistoryProps = {
  organization: RecordModel
  contacts: RecordModel[]
  notes: RecordModel[]
  documents: RecordModel[]
}

export function CustomerHistory({
  organization,
  contacts,
  notes,
  documents,
}: CustomerHistoryProps) {
  const manifest = useClientManifest()
  const events: HistoryEvent[] = [
    {
      id: `organization-${organization.id}`,
      created: String(organization.created),
      title: "Cliente inserito in anagrafica",
      description: String(organization.name),
      icon: Building2,
    },
    ...contacts.map((contact) => ({
      id: `contact-${contact.id}`,
      created: String(contact.created),
      title: "Contatto collegato",
      description: `${String(contact.first_name)} ${String(contact.last_name)}`,
      icon: ContactRound,
    })),
    ...notes.map((note) => ({
      id: `note-${note.id}`,
      created: String(note.created),
      title: "Nota aggiunta",
      description: String(note.body).replace(/<[^>]+>/g, ""),
      icon: StickyNote,
    })),
    ...documents.map((document) => ({
      id: `document-${document.id}`,
      created: String(document.created),
      title: "Documento archiviato",
      description: String(document.title),
      icon: FileText,
    })),
  ].sort(
    (left, right) =>
      new Date(right.created).getTime() - new Date(left.created).getTime()
  )

  if (events.length === 0) {
    return (
      <EmptyState
        title="Nessun evento nello storico"
        description="Le modifiche e i contenuti collegati compariranno qui."
      />
    )
  }

  return (
    <Card className="surface-shadow">
      <CardContent className="p-6">
        <div className="relative ml-4 border-l">
          {events.map((event) => {
            const Icon = event.icon
            return (
              <div key={event.id} className="relative pb-7 pl-8 last:pb-0">
                <span className="absolute -left-4 grid size-8 place-items-center rounded-full border bg-card text-primary">
                  <Icon className="size-4" />
                </span>
                <p className="text-sm font-semibold">{event.title}</p>
                <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                  {event.description}
                </p>
                <p className="mt-2 text-[11px] tracking-wide text-muted-foreground uppercase">
                  {formatDateTime(event.created, manifest.timeZone)}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
