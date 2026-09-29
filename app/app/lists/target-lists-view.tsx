"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Globe, Loader2, Lock, MoreHorizontal, Plus, Target, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { createTargetList, deleteTargetList } from "@/app/actions/target-lists"
import { useWriteGuard } from "@/lib/use-write-guard"
import { targetListPath } from "@/lib/routes"
import type { ListVisibility, TargetList } from "@/lib/crm-types"

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function TargetListsView({ lists }: { lists: TargetList[] }) {
  const router = useRouter()
  const guardWrite = useWriteGuard()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<ListVisibility>("shared")
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TargetList | null>(null)
  const [, startTransition] = useTransition()

  function openCreate() {
    if (!guardWrite()) return
    setName("")
    setDescription("")
    setVisibility("shared")
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("List name is required")
      return
    }
    setSaving(true)
    try {
      const { id } = await createTargetList({ name, description, visibility })
      toast.success("Target list created")
      setCreateOpen(false)
      router.push(targetListPath(id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create list")
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(list: TargetList) {
    startTransition(async () => {
      try {
        await deleteTargetList(list.id)
        toast.success(`Deleted ${list.name}`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete list")
        throw err
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Target lists"
        description="Curated lists for outbound outreach — track who's been worked, who replied, and who converted."
        actions={
          <Button onClick={openCreate}>
            <Plus data-icon="inline-start" />
            New list
          </Button>
        }
      />

      {lists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Target className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No target lists yet. Create one, then add contacts to work through them.
            </p>
            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" />
              New list
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => (
            <Card key={list.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="size-4 shrink-0 text-muted-foreground" />
                    <Link href={targetListPath(list.id)} className="truncate hover:underline">
                      {list.name}
                    </Link>
                    {list.visibility === "private" ? (
                      <Badge variant="secondary" className="shrink-0 gap-1">
                        <Lock className="size-3" /> Private
                      </Badge>
                    ) : null}
                  </CardTitle>
                  {list.ownerName ? (
                    <p className="mt-1 text-xs text-muted-foreground">Owned by {list.ownerName}</p>
                  ) : null}
                  {list.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{list.description}</p>
                  ) : null}
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
                    <DropdownMenuItem render={<Link href={targetListPath(list.id)} />}>
                      Open list
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(list)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <Link href={targetListPath(list.id)} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {list.workedCount} of {list.memberCount} worked
                    </span>
                    <span>
                      {list.respondedCount} replied · {list.wonCount} won
                    </span>
                  </div>
                  <ProgressBar value={list.workedCount} total={list.memberCount} />
                  <span className="text-xs text-muted-foreground">
                    {list.memberCount} {list.memberCount === 1 ? "contact" : "contacts"}
                  </span>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New target list</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="list-name">Name</FieldLabel>
              <Input
                id="list-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q4 Enterprise Targets"
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="list-desc">Description</FieldLabel>
              <Textarea
                id="list-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Who's on this list and why?"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="list-visibility">Visibility</FieldLabel>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as ListVisibility)}>
                <SelectTrigger id="list-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">
                    <span className="flex items-center gap-2">
                      <Globe className="size-3.5" /> Shared — everyone on the team
                    </span>
                  </SelectItem>
                  <SelectItem value="private">
                    <span className="flex items-center gap-2">
                      <Lock className="size-3.5" /> Private — you plus Owners/Admins
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="animate-spin" /> : <Plus />}
              Create list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete target list?"
        description={`Remove "${deleteTarget?.name}"? Contacts stay in your CRM; only the list and its outreach tracking are removed.`}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget)
        }}
      />
    </div>
  )
}
