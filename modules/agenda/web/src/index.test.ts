import { describe, expect, it } from "vitest"

import { agendaModule } from "./index"

describe("agendaModule", () => {
  it("integra personale e interventi", () => {
    expect(agendaModule.dependencies).toHaveLength(3)
    expect(agendaModule.dashboardWidgets?.[0]?.id).toBe("agenda-today")
  })
})
