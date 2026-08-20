import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { workspaceSettings } from "@/lib/db/schema"
import type { NormalizedEnrichment, Seniority } from "@/lib/enrichment/types"

/**
 * Resolved Clay connection for a workspace. Prefers the workspace's own config,
 * falling back to platform env (a shared demo table), mirroring the Resend
 * email pattern.
 */
export type ClayConfig = {
  webhookUrl: string
  authToken: string
  callbackSecret: string
  configured: boolean
}

export async function getClayConfig(workspaceId: string): Promise<ClayConfig> {
  const [row] = await db
    .select({
      webhookUrl: workspaceSettings.clayWebhookUrl,
      authToken: workspaceSettings.clayAuthToken,
      callbackSecret: workspaceSettings.clayCallbackSecret,
    })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1)

  const webhookUrl = row?.webhookUrl?.trim() || process.env.CLAY_WEBHOOK_URL?.trim() || ""
  const authToken = row?.authToken?.trim() || ""
  const callbackSecret =
    row?.callbackSecret?.trim() || process.env.CLAY_CALLBACK_SECRET?.trim() || ""

  return { webhookUrl, authToken, callbackSecret, configured: Boolean(webhookUrl) }
}

/** The shared callback secret used to verify inbound Clay results for a workspace. */
export async function getClayCallbackSecret(workspaceId: string): Promise<string> {
  const config = await getClayConfig(workspaceId)
  return config.callbackSecret
}

export type ClaySubmitPayload = {
  correlationId: string
  callbackUrl: string
  subjectType: string
  firstName?: string
  lastName?: string
  companyName?: string
  email?: string
  phone?: string
  website?: string
  city?: string
  state?: string
}

/**
 * Push a record into the workspace's Clay table (inbound "Monitor webhook").
 * Clay runs its enrichment columns and later POSTs results back to callbackUrl
 * (correlated by correlationId). Returns false when Clay isn't configured.
 */
export async function submitToClay(config: ClayConfig, payload: ClaySubmitPayload): Promise<boolean> {
  if (!config.configured) return false
  const res = await fetch(config.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {}),
    },
    body: JSON.stringify({
      // Clay maps these into its table columns and passes _callback_url +
      // _correlation_id through to the final HTTP API column.
      _callback_url: payload.callbackUrl,
      _correlation_id: payload.correlationId,
      subject_type: payload.subjectType,
      first_name: payload.firstName ?? "",
      last_name: payload.lastName ?? "",
      company_name: payload.companyName ?? "",
      email: payload.email ?? "",
      phone: payload.phone ?? "",
      website: payload.website ?? "",
      city: payload.city ?? "",
      state: payload.state ?? "",
    }),
  })
  if (!res.ok) {
    throw new Error(`Clay submission failed (${res.status})`)
  }
  return true
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = Number(value.replace(/[^0-9.]/g, ""))
    return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
  }
  return undefined
}

function str(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim()
  return undefined
}

function list(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === "string" && value.trim()) return value.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
  return undefined
}

const SENIORITY_VALUES: Seniority[] = ["ic", "manager", "director", "vp", "c-level", "owner"]

/**
 * Map a raw Clay callback body into Nula's normalized shape. Field names are
 * flexible (Clay column names are configured in the table); we accept common
 * aliases. Unmatched fields are simply ignored.
 */
export function clayToNormalized(raw: Record<string, unknown>): NormalizedEnrichment {
  const get = (...keys: string[]): unknown => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null && raw[k] !== "") return raw[k]
    }
    return undefined
  }

  const seniorityRaw = str(get("seniority", "seniority_level"))?.toLowerCase()
  const seniority = SENIORITY_VALUES.includes(seniorityRaw as Seniority)
    ? (seniorityRaw as Seniority)
    : undefined

  const decisionMakerRaw = get("decision_maker", "is_decision_maker", "decisionMaker")

  return {
    domain: str(get("domain", "website", "company_domain")),
    companyName: str(get("company_name", "companyName", "company")),
    industry: str(get("industry")),
    subIndustry: str(get("sub_industry", "subIndustry", "sub_industry_name")),
    employeeCount: num(get("employee_count", "employees", "headcount", "employeeCount")),
    revenueEstimate: str(get("revenue_estimate", "revenue", "estimated_revenue", "revenueEstimate")),
    companyType: str(get("company_type", "companyType")),
    description: str(get("description", "company_description")),
    techStack: list(get("tech_stack", "technologies", "techStack")),
    growthSignals: list(get("growth_signals", "signals", "growthSignals")),
    city: str(get("city", "location_city")),
    state: str(get("state", "location_state", "region")),
    market: str(get("market")),
    title: str(get("title", "job_title", "jobTitle")),
    seniority,
    decisionMaker:
      typeof decisionMakerRaw === "boolean"
        ? decisionMakerRaw
        : typeof decisionMakerRaw === "string"
          ? /^(true|yes|1)$/i.test(decisionMakerRaw)
          : undefined,
    workEmail: str(get("work_email", "email", "workEmail")),
    phone: str(get("phone", "phone_number")),
    companyLinkedin: str(get("company_linkedin", "linkedin_company", "companyLinkedin")),
    personLinkedin: str(get("linkedin", "linkedin_url", "person_linkedin", "personLinkedin")),
  }
}
