import type { RecordModel } from "pocketbase"
import { toast } from "sonner"

import { pb } from "@crm/app-core"

export async function downloadFile(record: RecordModel) {
  try {
    const token = await pb.files.getToken()
    const url = pb.files.getURL(record, String(record.file), { token })
    window.open(url, "_blank", "noopener,noreferrer")
  } catch {
    toast.error("Download non disponibile")
  }
}
