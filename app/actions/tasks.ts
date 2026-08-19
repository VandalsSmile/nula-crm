"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { tasks } from "@/lib/db/schema"
import { workspaceUserIdMatches } from "@/lib/auth-helpers"
import { getActingWriter } from "@/lib/entitlements"
import { randomId } from "@/lib/library-helpers"
import { APP_ROUTES } from "@/lib/routes"
import type { TaskPriority } from "@/lib/crm-types"

export type TaskInput = {
  title: string
  notes?: string
  priority?: TaskPriority
  /** ISO datetime string, or null/"" to clear. */
  dueAt?: string | null
  contactId?: string
  assigneeId?: string
}

function parseDue(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function revalidateTask(contactId?: string) {
  revalidatePath(APP_ROUTES.tasks)
  revalidatePath(APP_ROUTES.calendar)
  revalidatePath(APP_ROUTES.dashboard)
  if (contactId) revalidatePath(`${APP_ROUTES.contacts}/${contactId}`)
}

export async function createTask(input: TaskInput) {
  const { user, workspaceId } = await getActingWriter()
  const title = input.title?.trim()
  if (!title) throw new Error("Task title is required")

  const [row] = await db
    .insert(tasks)
    .values({
      id: randomId("task"),
      userId: workspaceId,
      title,
      notes: input.notes?.trim() ?? "",
      priority: input.priority ?? "normal",
      dueAt: parseDue(input.dueAt),
      contactId: input.contactId?.trim() ?? "",
      // Default the assignee to whoever created it; can be reassigned.
      assigneeId: input.assigneeId?.trim() || user.id,
      createdBy: user.id,
      status: "open",
    })
    .returning()

  revalidateTask(row.contactId)
  return row
}

export async function updateTask(id: string, input: Partial<TaskInput>) {
  const { scopeIds } = await getActingWriter()
  const patch: Record<string, string | Date | null> = { updatedAt: new Date() }
  if (input.title !== undefined) {
    const t = input.title.trim()
    if (!t) throw new Error("Task title is required")
    patch.title = t
  }
  if (input.notes !== undefined) patch.notes = input.notes.trim()
  if (input.priority !== undefined) patch.priority = input.priority
  if (input.dueAt !== undefined) patch.dueAt = parseDue(input.dueAt)
  if (input.contactId !== undefined) patch.contactId = input.contactId.trim()
  if (input.assigneeId !== undefined) patch.assigneeId = input.assigneeId.trim()

  const [row] = await db
    .update(tasks)
    .set(patch)
    .where(and(eq(tasks.id, id), workspaceUserIdMatches(tasks.userId, scopeIds)))
    .returning()
  if (!row) throw new Error("Task not found")

  revalidateTask(row.contactId)
  return row
}

export async function setTaskStatus(id: string, done: boolean) {
  const { scopeIds } = await getActingWriter()
  const [row] = await db
    .update(tasks)
    .set({ status: done ? "done" : "open", completedAt: done ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), workspaceUserIdMatches(tasks.userId, scopeIds)))
    .returning()
  if (!row) throw new Error("Task not found")

  revalidateTask(row.contactId)
  return { ok: true }
}

export async function deleteTask(id: string) {
  const { scopeIds } = await getActingWriter()
  const [row] = await db
    .select({ contactId: tasks.contactId })
    .from(tasks)
    .where(and(eq(tasks.id, id), workspaceUserIdMatches(tasks.userId, scopeIds)))
    .limit(1)
  if (!row) throw new Error("Task not found")

  await db.delete(tasks).where(eq(tasks.id, id))
  revalidateTask(row.contactId)
  return { ok: true }
}
