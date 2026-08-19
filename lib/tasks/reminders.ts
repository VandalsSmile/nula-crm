import "server-only"

import { and, eq, inArray, isNull, lte } from "drizzle-orm"

import { getWorkspaceScopeIds, workspaceUserIdMatches } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { contacts, tasks, user as userTable } from "@/lib/db/schema"
import { getWorkspaceEmailConfig, sendEmailViaResend } from "@/lib/email/sender"
import { appBaseUrl } from "@/lib/unsubscribe"

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function formatDue(d: Date | null): string {
  if (!d) return "No due date"
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

type DueTaskRow = {
  id: string
  title: string
  dueAt: Date | null
  assigneeId: string
  contactName: string
}

/**
 * Email each assignee a one-time reminder for their open tasks that are due
 * within the next 24 hours (or already overdue) and haven't been reminded yet.
 * Marks `remindedAt` so we don't re-notify. Uses the workspace's email config
 * (falls back to the platform sender).
 */
export async function sendTaskRemindersForWorkspace(
  workspaceId: string,
): Promise<{ sent: number; reminded: number }> {
  const scopeIds = await getWorkspaceScopeIds(workspaceId)
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const rows: DueTaskRow[] = (
    await db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueAt: tasks.dueAt,
        assigneeId: tasks.assigneeId,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        name: contacts.name,
      })
      .from(tasks)
      .leftJoin(contacts, eq(contacts.id, tasks.contactId))
      .where(
        and(
          workspaceUserIdMatches(tasks.userId, scopeIds),
          eq(tasks.status, "open"),
          isNull(tasks.remindedAt),
          lte(tasks.dueAt, soon), // excludes null due dates
        ),
      )
  ).map((r) => ({
    id: r.id,
    title: r.title,
    dueAt: r.dueAt,
    assigneeId: r.assigneeId,
    contactName: [r.firstName, r.lastName].filter(Boolean).join(" ") || r.name || "",
  }))

  if (rows.length === 0) return { sent: 0, reminded: 0 }

  const config = await getWorkspaceEmailConfig(workspaceId)
  // Without a sender we can't email; leave remindedAt unset so a later run retries.
  if (!config.apiKey) return { sent: 0, reminded: 0 }

  const byAssignee = new Map<string, DueTaskRow[]>()
  for (const row of rows) {
    if (!row.assigneeId) continue
    const list = byAssignee.get(row.assigneeId) ?? []
    list.push(row)
    byAssignee.set(row.assigneeId, list)
  }

  const tasksUrl = `${appBaseUrl()}/app/tasks`
  let sent = 0
  const remindedIds: string[] = []

  for (const [assigneeId, list] of byAssignee) {
    const [u] = await db
      .select({ email: userTable.email, name: userTable.name })
      .from(userTable)
      .where(eq(userTable.id, assigneeId))
      .limit(1)
    if (!u?.email) continue

    const items = list
      .map((t) => {
        const who = t.contactName ? ` — ${escapeHtml(t.contactName)}` : ""
        return `<li style="margin:4px 0;"><strong>${escapeHtml(t.title)}</strong>${who}<br/><span style="color:#6b7280;font-size:13px;">Due ${escapeHtml(formatDue(t.dueAt))}</span></li>`
      })
      .join("")
    const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#2c2440;">
      <p>You have ${list.length} task${list.length === 1 ? "" : "s"} due soon:</p>
      <ul style="padding-left:18px;">${items}</ul>
      <p><a href="${tasksUrl}" style="color:#4F3DF5;">Open your tasks in Nula</a></p>
    </div>`
    const text = `You have ${list.length} task(s) due soon:\n${list
      .map((t) => `- ${t.title}${t.contactName ? ` — ${t.contactName}` : ""} (Due ${formatDue(t.dueAt)})`)
      .join("\n")}\n\nOpen your tasks: ${tasksUrl}`

    const res = await sendEmailViaResend(config, {
      to: u.email,
      subject: `${list.length} task${list.length === 1 ? "" : "s"} due soon`,
      html,
      text,
    })
    if (res.ok) {
      sent++
      remindedIds.push(...list.map((t) => t.id))
    }
  }

  if (remindedIds.length > 0) {
    await db.update(tasks).set({ remindedAt: new Date() }).where(inArray(tasks.id, remindedIds))
  }

  return { sent, reminded: remindedIds.length }
}
