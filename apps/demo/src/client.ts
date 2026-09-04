import { addressBookModule } from "@crm/address-book"
import { agendaModule } from "@crm/agenda"
import { defineClientManifest } from "@crm/app-core"
import { personnelModule } from "@crm/personnel"
import { quotesModule } from "@crm/quotes"
import { workItemsModule } from "@crm/work-items"

export const clientManifest = defineClientManifest({
  slug: "demo",
  name: "Ferri & Co.",
  shortName: "FC",
  locale: "it-IT",
  accent: "#087f48",
  modules: [
    addressBookModule,
    personnelModule,
    workItemsModule,
    agendaModule,
    quotesModule,
  ],
})
