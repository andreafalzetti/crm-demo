import type { Confirmation } from "../types"

export function parseFunctionCallArguments(
  value: unknown
): Record<string, unknown> {
  if (typeof value !== "string" || value.trim() === "") return {}
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {}
    return parsed as Record<string, unknown>
  } catch {
    return {}
  }
}

export function confirmationFromToolResult(
  result: unknown
): Confirmation | null {
  if (!result || typeof result !== "object") return null
  const record = result as Record<string, unknown>
  if (typeof record.confirmationId !== "string") return null
  if (typeof record.summary !== "string") return null
  return {
    id: record.confirmationId,
    action: typeof record.action === "string" ? record.action : "action",
    summary: record.summary,
    status: "pending",
  }
}
