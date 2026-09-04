import { Trash2 } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

import type { DraftLine } from "../types"

export function QuoteLineEditor({
  line,
  onChange,
  onRemove,
}: {
  line: DraftLine
  onChange: (line: DraftLine) => void
  onRemove: () => void
}) {
  return (
    <div className="grid gap-2 rounded-xl border bg-muted/25 p-3 sm:grid-cols-[1fr_80px_110px_80px_auto] sm:items-end">
      <div>
        <label
          htmlFor={`${line.id}-description`}
          className="mb-1 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Descrizione
        </label>
        <Input
          id={`${line.id}-description`}
          value={line.description}
          onChange={(event) =>
            onChange({ ...line, description: event.target.value })
          }
          required
        />
      </div>
      <div>
        <label
          htmlFor={`${line.id}-quantity`}
          className="mb-1 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Quantità
        </label>
        <Input
          id={`${line.id}-quantity`}
          type="number"
          min="0.01"
          step="0.01"
          value={line.quantity}
          onChange={(event) =>
            onChange({ ...line, quantity: Number(event.target.value) })
          }
          required
        />
      </div>
      <div>
        <label
          htmlFor={`${line.id}-unit-price`}
          className="mb-1 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Prezzo
        </label>
        <Input
          id={`${line.id}-unit-price`}
          type="number"
          min="0"
          step="0.01"
          value={line.unitPrice}
          onChange={(event) =>
            onChange({ ...line, unitPrice: Number(event.target.value) })
          }
          required
        />
      </div>
      <div>
        <label
          htmlFor={`${line.id}-tax-rate`}
          className="mb-1 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
        >
          IVA %
        </label>
        <Input
          id={`${line.id}-tax-rate`}
          type="number"
          min="0"
          step="1"
          value={line.taxRate}
          onChange={(event) =>
            onChange({ ...line, taxRate: Number(event.target.value) })
          }
          required
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={false}
      >
        <Trash2 />
        <span className="sr-only">Rimuovi riga</span>
      </Button>
    </div>
  )
}
