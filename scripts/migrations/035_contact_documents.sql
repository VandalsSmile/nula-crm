-- Files (PDF, DOCX, etc.) attached to a contact record. Idempotent.
-- Stored in Vercel Blob; this table keeps the metadata + blob URL.
CREATE TABLE IF NOT EXISTS contact_documents (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,          -- workspace id
  "contactId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL DEFAULT '',
  "mimeType" TEXT NOT NULL DEFAULT '',
  "sizeBytes" INTEGER NOT NULL DEFAULT 0,
  url TEXT NOT NULL DEFAULT '',     -- public Blob URL
  pathname TEXT NOT NULL DEFAULT '', -- Blob pathname (for deletion)
  "uploadedBy" TEXT NOT NULL DEFAULT '', -- individual user id
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_documents_contact_idx
  ON contact_documents ("userId", "contactId", "createdAt");
