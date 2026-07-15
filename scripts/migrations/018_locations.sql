-- Locations / franchises belonging to a company. Contacts can optionally be
-- attached to a specific location. Idempotent.
CREATE TABLE IF NOT EXISTS locations (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  "companyId" text NOT NULL,
  name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  "createdAt" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "locationId" TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS locations_company_id_idx ON locations ("companyId");
CREATE INDEX IF NOT EXISTS locations_user_id_idx ON locations ("userId");
CREATE INDEX IF NOT EXISTS contacts_location_id_idx ON contacts ("locationId");
