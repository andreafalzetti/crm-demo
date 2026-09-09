import { pb } from "@crm/app-core"

import type { AlertsResponse, ForecastResponse } from "../types"

export function forecastForPlace(placeId: string) {
  return pb.send<ForecastResponse>("/api/crm/weather/forecast", {
    method: "GET",
    query: { placeId },
  })
}

export function forecastForCoords(latitude: number, longitude: number) {
  return pb.send<ForecastResponse>("/api/crm/weather/forecast/by-coords", {
    method: "GET",
    query: { lat: latitude, lon: longitude },
  })
}

export function forecastForAddress(address: string) {
  return pb.send<ForecastResponse>("/api/crm/weather/forecast/by-address", {
    method: "GET",
    query: { q: address },
  })
}

export function listAlerts() {
  return pb.send<AlertsResponse>("/api/crm/weather/alerts", { method: "GET" })
}

export function acknowledgeAlert(id: string) {
  return pb.send<{ id: string; status: string }>(
    `/api/crm/weather/alerts/${id}/ack`,
    { method: "POST" }
  )
}
