import { Clock3, CreditCard, UsersRound } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"

import type { AppointmentType } from "../types"

export function AppointmentTypeList({
  items,
  selectedId,
  onSelect,
}: {
  items: AppointmentType[]
  selectedId: string
  onSelect: (item: AppointmentType) => void
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const selected = item.id === selectedId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={
              selected
                ? "w-full rounded-xl border border-primary/35 bg-primary/[.07] p-4 text-left shadow-sm transition-all"
                : "w-full rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-sm"
            }
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-1 size-3 shrink-0 rounded-full ring-4 ring-background"
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.specialty}
                    </p>
                  </div>
                  <Badge variant={selected ? "default" : "secondary"}>
                    {item.price === null ? "Senza tariffa" : `€ ${item.price}`}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock3 className="size-3" /> {item.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <UsersRound className="size-3" />{" "}
                    {item.professionals.length} risorse
                  </span>
                  <span className="flex items-center gap-1">
                    <CreditCard className="size-3" />
                    {paymentLabel(item.paymentPolicy)}
                  </span>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function paymentLabel(policy: AppointmentType["paymentPolicy"]) {
  return {
    none: "Non previsto",
    optional: "In studio",
    deposit: "Acconto",
    required: "Anticipato",
  }[policy]
}
