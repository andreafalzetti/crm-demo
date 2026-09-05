import { describe, expect, it } from "vitest"

import { agendaModule } from "./index"
import { dayKey } from "./lib/week"

describe("agendaModule", () => {
  it("integra personale e interventi", () => {
    expect(agendaModule.dependencies).toHaveLength(4)
    expect(agendaModule.dependencies).toContainEqual({
      id: "appointments",
      optional: true,
    })
    expect(agendaModule.dashboardWidgets?.[0]?.id).toBe("agenda-today")
  })

  it("raggruppa gli eventi nella timezone configurata", () => {
    const value = "2026-09-05T22:30:00Z"
    expect(dayKey(value, "Europe/Rome")).toBe("2026-09-06")
    expect(dayKey(value, "America/New_York")).toBe("2026-09-05")
  })
})
