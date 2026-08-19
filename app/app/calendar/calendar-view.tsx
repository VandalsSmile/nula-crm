"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TaskFormDialog } from "@/components/task-form-dialog"
import { APP_ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"
import type { Task } from "@/lib/crm-types"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function priorityDot(task: Task, overdue: boolean): string {
  if (task.status === "done") return "bg-muted-foreground/40"
  if (overdue) return "bg-destructive"
  if (task.priority === "high") return "bg-destructive"
  if (task.priority === "low") return "bg-muted-foreground"
  return "bg-nula-violet"
}

export function CalendarView({ tasks }: { tasks: Task[] }) {
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()))
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [newDueAt, setNewDueAt] = useState<string | null>(null)

  const days = useMemo(() => {
    const gridStart = startOfWeek(monthStart)
    const gridEnd = endOfWeek(endOfMonth(monthStart))
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [monthStart])

  const { byDay, undated } = useMemo(() => {
    const map = new Map<string, Task[]>()
    let undatedCount = 0
    for (const t of tasks) {
      if (!t.dueAt) {
        undatedCount++
        continue
      }
      const key = format(new Date(t.dueAt), "yyyy-MM-dd")
      const list = map.get(key) ?? []
      list.push(t)
      map.set(key, list)
    }
    return { byDay: map, undated: undatedCount }
  }, [tasks])

  const [now] = useState(() => Date.now())

  function openNewOn(day: Date) {
    const d = new Date(day)
    d.setHours(9, 0, 0, 0)
    setNewDueAt(d.toISOString())
    setNewOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        description="Your tasks and follow-ups, by day."
        actions={
          <Button
            onClick={() => {
              setNewDueAt(null)
              setNewOpen(true)
            }}
          >
            <Plus data-icon="inline-start" />
            New task
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{format(monthStart, "MMMM yyyy")}</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonthStart(startOfMonth(new Date()))}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous month"
                onClick={() => setMonthStart((m) => addMonths(m, -1))}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next month"
                onClick={() => setMonthStart((m) => addMonths(m, 1))}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-sm">
            {WEEKDAYS.map((d) => (
              <div key={d} className="bg-muted/50 py-2 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const dayTasks = byDay.get(key) ?? []
              const inMonth = isSameMonth(day, monthStart)
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-24 bg-background p-1.5 align-top",
                    !inMonth && "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => openNewOn(day)}
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs hover:bg-muted",
                        isToday(day) && "bg-nula-violet font-semibold text-white hover:bg-nula-violet/90",
                      )}
                      aria-label={`Add task on ${format(day, "PP")}`}
                    >
                      {format(day, "d")}
                    </button>
                  </div>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayTasks.slice(0, 3).map((t) => {
                      const overdue = t.status === "open" && new Date(t.dueAt!).getTime() < now
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setEditTask(t)}
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-left text-xs hover:bg-muted"
                          title={t.title}
                        >
                          <span className={cn("size-1.5 shrink-0 rounded-full", priorityDot(t, overdue))} />
                          <span className={cn("truncate", t.status === "done" && "text-muted-foreground line-through")}>
                            {format(new Date(t.dueAt!), "h:mma").toLowerCase()} {t.title}
                          </span>
                        </button>
                      )
                    })}
                    {dayTasks.length > 3 ? (
                      <span className="px-1 text-xs text-muted-foreground">
                        +{dayTasks.length - 3} more
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          {undated > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              <CalendarDays className="mr-1 inline size-3.5" />
              {undated} task{undated === 1 ? "" : "s"} without a due date —{" "}
              <Link href={APP_ROUTES.tasks} className="underline">
                view in Tasks
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <TaskFormDialog open={newOpen} onOpenChange={setNewOpen} defaultDueAt={newDueAt} />
      <TaskFormDialog
        open={!!editTask}
        onOpenChange={(open) => !open && setEditTask(null)}
        task={editTask}
      />
    </div>
  )
}
