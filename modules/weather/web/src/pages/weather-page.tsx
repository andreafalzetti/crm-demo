import { useQuery } from "@tanstack/react-query"
import { CloudSun, Droplets, Wind } from "lucide-react"
import { useMemo, useState } from "react"
import type { RecordModel } from "pocketbase"

import { EmptyState, PageHeader, TableLoader, pb, useClientManifest } from "@crm/app-core"
import { Card, CardContent } from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { AlertList } from "../components/alert-list"
import { WeatherAttribution } from "../components/attribution"
import { ForecastStrip } from "../components/forecast-strip"
import { forecastForAddress, forecastForPlace, listAlerts } from "../lib/api"
import { hourLabel, millimetres, relativeDayLabel, temperature, windKmh } from "../lib/format"
import { WeatherSymbol } from "../components/weather-symbol"

type PlaceRecord = RecordModel & {
  label: string
  municipality: string
}

export function WeatherPage() {
  const manifest = useClientManifest()
  const [placeId, setPlaceId] = useState<string>("")

  const places = useQuery({
    queryKey: ["weather", "places"],
    queryFn: async () => {
      const result = await pb.collection("geo_places").getList<PlaceRecord>(1, 50, {
        filter: "resolved_at != ''",
        sort: "label",
      })
      return result.items
    },
  })

  const alerts = useQuery({
    queryKey: ["weather", "alerts"],
    queryFn: listAlerts,
  })

  const selected = placeId || places.data?.[0]?.id || ""

  const forecast = useQuery({
    // Until a place exists, the client's own base stands in, so the page is
    // useful on a fresh install instead of showing an empty selector.
    queryKey: ["weather", "forecast", selected || manifest.defaultLocation],
    enabled: Boolean(selected) || Boolean(manifest.defaultLocation),
    staleTime: 15 * 60 * 1000,
    queryFn: () =>
      selected
        ? forecastForPlace(selected)
        : forecastForAddress(manifest.defaultLocation as string),
  })

  const days = forecast.data?.forecast?.days ?? []
  const timeZone = forecast.data?.forecast?.timeZone ?? manifest.timeZone
  const [dayIndex, setDayIndex] = useState(0)
  const activeDay = days[Math.min(dayIndex, Math.max(days.length - 1, 0))]

  const hours = useMemo(() => {
    if (!activeDay || !forecast.data?.forecast) return []
    return forecast.data.forecast.hours.filter((hour) => {
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(hour.time))
      return key === activeDay.date
    })
  }, [activeDay, forecast.data, timeZone])

  const openAlerts = alerts.data?.alerts ?? []

  return (
    <>
      <PageHeader
        eyebrow="Operatività"
        title="Meteo"
        description="Previsioni a sette giorni sui luoghi seguiti dal gestionale."
        actions={
          places.data && places.data.length > 0 ? (
            <Select value={selected} onValueChange={setPlaceId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Scegli un luogo" />
              </SelectTrigger>
              <SelectContent>
                {places.data.map((place) => (
                  <SelectItem key={place.id} value={place.id}>
                    {place.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      {openAlerts.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Allerte aperte
          </h2>
          <AlertList alerts={openAlerts} />
        </section>
      )}

      {forecast.isPending ? (
        <TableLoader />
      ) : forecast.isError || days.length === 0 ? (
        <EmptyState
          icon={CloudSun}
          title="Nessuna previsione"
          description={
            forecast.data && !forecast.data.place.resolved
              ? "Il luogo è in attesa di geolocalizzazione: la previsione compare appena viene risolto."
              : "Aggiungi un indirizzo a un cliente o a un intervento per iniziare a seguirne il meteo."
          }
        />
      ) : (
        <div className="space-y-6">
          <section>
            <p className="mb-2 text-sm text-muted-foreground">
              {forecast.data?.place.label}
            </p>
            <div
              role="tablist"
              aria-label="Giorni disponibili"
              className="contents"
            >
              <ForecastStrip days={days} timeZone={timeZone} detailed />
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap gap-2">
              {days.map((day, index) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setDayIndex(index)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    index === dayIndex
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card/60 hover:bg-muted"
                  }`}
                >
                  {relativeDayLabel(day.date, timeZone)}
                </button>
              ))}
            </div>

            {hours.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Il dettaglio orario copre solo i primi giorni: oltre, MET
                  pubblica blocchi di sei ore.
                </CardContent>
              </Card>
            ) : (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {hours.map((hour) => (
                    <div
                      key={hour.time}
                      className="min-w-24 rounded-xl border bg-card/60 p-3 text-center"
                    >
                      <p className="text-[11px] text-muted-foreground">
                        {hourLabel(hour.time, timeZone)}
                      </p>
                      <span className="my-2 flex justify-center">
                        <WeatherSymbol
                          symbol={hour.symbol}
                          className="size-5 text-muted-foreground"
                        />
                      </span>
                      <p className="font-editorial text-base">
                        {temperature(hour.temperature)}
                      </p>
                      <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-sky-600">
                        <Droplets className="size-3" aria-hidden />
                        {millimetres(hour.precipitation)}
                      </p>
                      <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                        <Wind className="size-3" aria-hidden />
                        {windKmh(hour.wind)}
                      </p>
                    </div>
                ))}
              </div>
            )}
          </section>

          <WeatherAttribution />
        </div>
      )}
    </>
  )
}
