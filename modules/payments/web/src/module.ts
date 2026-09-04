import { createElement } from "react"
import { CircleDollarSign, SlidersHorizontal } from "lucide-react"

import type { CrmModule } from "@crm/app-core"

import { PaymentsWidget } from "./dashboard/payments-widget"
import { PaymentSettingsPage } from "./pages/payment-settings-page"
import { PaymentsPage } from "./pages/payments-page"

export const paymentsModule: CrmModule = {
  id: "payments",
  label: "Pagamenti",
  status: "preview",
  permissions: [],
  navigation: [
    {
      label: "Movimenti",
      to: "/payments",
      icon: CircleDollarSign,
    },
    {
      label: "Canali e regole",
      to: "/payments/settings",
      icon: SlidersHorizontal,
    },
  ],
  dashboardWidgets: [
    {
      id: "payments-overview",
      order: 60,
      component: PaymentsWidget,
    },
  ],
  routes: [
    { path: "payments", element: createElement(PaymentsPage) },
    {
      path: "payments/settings",
      element: createElement(PaymentSettingsPage),
    },
  ],
}
