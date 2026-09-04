import { createElement } from "react"
import { FileText } from "lucide-react"

import type { CrmModule } from "@crm/app-core"

import { CustomerQuotes } from "./components/customer-quotes"
import { QuotesWidget } from "./components/quotes-widget"
import { QuotesPage } from "./pages/quotes-page"

export const quotesModule: CrmModule = {
  id: "quotes",
  label: "Preventivi",
  dependencies: [{ id: "address-book" }, { id: "work-items" }],
  permissions: [
    "quotes.quotes.read",
    "quotes.quotes.create",
    "quotes.quotes.update",
    "quotes.quotes.delete",
    "quotes.lines.read",
    "quotes.lines.create",
    "quotes.lines.update",
    "quotes.lines.delete",
    "quotes.generate",
  ],
  navigation: [
    {
      label: "Preventivi PDF",
      to: "/quotes",
      icon: FileText,
      permission: "quotes.quotes.read",
    },
  ],
  dashboardWidgets: [
    {
      id: "quotes-pipeline",
      order: 50,
      permission: "quotes.quotes.read",
      component: QuotesWidget,
    },
  ],
  customerDetails: [
    {
      id: "customer-quotes",
      label: "Preventivi",
      permission: "quotes.quotes.read",
      component: CustomerQuotes,
    },
  ],
  routes: [{ path: "quotes", element: createElement(QuotesPage) }],
}
