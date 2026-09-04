import { useQuery } from "@tanstack/react-query"
import { ArrowRight, CalendarClock, ClipboardList } from "lucide-react"
import { Link } from "react-router-dom"

import { formatDateTime, pb } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

import type { WorkItem } from "../types"

export function WorkItemsWidget() {
  const items = useQuery({
    queryKey: ["dashboard", "work-items"],
    queryFn: () =>
      pb.collection<WorkItem>("work_items").getList(1, 4, {
        filter: 'status = "planned" || status = "in_progress"',
        sort: "start_at",
        expand: "organization",
      }),
  })

  return (
    <Card className="surface-shadow lg:col-span-2">
      <CardHeader className="flex flex-row items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
            Esecuzione
          </p>
          <CardTitle className="mt-1 font-editorial text-3xl">
            Prossimi interventi
          </CardTitle>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/work-items">
            Vedi tutti <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {items.isLoading ? (
          <div className="space-y-4 py-1">
            {[0, 1].map((item) => (
              <div key={item} className="flex items-center gap-4">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : items.data?.items.length ? (
          <div className="divide-y">
            {items.data.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                  <CalendarClock className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {String(item.expand?.organization?.name ?? item.code)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.start_at
                    ? formatDateTime(item.start_at)
                    : "Da pianificare"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-28 place-items-center text-center">
            <div>
              <ClipboardList className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Nessun intervento aperto
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
