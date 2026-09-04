import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import { pb } from "../lib/pocketbase"
import type { SessionPayload, UserRecord } from "../types"
import { AuthContext } from "./auth-context"

async function fetchSession(): Promise<SessionPayload> {
  return pb.send<SessionPayload>("/api/crm/me", { method: "GET" })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!pb.authStore.isValid) {
      setUser(null)
      setPermissions([])
      setLoading(false)
      return
    }
    try {
      await pb.collection("users").authRefresh()
      const session = await fetchSession()
      setUser(session.user)
      setPermissions(session.permissions)
    } catch {
      pb.authStore.clear()
      setUser(null)
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const task = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(task)
  }, [refresh])

  const login = useCallback(
    async (email: string, password: string) => {
      await pb.collection("users").authWithPassword(email, password)
      await refresh()
    },
    [refresh]
  )

  const logout = useCallback(() => {
    pb.authStore.clear()
    setUser(null)
    setPermissions([])
  }, [])

  const can = useCallback(
    (permission?: string) => !permission || permissions.includes(permission),
    [permissions]
  )
  const value = useMemo(
    () => ({ user, permissions, loading, login, logout, refresh, can }),
    [user, permissions, loading, login, logout, refresh, can]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
