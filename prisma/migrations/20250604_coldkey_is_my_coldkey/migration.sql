-- Run: npx prisma db push  (or apply manually against your Postgres)
-- Adds is_my_coldkey flag and drops per-user nickname uniqueness.

ALTER TABLE coldkey_nicknames
  ADD COLUMN IF NOT EXISTS is_my_coldkey BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS coldkey_nicknames_user_nickname_unique;

CREATE INDEX IF NOT EXISTS coldkey_nicknames_user_id_is_my_coldkey_idx
  ON coldkey_nicknames (user_id, is_my_coldkey);
