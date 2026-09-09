export type WeatherPlace = {
  id: string
  label: string
  municipality?: string
  province?: string
  latitude: number
  longitude: number
  resolved: boolean
}

export type ForecastDay = {
  date: string
  minTemp?: number
  maxTemp?: number
  precipitation: number
  maxWind: number
  symbol?: string
}

export type ForecastHour = {
  time: string
  temperature?: number
  precipitation: number
  wind: number
  symbol?: string
}

export type Forecast = {
  updatedAt: string
  timeZone: string
  days: ForecastDay[]
  hours: ForecastHour[]
}

export type ForecastResponse = {
  place: WeatherPlace
  /** Absent while the place is still queued for geocoding. */
  forecast?: Forecast
  attribution: string
}

export type WeatherAlert = {
  id: string
  day: string
  severity: "info" | "warning" | "critical"
  headline: string
  status: "open" | "acknowledged" | "expired"
  place: WeatherPlace
  workItem?: string
}

export type AlertsResponse = {
  alerts: WeatherAlert[]
  attribution: string
}

/** Which position the widget ended up showing, so it can say so out loud. */
export type PositionSource = "geolocation" | "fallback" | "pending"
