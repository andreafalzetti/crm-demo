import { useContext } from "react"

import { ManifestContext } from "./manifest-context"

export function useClientManifest() {
  const manifest = useContext(ManifestContext)
  if (!manifest)
    throw new Error("useClientManifest deve essere usato dentro AppShell")
  return manifest
}
