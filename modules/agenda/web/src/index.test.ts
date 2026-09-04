import { describe, expect, it } from "vitest"

import { agendaModule } from "./index"

describe("agendaModule", () => {
  it("integra personale e interventi", () => {
    expect(agendaModule.dependencies).toHaveLength(4)
    expect(agendaModule.dependencies).toContainEqual({
      id: "appointments",
      optional: true,
    })
    expect(agendaModule.dashboardWidgets?.[0]?.id).toBe("agenda-today")
  })
})
