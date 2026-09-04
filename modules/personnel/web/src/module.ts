import { createElement } from "react"
import { CalendarCheck2, UsersRound } from "lucide-react"

import type { CrmModule } from "@crm/app-core"

import { PersonnelWidget } from "./components/personnel-widget"
import { AttendancePage } from "./pages/attendance-page"
import { PersonnelPage } from "./pages/personnel-page"

const permissions = ["staff", "attendance", "leave"].flatMap((resource) =>
  ["read", "create", "update", "delete"].map(
    (action) => `personnel.${resource}.${action}`
  )
)

export const personnelModule: CrmModule = {
  id: "personnel",
  label: "Personale",
  permissions,
  navigation: [
    {
      label: "Collaboratori",
      to: "/personnel",
      icon: UsersRound,
      permission: "personnel.staff.read",
    },
    {
      label: "Presenze",
      to: "/personnel/attendance",
      icon: CalendarCheck2,
      permission: "personnel.attendance.read",
    },
  ],
  dashboardWidgets: [
    {
      id: "personnel-availability",
      order: 20,
      permission: "personnel.staff.read",
      component: PersonnelWidget,
    },
  ],
  routes: [
    { path: "personnel", element: createElement(PersonnelPage) },
    { path: "personnel/attendance", element: createElement(AttendancePage) },
  ],
}
