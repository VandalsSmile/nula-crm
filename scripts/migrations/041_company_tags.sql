-- Tagging for companies, mirroring contact_tags. Tags describe facts about a
-- company (industry focus, partner, do-not-contact, etc.). Idempotent.
CREATE TABLE IF NOT EXISTS company_tags (
  "companyId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "addedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "addedBy" TEXT NOT NULL DEFAULT '',
  PRIMARY KEY ("companyId", "tagId")
);

CREATE INDEX IF NOT EXISTS company_tags_tag_idx ON company_tags ("tagId");
