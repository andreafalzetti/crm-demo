import { createElement } from "react"
import { Building2, ContactRound } from "lucide-react"

import type { CrmModule } from "@crm/app-core"

import { ContactsPage } from "./contacts/contacts-page"
import { AddressBookWidget } from "./dashboard/address-book-widget"
import { OrganizationDetailPage } from "./organizations/organization-detail-page"
import { OrganizationsPage } from "./organizations/organizations-page"

const permissions = [
  "organizations",
  "contacts",
  "notes",
  "activities",
  "documents",
].flatMap((resource) =>
  ["read", "create", "update", "delete"].map(
    (action) => `addressbook.${resource}.${action}`
  )
)

export const addressBookModule: CrmModule = {
  id: "address-book",
  label: "Anagrafiche",
  permissions,
  navigation: [
    {
      label: "Clienti",
      to: "/organizations",
      icon: Building2,
      permission: "addressbook.organizations.read",
    },
    {
      label: "Contatti",
      to: "/contacts",
      icon: ContactRound,
      permission: "addressbook.contacts.read",
    },
  ],
  dashboardWidgets: [
    {
      id: "address-book-summary",
      order: 10,
      permission: "addressbook.organizations.read",
      component: AddressBookWidget,
    },
  ],
  routes: [
    { path: "organizations", element: createElement(OrganizationsPage) },
    {
      path: "organizations/:organizationId",
      element: createElement(OrganizationDetailPage),
    },
    { path: "contacts", element: createElement(ContactsPage) },
  ],
}
