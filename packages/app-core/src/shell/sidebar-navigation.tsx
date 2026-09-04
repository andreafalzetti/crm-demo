import { Activity, BookOpenText } from "lucide-react"

import { BrandMark } from "../components/brand-mark"
import type { ClientManifest, NavItem, NavigationGroup } from "../types"
import { SidebarLink } from "./sidebar-link"

export function SidebarNavigation({
  manifest,
  navigationGroups,
  adminNavigation,
  onNavigate,
}: {
  manifest: ClientManifest
  navigationGroups: NavigationGroup[]
  adminNavigation: NavItem[]
  onNavigate: () => void
}) {
  const previewModules = manifest.modules.filter(
    (module) => module.status === "preview"
  ).length
  const activeModules = manifest.modules.length - previewModules

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center border-b border-white/10 px-5">
        <BrandMark manifest={manifest} />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <SidebarLink
          item={{ label: "Panoramica", to: "/", icon: Activity }}
          onNavigate={onNavigate}
          end
        />
        {navigationGroups.map((group) => (
          <section key={group.id}>
            <div className="mt-7 mb-2 flex items-center justify-between gap-2 px-3">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-stone-500 uppercase">
                {group.label}
              </p>
              {group.status === "preview" && (
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.14em] text-emerald-200 uppercase">
                  Mock
                </span>
              )}
            </div>
            {group.items.map((item) => (
              <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </section>
        ))}
        {adminNavigation.length > 0 && (
          <>
            <p className="mt-7 mb-2 px-3 text-[10px] font-semibold tracking-[0.2em] text-stone-500 uppercase">
              Amministrazione
            </p>
            {adminNavigation.map((item) => (
              <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </>
        )}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/[.055] p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-stone-200">
            <BookOpenText className="size-4 text-[var(--sidebar-accent)]" />
            CRM modulare
          </div>
          <p className="mt-1.5 text-[11px] leading-4 text-stone-500">
            PocketBase · {activeModules} attivi
            {previewModules > 0 ? ` · ${previewModules} mock` : ""}
          </p>
        </div>
      </div>
    </div>
  )
}
