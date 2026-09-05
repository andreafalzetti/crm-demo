import type { ClientManifest, ClientManifestInput } from "./types"

export const DEFAULT_TIME_ZONE = "Europe/Rome"

export function defineClientManifest(
  manifest: ClientManifestInput
): ClientManifest {
  const timeZone = manifest.timeZone?.trim() || DEFAULT_TIME_ZONE
  try {
    new Intl.DateTimeFormat(manifest.locale, { timeZone }).format()
  } catch {
    throw new Error(`Timezone non valida: ${timeZone}`)
  }
  const moduleIds = new Set<string>()
  const permissions = new Set<string>()
  const paths = new Set<string>()
  const contributions = new Set<string>()
  for (const module of manifest.modules) {
    if (moduleIds.has(module.id))
      throw new Error(`Modulo duplicato: ${module.id}`)
    moduleIds.add(module.id)
    for (const permission of module.permissions) {
      if (permissions.has(permission))
        throw new Error(`Capability duplicata: ${permission}`)
      permissions.add(permission)
    }
    for (const route of module.routes) {
      const path = route.index ? "<index>" : route.path
      if (path && paths.has(path)) throw new Error(`Route duplicata: ${path}`)
      if (path) paths.add(path)
    }
    for (const contribution of [
      ...(module.dashboardWidgets ?? []),
      ...(module.customerDetails ?? []),
      ...(module.shellPanels ?? []),
    ]) {
      const key = `${module.id}:${contribution.id}`
      if (contributions.has(key))
        throw new Error(`Contributo duplicato: ${key}`)
      contributions.add(key)
    }
  }
  for (const module of manifest.modules) {
    for (const dependency of module.dependencies ?? []) {
      if (!dependency.optional && !moduleIds.has(dependency.id)) {
        throw new Error(
          `Il modulo ${module.id} richiede il modulo ${dependency.id}`
        )
      }
    }
  }
  return { ...manifest, timeZone }
}
