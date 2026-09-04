import { type FormEvent, useState } from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"

import { pb, useAuth } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { FormField } from "../shared/form-field"

export function DocumentUploader({
  organizationId,
  onUploaded,
}: {
  organizationId: string
  onUploaded: () => void
}) {
  const { can } = useAuth()
  const [pending, setPending] = useState(false)

  if (!can("addressbook.documents.create")) return null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    data.set("organization", organizationId)
    setPending(true)
    try {
      await pb.collection("documents").create(data)
      event.currentTarget.reset()
      toast.success("Documento caricato")
      onUploaded()
    } catch {
      toast.error("Caricamento non riuscito")
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-xl border bg-card p-4 surface-shadow sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <FormField label="Titolo" name="title" required />
      <div className="space-y-2">
        <Label htmlFor="document-file">File · max 10 MB</Label>
        <Input id="document-file" name="file" type="file" required />
      </div>
      <Button type="submit" disabled={pending}>
        <Upload />
        {pending ? "Caricamento…" : "Carica"}
      </Button>
    </form>
  )
}
