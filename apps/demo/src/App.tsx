import {
  createBrowserRouter,
  isRouteErrorResponse,
  Link,
  RouterProvider,
  useRouteError,
} from "react-router-dom"

import {
  AppShell,
  AuditPage,
  ChangePasswordPage,
  LoginPage,
  NotFoundPage,
  OverviewPage,
  ProtectedRoute,
  RolesPage,
  UsersPage,
} from "@crm/app-core"
import { clientManifest } from "@/client"

const routes = clientManifest.modules.flatMap((module) => module.routes)

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage manifest={clientManifest} />,
    errorElement: <RouteErrorPage />,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/change-password", element: <ChangePasswordPage /> },
      {
        path: "/",
        element: <AppShell manifest={clientManifest} />,
        children: [
          { index: true, element: <OverviewPage manifest={clientManifest} /> },
          ...routes,
          { path: "admin/users", element: <UsersPage /> },
          { path: "admin/roles", element: <RolesPage /> },
          { path: "admin/audit", element: <AuditPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}

function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} · ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Si è verificato un errore inatteso."

  return (
    <main className="grid min-h-svh place-items-center bg-background px-6">
      <div className="max-w-lg text-center">
        <p className="text-xs font-semibold tracking-[.22em] text-primary uppercase">
          Ferri & Co. · CRM
        </p>
        <h1 className="mt-4 font-editorial text-5xl tracking-tight">
          Qualcosa si è interrotto.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {message}
        </p>
        <Link
          className="mt-7 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          to="/"
        >
          Torna al CRM
        </Link>
      </div>
    </main>
  )
}
