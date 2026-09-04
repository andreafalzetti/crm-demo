import { createElement } from "react"
import { ClipboardList } from "lucide-react"

import type { CrmModule } from "@crm/app-core"

import { CustomerWorkItems } from "./components/customer-work-items"
import { WorkItemsWidget } from "./components/work-items-widget"
import { WorkItemsPage } from "./pages/work-items-page"

const permissions = ["items", "assignments"].flatMap((resource) =>
  ["read", "create", "update", "delete"].map(
    (action) => `workitems.${resource}.${action}`
  )
)

export const workItemsModule: CrmModule = {
  id: "work-items",
  label: "Interventi",
  dependencies: [{ id: "address-book" }, { id: "personnel" }],
  permissions,
  navigation: [
    {
      label: "Interventi",
      to: "/work-items",
      icon: ClipboardList,
      permission: "workitems.items.read",
    },
  ],
  dashboardWidgets: [
    {
      id: "next-work-items",
      order: 30,
      permission: "workitems.items.read",
      component: WorkItemsWidget,
    },
  ],
  customerDetails: [
    {
      id: "customer-work-items",
      label: "Interventi",
      permission: "workitems.items.read",
      component: CustomerWorkItems,
    },
  ],
  routes: [{ path: "work-items", element: createElement(WorkItemsPage) }],
}
