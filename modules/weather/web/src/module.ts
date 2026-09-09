import { createElement } from "react"
import { CloudSun, SlidersHorizontal } from "lucide-react"

import type { CrmModule } from "@crm/app-core"

import { CustomerWeather } from "./components/customer-weather"
import { WeatherWidget } from "./components/weather-widget"
import { WeatherPage } from "./pages/weather-page"
import { WeatherRulesPage } from "./pages/weather-rules-page"

export const weatherModule: CrmModule = {
  id: "weather",
  label: "Meteo",
  // Both are optional: the module geolocates whichever address collections the
  // instance happens to have, and works with neither.
  dependencies: [
    { id: "address-book", optional: true },
    { id: "work-items", optional: true },
  ],
  permissions: [
    "weather.forecast.read",
    "weather.places.manage",
    "weather.rules.read",
    "weather.rules.manage",
    "weather.alerts.read",
    "weather.alerts.acknowledge",
  ],
  navigation: [
    {
      label: "Meteo",
      to: "/meteo",
      icon: CloudSun,
      permission: "weather.forecast.read",
    },
    {
      label: "Regole meteo",
      to: "/meteo/regole",
      icon: SlidersHorizontal,
      permission: "weather.rules.read",
    },
  ],
  dashboardWidgets: [
    {
      id: "weather-now",
      order: 35,
      permission: "weather.forecast.read",
      component: WeatherWidget,
    },
  ],
  customerDetails: [
    {
      id: "weather",
      label: "Meteo",
      permission: "weather.forecast.read",
      component: CustomerWeather,
    },
  ],
  routes: [
    { path: "meteo", element: createElement(WeatherPage) },
    { path: "meteo/regole", element: createElement(WeatherRulesPage) },
  ],
}
