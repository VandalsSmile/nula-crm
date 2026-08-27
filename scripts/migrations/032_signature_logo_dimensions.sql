-- Email signature logo dimensions. Idempotent.
-- Stores the intended 1× display width/height (px) of the signature logo so the
-- sent email can emit explicit width/height attributes. This keeps the logo crisp
-- on HiDPI/retina clients (the uploaded logo is normalized to 2× the display box)
-- and correctly sized in Outlook, which ignores max-width/max-height CSS.
ALTER TABLE email_signatures ADD COLUMN IF NOT EXISTS "logoWidth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_signatures ADD COLUMN IF NOT EXISTS "logoHeight" INTEGER NOT NULL DEFAULT 0;
