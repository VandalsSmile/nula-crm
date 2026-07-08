"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { user as userTable } from "@/lib/db/schema"
import { getActingUser } from "@/lib/auth-helpers"

export async function updateUserProfile(input: { phone?: string; jobTitle?: string }) {
  const { user } = await getActingUser()

  const patch: Record<string, string> = {}
  if (input.phone !== undefined) patch.phone = input.phone.trim()
  if (input.jobTitle !== undefined) patch.jobTitle = input.jobTitle.trim()

  if (Object.keys(patch).length > 0) {
    await db.update(userTable).set(patch).where(eq(userTable.id, user.id))
  }

  revalidatePath("/app", "layout")
  return { ok: true }
}
