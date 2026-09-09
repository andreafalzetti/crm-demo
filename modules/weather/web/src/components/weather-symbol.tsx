import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react"

import { symbolBase, symbolLabel } from "../lib/symbols"

/**
 * Renders a MET symbol code as an icon.
 *
 * The mapping returns elements rather than component references on purpose:
 * picking a component into a capitalised local during render is exactly what
 * `react-hooks/static-components` forbids, and this keeps every branch static.
 * The label rides along in a screen-reader-only span, so the forecast is not
 * conveyed by colour and shape alone.
 */
export function WeatherSymbol({
  symbol,
  className = "size-6",
}: {
  symbol?: string
  className?: string
}) {
  const base = symbolBase(symbol)
  const props = { className, "aria-hidden": true }

  let icon = <Sun {...props} />
  if (base.includes("thunder")) icon = <CloudLightning {...props} />
  else if (base.includes("snow") || base.includes("sleet")) icon = <CloudSnow {...props} />
  else if (base.includes("fog")) icon = <CloudFog {...props} />
  else if (base.startsWith("heavyrain") || base.startsWith("rain")) icon = <CloudRain {...props} />
  else if (base.includes("rain") || base.includes("drizzle")) icon = <CloudDrizzle {...props} />
  else if (base === "cloudy") icon = <Cloud {...props} />
  else if (base.startsWith("partlycloudy") || base === "fair") icon = <CloudSun {...props} />

  return (
    <>
      {icon}
      <span className="sr-only">{symbolLabel(symbol)}</span>
    </>
  )
}

/** True when the symbol implies falling water, used to tint the icon. */
export function isWet(symbol?: string) {
  const base = symbolBase(symbol)
  return (
    base.includes("rain") ||
    base.includes("snow") ||
    base.includes("sleet") ||
    base.includes("drizzle") ||
    base.includes("thunder")
  )
}
