-- Distinguish a one-time email campaign ("broadcast") from a multi-step drip
-- ("sequence"). Existing rows default to broadcast; multi-step ones are marked
-- as sequences below. Idempotent.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'broadcast';

-- Backfill: any campaign whose sequence has more than one step is a sequence.
UPDATE campaigns
SET "kind" = 'sequence'
WHERE jsonb_typeof(sequence) = 'array' AND jsonb_array_length(sequence) > 1;
