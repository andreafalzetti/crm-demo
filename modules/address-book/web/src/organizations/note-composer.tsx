import { type FormEvent, useState } from "react"
import { NotebookPen } from "lucide-react"
import { toast } from "sonner"

import { pb, useAuth } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

export function NoteComposer({
  organizationId,
  onCreated,
}: {
  organizationId: string
  onCreated: () => void
}) {
  const [body, setBody] = useState("")
  const [pending, setPending] = useState(false)
  const { can } = useAuth()

  if (!can("addressbook.notes.create")) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    try {
      await pb
        .collection("notes")
        .create({ organization: organizationId, body })
      setBody("")
      toast.success("Nota aggiunta")
      onCreated()
    } catch {
      toast.error("Nota non salvata")
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border bg-card p-4 surface-shadow"
    >
      <Label htmlFor="new-note">Nuova nota</Label>
      <Textarea
        id="new-note"
        className="mt-2 min-h-24"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Contesto della conversazione, esigenze, decisioni…"
        required
      />
      <div className="mt-3 flex justify-end">
        <Button size="sm" disabled={pending || !body.trim()}>
          <NotebookPen />
          Aggiungi nota
        </Button>
      </div>
    </form>
  )
}
