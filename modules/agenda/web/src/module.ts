import { createElement } from "react"
import { CalendarDays } from "lucide-react"

import type { CrmModule } from "@crm/app-core"

import { AgendaWidget } from "./components/agenda-widget"
import { AgendaPage } from "./pages/agenda-page"

export const agendaModule: CrmModule = {
  id: "agenda",
  label: "Agenda",
  dependencies: [
    { id: "address-book" },
    { id: "personnel" },
    { id: "work-items" },
    { id: "appointments", optional: true },
  ],
  permissions: [
    "agenda.entries.read",
    "agenda.entries.create",
    "agenda.entries.update",
    "agenda.entries.delete",
  ],
  navigation: [
    {
      label: "Agenda condivisa",
      to: "/agenda",
      icon: CalendarDays,
      permission: "agenda.entries.read",
    },
  ],
  dashboardWidgets: [
    {
      id: "agenda-today",
      order: 40,
      permission: "agenda.entries.read",
      component: AgendaWidget,
    },
  ],
  routes: [{ path: "agenda", element: createElement(AgendaPage) }],
}
