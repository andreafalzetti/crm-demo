import { describe, expect, it } from "vitest"

import { workItemsModule } from "./index"

describe("workItemsModule", () => {
  it("dichiara le dipendenze operative", () => {
    expect(workItemsModule.dependencies?.map(({ id }) => id)).toEqual([
      "address-book",
      "personnel",
    ])
    expect(workItemsModule.customerDetails).toHaveLength(1)
  })
})
