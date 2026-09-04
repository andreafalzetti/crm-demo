import { createElement } from "react"
import { CalendarRange, ListPlus, Route } from "lucide-react"

import type { CrmModule } from "@crm/app-core"

import { AppointmentsWidget } from "./dashboard/appointments-widget"
import { AppointmentTypesPage } from "./pages/appointment-types-page"
import { AppointmentsPage } from "./pages/appointments-page"
import { SchedulingRulesPage } from "./pages/scheduling-rules-page"

export const appointmentsModule: CrmModule = {
  id: "appointments",
  label: "Appuntamenti",
  status: "preview",
  dependencies: [
    { id: "address-book" },
    { id: "personnel" },
    { id: "agenda" },
    { id: "payments", optional: true },
  ],
  permissions: [],
  navigation: [
    {
      label: "Appuntamenti",
      to: "/appointments",
      icon: CalendarRange,
    },
    {
      label: "Tipi di visita",
      to: "/appointments/types",
      icon: ListPlus,
    },
    {
      label: "Disponibilità e regole",
      to: "/appointments/rules",
      icon: Route,
    },
  ],
  dashboardWidgets: [
    {
      id: "appointments-overview",
      order: 25,
      component: AppointmentsWidget,
    },
  ],
  routes: [
    { path: "appointments", element: createElement(AppointmentsPage) },
    {
      path: "appointments/types",
      element: createElement(AppointmentTypesPage),
    },
    {
      path: "appointments/rules",
      element: createElement(SchedulingRulesPage),
    },
  ],
}
