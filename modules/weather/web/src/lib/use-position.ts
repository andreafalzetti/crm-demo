import { useEffect, useState } from "react"

import type { PositionSource } from "../types"

export type ResolvedPosition = {
  source: PositionSource
  coords?: { latitude: number; longitude: number }
}

/**
 * Asks the browser where it is, and gives up quickly.
 *
 * Geolocation can hang indefinitely when the user simply ignores the prompt, so
 * the hook resolves to `fallback` after a timeout rather than leaving the widget
 * spinning. `permissions.query` is consulted first, when available, to skip the
 * prompt entirely for users who already said no.
 */
export function usePosition(timeoutMs = 8000): ResolvedPosition {
  const [position, setPosition] = useState<ResolvedPosition>({
    source: "pending",
  })

  useEffect(() => {
    let settled = false
    const settle = (next: ResolvedPosition) => {
      if (!settled) {
        settled = true
        setPosition(next)
      }
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      settle({ source: "fallback" })
      return
    }

    const timer = window.setTimeout(() => settle({ source: "fallback" }), timeoutMs)
    const request = () =>
      navigator.geolocation.getCurrentPosition(
        (result) =>
          settle({
            source: "geolocation",
            coords: {
              latitude: result.coords.latitude,
              longitude: result.coords.longitude,
            },
          }),
        () => settle({ source: "fallback" }),
        { timeout: timeoutMs, maximumAge: 5 * 60 * 1000 }
      )

    // Querying the permission first avoids re-prompting somebody who declined.
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => {
          if (status.state === "denied") {
            settle({ source: "fallback" })
            return
          }
          request()
        })
        .catch(request)
    } else {
      request()
    }

    return () => {
      settled = true
      window.clearTimeout(timer)
    }
  }, [timeoutMs])

  return position
}
