import { addressBookModule } from "@crm/address-book"
import { agendaModule } from "@crm/agenda"
import { appointmentsModule } from "@crm/appointments"
import { assistantModule } from "@crm/assistant"
import { defineClientManifest } from "@crm/app-core"
import { paymentsModule } from "@crm/payments"
import { personnelModule } from "@crm/personnel"
import { quotesModule } from "@crm/quotes"
import { workItemsModule } from "@crm/work-items"

export const clientManifest = defineClientManifest({
  slug: "demo",
  name: "Ferri & Co.",
  shortName: "FC",
  locale: "it-IT",
  timeZone: "Europe/Rome",
  accent: "#087f48",
  modules: [
    addressBookModule,
    personnelModule,
    appointmentsModule,
    workItemsModule,
    agendaModule,
    quotesModule,
    paymentsModule,
    assistantModule,
  ],
})
