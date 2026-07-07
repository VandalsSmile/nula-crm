"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Pencil, Trash2, UserMinus } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { GroupFormDialog } from "@/components/group-form-dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { addContactToGroup, deleteGroup, removeContactFromGroup } from "@/app/actions/groups"
import type { Contact, Group } from "@/lib/crm-types"
import { APP_ROUTES, contactPath } from "@/lib/routes"

export function GroupDetailView({
  group,
  members,
  allContacts,
}: {
  group: Group
  members: Contact[]
  allContacts: Contact[]
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const memberIds = new Set(members.map((m) => m.id))
  const available = allContacts.filter((c) => !memberIds.has(c.id))

  function addMember(contactId: string | null) {
    if (!contactId) return
    startTransition(async () => {
      try {
        await addContactToGroup(contactId, group.id)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add contact")
      }
    })
  }

  function removeMember(contactId: string) {
    startTransition(async () => {
      try {
        await removeContactFromGroup(contactId, group.id)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not remove contact")
      }
    })
  }

  async function handleDelete() {
    await deleteGroup(group.id)
    toast.success(`Deleted "${group.name}"`)
    router.push(APP_ROUTES.groups)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={APP_ROUTES.groups} />}>Groups</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{group.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title={group.name}
        description={group.description || "Audience group"}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href={APP_ROUTES.groups} />}>
              <ArrowLeft data-icon="inline-start" />
              Back
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{group.memberCount ?? members.length} members</Badge>
        {group.isSystem ? <Badge variant="outline">Default group</Badge> : null}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">Members</CardTitle>
          {available.length > 0 ? (
            <Select onValueChange={addMember}>
              <SelectTrigger className="h-9 w-52">
                <SelectValue placeholder="Add contact" />
              </SelectTrigger>
              <SelectContent>
                {available.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs text-muted-foreground">All contacts are in this group</span>
          )}
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No contacts in this group yet. Add members above or assign from a contact profile.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((contact) => (
                <li key={contact.id} className="flex items-center justify-between gap-3 py-3">
                  <Link href={contactPath(contact.id)} className="font-medium hover:underline">
                    {contact.fullName}
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {contact.email || contact.phone || "—"}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={() => removeMember(contact.id)}
                      aria-label={`Remove ${contact.fullName}`}
                    >
                      <UserMinus />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <GroupFormDialog open={editOpen} onOpenChange={setEditOpen} group={group} />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete group?"
        description={`Remove "${group.name}" permanently?`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
