"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, CalendarClock, ListChecks, Globe, Mail, MapPin, Pencil, Phone, Plus, ShoppingBag, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { LifecycleBadge, LeadScoreBadge } from "@/components/lifecycle-badge"
import { ActivityFeed } from "@/components/activity-feed"
import { EditContactDialog } from "@/components/edit-contact-dialog"
import { ContactRelationsEditor } from "@/components/contact-relations-editor"
import { DealFormDialog } from "@/components/deal-form-dialog"
import { TaskFormDialog } from "@/components/task-form-dialog"
import { BookingFormDialog } from "@/components/booking-form-dialog"
import { RecordPurchaseDialog } from "@/components/record-purchase-dialog"
import { EmailContactDialog } from "@/components/email-contact-dialog"
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
import { NulaIntelligenceCard } from "@/components/enrichment/nula-intelligence-card"
import { ContactDocuments } from "@/components/contact-documents"
import { EmailViewDialog } from "@/components/email-view-dialog"
import { enrichContact, type EnrichmentView } from "@/app/actions/enrichment"
import { useWriteGuard } from "@/lib/use-write-guard"
import { formatDateTime } from "@/lib/format"
import { formatRevenue, type Activity, type Booking, type Contact, type ContactDocument, type Deal, type Group, type Message, type Tag, type Task } from "@/lib/crm-types"
import { APP_ROUTES, companyPath } from "@/lib/routes"

export function ContactProfile({
  contact,
  activities,
  deals,
  tasks,
  bookings,
  emails = [],
  documents = [],
  allTags,
  allGroups,
  intelligenceEnabled = false,
  enrichment = null,
  initialEmailId = "",
}: {
  contact: Contact
  activities: Activity[]
  deals: Deal[]
  tasks: Task[]
  bookings: Booking[]
  emails?: Message[]
  documents?: ContactDocument[]
  allTags: Tag[]
  allGroups: Group[]
  intelligenceEnabled?: boolean
  enrichment?: EnrichmentView | null
  /** When set (from ?email=<id>), open that email on load — e.g. from the activity feed. */
  initialEmailId?: string
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dealOpen, setDealOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [viewEmail, setViewEmail] = useState<Message | null>(null)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const [note, setNote] = useState("")
  const [enrichBusy, setEnrichBusy] = useState(false)
  const [pending, startTransition] = useTransition()
  const guardWrite = useWriteGuard()

  // Deep-link from the activity feed (?email=<id>): open that email. Synced during
  // render (React's recommended alternative to an effect) so it also fires when the
  // param changes while already on this page.
  const [deepLinkedEmailId, setDeepLinkedEmailId] = useState("")
  if (initialEmailId && initialEmailId !== deepLinkedEmailId) {
    setDeepLinkedEmailId(initialEmailId)
    setViewEmail(emails.find((m) => m.id === initialEmailId) ?? null)
  }

  async function handleEnrich() {
    setEnrichBusy(true)
    try {
      const res = await enrichContact(contact.id)
      toast.success(
        res.status === "enriched"
          ? "Enriched with Nula Intelligence"
          : "Enrichment started — results will appear shortly",
      )
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enrich")
    } finally {
      setEnrichBusy(false)
    }
  }

  async function handleDelete() {
    await deleteContact(contact.id)
    toast.success("Contact deleted")
    router.push(APP_ROUTES.contacts)
    router.refresh()
  }

  function saveNote() {
    if (!note.trim()) return
    if (!guardWrite()) return
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
          <Button onClick={() => setEmailOpen(true)}>
            <Mail data-icon="inline-start" />
            Email
          </Button>
          {intelligenceEnabled ? (
            <Button variant="outline" onClick={handleEnrich} disabled={enrichBusy}>
              <Sparkles data-icon="inline-start" />
              {contact.enrichmentStatus === "enriched" ? "Re-enrich" : "Enrich"}
            </Button>
          ) : null}
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

      {intelligenceEnabled ? (
        <NulaIntelligenceCard subjectType="contact" subjectId={contact.id} view={enrichment} />
      ) : contact.aiSummary || contact.recommendedNextAction ? (
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
            {contact.companyName && contact.companyName !== contact.fullName ? (
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                {contact.companyId ? (
                  <Link href={companyPath(contact.companyId)} className="text-nula-violet hover:underline">
                    {contact.companyName}
                  </Link>
                ) : (
                  contact.companyName
                )}
                {contact.locationName ? (
                  <span className="text-muted-foreground">· {contact.locationName}</span>
                ) : null}
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

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-4 text-muted-foreground" />
            Tasks
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)}>
            <Plus data-icon="inline-start" />
            Add task
          </Button>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className={task.status === "done" ? "font-medium text-muted-foreground line-through" : "font-medium"}>
                      {task.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {task.dueAt ? formatDateTime(task.dueAt) : "No due date"} · {task.priority}
                    </p>
                  </div>
                  <Badge variant={task.status === "done" ? "secondary" : "outline"}>{task.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            Appointments
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setBookingOpen(true)}>
            <Plus data-icon="inline-start" />
            Add appointment
          </Button>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No appointments yet. Add one, or connect a scheduling tool (Settings → Lead sources).
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{b.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {b.startAt ? formatDateTime(b.startAt) : "No time"}
                      {b.location ? ` · ${b.location}` : ""}
                    </p>
                  </div>
                  <Badge variant={b.status === "canceled" ? "destructive" : "default"}>{b.status}</Badge>
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

      <Card id="emails" className="scroll-mt-24">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            Emails
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEmailOpen(true)}>
            <Mail data-icon="inline-start" />
            New email
          </Button>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No emails yet. Send one to start the conversation.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {emails.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setViewEmail(m)}
                    className="flex w-full flex-col gap-0.5 rounded-md py-3 text-left transition-colors hover:bg-muted/50"
                    title="View email"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">
                        {m.direction === "outbound" ? "Sent" : "Received"}
                        {m.subject ? `: ${m.subject}` : ""}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(m.createdAt)}
                      </span>
                    </div>
                    {m.body ? (
                      <p className="line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">
                        {m.body}
                      </p>
                    ) : null}
                    {m.direction === "outbound" && !["sent", "logged"].includes(m.status) ? (
                      <span className="text-xs text-muted-foreground/80">{m.status}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ContactDocuments contactId={contact.id} documents={documents} />

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
      <EmailContactDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        contactId={contact.id}
        contactName={contact.fullName}
        contactEmail={contact.email}
      />
      <EmailViewDialog
        open={!!viewEmail}
        onOpenChange={(o) => !o && setViewEmail(null)}
        email={viewEmail}
        contactName={contact.fullName}
      />
      <RecordPurchaseDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} contactId={contact.id} />
      <TaskFormDialog open={taskOpen} onOpenChange={setTaskOpen} defaultContactId={contact.id} />
      <BookingFormDialog open={bookingOpen} onOpenChange={setBookingOpen} defaultContactId={contact.id} />
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
