import { createElement } from "react"
import { AudioLines } from "lucide-react"

import type { CrmModule } from "@crm/app-core"

import { AssistantPanel } from "./assistant-panel"
import { VoicePage } from "./voice/voice-page"

export const assistantModule: CrmModule = {
  id: "assistant",
  label: "Assistente CRM",
  dependencies: [
    { id: "address-book", optional: true },
    { id: "personnel", optional: true },
    { id: "work-items", optional: true },
    { id: "agenda", optional: true },
    { id: "quotes", optional: true },
  ],
  permissions: ["assistant.use"],
  navigation: [
    {
      label: "Prova voce",
      to: "/voce",
      icon: AudioLines,
      permission: "assistant.use",
    },
  ],
  routes: [{ path: "voce", element: createElement(VoicePage) }],
  shellPanels: [
    {
      id: "assistant-panel",
      permission: "assistant.use",
      component: AssistantPanel,
    },
  ],
}
