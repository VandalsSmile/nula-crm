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
import { TagBadge } from "@/components/tag-badge"
import { ViewToggle } from "@/components/view-toggle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { deleteContact } from "@/app/actions/contacts"
import { Building2, Mail, Phone, UserRound } from "lucide-react"
import { type Company, type Contact } from "@/lib/crm-types"
import { useViewMode } from "@/hooks/use-view-mode"
import { APP_ROUTES, contactPath } from "@/lib/routes"

const ALL_COMPANIES = "__all__"

export function ContactsView({
  contacts,
  companies,
  selectedCompanyId,
}: {
  contacts: Contact[]
  companies: Company[]
  selectedCompanyId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentQuery = searchParams.get("q") ?? ""
  const [search, setSearch] = useState(currentQuery)

  function pushParams(nextQuery: string, nextCompanyId: string) {
    const params = new URLSearchParams()
    if (nextQuery.trim()) params.set("q", nextQuery.trim())
    if (nextCompanyId) params.set("company", nextCompanyId)
    const qs = params.toString()
    router.push(qs ? `${APP_ROUTES.contacts}?${qs}` : APP_ROUTES.contacts)
  }
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [view, setView] = useViewMode("contacts")
  const [, startTransition] = useTransition()

  useEffect(() => {
    const handle = setTimeout(() => {
      if (search.trim() === currentQuery) return
      pushParams(search, selectedCompanyId)
    }, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, currentQuery])

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
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <ViewToggle mode={view} onChange={setView} />
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

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, company, or phone…"
            className="h-10 pl-9"
            aria-label="Search contacts"
          />
        </div>
        {companies.length > 0 ? (
          <Select
            value={selectedCompanyId || ALL_COMPANIES}
            onValueChange={(v) => pushParams(search, !v || v === ALL_COMPANIES ? "" : v)}
          >
            <SelectTrigger className="h-10 sm:w-56" aria-label="Filter by company">
              <SelectValue>
                {(v: string) =>
                  !v || v === ALL_COMPANIES
                    ? "All companies"
                    : companies.find((c) => c.id === v)?.name ?? "All companies"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_COMPANIES}>All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {currentQuery
              ? `No contacts match "${currentQuery}".`
              : "No contacts yet. Add your first contact or import a CSV."}
          </CardContent>
        </Card>
      ) : view === "grid" ? (
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
                  {contact.companyName && contact.companyName !== contact.fullName ? (
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
                    {contact.tags.slice(0, 5).map((t) => (
                      <TagBadge key={t.id} name={t.name} color={t.color} />
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Link href={contactPath(contact.id)} className="font-medium hover:underline">
                          {contact.fullName}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {contact.tags.slice(0, 3).map((t) => (
                            <TagBadge key={t.id} name={t.name} color={t.color} />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.companyName && contact.companyName !== contact.fullName
                          ? contact.companyName
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{contact.email || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{contact.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{contact.ownerName || "—"}</TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
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
