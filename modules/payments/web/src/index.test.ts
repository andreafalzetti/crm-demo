import { describe, expect, it } from "vitest"

import { paymentsModule } from "./index"

describe("paymentsModule", () => {
  it("rimane un modulo preview indipendente dal provider", () => {
    expect(paymentsModule.status).toBe("preview")
    expect(paymentsModule.permissions).toEqual([])
    expect(paymentsModule.routes).toHaveLength(2)
  })
})
