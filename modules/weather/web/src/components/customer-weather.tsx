import { useQuery } from "@tanstack/react-query"
import { CloudSun } from "lucide-react"
import type { RecordModel } from "pocketbase"

import { EmptyState, pb, useClientManifest } from "@crm/app-core"
import { Card, CardContent } from "@workspace/ui/components/card"

import { AlertList } from "./alert-list"
import { WeatherAttribution } from "./attribution"
import { ForecastStrip } from "./forecast-strip"
import { forecastForPlace, listAlerts } from "../lib/api"

type OrganizationRecord = RecordModel & {
  name: string
  address: string
  place: string
}

export function CustomerWeather({ organizationId }: { organizationId: string }) {
  const manifest = useClientManifest()

  const organization = useQuery({
    queryKey: ["weather", "organization", organizationId],
    queryFn: () =>
      pb.collection("organizations").getOne<OrganizationRecord>(organizationId),
  })

  const placeId = organization.data?.place ?? ""

  const forecast = useQuery({
    queryKey: ["weather", "forecast", placeId],
    enabled: Boolean(placeId),
    staleTime: 15 * 60 * 1000,
    queryFn: () => forecastForPlace(placeId),
  })

  const alerts = useQuery({
    queryKey: ["weather", "alerts"],
    queryFn: listAlerts,
  })

  if (!organization.isPending && !placeId) {
    return (
      <EmptyState
        icon={CloudSun}
        title="Indirizzo non geolocalizzato"
        description="Aggiungi un indirizzo alla scheda cliente: il meteo compare appena viene risolto."
      />
    )
  }

  const days = forecast.data?.forecast?.days ?? []
  // Only the alerts that concern this customer's own place belong on their card.
  const relevant = (alerts.data?.alerts ?? []).filter(
    (alert) => alert.place.id === placeId
  )

  return (
    <div className="space-y-4">
      {relevant.length > 0 && <AlertList alerts={relevant} />}
      <Card>
        <CardContent className="space-y-4 p-5">
          {days.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {forecast.isPending
                ? "Carico la previsione…"
                : "Previsione non ancora disponibile per questo indirizzo."}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {forecast.data?.place.label}
              </p>
              <ForecastStrip
                days={days}
                timeZone={forecast.data?.forecast?.timeZone ?? manifest.timeZone}
                detailed
              />
            </>
          )}
          <WeatherAttribution />
        </CardContent>
      </Card>
    </div>
  )
}
