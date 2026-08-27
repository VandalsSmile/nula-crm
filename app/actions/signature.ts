"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getActingUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { emailSignatures, workspaceSettings } from "@/lib/db/schema"
import { randomId } from "@/lib/library-helpers"
import { APP_ROUTES } from "@/lib/routes"

export type SignatureInfo = {
  enabled: boolean
  fullName: string
  title: string
  company: string
  phone: string
  email: string
  website: string
  logoUrl: string
  logoWidth: number
  logoHeight: number
  tagline: string
}

/** The current user's signature, prefilled from their account + company on first use. */
export async function getMySignature(): Promise<SignatureInfo> {
  const { user, workspaceId } = await getActingUser()
  const [row] = await db
    .select()
    .from(emailSignatures)
    .where(eq(emailSignatures.userId, user.id))
    .limit(1)

  if (row) {
    return {
      enabled: row.enabled,
      fullName: row.fullName,
      title: row.title,
      company: row.company,
      phone: row.phone,
      email: row.email,
      website: row.website,
      logoUrl: row.logoUrl,
      logoWidth: row.logoWidth,
      logoHeight: row.logoHeight,
      tagline: row.tagline,
    }
  }

  // Sensible defaults from the user + workspace so the creator isn't blank.
  const [ws] = await db
    .select({ companyName: workspaceSettings.companyName, website: workspaceSettings.website })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  return {
    enabled: true,
    fullName: user.name ?? "",
    title: "",
    company: ws?.companyName ?? "",
    phone: "",
    email: user.email ?? "",
    website: ws?.website ?? "",
    logoUrl: "",
    logoWidth: 0,
    logoHeight: 0,
    tagline: "",
  }
}

/** Create/update the current user's signature. */
export async function updateMySignature(input: Partial<SignatureInfo>): Promise<SignatureInfo> {
  const { user, workspaceId } = await getActingUser()

  const set: Partial<typeof emailSignatures.$inferInsert> = { updatedAt: new Date() }
  if (input.enabled !== undefined) set.enabled = input.enabled
  if (input.fullName !== undefined) set.fullName = input.fullName.trim()
  if (input.title !== undefined) set.title = input.title.trim()
  if (input.company !== undefined) set.company = input.company.trim()
  if (input.phone !== undefined) set.phone = input.phone.trim()
  if (input.email !== undefined) set.email = input.email.trim()
  if (input.website !== undefined) set.website = input.website.trim()
  if (input.logoUrl !== undefined) set.logoUrl = input.logoUrl.trim()
  if (input.logoWidth !== undefined) set.logoWidth = Math.max(0, Math.round(input.logoWidth))
  if (input.logoHeight !== undefined) set.logoHeight = Math.max(0, Math.round(input.logoHeight))
  if (input.tagline !== undefined) set.tagline = input.tagline.trim()

  const [existing] = await db
    .select({ id: emailSignatures.id })
    .from(emailSignatures)
    .where(eq(emailSignatures.userId, user.id))
    .limit(1)

  if (existing) {
    await db.update(emailSignatures).set(set).where(eq(emailSignatures.id, existing.id))
  } else {
    await db.insert(emailSignatures).values({
      id: randomId("sig"),
      userId: user.id,
      workspaceId,
      ...set,
    })
  }

  revalidatePath(APP_ROUTES.settings)
  return getMySignature()
}
