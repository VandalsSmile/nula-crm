"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Mail, Phone, Pencil, MoreHorizontal, Upload } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { LifecycleBadge, LeadScoreBadge } from "@/components/lifecycle-badge"
import { AddContactDialog } from "@/components/add-contact-dialog"
import { CsvImportDialog } from "@/components/csv-import-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { initials, type Contact } from "@/lib/crm-types"
import { APP_ROUTES, contactPath } from "@/lib/routes"

export function ContactsView({ contacts }: { contacts: Contact[] }) {
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contacts"
        description="Your people — leads, customers, and everyone in between."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload data-icon="inline-start" />
              Import CSV
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              Add contact
            </Button>
          </div>
        }
      />

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No contacts yet. Add your first contact or import a CSV.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-base">
                    <Link href={contactPath(contact.id)} className="hover:underline">
                      {contact.fullName}
                    </Link>
                  </CardTitle>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <LifecycleBadge stage={contact.lifecycleStage} />
                    {contact.leadScore > 0 ? <LeadScoreBadge score={contact.leadScore} /> : null}
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
                    <DropdownMenuItem render={<Link href={contactPath(contact.id)} />}>
                      <Pencil />
                      View profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                {contact.email ? (
                  <div className="flex items-center gap-2">
                    <Mail className="size-4" />
                    {contact.email}
                  </div>
                ) : null}
                {contact.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="size-4" />
                    {contact.phone}
                  </div>
                ) : null}
                {contact.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {contact.tags.slice(0, 3).map((t) => (
                      <Badge key={t.id} variant="secondary" className="text-xs">
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} />
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
