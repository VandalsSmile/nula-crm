"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Pencil, Plus, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { GroupFormDialog } from "@/components/group-form-dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteGroup } from "@/app/actions/groups"
import type { Group } from "@/lib/crm-types"
import { groupPath } from "@/lib/routes"

export function GroupsView({ groups }: { groups: Group[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)
  const [, startTransition] = useTransition()

  function handleDelete(group: Group) {
    startTransition(async () => {
      try {
        await deleteGroup(group.id)
        toast.success(`Deleted "${group.name}"`)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete group")
        throw err
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Groups"
        description="Intentional audiences for campaigns and automations. Tags describe facts; groups describe who to reach."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Create group
          </Button>
        }
      />

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No groups yet. Create your first audience group.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base">
                    <Link href={groupPath(group.id)} className="hover:underline">
                      {group.name}
                    </Link>
                  </CardTitle>
                  {group.description ? <CardDescription>{group.description}</CardDescription> : null}
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
                    <DropdownMenuItem render={<Link href={groupPath(group.id)} />}>
                      <Users />
                      View members
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditGroup(group)}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(group)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="size-4" />
                  {group.memberCount ?? 0} contacts
                </div>
                {group.isSystem ? <Badge variant="secondary">Default</Badge> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GroupFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <GroupFormDialog
        open={!!editGroup}
        onOpenChange={(open) => !open && setEditGroup(null)}
        group={editGroup}
      />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete group?"
        description={`Remove "${deleteTarget?.name}" and unlink all member contacts. Campaigns using this group will lose their audience.`}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget)
        }}
      />
    </div>
  )
}
