import { Command } from "lucide-react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAuth } from "./use-auth"

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageLoader />
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.must_change_password && location.pathname !== "/change-password")
    return <Navigate to="/change-password" replace />
  return <Outlet />
}

function FullPageLoader() {
  return (
    <div className="grid min-h-svh place-items-center bg-background">
      <div className="text-center">
        <Command className="mx-auto size-8 animate-pulse text-primary" />
        <p className="mt-3 text-xs font-semibold tracking-[.2em] text-muted-foreground uppercase">
          Apertura workspace
        </p>
      </div>
    </div>
  )
}
