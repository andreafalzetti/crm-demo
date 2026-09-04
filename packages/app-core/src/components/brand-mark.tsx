import { cn } from "@workspace/ui/lib/utils"

import type { ClientManifest } from "../types"

export function BrandMark({
  manifest,
  dark = false,
}: {
  manifest: ClientManifest
  dark?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        dark ? "text-foreground" : "text-white"
      )}
    >
      <span className="grid size-9 place-items-center rounded-full border border-current/25 font-editorial text-lg italic">
        {manifest.shortName.slice(0, 2)}
      </span>
      <span className="text-sm font-semibold tracking-[0.08em] uppercase">
        {manifest.name}
      </span>
    </div>
  )
}
