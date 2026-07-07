import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core"

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

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  websiteUrl: text("websiteUrl").notNull().default(""),
  contactName: text("contactName").notNull().default(""),
  contactEmail: text("contactEmail").notNull().default(""),
  phone: text("phone").notNull().default(""),
  location: text("location").notNull().default(""),
  timezone: text("timezone").notNull().default("America/New_York"),
  industry: text("industry").notNull().default(""),
  accentColor: text("accentColor").notNull().default("oklch(0.6 0.16 250)"),
  logoUrl: text("logoUrl"),
  brandVoice: text("brandVoice").notNull().default(""),
  targetAudience: text("targetAudience").notNull().default(""),
  commonServices: text("commonServices").notNull().default(""),
  notes: text("notes").notNull().default(""),
  lacrmApiKeyEnc: text("lacrmApiKeyEnc"),
  lacrmStatus: text("lacrmStatus").notNull().default("Disconnected"),
  lacrmConnectedBy: text("lacrmConnectedBy").notNull().default("—"),
  lacrmLastCheckedAt: timestamp("lacrmLastCheckedAt"),
  lacrmAccountName: text("lacrmAccountName"),
  lacrmUserId: text("lacrmUserId"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  clientId: text("clientId").notNull().default(""),
  actorId: text("actorId").notNull().default(""),
  at: timestamp("at").notNull().defaultNow(),
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
