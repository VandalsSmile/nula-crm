-- Nula B2B Intelligence module (Clay enrichment). Idempotent.
-- Adds: per-workspace add-on subscription table, enrichment run/feedback tables,
-- enrichment columns on contacts/companies, and workspace_settings config.

-- Paid add-on subscriptions (a second subscription per workspace, independent of
-- the base plan). One row per (workspaceId, addonId).
CREATE TABLE IF NOT EXISTS workspace_addons (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "addonId" TEXT NOT NULL DEFAULT 'b2b_intelligence',
  "status" TEXT NOT NULL DEFAULT 'active',
  "squareSubscriptionId" TEXT NOT NULL DEFAULT '',
  "squareCustomerId" TEXT NOT NULL DEFAULT '',
  "priceId" TEXT NOT NULL DEFAULT '',
  "currentPeriodEnd" TIMESTAMP,
  "creditsUsedThisPeriod" INTEGER NOT NULL DEFAULT 0,
  "creditLimit" INTEGER NOT NULL DEFAULT 250,
  "periodResetAt" TIMESTAMP,
  "enabledBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_addons_ws_addon_idx
  ON workspace_addons ("workspaceId", "addonId");
CREATE INDEX IF NOT EXISTS workspace_addons_customer_idx
  ON workspace_addons ("squareCustomerId") WHERE "squareCustomerId" <> '';

-- One row per Enrich request (audit + idempotency + payload store).
CREATE TABLE IF NOT EXISTS enrichment_runs (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL DEFAULT 'contact',
  "subjectId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'clay',
  "correlationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "requestPayload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "responsePayload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "normalized" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "fitScore" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT NOT NULL DEFAULT '',
  "requestedBy" TEXT NOT NULL DEFAULT '',
  "requestedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS enrichment_runs_correlation_idx
  ON enrichment_runs ("correlationId");
CREATE INDEX IF NOT EXISTS enrichment_runs_subject_idx
  ON enrichment_runs ("subjectType", "subjectId");

-- Append-only human/outcome feedback on enriched records (the learning dataset).
CREATE TABLE IF NOT EXISTS enrichment_feedback (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL DEFAULT 'contact',
  "subjectId" TEXT NOT NULL,
  "runId" TEXT NOT NULL DEFAULT '',
  "signal" TEXT NOT NULL,
  "fitScoreAtFeedback" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS enrichment_feedback_subject_idx
  ON enrichment_feedback ("subjectType", "subjectId");

-- Enrichment columns on contacts.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "seniority" TEXT NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "fitScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "enrichedAt" TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "enrichmentStatus" TEXT NOT NULL DEFAULT '';

-- Enrichment columns on companies.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "industry" TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "subIndustry" TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "employeeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "revenueEstimate" TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "companySize" TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "companyType" TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "techStack" TEXT NOT NULL DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "fitScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "enrichedAt" TIMESTAMP;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "enrichmentStatus" TEXT NOT NULL DEFAULT '';

-- Workspace config: B2B/B2C hint + Clay connection + auto-enrich toggle.
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "companyModel" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "clayWebhookUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "clayAuthToken" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "clayCallbackSecret" TEXT NOT NULL DEFAULT '';
ALTER TABLE workspace_settings ADD COLUMN IF NOT EXISTS "autoEnrichOnIntake" BOOLEAN NOT NULL DEFAULT false;
