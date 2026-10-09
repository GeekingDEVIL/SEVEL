-- Character System: domains, challenges, rivalries, cosmetics, history
-- Migration 039

-- Domain scores (computed, cached)
CREATE TABLE IF NOT EXISTS user_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  force_score NUMERIC(5,2) DEFAULT 0,
  form_score NUMERIC(5,2) DEFAULT 0,
  flow_score NUMERIC(5,2) DEFAULT 0,
  fight_score NUMERIC(5,2) DEFAULT 0,
  function_score NUMERIC(5,2) DEFAULT 0,
  fortitude_score NUMERIC(5,2) DEFAULT 0,
  archetype TEXT,
  specialization TEXT,
  computed_at TIMESTAMPTZ DEFAULT now(),
  sex TEXT DEFAULT 'male',
  UNIQUE(user_id, sex)
);

-- Domain score history (for ghost overlay / trends)
CREATE TABLE IF NOT EXISTS domain_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  force_score NUMERIC(5,2) DEFAULT 0,
  form_score NUMERIC(5,2) DEFAULT 0,
  flow_score NUMERIC(5,2) DEFAULT 0,
  fight_score NUMERIC(5,2) DEFAULT 0,
  function_score NUMERIC(5,2) DEFAULT 0,
  fortitude_score NUMERIC(5,2) DEFAULT 0,
  snapshot_date DATE NOT NULL,
  sex TEXT DEFAULT 'male',
  UNIQUE(user_id, snapshot_date, sex)
);

-- XP transaction log (audit trail)
CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id UUID,
  description TEXT,
  sex TEXT DEFAULT 'male',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Challenges (weekly + monthly)
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  metric TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 200,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User challenge progress
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  current_value NUMERIC DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN DEFAULT false,
  sex TEXT DEFAULT 'male',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, challenge_id, sex)
);

-- Rivalries
CREATE TABLE IF NOT EXISTS rivalries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  score_a INTEGER DEFAULT 0,
  score_b INTEGER DEFAULT 0,
  outcome_a TEXT,
  outcome_b TEXT,
  finalized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cosmetics / loot catalog
CREATE TABLE IF NOT EXISTS cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  asset_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User's owned cosmetics
CREATE TABLE IF NOT EXISTS user_cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cosmetic_id UUID NOT NULL REFERENCES cosmetics(id) ON DELETE CASCADE,
  equipped BOOLEAN DEFAULT false,
  source TEXT NOT NULL DEFAULT 'drop',
  acquired_at TIMESTAMPTZ DEFAULT now(),
  sex TEXT DEFAULT 'male',
  UNIQUE(user_id, cosmetic_id, sex)
);

-- History / journal events
CREATE TABLE IF NOT EXISTS user_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  sex TEXT DEFAULT 'male',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Upgrade user_stats with reforge + forge shards
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS reforge_count INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS forge_shards INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_lifetime_xp BIGINT DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_rivalries_users_a ON rivalries(user_a, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_rivalries_users_b ON rivalries(user_b, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_user_history_user ON user_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_history_type ON user_history(user_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_snapshots_user ON domain_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_domains_user ON user_domains(user_id);

-- RLS policies
ALTER TABLE user_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE rivalries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_domains_own" ON user_domains FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "domain_snapshots_own" ON domain_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "xp_events_own" ON xp_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "challenges_read" ON challenges FOR SELECT USING (true);
CREATE POLICY "user_challenges_own" ON user_challenges FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "rivalries_own" ON rivalries FOR ALL USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "cosmetics_read" ON cosmetics FOR SELECT USING (true);
CREATE POLICY "user_cosmetics_own" ON user_cosmetics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_history_own" ON user_history FOR ALL USING (auth.uid() = user_id);
