import { describe, expect, it } from "vitest"

import { assistantModule } from "./index"

describe("assistant module", () => {
  it("contribuisce il pannello globale protetto da capability", () => {
    expect(assistantModule.permissions).toContain("assistant.use")
    expect(assistantModule.shellPanels?.[0]?.permission).toBe("assistant.use")
  })

  it("espone la prova voce come route protetta", () => {
    expect(assistantModule.routes?.map((route) => route.path)).toContain("voce")
    const navigation = assistantModule.navigation.find(
      (item) => item.to === "/voce"
    )
    expect(navigation?.permission).toBe("assistant.use")
  })
})
