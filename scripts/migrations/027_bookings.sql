-- Bookings / appointments, typically created from a scheduling integration
-- (Calendly, Cal.com, etc.) via webhook, linked to a CRM contact. Idempotent.
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT 'Appointment',
  status TEXT NOT NULL DEFAULT 'scheduled',
  "startAt" TIMESTAMP,
  "endAt" TIMESTAMP,
  location TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  "attendeeName" TEXT NOT NULL DEFAULT '',
  "attendeeEmail" TEXT NOT NULL DEFAULT '',
  "attendeePhone" TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  "externalId" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings ("userId");
CREATE INDEX IF NOT EXISTS bookings_start_idx ON bookings ("startAt");
CREATE INDEX IF NOT EXISTS bookings_contact_idx ON bookings ("contactId");
-- De-dupe repeated webhook deliveries for the same external event per workspace.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_external_uniq
  ON bookings ("userId", "externalId")
  WHERE "externalId" <> '';
