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
    expect(
      defineClientManifest({
        slug: "demo",
        name: "Demo",
        shortName: "DE",
        locale: "it-IT",
        accent: "#087f48",
        modules: [module],
      }).modules
    ).toHaveLength(1)
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
