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
