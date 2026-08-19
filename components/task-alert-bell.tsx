"use client"

import Link from "next/link"
import useSWR from "swr"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getTaskAlerts } from "@/app/actions/tasks"
import { APP_ROUTES } from "@/lib/routes"

export function TaskAlertBell() {
  const { data } = useSWR("task-alerts", () => getTaskAlerts(), {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })
  const count = (data?.overdue ?? 0) + (data?.dueToday ?? 0)
  const label = count > 0 ? `${count} task${count === 1 ? "" : "s"} due` : "Tasks"

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={label}
      title={label}
      render={<Link href={APP_ROUTES.tasks} />}
    >
      <Bell className="size-4" />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Button>
  )
}
