import { describe, expect, it } from "vitest"

import { weatherModule } from "./index"
import {
  dayLabel,
  hourLabel,
  millimetres,
  relativeDayLabel,
  temperature,
  windKmh,
} from "./lib/format"
import { symbolBase, symbolLabel } from "./lib/symbols"

describe("weatherModule", () => {
  it("non impone i moduli anagrafica e interventi", () => {
    expect(weatherModule.dependencies).toEqual([
      { id: "address-book", optional: true },
      { id: "work-items", optional: true },
    ])
  })

  it("contribuisce widget, tab cliente e rotte", () => {
    expect(weatherModule.dashboardWidgets?.[0]?.id).toBe("weather-now")
    expect(weatherModule.customerDetails?.[0]?.id).toBe("weather")
    expect(weatherModule.routes.map((route) => route.path)).toEqual([
      "meteo",
      "meteo/regole",
    ])
  })

  it("separa la lettura delle regole dalla loro modifica", () => {
    // The rules page is navigable by anyone who may read them; only the
    // manage permission unlocks the editing controls inside it.
    const rulesNav = weatherModule.navigation.find(
      (item) => item.to === "/meteo/regole"
    )
    expect(rulesNav?.permission).toBe("weather.rules.read")
    expect(weatherModule.permissions).toContain("weather.rules.manage")
  })
})

describe("formattazione dei giorni", () => {
  it("non sposta il giorno per chi guarda da un fuso a ovest", () => {
    // A forecast day is a plain calendar date. Parsing it as UTC midnight and
    // formatting it in UTC keeps "2026-09-10" on the 10th everywhere; reading it
    // through the browser's local zone would show the 9th in the Americas.
    expect(dayLabel("2026-09-10")).toContain("10")
  })

  it("chiama oggi e domani per nome nel fuso del luogo", () => {
    const rome = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const today = rome.format(new Date())
    const tomorrow = rome.format(new Date(Date.now() + 24 * 60 * 60 * 1000))
    expect(relativeDayLabel(today, "Europe/Rome")).toBe("oggi")
    expect(relativeDayLabel(tomorrow, "Europe/Rome")).toBe("domani")
  })

  it("mostra l'ora italiana per un istante reale", () => {
    // 20:00 UTC on 10 September is 22:00 in Rome (CEST): the hour the storm
    // peaks must read 22, not 20.
    expect(hourLabel("2026-09-10T20:00:00Z", "Europe/Rome")).toBe("22:00")
    expect(hourLabel("2026-01-10T20:00:00Z", "Europe/Rome")).toBe("21:00")
    expect(hourLabel("non una data", "Europe/Rome")).toBe("—")
  })
})

describe("unità di misura", () => {
  it("tace quando non piove e arrotonda solo sopra il millimetro", () => {
    expect(millimetres(0)).toBe("—")
    expect(millimetres(0.4)).toBe("0.4 mm")
    expect(millimetres(33.9)).toBe("34 mm")
  })

  it("converte il vento da m/s a km/h", () => {
    expect(windKmh(6.9)).toBe("25 km/h")
  })

  it("gestisce una temperatura assente", () => {
    expect(temperature(undefined)).toBe("—")
    expect(temperature(27.8)).toBe("28°")
  })
})

describe("simboli MET", () => {
  it("ignora il suffisso giorno/notte", () => {
    expect(symbolBase("partlycloudy_night")).toBe("partlycloudy")
    expect(symbolLabel("clearsky_day")).toBe("sereno")
  })

  it("distingue la pioggia forte da quella debole", () => {
    expect(symbolLabel("heavyrain")).toBe("pioggia intensa")
    expect(symbolLabel("lightrainshowers_day")).toBe("rovesci deboli")
    expect(symbolLabel(undefined)).toBe("—")
  })
})
