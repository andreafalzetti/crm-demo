import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, Building2, MapPin } from "lucide-react"
import { Link } from "react-router-dom"

import { useClientManifest } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

import { forecastForAddress, forecastForCoords } from "../lib/api"
import { millimetres, temperature, windKmh } from "../lib/format"
import { symbolLabel } from "../lib/symbols"
import { usePosition } from "../lib/use-position"
import { WeatherSymbol } from "./weather-symbol"

export function WeatherWidget() {
  const manifest = useClientManifest()
  const position = usePosition()
  const fallbackAddress = manifest.defaultLocation

  const forecast = useQuery({
    // The key carries the source so a fallback render is never served from a
    // cached geolocated answer, or the other way round.
    queryKey: ["dashboard", "weather", position.source, position.coords ?? fallbackAddress],
    enabled:
      position.source === "geolocation" ||
      (position.source === "fallback" && Boolean(fallbackAddress)),
    staleTime: 15 * 60 * 1000,
    queryFn: () =>
      position.coords
        ? forecastForCoords(position.coords.latitude, position.coords.longitude)
        : forecastForAddress(fallbackAddress as string),
  })

  const today = forecast.data?.forecast?.days[0]
  const locating = position.source === "pending" || forecast.isPending
  const usingDevice = position.source === "geolocation"

  return (
    <Card className="overflow-hidden border-primary/25 bg-[#16212b] text-stone-100 surface-shadow">
      <CardContent className="relative p-6">
        <div className="absolute -top-14 -right-12 size-40 rounded-full border border-sky-300/20" />
        <WeatherSymbol symbol={today?.symbol} className="size-6 text-sky-300" />
        <p className="mt-5 text-[10px] font-semibold tracking-[.2em] text-sky-300 uppercase">
          Meteo
        </p>

        {locating ? (
          <p className="mt-3 text-sm text-stone-400">Individuo la posizione…</p>
        ) : forecast.isError || !today ? (
          <p className="mt-3 text-sm text-stone-400">
            Previsione non disponibile.
          </p>
        ) : (
          <>
            <p className="mt-1 font-editorial text-5xl">
              {temperature(today.maxTemp)}
            </p>
            <p className="mt-1 text-xs text-stone-400">
              {symbolLabel(today.symbol)} · min {temperature(today.minTemp)}
              {today.precipitation >= 1 && ` · ${millimetres(today.precipitation)}`}
              {today.maxWind >= 8 && ` · ${windKmh(today.maxWind)}`}
            </p>
          </>
        )}

        {/* Which position is on screen is never left implicit: a forecast for
            the wrong town is worse than no forecast. */}
        {!locating && forecast.data && (
          <p className="mt-4 flex items-center gap-1.5 text-[11px] text-stone-400">
            {usingDevice ? (
              <MapPin className="size-3 shrink-0" aria-hidden />
            ) : (
              <Building2 className="size-3 shrink-0" aria-hidden />
            )}
            <span className="truncate">
              {usingDevice ? "Posizione attuale" : "Sede"} ·{" "}
              {forecast.data.place.label}
            </span>
          </p>
        )}

        <Button asChild variant="secondary" size="sm" className="relative mt-5">
          <Link to="/meteo">
            Apri le previsioni <ArrowUpRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
