import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, SlidersHorizontal, Trash2 } from "lucide-react"
import { useState } from "react"
import type { RecordModel } from "pocketbase"
import { toast } from "sonner"

import { Can, EmptyState, PageHeader, TableLoader, pb, useAuth } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"

type RuleRecord = RecordModel & {
  name: string
  enabled: boolean
  metric: string
  operator: "gte" | "lte"
  threshold: number
  horizon_days: number
  scope: string
  severity: string
}

const METRICS: Array<[string, string, string]> = [
  ["precipitation_mm", "Pioggia giornaliera", "mm"],
  ["wind_ms", "Vento massimo", "m/s"],
  ["temp_min", "Temperatura minima", "°C"],
  ["temp_max", "Temperatura massima", "°C"],
]

const SCOPES: Array<[string, string]> = [
  ["all_places", "Tutti i luoghi seguiti"],
  ["work_items", "Solo i cantieri pianificati"],
  ["organizations", "Solo le sedi dei clienti"],
]

const SEVERITIES: Array<[string, string]> = [
  ["info", "Informativa"],
  ["warning", "Attenzione"],
  ["critical", "Critica"],
]

type RuleDraft = {
  name: string
  enabled: boolean
  metric: string
  operator: "gte" | "lte"
  threshold: number
  horizon_days: number
  scope: string
  severity: string
}

const EMPTY_RULE: RuleDraft = {
  name: "",
  enabled: true,
  metric: "precipitation_mm",
  operator: "gte",
  threshold: 20,
  horizon_days: 3,
  scope: "all_places",
  severity: "warning",
}

function unitFor(metric: string) {
  return METRICS.find(([key]) => key === metric)?.[2] ?? ""
}

export function WeatherRulesPage() {
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const editable = can("weather.rules.manage")
  const [draft, setDraft] = useState<RuleDraft | null>(null)

  const rules = useQuery({
    queryKey: ["weather", "rules"],
    queryFn: async () => {
      const result = await pb
        .collection("weather_alert_rules")
        .getList<RuleRecord>(1, 50, { sort: "name" })
      return result.items
    },
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["weather", "rules"] })

  const save = useMutation({
    mutationFn: (rule: Partial<RuleRecord> & { id?: string }) =>
      rule.id
        ? pb.collection("weather_alert_rules").update(rule.id, rule)
        : pb.collection("weather_alert_rules").create(rule),
    onSuccess: () => {
      setDraft(null)
      void invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => pb.collection("weather_alert_rules").delete(id),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <>
      <PageHeader
        eyebrow="Meteo"
        title="Regole di allerta"
        description="Soglie valutate ogni mattina alle 06:00 sulle previsioni già scaricate."
        actions={
          <Can permission="weather.rules.manage">
            <Button onClick={() => setDraft({ ...EMPTY_RULE })}>
              <Plus /> Nuova regola
            </Button>
          </Can>
        }
      />

      {rules.isPending ? (
        <TableLoader />
      ) : (rules.data?.length ?? 0) === 0 && !draft ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="Nessuna regola"
          description="Aggiungi una soglia per farti avvisare quando le previsioni la superano."
        />
      ) : (
        <div className="space-y-3">
          {draft && (
            <RuleForm
              value={draft}
              busy={save.isPending}
              onChange={setDraft}
              onCancel={() => setDraft(null)}
              onSubmit={() => save.mutate(draft)}
            />
          )}

          {rules.data?.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <Switch
                  checked={rule.enabled}
                  disabled={!editable || save.isPending}
                  aria-label={`Attiva ${rule.name}`}
                  onCheckedChange={(enabled) =>
                    save.mutate({ id: rule.id, enabled })
                  }
                />
                <div className="min-w-48 flex-1">
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {METRICS.find(([key]) => key === rule.metric)?.[1]}{" "}
                    {rule.operator === "gte" ? "≥" : "≤"} {rule.threshold}{" "}
                    {unitFor(rule.metric)} · entro {rule.horizon_days} giorni ·{" "}
                    {SCOPES.find(([key]) => key === rule.scope)?.[1]}
                  </p>
                </div>
                <Can permission="weather.rules.manage">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(rule.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    <span className="sr-only">Elimina {rule.name}</span>
                  </Button>
                </Can>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

function RuleForm({
  value,
  busy,
  onChange,
  onCancel,
  onSubmit,
}: {
  value: RuleDraft
  busy: boolean
  onChange: (next: RuleDraft) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="rule-name">Nome</Label>
          <Input
            id="rule-name"
            value={value.name}
            placeholder="Pioggia intensa"
            onChange={(event) => onChange({ ...value, name: event.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="rule-metric">Misura</Label>
          <Select
            value={value.metric}
            onValueChange={(metric) => onChange({ ...value, metric })}
          >
            <SelectTrigger id="rule-metric">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <div className="w-28">
            <Label htmlFor="rule-operator">Condizione</Label>
            <Select
              value={value.operator}
              onValueChange={(operator) =>
                onChange({ ...value, operator: operator as "gte" | "lte" })
              }
            >
              <SelectTrigger id="rule-operator">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gte">almeno</SelectItem>
                <SelectItem value="lte">al massimo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="rule-threshold">
              Soglia ({unitFor(value.metric)})
            </Label>
            <Input
              id="rule-threshold"
              type="number"
              step="0.1"
              value={value.threshold}
              onChange={(event) =>
                onChange({ ...value, threshold: Number(event.target.value) })
              }
            />
          </div>
        </div>

        <div>
          <Label htmlFor="rule-horizon">Orizzonte (giorni)</Label>
          <Input
            id="rule-horizon"
            type="number"
            min={1}
            max={7}
            value={value.horizon_days}
            onChange={(event) =>
              onChange({
                ...value,
                // MET publishes seven usable days; anything beyond is noise.
                horizon_days: Math.min(7, Math.max(1, Number(event.target.value))),
              })
            }
          />
        </div>

        <div>
          <Label htmlFor="rule-scope">Ambito</Label>
          <Select
            value={value.scope}
            onValueChange={(scope) => onChange({ ...value, scope })}
          >
            <SelectTrigger id="rule-scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPES.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="rule-severity">Gravità</Label>
          <Select
            value={value.severity}
            onValueChange={(severity) => onChange({ ...value, severity })}
          >
            <SelectTrigger id="rule-severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end justify-end gap-2 sm:col-span-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Annulla
          </Button>
          <Button onClick={onSubmit} disabled={busy || !value.name.trim()}>
            Salva regola
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
