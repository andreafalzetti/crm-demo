import { Sparkles } from "lucide-react"

import { useAuth } from "../auth/use-auth"
import type { ClientManifest, DashboardWidget } from "../types"
import { EmptyState } from "./empty-state"
import { PageHeader } from "./page-header"

export function OverviewPage({ manifest }: { manifest: ClientManifest }) {
  const { can, user } = useAuth()
  const widgets: DashboardWidget[] = []
  for (const module of manifest.modules) {
    for (const widget of module.dashboardWidgets ?? []) {
      if (can(widget.permission)) widgets.push(widget)
    }
  }
  widgets.sort((left, right) => (left.order ?? 100) - (right.order ?? 100))

  return (
    <>
      <PageHeader
        eyebrow="Workspace operativo"
        title={`Buon lavoro, ${user?.name?.split(" ")[0] ?? ""}`}
        description="Clienti, persone, incarichi e prossime scadenze in un’unica vista."
      />
      {widgets.length ? (
        <div className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {widgets.map((widget) => {
            const Widget = widget.component
            return <Widget key={widget.id} />
          })}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Dashboard pronta"
          description="Attiva un modulo con widget per popolare questa panoramica."
        />
      )}
    </>
  )
}
