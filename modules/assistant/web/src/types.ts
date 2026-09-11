export type Confirmation = {
  id: string
  action: string
  summary: string
  status: "pending" | "confirmed" | "cancelled"
}

export type RecordLink = {
  label: string
  to: string
}

export type AssistantResponse = {
  message: string
  confirmations: Confirmation[]
  links: RecordLink[]
}

export type ConversationMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  confirmations?: Confirmation[]
  links?: RecordLink[]
}

export type VoiceStatus = "idle" | "connecting" | "active" | "closed" | "error"

export type VoiceSessionCredentials = {
  sessionId: string
  sdp: string
}

export type VoiceToolRun = {
  id: string
  name: string
  phase: "start" | "done"
  result?: unknown
  error?: string
}

export type VoiceTranscriptLine = {
  id: string
  role: "user" | "assistant"
  text: string
}
