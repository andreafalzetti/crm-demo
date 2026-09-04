import type { CrmModule } from "@crm/app-core"

import { AssistantPanel } from "./assistant-panel"

export const assistantModule: CrmModule = {
  id: "assistant",
  label: "Assistente",
  dependencies: [
    { id: "address-book", optional: true },
    { id: "personnel", optional: true },
    { id: "work-items", optional: true },
    { id: "agenda", optional: true },
    { id: "quotes", optional: true },
  ],
  permissions: ["assistant.use"],
  navigation: [],
  routes: [],
  shellPanels: [
    {
      id: "assistant-panel",
      permission: "assistant.use",
      component: AssistantPanel,
    },
  ],
}
