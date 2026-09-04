export type AppointmentType = {
  id: string
  name: string
  specialty: string
  duration: number
  price: number | null
  color: string
  bookingMode: "public" | "staff" | "both"
  paymentPolicy: "none" | "optional" | "deposit" | "required"
  professionals: string[]
  minimumNotice: string
  bufferBefore: number
  bufferAfter: number
}

export type AppointmentPreview = {
  id: string
  time: string
  patient: string
  type: string
  professional: string
  room: string
  status: "confirmed" | "arrived" | "pending"
  paymentStatus: "paid" | "due" | "not-required"
  amount: number | null
}

export type AvailabilityPreview = {
  professional: string
  role: string
  initials: string
  days: Record<string, string>
  exception?: string
}
