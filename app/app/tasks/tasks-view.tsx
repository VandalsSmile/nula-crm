"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarClock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { TaskFormDialog } from "@/components/task-form-dialog"
import { deleteTask, setTaskStatus } from "@/app/actions/tasks"
import { contactPath } from "@/lib/routes"
import { formatDateTime } from "@/lib/format"
import type { Task } from "@/lib/crm-types"

type Filter = "open" | "overdue" | "today" | "done" | "all"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "done", label: "Completed" },
  { value: "all", label: "All" },
]

function isOverdue(t: Task, now: number): boolean {
  return t.status === "open" && !!t.dueAt && new Date(t.dueAt).getTime() < now
}

function isDueToday(t: Task): boolean {
  if (t.status !== "open" || !t.dueAt) return false
  const d = new Date(t.dueAt)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

const PRIORITY_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  high: "destructive",
  normal: "secondary",
  low: "outline",
}

export function TasksView({ tasks }: { tasks: Task[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [filter, setFilter] = useState<Filter>("open")
  const [addOpen, setAddOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)

  const [now] = useState(() => Date.now())
  const counts = useMemo(() => {
    let overdue = 0
    let today = 0
    for (const t of tasks) {
      if (isOverdue(t, now)) overdue++
      if (isDueToday(t)) today++
    }
    return { overdue, today }
  }, [tasks, now])

  const visible = useMemo(() => {
    switch (filter) {
      case "open":
        return tasks.filter((t) => t.status === "open")
      case "overdue":
        return tasks.filter((t) => isOverdue(t, now))
      case "today":
        return tasks.filter((t) => isDueToday(t))
      case "done":
        return tasks.filter((t) => t.status === "done")
      default:
        return tasks
    }
  }, [tasks, filter, now])

  function toggle(task: Task) {
    startTransition(async () => {
      try {
        await setTaskStatus(task.id, task.status !== "done")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update task")
      }
    })
  }

  function handleDelete(task: Task) {
    startTransition(async () => {
      try {
        await deleteTask(task.id)
        toast.success("Task deleted")
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete task")
        throw err
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tasks"
        description="Follow-ups and to-dos — due dates, priorities, and who's on it."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus data-icon="inline-start" />
            New task
          </Button>
        }
      />

      {counts.overdue > 0 || counts.today > 0 ? (
        <div className="flex flex-wrap gap-2 text-sm">
          {counts.overdue > 0 ? (
            <button type="button" onClick={() => setFilter("overdue")}>
              <Badge variant="destructive">{counts.overdue} overdue</Badge>
            </button>
          ) : null}
          {counts.today > 0 ? (
            <button type="button" onClick={() => setFilter("today")}>
              <Badge variant="secondary">{counts.today} due today</Badge>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="w-40">
        <Select value={filter} onValueChange={(v) => setFilter((v as Filter) || "open")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No tasks here. Create one to start tracking follow-ups.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Task</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((task) => {
                    const overdue = isOverdue(task, now)
                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <Checkbox
                            checked={task.status === "done"}
                            onCheckedChange={() => toggle(task)}
                            aria-label={task.status === "done" ? "Mark open" : "Mark done"}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => setEditTask(task)}
                            className="text-left"
                          >
                            <span
                              className={
                                task.status === "done"
                                  ? "font-medium text-muted-foreground line-through"
                                  : "font-medium hover:underline"
                              }
                            >
                              {task.title}
                            </span>
                            {task.notes ? (
                              <span className="block max-w-md truncate text-xs text-muted-foreground">
                                {task.notes}
                              </span>
                            ) : null}
                          </button>
                        </TableCell>
                        <TableCell>
                          {task.dueAt ? (
                            <span
                              className={
                                overdue
                                  ? "inline-flex items-center gap-1 text-sm text-destructive"
                                  : "inline-flex items-center gap-1 text-sm text-muted-foreground"
                              }
                            >
                              <CalendarClock className="size-3.5" />
                              {formatDateTime(task.dueAt)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={PRIORITY_VARIANT[task.priority] ?? "secondary"}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.contactId ? (
                            <Link
                              href={contactPath(task.contactId)}
                              className="text-sm hover:underline"
                            >
                              {task.contactName || "Contact"}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.assigneeName || "Unassigned"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon-sm" aria-label="Task actions" />
                              }
                            >
                              <MoreHorizontal />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditTask(task)}>
                                <Pencil data-icon="inline-start" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTarget(task)}
                              >
                                <Trash2 data-icon="inline-start" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <TaskFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <TaskFormDialog
        open={!!editTask}
        onOpenChange={(open) => !open && setEditTask(null)}
        task={editTask}
      />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete task?"
        description={`Remove "${deleteTarget?.title}"?`}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget)
        }}
      />
    </div>
  )
}
