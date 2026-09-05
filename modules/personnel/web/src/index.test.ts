import { describe, expect, it } from "vitest"

import { personnelModule } from "./index"
import { dateInputValue } from "./lib/date"

describe("personnelModule", () => {
  it("espone personale e presenze", () => {
    expect(personnelModule.permissions).toHaveLength(12)
    expect(personnelModule.routes.map((route) => route.path)).toContain(
      "personnel/attendance"
    )
  })

  it("calcola il giorno nella timezone configurata", () => {
    const value = new Date("2026-09-05T22:30:00Z")
    expect(dateInputValue(value, "Europe/Rome")).toBe("2026-09-06")
    expect(dateInputValue(value, "America/New_York")).toBe("2026-09-05")
  })
})
