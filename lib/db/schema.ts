import { pgTable, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core"
import type { AiActionPreview } from "@/lib/crm-types"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  workspaceId: text("workspaceId"),
  notificationsReadAt: timestamp("notificationsReadAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

/** Central CRM contact record (renamed from legacy clients table). */
export const contacts = pgTable("contacts", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  firstName: text("firstName").notNull().default(""),
  lastName: text("lastName").notNull().default(""),
  name: text("name").notNull().default(""),
  legacyContactName: text("legacyContactName").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  zip: text("zip").notNull().default(""),
  location: text("location").notNull().default(""),
  source: text("source").notNull().default(""),
  lifecycleStage: text("lifecycleStage").notNull().default("New Lead"),
  leadStatus: text("leadStatus").notNull().default("Open"),
  customerStatus: text("customerStatus").notNull().default("Prospect"),
  notes: text("notes").notNull().default(""),
  lastContactedAt: timestamp("lastContactedAt"),
  lastActivityAt: timestamp("lastActivityAt"),
  lastPurchaseAt: timestamp("lastPurchaseAt"),
  totalRevenueCents: integer("totalRevenueCents").notNull().default(0),
  productsPurchased: text("productsPurchased").notNull().default(""),
  communicationPreference: text("communicationPreference").notNull().default("email"),
  optInStatus: text("optInStatus").notNull().default("unknown"),
  leadScore: integer("leadScore").notNull().default(0),
  aiSummary: text("aiSummary").notNull().default(""),
  recommendedNextAction: text("recommendedNextAction").notNull().default(""),
  timezone: text("timezone").notNull().default("America/New_York"),
  industry: text("industry").notNull().default(""),
  websiteUrl: text("websiteUrl").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  color: text("color").notNull().default("#4F3DF5"),
  description: text("description").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  type: text("type").notNull().default("audience"),
  isSystem: boolean("isSystem").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const contactTags = pgTable("contact_tags", {
  contactId: text("contactId").notNull(),
  tagId: text("tagId").notNull(),
  addedAt: timestamp("addedAt").notNull().defaultNow(),
  addedBy: text("addedBy").notNull().default(""),
})

export const contactGroups = pgTable("contact_groups", {
  contactId: text("contactId").notNull(),
  groupId: text("groupId").notNull(),
  addedAt: timestamp("addedAt").notNull().defaultNow(),
  addedBy: text("addedBy").notNull().default(""),
})

export const deals = pgTable("deals", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  contactId: text("contactId").notNull(),
  title: text("title").notNull(),
  offerInterest: text("offerInterest").notNull().default(""),
  stage: text("stage").notNull().default("New Lead"),
  estimatedValueCents: integer("estimatedValueCents").notNull().default(0),
  probability: integer("probability").notNull().default(0),
  nextStep: text("nextStep").notNull().default(""),
  ownerId: text("ownerId").notNull().default(""),
  closeDate: timestamp("closeDate"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("email"),
  status: text("status").notNull().default("draft"),
  goal: text("goal").notNull().default(""),
  audience: text("audience").notNull().default(""),
  groupId: text("groupId"),
  sequence: jsonb("sequence").$type<unknown[]>().notNull().default([]),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const campaignSends = pgTable("campaign_sends", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  campaignId: text("campaignId").notNull(),
  contactId: text("contactId").notNull(),
  step: integer("step").notNull().default(1),
  channel: text("channel").notNull().default("email"),
  status: text("status").notNull().default("scheduled"),
  scheduledFor: timestamp("scheduledFor").notNull().defaultNow(),
  sentAt: timestamp("sentAt"),
  error: text("error").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  contactId: text("contactId").notNull().default(""),
  actorId: text("actorId").notNull().default(""),
  at: timestamp("at").notNull().defaultNow(),
})

export const aiActions = pgTable("ai_actions", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  actorId: text("actorId").notNull().default(""),
  command: text("command").notNull(),
  intent: text("intent").notNull(),
  status: text("status").notNull().default("pending"),
  preview: jsonb("preview").$type<AiActionPreview>().notNull().default({} as AiActionPreview),
  result: jsonb("result").$type<Record<string, unknown>>().notNull().default({}),
  summary: text("summary").notNull().default(""),
  reversible: boolean("reversible").notNull().default(false),
  undoPayload: jsonb("undoPayload").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  executedAt: timestamp("executedAt"),
  undoneAt: timestamp("undoneAt"),
})

export const workspaceSettings = pgTable("workspace_settings", {
  workspaceId: text("workspaceId").primaryKey(),
  businessType: text("businessType").notNull().default("iv-therapy"),
  onboardingComplete: boolean("onboardingComplete").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const automations = pgTable("automations", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),
  action: text("action").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("lastRunAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const teamInvites = pgTable("team_invites", {
  id: text("id").primaryKey(),
  workspaceId: text("workspaceId").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("admin"),
  status: text("status").notNull().default("Pending"),
  invitedByUserId: text("invitedByUserId").notNull(),
  invitedByName: text("invitedByName").notNull().default(""),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  acceptedByUserId: text("acceptedByUserId"),
})

/** @deprecated Use contacts — kept for migration compatibility */
export const clients = contacts
