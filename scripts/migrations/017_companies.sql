-- Companies (organizations) that contacts can belong to. Locations/franchises
-- are a later phase. Idempotent.
CREATE TABLE IF NOT EXISTS companies (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  name text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

-- Link a contact to a company record (empty string = not linked). The free-text
-- contacts.companyName remains as a denormalized label / fallback.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "companyId" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS contacts_company_id_idx ON contacts ("companyId");
CREATE INDEX IF NOT EXISTS companies_user_id_idx ON companies ("userId");
