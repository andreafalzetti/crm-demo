import type { ActivityRecord, Contact, Organization } from "../types"

export function relatedLabel(activity: ActivityRecord) {
  const organization = activity.expand?.organization as Organization | undefined
  const contact = activity.expand?.contact as Contact | undefined
  return (
    organization?.name ??
    (contact
      ? `${contact.first_name} ${contact.last_name}`
      : "Relazione non indicata")
  )
}

export function activityTypeLabel(type: string) {
  return (
    (
      {
        call: "Telefonata",
        email: "Email",
        meeting: "Incontro",
        task: "Compito",
      } as Record<string, string>
    )[type] ?? type
  )
}
