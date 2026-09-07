import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { MessageBubble } from "./message-bubble"

function renderAssistantMessage(text: string) {
  return renderToStaticMarkup(
    <MessageBubble
      message={{ id: "message-1", role: "assistant", text }}
      busyConfirmation={null}
      onResolve={() => undefined}
    />
  )
}

describe("assistant message formatting", () => {
  it("renders emphasis and ordered lists", () => {
    const markup = renderAssistantMessage(
      "Mi servono tre dettagli:\n\n1. **Con chi**?\n2. **A che ora**?\n3. **Oggetto**?"
    )

    expect(markup).toContain("<ol")
    expect(markup).toContain("<strong")
    expect(markup).toContain("Con chi")
    expect(markup).not.toContain("**Con chi**")
  })

  it("does not render model-provided HTML or clickable markdown links", () => {
    const markup = renderAssistantMessage(
      '<script>alert("xss")</script>\n\n[Apri](javascript:alert(1))'
    )

    expect(markup).not.toContain("<script")
    expect(markup).not.toContain("href=")
    expect(markup).toContain("Apri")
  })
})
