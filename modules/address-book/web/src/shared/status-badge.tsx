import { Badge } from "@workspace/ui/components/badge"

const STATUS_LABELS: Record<string, string> = {
  prospect: "Prospect",
  active: "Attivo",
  archived: "Archiviato",
  inactive: "Non attivo",
  open: "Aperta",
  done: "Completata",
  cancelled: "Annullata",
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <Badge
      variant={
        value === "active" || value === "done"
          ? "default"
          : value === "archived" || value === "cancelled"
            ? "outline"
            : "secondary"
      }
    >
      {STATUS_LABELS[value] ?? value}
    </Badge>
  )
}
