import { NavLink } from "react-router-dom"

import { cn } from "@workspace/ui/lib/utils"

import type { NavItem } from "../types"

export function SidebarLink({
  item,
  onNavigate,
  end = false,
}: {
  item: NavItem
  onNavigate: () => void
  end?: boolean
}) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-400 transition-all hover:bg-white/[.06] hover:text-stone-100",
          isActive &&
            "bg-white/[.09] text-white shadow-[inset_2px_0_0_var(--sidebar-accent)]"
        )
      }
    >
      <Icon className="size-4" />
      {item.label}
    </NavLink>
  )
}
