import { describe, expect, it } from "vitest"

import {
  confirmationFromToolResult,
  parseFunctionCallArguments,
} from "./live-protocol"

describe("parseFunctionCallArguments", () => {
  it("accetta un oggetto JSON", () => {
    expect(parseFunctionCallArguments('{"query":"Aurora"}')).toEqual({
      query: "Aurora",
    })
  })

  it("degrada a oggetto vuoto su valori non validi", () => {
    expect(parseFunctionCallArguments("{")).toEqual({})
    expect(parseFunctionCallArguments("[1,2]")).toEqual({})
    expect(parseFunctionCallArguments(null)).toEqual({})
    expect(parseFunctionCallArguments("")).toEqual({})
  })
})

describe("confirmationFromToolResult", () => {
  it("riconosce il risultato di prepare_action", () => {
    expect(
      confirmationFromToolResult({
        confirmationId: "abc123",
        action: "create_note",
        summary: "Aggiungere una nota",
      })
    ).toEqual({
      id: "abc123",
      action: "create_note",
      summary: "Aggiungere una nota",
      status: "pending",
    })
  })

  it("ignora risultati senza conferma", () => {
    expect(confirmationFromToolResult({ customers: [] })).toBeNull()
    expect(confirmationFromToolResult(undefined)).toBeNull()
  })
})
