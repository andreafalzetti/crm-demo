import { useMemo, useState } from "react"
import { ChevronDown, Search } from "lucide-react"
import type { RecordModel } from "pocketbase"

import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

/** F2 Labs' support role (server: platform.SupportRoleKey). */
export const SUPPORT_ROLE = "assistenza"

/**
 * What a permission requires (docs/ruoli.md, «La finestra del ruolo»): the
 * permissions follow the tables, so `agenda.entries.create`, `.update` and
 * `.delete` want `agenda.entries.read`, when the module declares it.
 */
function requirementKey(key: string) {
  const parts = key.split(".")
  if (parts.length < 2 || parts.at(-1) === "read") return null
  return [...parts.slice(0, -1), "read"].join(".")
}

/** Lower case, without accents: «Città» is found as «citta». */
function fold(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

/**
 * The permissions by module, closed, each with how many are on and a box
 * that turns the whole module on or off; the search opens them. Ticking a
 * permission ticks what it requires, unticking one unticks what requires
 * it.
 */
export function PermissionPicker({
  permissions,
  selected,
  onChange,
  readOnly = false,
}: {
  permissions: RecordModel[]
  selected: Set<string>
  onChange: (ids: string[]) => void
  readOnly?: boolean
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<Set<string>>(new Set())
  const { grouped, byKey } = useMemo(() => {
    const grouped = new Map<string, RecordModel[]>()
    const byKey = new Map<string, RecordModel>()
    for (const permission of permissions) {
      const module = String(permission.module)
      grouped.set(module, [...(grouped.get(module) ?? []), permission])
      byKey.set(String(permission.key), permission)
    }
    return { grouped, byKey }
  }, [permissions])

  const requiresOf = (permission: RecordModel) => {
    const key = requirementKey(String(permission.key))
    const required = key ? byKey.get(key) : undefined
    return required ? [required] : []
  }

  /** Turns on these and, through them, what they require. */
  function add(items: RecordModel[]) {
    const next = new Set(selected)
    const queue = [...items]
    while (queue.length > 0) {
      const permission = queue.shift()!
      if (next.has(permission.id)) continue
      next.add(permission.id)
      queue.push(...requiresOf(permission))
    }
    onChange([...next])
  }

  /** Turns off these and what requires them. */
  function remove(items: RecordModel[]) {
    const next = new Set(selected)
    const queue = [...items]
    while (queue.length > 0) {
      const permission = queue.shift()!
      if (!next.delete(permission.id)) continue
      for (const other of permissions)
        if (
          next.has(other.id) &&
          requiresOf(other).some((item) => item.id === permission.id)
        )
          queue.push(other)
    }
    onChange([...next])
  }

  const wanted = fold(query.trim())
  const matches = (permission: RecordModel) =>
    [permission.label, permission.description, permission.key].some((text) =>
      fold(String(text ?? "")).includes(wanted)
    )
  const shown = [...grouped].flatMap(([module, items]) => {
    const visible = wanted ? items.filter(matches) : items
    return visible.length > 0 ? [{ module, items, visible }] : []
  })

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query) {
              event.preventDefault()
              event.stopPropagation()
              setQuery("")
            }
          }}
          placeholder="Cerca un permesso"
          aria-label="Cerca un permesso"
          className="pl-9"
        />
      </div>
      {shown.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
          Nessun permesso per «{query.trim()}».
        </p>
      ) : (
        <div className="divide-y rounded-xl border">
          {shown.map(({ module, items, visible }) => {
            const expanded = Boolean(wanted) || open.has(module)
            const on = items.filter((permission) =>
              selected.has(permission.id)
            ).length
            return (
              <section key={module}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <Checkbox
                    aria-label={`Tutti i permessi di ${module}`}
                    checked={
                      on === items.length
                        ? true
                        : on > 0
                          ? "indeterminate"
                          : false
                    }
                    disabled={readOnly}
                    onCheckedChange={() =>
                      on === items.length ? remove(items) : add(items)
                    }
                  />
                  <button
                    type="button"
                    aria-expanded={expanded}
                    className="flex flex-1 items-center gap-2 text-left text-sm font-semibold capitalize"
                    onClick={() =>
                      setOpen((current) => {
                        const next = new Set(current)
                        if (!next.delete(module)) next.add(module)
                        return next
                      })
                    }
                  >
                    <span className="flex-1">{module}</span>
                    <span className="text-xs font-normal text-muted-foreground normal-case tabular-nums">
                      {on} di {items.length}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted-foreground transition-transform",
                        !expanded && "-rotate-90"
                      )}
                    />
                  </button>
                </div>
                {expanded && (
                  <div className="grid gap-1 px-3 pb-3 sm:grid-cols-2">
                    {visible.map((permission) => {
                      const requires = requiresOf(permission)
                      return (
                        <label
                          key={permission.id}
                          className="flex items-start gap-3 rounded-lg p-2 text-sm hover:bg-muted"
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={selected.has(permission.id)}
                            disabled={readOnly}
                            onCheckedChange={(value) =>
                              value === true
                                ? add([permission])
                                : remove([permission])
                            }
                          />
                          <span>
                            <span className="block font-medium">
                              {String(permission.label)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {String(permission.key)}
                              {requires.length > 0 && (
                                <span className="block">
                                  Insieme a «{String(requires[0].label)}».
                                </span>
                              )}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
