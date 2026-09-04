import { createContext } from "react"

import type { ClientManifest } from "./types"

export const ManifestContext = createContext<ClientManifest | null>(null)
