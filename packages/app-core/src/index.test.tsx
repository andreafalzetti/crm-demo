import { describe, expect, it } from "vitest"

import { defineClientManifest, type CrmModule } from "./index"

const module: CrmModule = {
  id: "test",
  label: "Test",
  navigation: [],
  permissions: ["test.items.read"],
  routes: [{ path: "items" }],
}

describe("defineClientManifest", () => {
  it("accetta moduli con identificatori univoci", () => {
    const manifest = defineClientManifest({
      slug: "demo",
      name: "Demo",
      shortName: "DE",
      locale: "it-IT",
      accent: "#087f48",
      modules: [module],
    })
    expect(manifest.modules).toHaveLength(1)
    expect(manifest.timeZone).toBe("Europe/Rome")
  })

  it("accetta una timezone IANA configurata", () => {
    expect(
      defineClientManifest({
        slug: "demo",
        name: "Demo",
        shortName: "DE",
        locale: "it-IT",
        timeZone: "Europe/London",
        accent: "#087f48",
        modules: [module],
      }).timeZone
    ).toBe("Europe/London")
  })

  it("rifiuta una timezone non valida", () => {
    expect(() =>
      defineClientManifest({
        slug: "demo",
        name: "Demo",
        shortName: "DE",
        locale: "it-IT",
        timeZone: "Mars/Olympus",
        accent: "#087f48",
        modules: [module],
      })
    ).toThrow("Timezone non valida")
  })

  it("rifiuta moduli duplicati", () => {
    expect(() =>
      defineClientManifest({
        slug: "demo",
        name: "Demo",
        shortName: "DE",
        locale: "it-IT",
        accent: "#087f48",
        modules: [module, module],
      })
    ).toThrow("Modulo duplicato")
  })
})
