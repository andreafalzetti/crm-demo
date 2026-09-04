export { AuditPage } from "./admin/audit-page"
export { RolesPage } from "./admin/roles-page"
export { UsersPage } from "./admin/users-page"
export { AuthProvider } from "./auth/auth-provider"
export { Can } from "./auth/can"
export { ChangePasswordPage } from "./auth/change-password-page"
export { LoginPage } from "./auth/login-page"
export { ProtectedRoute } from "./auth/protected-route"
export { useAuth } from "./auth/use-auth"
export { AccessDenied } from "./components/access-denied"
export { EmptyState } from "./components/empty-state"
export { NotFoundPage } from "./components/not-found-page"
export { OverviewPage } from "./components/overview-page"
export { PageHeader } from "./components/page-header"
export { TableLoader } from "./components/table-loader"
export { formatDateTime } from "./lib/format"
export { pb } from "./lib/pocketbase"
export { defineClientManifest } from "./manifest"
export { AppShell } from "./shell/app-shell"
export { useClientManifest } from "./use-client-manifest"
export type {
  AuthContextValue,
  ClientManifest,
  CrmModule,
  CustomerDetailContribution,
  DashboardWidget,
  NavItem,
  NavigationGroup,
  SessionPayload,
  UserRecord,
} from "./types"
