import { describe, expect, it } from "vitest"

import { assistantModule } from "./index"

describe("assistant module", () => {
  it("contribuisce il pannello globale protetto da capability", () => {
    expect(assistantModule.permissions).toContain("assistant.use")
    expect(assistantModule.shellPanels?.[0]?.permission).toBe("assistant.use")
  })
})
