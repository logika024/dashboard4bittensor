-- Run after pulling: npx prisma db push
CREATE TABLE IF NOT EXISTS user_saved_subnets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  netuid INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_saved_subnets_user_netuid_unique UNIQUE (user_id, netuid)
);

CREATE INDEX IF NOT EXISTS user_saved_subnets_user_id_idx ON user_saved_subnets (user_id);
