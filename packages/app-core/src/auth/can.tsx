import type { ReactNode } from "react"

import { useAuth } from "./use-auth"

export function Can({
  permission,
  children,
}: {
  permission: string
  children: ReactNode
}) {
  return useAuth().can(permission) ? children : null
}
