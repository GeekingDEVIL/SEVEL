-- ═══════════════════════════════════════════════════════════════
-- MA Learn Redesign — curriculum, lessons, practice logs
-- Spec: specs/MA_LEARN_REDESIGN.md
-- ═══════════════════════════════════════════════════════════════

-- Curriculum levels within a discipline
CREATE TABLE IF NOT EXISTS ma_curriculum_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline TEXT NOT NULL,
  level_key TEXT NOT NULL,
  level_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  belt_name TEXT,
  lesson_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(discipline, level_key)
);

ALTER TABLE ma_curriculum_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY ma_curriculum_levels_read ON ma_curriculum_levels FOR SELECT USING (true);

-- Individual lessons
CREATE TABLE IF NOT EXISTS ma_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID NOT NULL REFERENCES ma_curriculum_levels(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  lesson_order INTEGER NOT NULL,
  week INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  duration_min INTEGER DEFAULT 10,
  coaching_cues TEXT[],
  common_mistakes TEXT[],
  drill_name TEXT,
  drill_description TEXT,
  drill_duration_min INTEGER,
  drill_equipment TEXT DEFAULT 'none',
  self_check TEXT,
  prerequisites UUID[],
  UNIQUE(level_id, lesson_order)
);

ALTER TABLE ma_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY ma_lessons_read ON ma_lessons FOR SELECT USING (true);

-- Which techniques each lesson teaches
CREATE TABLE IF NOT EXISTS ma_lesson_techniques (
  lesson_id UUID NOT NULL REFERENCES ma_lessons(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES ma_techniques(id) ON DELETE CASCADE,
  focus TEXT DEFAULT 'primary',
  teaching_notes TEXT,
  PRIMARY KEY (lesson_id, technique_id)
);

ALTER TABLE ma_lesson_techniques ENABLE ROW LEVEL SECURITY;
CREATE POLICY ma_lesson_techniques_read ON ma_lesson_techniques FOR SELECT USING (true);

-- User progress through lessons
CREATE TABLE IF NOT EXISTS ma_user_lessons (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES ma_lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  self_rating INTEGER CHECK (self_rating BETWEEN 1 AND 5),
  notes TEXT,
  PRIMARY KEY (user_id, lesson_id)
);

ALTER TABLE ma_user_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY ma_user_lessons_select ON ma_user_lessons FOR SELECT USING (user_id = auth.uid());
CREATE POLICY ma_user_lessons_insert ON ma_user_lessons FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY ma_user_lessons_update ON ma_user_lessons FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY ma_user_lessons_delete ON ma_user_lessons FOR DELETE USING (user_id = auth.uid());

-- Practice session logs (lightweight)
CREATE TABLE IF NOT EXISTS ma_practice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  practice_type TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  intensity TEXT DEFAULT 'moderate',
  technique_ids UUID[],
  self_rating INTEGER CHECK (self_rating BETWEEN 1 AND 5),
  notes TEXT,
  xp_earned INTEGER DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ma_practice_logs_user_date ON ma_practice_logs(user_id, date DESC);

ALTER TABLE ma_practice_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ma_practice_logs_select ON ma_practice_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY ma_practice_logs_insert ON ma_practice_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY ma_practice_logs_update ON ma_practice_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY ma_practice_logs_delete ON ma_practice_logs FOR DELETE USING (user_id = auth.uid());

-- User-saved combos
CREATE TABLE IF NOT EXISTS ma_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  name TEXT NOT NULL,
  technique_ids UUID[] NOT NULL,
  notes TEXT,
  is_preset BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ma_combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ma_combos_select ON ma_combos FOR SELECT USING (user_id = auth.uid() OR is_preset = true);
CREATE POLICY ma_combos_insert ON ma_combos FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY ma_combos_update ON ma_combos FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY ma_combos_delete ON ma_combos FOR DELETE USING (user_id = auth.uid());

-- Expand ma_techniques with curriculum fields
ALTER TABLE ma_techniques
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS stance TEXT DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS steps TEXT[],
  ADD COLUMN IF NOT EXISTS coaching_cues TEXT[],
  ADD COLUMN IF NOT EXISTS muscles_used TEXT[],
  ADD COLUMN IF NOT EXISTS equipment TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS related_technique_ids UUID[];
