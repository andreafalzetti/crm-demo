import { type FormEvent, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { pb } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"

import { EURO_FORMATTER } from "../lib/format"
import type { DraftLine, OrganizationOption } from "../types"
import { QuoteLineEditor } from "./quote-line-editor"

function newLine(): DraftLine {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 22,
  }
}

export function QuoteDialog({
  initialOrganization = "",
  onClose,
  onSaved,
}: {
  initialOrganization?: string
  onClose: () => void
  onSaved: () => void
}) {
  const [organization, setOrganization] = useState(initialOrganization)
  const [lines, setLines] = useState<DraftLine[]>([newLine()])
  const [pending, setPending] = useState(false)
  const organizations = useQuery({
    queryKey: ["quotes", "organizations"],
    queryFn: () =>
      pb.collection<OrganizationOption>("organizations").getFullList({
        sort: "name",
        fields: "id,name",
      }),
  })
  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0
    )
    const tax = lines.reduce(
      (sum, line) =>
        sum + line.quantity * line.unitPrice * (line.taxRate / 100),
      0
    )
    return { subtotal, tax, total: subtotal + tax }
  }, [lines])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    try {
      const quote = await pb.collection("quotes").create({
        number: `PRE-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        title: form.get("title"),
        organization,
        status: "draft",
        valid_until: form.get("valid_until")
          ? new Date(
              `${String(form.get("valid_until"))}T12:00:00`
            ).toISOString()
          : "",
        subtotal: totals.subtotal,
        tax_total: totals.tax,
        total: totals.total,
        notes: form.get("notes"),
      })
      await Promise.all(
        lines.map((line, index) =>
          pb.collection("quote_lines").create({
            quote: quote.id,
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unitPrice,
            tax_rate: line.taxRate,
            position: index + 1,
          })
        )
      )
      toast.success("Preventivo creato", {
        description: "Ora puoi generare il PDF definitivo.",
      })
      onSaved()
    } catch {
      toast.error("Preventivo non salvato")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-4xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="font-editorial text-3xl">
              Nuovo preventivo
            </DialogTitle>
            <DialogDescription>
              Componi le voci economiche; il server ricalcolerà i totali nel
              PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quote-title">Oggetto</Label>
              <Input id="quote-title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={organization}
                onValueChange={(value) => setOrganization(value ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona il cliente" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.data?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-valid">Valido fino al</Label>
              <Input id="quote-valid" name="valid_until" type="date" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="quote-notes">Condizioni e note</Label>
              <Textarea id="quote-notes" name="notes" />
            </div>
          </div>
          <section className="border-t pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-editorial text-2xl">Voci del preventivo</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setLines((current) => [...current, newLine()])}
              >
                <Plus /> Aggiungi riga
              </Button>
            </div>
            <div className="space-y-2">
              {lines.map((line) => (
                <QuoteLineEditor
                  key={line.id}
                  line={line}
                  onChange={(next) =>
                    setLines((current) =>
                      current.map((item) => (item.id === line.id ? next : item))
                    )
                  }
                  onRemove={() =>
                    setLines((current) =>
                      current.length === 1
                        ? current
                        : current.filter((item) => item.id !== line.id)
                    )
                  }
                />
              ))}
            </div>
            <div className="mt-5 ml-auto grid max-w-sm grid-cols-2 gap-y-2 rounded-xl bg-[#1d211e] p-5 text-sm text-stone-100">
              <span className="text-stone-400">Imponibile</span>
              <span className="text-right">
                {EURO_FORMATTER.format(totals.subtotal)}
              </span>
              <span className="text-stone-400">IVA</span>
              <span className="text-right">
                {EURO_FORMATTER.format(totals.tax)}
              </span>
              <span className="border-t border-white/10 pt-2 font-semibold">
                Totale
              </span>
              <span className="border-t border-white/10 pt-2 text-right font-editorial text-xl">
                {EURO_FORMATTER.format(totals.total)}
              </span>
            </div>
          </section>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={
                pending ||
                !organization ||
                lines.some((line) => !line.description)
              }
            >
              {pending ? "Salvataggio…" : "Crea preventivo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
