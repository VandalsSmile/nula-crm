"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, Globe, Mail, MapPin, Pencil, Phone, Plus, ShoppingBag, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { LifecycleBadge, LeadScoreBadge } from "@/components/lifecycle-badge"
import { ActivityFeed } from "@/components/activity-feed"
import { EditContactDialog } from "@/components/edit-contact-dialog"
import { ContactRelationsEditor } from "@/components/contact-relations-editor"
import { DealFormDialog } from "@/components/deal-form-dialog"
import { RecordPurchaseDialog } from "@/components/record-purchase-dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { addContactNote } from "@/app/actions/activities"
import { deleteContact } from "@/app/actions/contacts"
import { deleteDeal } from "@/app/actions/deals"
import { formatDateTime } from "@/lib/format"
import { formatRevenue, type Activity, type Contact, type Deal, type Group, type Tag } from "@/lib/crm-types"
import { APP_ROUTES, companyPath } from "@/lib/routes"

export function ContactProfile({
  contact,
  activities,
  deals,
  allTags,
  allGroups,
}: {
  contact: Contact
  activities: Activity[]
  deals: Deal[]
  allTags: Tag[]
  allGroups: Group[]
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dealOpen, setDealOpen] = useState(false)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()

  async function handleDelete() {
    await deleteContact(contact.id)
    toast.success("Contact deleted")
    router.push(APP_ROUTES.contacts)
    router.refresh()
  }

  function saveNote() {
    if (!note.trim()) return
    startTransition(async () => {
      try {
        await addContactNote(contact.id, note)
        setNote("")
        toast.success("Note added")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add note")
      }
    })
  }

  function removeDeal(dealId: string) {
    startTransition(async () => {
      try {
        await deleteDeal(dealId)
        toast.success("Deal deleted")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete deal")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={APP_ROUTES.contacts} />}>Contacts</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{contact.fullName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{contact.fullName}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <LifecycleBadge stage={contact.lifecycleStage} />
            <LeadScoreBadge score={contact.leadScore} />
            {contact.source ? <Badge variant="secondary">Source: {contact.source}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href={APP_ROUTES.contacts} />}>
            <ArrowLeft data-icon="inline-start" />
            Back
          </Button>
          <Button variant="outline" onClick={() => setPurchaseOpen(true)}>
            <ShoppingBag data-icon="inline-start" />
            Record purchase
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
      </div>

      {contact.aiSummary || contact.recommendedNextAction ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              AI insight
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {contact.aiSummary ? <p className="mb-2">{contact.aiSummary}</p> : null}
            {contact.recommendedNextAction ? (
              <p className="font-medium text-primary">Next: {contact.recommendedNextAction}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact info</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {contact.companyName ? (
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                {contact.companyId ? (
                  <Link href={companyPath(contact.companyId)} className="text-nula-violet hover:underline">
                    {contact.companyName}
                  </Link>
                ) : (
                  contact.companyName
                )}
              </div>
            ) : null}
            {contact.email ? (
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                {contact.email}
              </div>
            ) : null}
            {contact.phone ? (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                {contact.phone}
              </div>
            ) : null}
            {contact.websiteUrl ? (
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-muted-foreground" />
                <a
                  href={/^https?:\/\//i.test(contact.websiteUrl) ? contact.websiteUrl : `https://${contact.websiteUrl}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-nula-violet hover:underline"
                >
                  {contact.websiteUrl}
                </a>
              </div>
            ) : null}
            {contact.city || contact.state ? (
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                {[contact.city, contact.state, contact.zip].filter(Boolean).join(", ")}
              </div>
            ) : null}
            <Separator />
            <div>
              <span className="text-muted-foreground">Owner: </span>
              <span className="font-medium">{contact.ownerName || "Unassigned"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Revenue: </span>
              <span className="font-medium">{formatRevenue(contact.totalRevenueCents)}</span>
            </div>
            {contact.lastPurchaseAt ? (
              <div>
                <span className="text-muted-foreground">Last purchase: </span>
                {formatDateTime(contact.lastPurchaseAt)}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tags & groups</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactRelationsEditor contact={contact} allTags={allTags} allGroups={allGroups} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle>Deals</CardTitle>
          <Button size="sm" variant="outline" onClick={() => { setEditDeal(null); setDealOpen(true) }}>
            <Plus data-icon="inline-start" />
            Add deal
          </Button>
        </CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deals yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {deals.map((deal) => (
                <li key={deal.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{deal.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {deal.stage} · {formatRevenue(deal.estimatedValueCents)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => { setEditDeal(deal); setDealOpen(true) }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={pending}
                      onClick={() => removeDeal(deal.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {contact.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{contact.notes}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add a note to the timeline..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveNote()}
            />
            <Button onClick={saveNote} disabled={pending || !note.trim()}>
              Add
            </Button>
          </div>
          <ActivityFeed items={activities} />
        </CardContent>
      </Card>

      <EditContactDialog open={editOpen} onOpenChange={setEditOpen} contact={contact} />
      <RecordPurchaseDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} contactId={contact.id} />
      <DealFormDialog
        open={dealOpen}
        onOpenChange={(open) => { setDealOpen(open); if (!open) setEditDeal(null) }}
        contactId={contact.id}
        deal={editDeal}
      />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete contact?"
        description={`Permanently remove ${contact.fullName} and all related data?`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
