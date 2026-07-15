-- Per-contact company name. A full company/location hierarchy is a later phase;
-- this is a simple text field so contacts can be labelled and searched by company.
-- Idempotent.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "companyName" TEXT NOT NULL DEFAULT '';
