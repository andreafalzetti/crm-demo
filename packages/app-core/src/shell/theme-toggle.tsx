import { Moon, Sun } from "lucide-react"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"

export function ThemeToggle() {
  const [dark, setDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
  )

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("crm-theme", next ? "dark" : "light")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title={dark ? "Tema chiaro" : "Tema scuro"}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  )
}
