import { type CSSProperties, useState } from "react"
import { History, LogOut, Menu, Search, ShieldCheck, Users } from "lucide-react"
import { Outlet } from "react-router-dom"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

import { useAuth } from "../auth/use-auth"
import { initials } from "../lib/format"
import { ManifestContext } from "../manifest-context"
import type { ClientManifest, NavItem, NavigationGroup } from "../types"
import { SidebarNavigation } from "./sidebar-navigation"
import { ThemeToggle } from "./theme-toggle"

export function AppShell({ manifest }: { manifest: ClientManifest }) {
  const { user, can, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigationGroups = manifest.modules.reduce<NavigationGroup[]>(
    (groups, module) => {
      const items = module.navigation.filter((item) => can(item.permission))
      if (items.length)
        groups.push({
          id: module.id,
          label: module.label,
          status: module.status,
          items,
        })
      return groups
    },
    []
  )
  const adminNavigation: NavItem[] = [
    {
      label: "Utenti",
      to: "/admin/users",
      icon: Users,
      permission: "core.users.read",
    },
    {
      label: "Ruoli e permessi",
      to: "/admin/roles",
      icon: ShieldCheck,
      permission: "core.roles.read",
    },
    {
      label: "Registro attività",
      to: "/admin/audit",
      icon: History,
      permission: "core.audit.read",
    },
  ].filter((item) => can(item.permission))

  const navigation = (
    <SidebarNavigation
      manifest={manifest}
      navigationGroups={navigationGroups}
      adminNavigation={adminNavigation}
      onNavigate={() => setMobileOpen(false)}
    />
  )

  return (
    <ManifestContext.Provider value={manifest}>
      <div
        style={
          {
            "--primary": manifest.accent,
            "--sidebar-accent": manifest.accent,
          } as CSSProperties
        }
        className="min-h-svh lg:grid lg:grid-cols-[244px_1fr]"
      >
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[244px] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] lg:block">
          {navigation}
        </aside>
        <div className="min-w-0 lg:col-start-2">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/88 px-4 backdrop-blur-xl md:px-7">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu />
                  <span className="sr-only">Apri menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] border-0 bg-[var(--sidebar)] p-0 text-[var(--sidebar-foreground)]"
              >
                <SheetTitle className="sr-only">Navigazione</SheetTitle>
                {navigation}
              </SheetContent>
            </Sheet>
            <button
              className="hidden items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm transition-colors hover:text-foreground md:flex"
              type="button"
            >
              <Search className="size-4" />
              <span className="w-48 text-left">Cerca nel workspace</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                ⌘ K
              </kbd>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <div className="mx-1 h-6 w-px bg-border" />
              <Avatar className="size-8">
                <AvatarFallback>{initials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="hidden leading-tight sm:block">
                <p className="max-w-36 truncate text-sm font-medium">
                  {user?.name}
                </p>
                <p className="max-w-36 truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Esci">
                <LogOut />
              </Button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1500px] p-4 md:p-7 lg:p-9">
            <Outlet />
          </main>
        </div>
      </div>
    </ManifestContext.Provider>
  )
}
