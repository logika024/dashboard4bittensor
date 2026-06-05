-- Adds portfolio tracking flag for my coldkeys.

ALTER TABLE coldkey_nicknames
  ADD COLUMN IF NOT EXISTS tracked BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS coldkey_nicknames_user_id_tracked_idx
  ON coldkey_nicknames (user_id, tracked);

-- Legacy my coldkeys were implicitly tracked in the old localStorage flow.
UPDATE coldkey_nicknames
SET tracked = true
WHERE is_my_coldkey = true AND tracked = false;
