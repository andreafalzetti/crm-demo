import { pb } from "@crm/app-core"

import type { AssistantResponse, VoiceSessionCredentials } from "./types"

export function sendMessage(
  message: string,
  sessionId: string,
  timeZone: string
) {
  return pb.send<AssistantResponse>("/api/crm/assistant/chat", {
    method: "POST",
    body: { message, sessionId, timeZone },
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

export function createVoiceSession(sdp: string) {
  return pb.send<VoiceSessionCredentials>("/api/crm/assistant/voice/session", {
    method: "POST",
    body: { sdp },
  })
}

export function runVoiceTool(
  sessionId: string,
  operation: string,
  args: Record<string, unknown>
) {
  return pb.send<{ result: unknown }>("/api/crm/assistant/voice/tools", {
    method: "POST",
    body: { sessionId, operation, args },
  })
}
