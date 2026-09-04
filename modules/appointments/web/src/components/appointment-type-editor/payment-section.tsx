import { CreditCard, ExternalLink } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import type { AppointmentType } from "../../types"
import { EditorField } from "./editor-field"

export function PaymentSection({
  item,
  onChange,
}: {
  item: AppointmentType
  onChange: () => void
}) {
  return (
    <div className="space-y-5 p-5">
      <div className="grid gap-5 md:grid-cols-2">
        <EditorField label="Tariffa">
          <div className="relative">
            <Input
              defaultValue={item.price ?? ""}
              type="number"
              placeholder="Nessuna tariffa"
              onChange={onChange}
              className="pl-8"
            />
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
          </div>
        </EditorField>
        <EditorField label="Politica di pagamento">
          <Select defaultValue={item.paymentPolicy} onValueChange={onChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nessun pagamento</SelectItem>
              <SelectItem value="optional">Paga in studio</SelectItem>
              <SelectItem value="deposit">Acconto alla prenotazione</SelectItem>
              <SelectItem value="required">Saldo alla prenotazione</SelectItem>
            </SelectContent>
          </Select>
        </EditorField>
      </div>
      <div className="flex flex-col gap-4 rounded-lg border border-dashed border-primary/35 bg-primary/[.045] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="font-medium">Modulo Pagamenti collegato</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Il tipo definisce il prezzo; il modulo Pagamenti gestisce intenti,
              transazioni, POS e riconciliazione.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/payments/settings">
            Configura canali <ExternalLink />
          </Link>
        </Button>
      </div>
    </div>
  )
}
