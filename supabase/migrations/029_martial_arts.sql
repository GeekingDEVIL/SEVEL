-- ═══════════════════════════════════════════════════════════════
-- Martial Arts Module — tables, indexes, RLS
-- Spec: specs/MARTIAL_ARTS_SPEC.md
-- ═══════════════════════════════════════════════════════════════

-- Technique library (seeded from curated data per discipline)
CREATE TABLE IF NOT EXISTS ma_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'beginner',
  belt_level TEXT,
  key_points TEXT[],
  common_mistakes TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ma_techniques_discipline ON ma_techniques(discipline);

-- Forms / Kata library
CREATE TABLE IF NOT EXISTS ma_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  belt_level TEXT,
  move_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Master session table
CREATE TABLE IF NOT EXISTS ma_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  session_type TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_rounds INTEGER DEFAULT 0,
  intensity TEXT DEFAULT 'medium',
  energy_rating INTEGER,
  notes TEXT,
  xp_earned INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ma_sessions_user_date ON ma_sessions(user_id, date DESC);
CREATE INDEX idx_ma_sessions_user_discipline ON ma_sessions(user_id, discipline);

-- Individual rounds within a session
CREATE TABLE IF NOT EXISTS ma_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ma_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_index INTEGER NOT NULL,
  round_type TEXT NOT NULL,
  duration_seconds INTEGER,
  rest_seconds INTEGER,
  intensity TEXT,
  partner_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ma_rounds_session ON ma_rounds(session_id);

-- Techniques practiced in a round
CREATE TABLE IF NOT EXISTS ma_round_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES ma_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES ma_techniques(id),
  reps INTEGER,
  duration_seconds INTEGER,
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Form/Kata logs per session
CREATE TABLE IF NOT EXISTS ma_form_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ma_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES ma_forms(id),
  repetitions INTEGER DEFAULT 1,
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session templates (user-created reusable session structures)
CREATE TABLE IF NOT EXISTS ma_session_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  name TEXT NOT NULL,
  session_type TEXT NOT NULL,
  round_count INTEGER DEFAULT 5,
  round_duration_seconds INTEGER DEFAULT 180,
  rest_duration_seconds INTEGER DEFAULT 60,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Technique mastery per user (6-level system)
CREATE TABLE IF NOT EXISTS ma_technique_mastery (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES ma_techniques(id),
  times_practiced INTEGER NOT NULL DEFAULT 0,
  avg_quality NUMERIC DEFAULT 0,
  mastery_level INTEGER NOT NULL DEFAULT 0,
  form_check_passed BOOLEAN DEFAULT false,
  used_in_sparring BOOLEAN DEFAULT false,
  video_ref TEXT,
  last_practiced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, technique_id)
);

-- Per-discipline hour + progress tracking (10K-hour journey)
CREATE TABLE IF NOT EXISTS ma_discipline_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_techniques_learned INTEGER DEFAULT 0,
  total_sparring_rounds INTEGER DEFAULT 0,
  belt_rank TEXT,
  belt_earned_at TIMESTAMPTZ,
  gym_name TEXT,
  instructor TEXT,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_session_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, discipline)
);

-- User's custom combos
CREATE TABLE IF NOT EXISTS ma_custom_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  name TEXT NOT NULL,
  technique_ids UUID[] NOT NULL,
  difficulty TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aggregated stats across all disciplines
CREATE TABLE IF NOT EXISTS ma_user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_sessions INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 0,
  total_mat_time_seconds INTEGER DEFAULT 0,
  total_sparring_sessions INTEGER DEFAULT 0,
  techniques_drilled INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  last_session_date DATE,
  style_dna TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Schedule integration: add session_type to existing tables
ALTER TABLE recurring_plans
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'gym',
  ADD COLUMN IF NOT EXISTS ma_discipline TEXT,
  ADD COLUMN IF NOT EXISTS ma_session_template_id UUID REFERENCES ma_session_templates(id) ON DELETE SET NULL;

ALTER TABLE scheduled_days
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'gym',
  ADD COLUMN IF NOT EXISTS ma_discipline TEXT,
  ADD COLUMN IF NOT EXISTS ma_session_template_id UUID REFERENCES ma_session_templates(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════
-- RLS policies
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'ma_sessions',
      'ma_rounds',
      'ma_round_techniques',
      'ma_form_logs',
      'ma_session_templates',
      'ma_custom_combos',
      'ma_user_stats'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (user_id = auth.uid())',
      t || '_select', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (user_id = auth.uid())',
      t || '_insert', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (user_id = auth.uid())',
      t || '_update', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING (user_id = auth.uid())',
      t || '_delete', t
    );
  END LOOP;
END $$;

-- Composite PK tables need separate RLS
ALTER TABLE ma_technique_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY ma_technique_mastery_select ON ma_technique_mastery FOR SELECT USING (user_id = auth.uid());
CREATE POLICY ma_technique_mastery_insert ON ma_technique_mastery FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY ma_technique_mastery_update ON ma_technique_mastery FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY ma_technique_mastery_delete ON ma_technique_mastery FOR DELETE USING (user_id = auth.uid());

ALTER TABLE ma_discipline_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY ma_discipline_progress_select ON ma_discipline_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY ma_discipline_progress_insert ON ma_discipline_progress FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY ma_discipline_progress_update ON ma_discipline_progress FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY ma_discipline_progress_delete ON ma_discipline_progress FOR DELETE USING (user_id = auth.uid());

-- Public read for technique + form libraries (seeded data, no user_id)
ALTER TABLE ma_techniques ENABLE ROW LEVEL SECURITY;
CREATE POLICY ma_techniques_read ON ma_techniques FOR SELECT USING (true);

ALTER TABLE ma_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY ma_forms_read ON ma_forms FOR SELECT USING (true);
