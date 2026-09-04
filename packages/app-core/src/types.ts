import type { ComponentType } from "react"
import type { LucideIcon } from "lucide-react"
import type { RecordModel } from "pocketbase"
import type { RouteObject } from "react-router-dom"

export type NavItem = {
  label: string
  to: string
  icon: LucideIcon
  permission?: string
}

export type CrmModule = {
  id: string
  label: string
  status?: "active" | "preview"
  navigation: NavItem[]
  routes: RouteObject[]
  permissions: string[]
  dependencies?: Array<{ id: string; optional?: boolean }>
  dashboardWidgets?: DashboardWidget[]
  customerDetails?: CustomerDetailContribution[]
  shellPanels?: ShellPanelContribution[]
}

export type DashboardWidget = {
  id: string
  order?: number
  permission?: string
  component: ComponentType
}

export type CustomerDetailContribution = {
  id: string
  label: string
  permission?: string
  component: ComponentType<{ organizationId: string }>
}

export type ShellPanelContribution = {
  id: string
  permission?: string
  component: ComponentType
}

export type NavigationGroup = {
  id: string
  label: string
  status?: "active" | "preview"
  items: NavItem[]
}

export type ClientManifest = {
  slug: string
  name: string
  shortName: string
  locale: "it-IT"
  accent: string
  modules: CrmModule[]
}

export type UserRecord = RecordModel & {
  name: string
  email: string
  active: boolean
  must_change_password: boolean
  roles: string[]
}

export type SessionPayload = {
  user: UserRecord
  permissions: string[]
  modules: string[]
}

export type AuthContextValue = {
  user: UserRecord | null
  permissions: string[]
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  can: (permission?: string) => boolean
}
