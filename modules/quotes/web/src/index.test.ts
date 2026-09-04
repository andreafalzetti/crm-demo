import { describe, expect, it } from "vitest"

import { quotesModule } from "./index"

describe("quotesModule", () => {
  it("contribuisce preventivi alla scheda cliente", () => {
    expect(quotesModule.permissions).toContain("quotes.generate")
    expect(quotesModule.customerDetails?.[0]?.label).toBe("Preventivi")
  })
})
