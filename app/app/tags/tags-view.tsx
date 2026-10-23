"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { TagFormDialog } from "@/components/tag-form-dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { ViewToggle } from "@/components/view-toggle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { deleteTag } from "@/app/actions/tags"
import { useViewMode } from "@/hooks/use-view-mode"
import type { Tag } from "@/lib/crm-types"

export function TagsView({ tags }: { tags: Tag[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTag, setEditTag] = useState<Tag | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)
  const [view, setView] = useViewMode("tags")
  const [, startTransition] = useTransition()

  function handleDelete(tag: Tag) {
    startTransition(async () => {
      try {
        await deleteTag(tag.id)
        toast.success(`Deleted "${tag.name}"`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete tag")
        throw err
      }
    })
  }

  function renderActions(tag: Tag) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditTag(tag)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(tag)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tags"
        description="Labels for facts about a contact — source, status, interests. To pick who to message, use Groups."
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle mode={view} onChange={setView} />
            <Button onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" />
              Create tag
            </Button>
          </div>
        }
      />

      {tags.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No tags yet. Create tags to organize and filter contacts.
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tags.map((tag) => (
            <Card key={tag.id}>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                    aria-hidden
                  />
                  <CardTitle className="text-base">{tag.name}</CardTitle>
                </div>
                {renderActions(tag)}
              </CardHeader>
              <CardContent>
                {tag.description ? (
                  <p className="text-sm text-muted-foreground">{tag.description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/70">No description</p>
                )}
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
                    <TableHead>Tag</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                            aria-hidden
                          />
                          <span className="font-medium">{tag.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tag.description || "—"}
                      </TableCell>
                      <TableCell>{renderActions(tag)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <TagFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TagFormDialog open={!!editTag} onOpenChange={(open) => !open && setEditTag(null)} tag={editTag} />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete tag?"
        description={`Remove "${deleteTarget?.name}" from all contacts?`}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget)
        }}
      />
    </div>
  )
}
