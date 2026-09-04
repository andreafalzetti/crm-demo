import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

export function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  className,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  required?: boolean
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
      />
    </div>
  )
}
