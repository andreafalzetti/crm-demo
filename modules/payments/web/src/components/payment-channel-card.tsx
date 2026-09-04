import {
  Banknote,
  Check,
  CreditCard,
  ExternalLink,
  Landmark,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import type { PaymentChannel } from "../types"

export function PaymentChannelCard({ channel }: { channel: PaymentChannel }) {
  const Icon =
    channel.mode === "online"
      ? CreditCard
      : channel.mode === "physical"
        ? Landmark
        : Banknote

  return (
    <Card className="h-full transition-transform hover:-translate-y-0.5">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <ChannelStatus channel={channel} />
        </div>
        <h3 className="mt-5 font-editorial text-2xl">{channel.name}</h3>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {channel.description}
        </p>
        <div className="mt-4 border-t pt-4 text-[11px] text-muted-foreground">
          {channel.detail}
        </div>
        <div className="mt-auto pt-5">
          <Button
            className="w-full"
            variant="outline"
            disabled={channel.status !== "enabled"}
          >
            {channel.status === "enabled" ? <Check /> : <ExternalLink />}
            {channel.status === "enabled" ? "Canale attivo" : "Connetti (mock)"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ChannelStatus({ channel }: { channel: PaymentChannel }) {
  if (channel.status === "enabled") return <Badge>Attivo</Badge>
  if (channel.status === "available") {
    return <Badge variant="secondary">Configurabile</Badge>
  }
  return <Badge variant="outline">Fase successiva</Badge>
}
