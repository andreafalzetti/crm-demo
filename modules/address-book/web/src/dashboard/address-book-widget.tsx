import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, Building2, ContactRound } from "lucide-react"
import { Link } from "react-router-dom"

import { pb } from "@crm/app-core"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"

export function AddressBookWidget() {
  const organizations = useQuery({
    queryKey: ["dashboard", "organization-count"],
    queryFn: async () =>
      (await pb.collection("organizations").getList(1, 1, { fields: "id" }))
        .totalItems,
  })
  const contacts = useQuery({
    queryKey: ["dashboard", "contact-count"],
    queryFn: async () =>
      (await pb.collection("contacts").getList(1, 1, { fields: "id" }))
        .totalItems,
  })

  return (
    <Card className="overflow-hidden surface-shadow lg:col-span-2">
      <CardContent className="grid gap-0 p-0 sm:grid-cols-[1.25fr_.75fr]">
        <div className="p-6">
          <p className="text-[10px] font-semibold tracking-[.2em] text-primary uppercase">
            Anagrafiche
          </p>
          <h2 className="mt-2 font-editorial text-3xl">
            Relazioni in archivio
          </h2>
          <div className="mt-7 grid grid-cols-2 gap-4">
            <div>
              <Building2 className="size-4 text-muted-foreground" />
              <p className="mt-3 font-editorial text-5xl">
                {organizations.data ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">clienti e aziende</p>
            </div>
            <div className="border-l pl-4">
              <ContactRound className="size-4 text-muted-foreground" />
              <p className="mt-3 font-editorial text-5xl">
                {contacts.data ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">persone collegate</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between bg-[#e6ddc8] p-6 text-[#26251f] dark:bg-[#ddd0b4]">
          <p className="font-editorial text-2xl leading-tight">
            Ogni relazione conserva il proprio contesto operativo.
          </p>
          <Button asChild variant="outline" className="mt-7 bg-white/35">
            <Link to="/organizations">
              Apri i clienti
              <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
