import { describe, expect, it } from "vitest"

import { appointmentsModule } from "./index"

describe("appointmentsModule", () => {
  it("dichiara le integrazioni dello scheduling medicale", () => {
    expect(appointmentsModule.status).toBe("preview")
    expect(appointmentsModule.routes).toHaveLength(3)
    expect(appointmentsModule.dependencies).toEqual(
      expect.arrayContaining([
        { id: "address-book" },
        { id: "personnel" },
        { id: "agenda" },
        { id: "payments", optional: true },
      ])
    )
  })
})
