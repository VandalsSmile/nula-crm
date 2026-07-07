"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Globe, MapPin, Pencil, Trash2, MoreHorizontal } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { LacrmStatusBadge } from "@/components/status-badge"
import { AddClientDialog } from "@/components/add-client-dialog"
import { EditClientDialog } from "@/components/edit-client-dialog"
import { DeleteClientDialog } from "@/components/delete-client-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { initials, type Client } from "@/lib/mock-data"

export function ClientsView({ clients }: { clients: Client[] }) {
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        description="Manage client profiles, contacts, and LACRM connections."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus data-icon="inline-start" />
            Add Client
          </Button>
        }
      />

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">No clients yet.</p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              Add your first client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="flex flex-col">
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-11">
                    {client.logoUrl ? (
                      <AvatarImage src={client.logoUrl} alt={`${client.name} logo`} className="object-contain" />
                    ) : null}
                    <AvatarFallback style={{ backgroundColor: client.accentColor, color: "white" }}>
                      {initials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      <Link href={`/clients/${client.id}`} className="hover:underline">
                        {client.name}
                      </Link>
                    </CardTitle>
                    <LacrmStatusBadge status={client.lacrm.status} />
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditClient(client)}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteClient(client)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                {client.websiteUrl ? (
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 shrink-0" />
                    <span className="truncate">{client.websiteUrl}</span>
                  </div>
                ) : null}
                {client.location ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 shrink-0" />
                    <span className="truncate">{client.location}</span>
                  </div>
                ) : null}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" render={<Link href={`/clients/${client.id}`} />}>
                  View profile
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AddClientDialog open={addOpen} onOpenChange={setAddOpen} />
      {editClient ? (
        <EditClientDialog client={editClient} open={!!editClient} onOpenChange={(open) => !open && setEditClient(null)} />
      ) : null}
      {deleteClient ? (
        <DeleteClientDialog
          clientId={deleteClient.id}
          clientName={deleteClient.name}
          open={!!deleteClient}
          onOpenChange={(open) => !open && setDeleteClient(null)}
        />
      ) : null}
    </div>
  )
}
