import { Droplets, Wind } from "lucide-react"

import type { ForecastDay } from "../types"
import { millimetres, relativeDayLabel, temperature, weekdayLabel, windKmh } from "../lib/format"
import { WeatherSymbol, isWet } from "./weather-symbol"

export function ForecastStrip({
  days,
  timeZone,
  detailed = false,
}: {
  days: ForecastDay[]
  timeZone: string
  detailed?: boolean
}) {
  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna previsione disponibile.</p>
  }
  return (
    // The strip scrolls inside itself so seven days never push the page sideways.
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {days.map((day, index) => {
        const wet = day.precipitation >= 1 || isWet(day.symbol)
        return (
          <div
            key={day.date}
            className="min-w-28 flex-1 rounded-xl border bg-card/60 p-3 text-center"
          >
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {index === 0 ? relativeDayLabel(day.date, timeZone) : weekdayLabel(day.date)}
            </p>
            <span className="my-2 flex justify-center">
              <WeatherSymbol
                symbol={day.symbol}
                className={`size-6 ${wet ? "text-sky-600" : "text-muted-foreground"}`}
              />
            </span>
            <p className="font-editorial text-lg leading-none">
              {temperature(day.maxTemp)}
              <span className="ml-1 text-sm text-muted-foreground">
                {temperature(day.minTemp)}
              </span>
            </p>
            {detailed ? (
              <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                <p className="flex items-center justify-center gap-1">
                  <Droplets className="size-3" aria-hidden />
                  {millimetres(day.precipitation)}
                </p>
                <p className="flex items-center justify-center gap-1">
                  <Wind className="size-3" aria-hidden />
                  {windKmh(day.maxWind)}
                </p>
              </div>
            ) : (
              day.precipitation >= 1 && (
                <p className="mt-2 text-[11px] text-sky-600">
                  {millimetres(day.precipitation)}
                </p>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
