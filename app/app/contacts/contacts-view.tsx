"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { MoreHorizontal, Pencil, Plus, Search, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { LifecycleBadge, LeadScoreBadge } from "@/components/lifecycle-badge"
import { AddContactDialog } from "@/components/add-contact-dialog"
import { EditContactDialog } from "@/components/edit-contact-dialog"
import { CsvImportDialog } from "@/components/csv-import-dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteContact } from "@/app/actions/contacts"
import { Building2, Mail, Phone, UserRound } from "lucide-react"
import { type Contact } from "@/lib/crm-types"
import { APP_ROUTES, contactPath } from "@/lib/routes"

export function ContactsView({ contacts }: { contacts: Contact[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentQuery = searchParams.get("q") ?? ""
  const [search, setSearch] = useState(currentQuery)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const handle = setTimeout(() => {
      if (search.trim() === currentQuery) return
      const params = new URLSearchParams()
      if (search.trim()) params.set("q", search.trim())
      const qs = params.toString()
      router.push(qs ? `${APP_ROUTES.contacts}?${qs}` : APP_ROUTES.contacts)
    }, 300)
    return () => clearTimeout(handle)
  }, [search, currentQuery, router])

  function handleDelete(contact: Contact) {
    startTransition(async () => {
      try {
        await deleteContact(contact.id)
        toast.success(`Deleted ${contact.fullName}`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete contact")
        throw err
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contacts"
        description="Your people — leads, customers, and everyone in between."
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="h-10 pl-9"
          aria-label="Search contacts"
        />
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {currentQuery
              ? `No contacts match "${currentQuery}".`
              : "No contacts yet. Add your first contact or import a CSV."}
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
                  {contact.companyName ? (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="size-3.5" />
                      {contact.companyName}
                    </p>
                  ) : null}
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
                      View profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditContact(contact)}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(contact)}>
                      <Trash2 />
                      Delete
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
                {contact.ownerName ? (
                  <div className="flex items-center gap-2">
                    <UserRound className="size-4" />
                    {contact.ownerName}
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
      {editContact ? (
        <EditContactDialog
          open={!!editContact}
          onOpenChange={(open) => !open && setEditContact(null)}
          contact={editContact}
        />
      ) : null}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete contact?"
        description={`Permanently remove ${deleteTarget?.fullName}?`}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget)
        }}
      />
    </div>
  )
}
