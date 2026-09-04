import { toast } from "sonner"

import { pb } from "@crm/app-core"

export async function downloadQuotePdf(id: string, number: string) {
  try {
    const response = await fetch(`/api/crm/quotes/${id}/pdf`, {
      method: "POST",
      headers: { Authorization: pb.authStore.token },
    })
    if (!response.ok) throw new Error("PDF non disponibile")
    const url = URL.createObjectURL(await response.blob())
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `preventivo-${number}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success("PDF generato e archiviato")
  } catch {
    toast.error("Generazione PDF non riuscita")
  }
}
