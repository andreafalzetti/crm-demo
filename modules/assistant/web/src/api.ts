import { pb } from "@crm/app-core"

import type { AssistantResponse } from "./types"

export function sendMessage(message: string, sessionId: string) {
  return pb.send<AssistantResponse>("/api/crm/assistant/chat", {
    method: "POST",
    body: { message, sessionId },
  })
}

export function resolveConfirmation(
  id: string,
  decision: "confirm" | "cancel"
) {
  return pb.send<{ status: "confirmed" | "cancelled" }>(
    `/api/crm/assistant/actions/${id}/${decision}`,
    { method: "POST" }
  )
}
