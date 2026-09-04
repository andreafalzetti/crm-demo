import { describe, expect, it } from "vitest"

import { addressBookModule } from "./index"

describe("addressBookModule", () => {
  it("espone capability e route senza duplicati", () => {
    expect(new Set(addressBookModule.permissions).size).toBe(
      addressBookModule.permissions.length
    )
    expect(addressBookModule.permissions).toHaveLength(20)
    expect(
      addressBookModule.routes.some((route) => route.path === "organizations")
    ).toBe(true)
  })
})
