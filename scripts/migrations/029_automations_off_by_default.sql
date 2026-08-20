-- Automations are OFF by default for all accounts. Idempotent.
-- Flip the column default and disable every existing automation so nothing
-- auto-runs until a human explicitly opts in from the Automations page.
ALTER TABLE automations ALTER COLUMN enabled SET DEFAULT false;
UPDATE automations SET enabled = false WHERE enabled = true;
