"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Globe, Lock, Mail, Plus, Search, Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { OwnerSelect } from "@/components/owner-select"
import { EmailContactDialog } from "@/components/email-contact-dialog"
import {
  addContactsToTargetList,
  removeFromTargetList,
  setTargetListVisibility,
  setTargetMemberNote,
  setTargetMemberOwner,
  setTargetMemberStatus,
} from "@/app/actions/target-lists"
import { useWriteGuard } from "@/lib/use-write-guard"
import { relativeTime } from "@/lib/format"
import { contactPath } from "@/lib/routes"
import {
  OUTREACH_STATUS_LABELS,
  OUTREACH_STATUSES,
  type OutreachStatus,
  type TargetList,
  type TargetListMember,
} from "@/lib/crm-types"

type ContactOption = { id: string; name: string; email: string }

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function TargetListDetailView({
  list,
  members,
  contactOptions,
  backHref,
}: {
  list: TargetList
  members: TargetListMember[]
  contactOptions: ContactOption[]
  backHref: string
}) {
  const router = useRouter()
  const guardWrite = useWriteGuard()
  const [pending, startTransition] = useTransition()
  const [emailMember, setEmailMember] = useState<TargetListMember | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const existingIds = useMemo(() => new Set(members.map((m) => m.contactId)), [members])

  function run(fn: () => Promise<unknown>, okMsg?: string) {
    if (!guardWrite()) return
    startTransition(async () => {
      try {
        await fn()
        if (okMsg) toast.success(okMsg)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Target lists
        </Link>
        <PageHeader
          title={list.name}
          description={
            [list.ownerName ? `Owned by ${list.ownerName}` : null, list.description]
              .filter(Boolean)
              .join(" · ") || "Work through this list and track outreach per contact."
          }
          actions={
            <div className="flex items-center gap-2">
              {list.canManage ? (
                <Select
                  value={list.visibility}
                  onValueChange={(v) => run(() => setTargetListVisibility(list.id, v ?? "shared"))}
                >
                  <SelectTrigger className="h-9 w-[132px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared">
                      <span className="flex items-center gap-2">
                        <Globe className="size-3.5" /> Shared
                      </span>
                    </SelectItem>
                    <SelectItem value="private">
                      <span className="flex items-center gap-2">
                        <Lock className="size-3.5" /> Private
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  {list.visibility === "private" ? (
                    <>
                      <Lock className="size-3" /> Private
                    </>
                  ) : (
                    <>
                      <Globe className="size-3" /> Shared
                    </>
                  )}
                </Badge>
              )}
              <Button onClick={() => guardWrite() && setAddOpen(true)}>
                <UserPlus data-icon="inline-start" />
                Add contacts
              </Button>
            </div>
          }
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">
              {list.workedCount} of {list.memberCount} worked
            </span>
            <span className="text-muted-foreground">
              {list.respondedCount} replied · {list.wonCount} won
            </span>
          </div>
          <ProgressBar value={list.workedCount} total={list.memberCount} />
        </CardContent>
      </Card>

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No contacts on this list yet. Click “Add contacts” to start building it.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-40">Status</TableHead>
                    <TableHead className="w-44">Owner</TableHead>
                    <TableHead className="w-28">Last touch</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.contactId}>
                      <TableCell>
                        <Link href={contactPath(m.contactId)} className="font-medium hover:underline">
                          {m.fullName}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {[m.companyName, m.email].filter(Boolean).join(" · ") || m.lifecycleStage}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={m.status}
                          onValueChange={(v) =>
                            run(() => setTargetMemberStatus(list.id, m.contactId, v as OutreachStatus))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OUTREACH_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {OUTREACH_STATUS_LABELS[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <OwnerSelect
                          value={m.ownerId}
                          onChange={(ownerId) =>
                            run(() => setTargetMemberOwner(list.id, m.contactId, ownerId))
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.lastTouchedAt ? relativeTime(m.lastTouchedAt) : "—"}
                      </TableCell>
                      <TableCell>
                        <Input
                          defaultValue={m.note}
                          placeholder="Add a note…"
                          className="h-8"
                          onBlur={(e) => {
                            const next = e.target.value.trim()
                            if (next !== m.note) {
                              run(() => setTargetMemberNote(list.id, m.contactId, next))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Email ${m.fullName}`}
                            disabled={!m.email}
                            onClick={() => setEmailMember(m)}
                          >
                            <Mail />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove ${m.fullName}`}
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => removeFromTargetList(list.id, m.contactId),
                                `Removed ${m.fullName} from ${list.name}`,
                              )
                            }
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <AddContactsDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        options={contactOptions}
        existingIds={existingIds}
        onAdd={(ids) =>
          run(async () => {
            const { added } = await addContactsToTargetList(list.id, ids)
            toast.success(`Added ${added} ${added === 1 ? "contact" : "contacts"}`)
            setAddOpen(false)
          })
        }
      />

      {emailMember ? (
        <EmailContactDialog
          open={!!emailMember}
          onOpenChange={(open) => !open && setEmailMember(null)}
          contactId={emailMember.contactId}
          contactName={emailMember.fullName}
          contactEmail={emailMember.email}
        />
      ) : null}
    </div>
  )
}

function AddContactsDialog({
  open,
  onOpenChange,
  options,
  existingIds,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  options: ContactOption[]
  existingIds: Set<string>
  onAdd: (ids: string[]) => void
}) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const available = useMemo(() => options.filter((o) => !existingIds.has(o.id)), [options, existingIds])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? available.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(q))
      : available
    return list.slice(0, 100)
  }, [available, query])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setQuery("")
          setSelected(new Set())
        }
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Add contacts to the list</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search contacts…"
            className="h-9 pl-9"
          />
        </div>
        <div className="-mx-1 max-h-[45vh] min-h-0 flex-1 overflow-y-auto px-1">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {available.length === 0 ? "Every contact is already on this list." : "No contacts found."}
            </p>
          ) : (
            <ul className="flex flex-col">
              {filtered.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{c.name}</span>
                      {c.email ? (
                        <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={selected.size === 0} onClick={() => onAdd([...selected])}>
            <Plus />
            Add {selected.size > 0 ? selected.size : ""} {selected.size === 1 ? "contact" : "contacts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
