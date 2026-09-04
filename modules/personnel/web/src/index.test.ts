import { describe, expect, it } from "vitest"

import { personnelModule } from "./index"

describe("personnelModule", () => {
  it("espone personale e presenze", () => {
    expect(personnelModule.permissions).toHaveLength(12)
    expect(personnelModule.routes.map((route) => route.path)).toContain(
      "personnel/attendance"
    )
  })
})
