/**
 * MET symbol codes carry a `_day` / `_night` / `_polartwilight` suffix that only
 * changes the artwork, never the weather, so it is stripped before matching.
 */
export function symbolBase(symbol?: string) {
  return (symbol ?? "").split("_")[0] ?? ""
}

const SYMBOL_LABELS: Array<[string, string]> = [
  ["thunder", "temporale"],
  ["heavyrainshowers", "rovesci intensi"],
  ["heavyrain", "pioggia intensa"],
  ["lightrainshowers", "rovesci deboli"],
  ["lightrain", "pioggia debole"],
  ["rainshowers", "rovesci"],
  ["rain", "pioggia"],
  ["heavysnow", "neve intensa"],
  ["snow", "neve"],
  ["sleet", "nevischio"],
  ["fog", "nebbia"],
  ["cloudy", "nuvoloso"],
  ["partlycloudy", "poco nuvoloso"],
  ["fair", "poco nuvoloso"],
  ["clearsky", "sereno"],
]

export function symbolLabel(symbol?: string) {
  const base = symbolBase(symbol)
  if (!base) return "—"
  // Ordered longest-prefix-first so "heavyrain" never matches plain "rain".
  const match = SYMBOL_LABELS.find(([key]) => base.includes(key))
  return match ? match[1] : base
}
