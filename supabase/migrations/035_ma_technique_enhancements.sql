-- 035: Add video/animation fields to ma_techniques, form_check_score to ma_user_lessons

ALTER TABLE ma_techniques
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS animation_key TEXT;

ALTER TABLE ma_user_lessons
  ADD COLUMN IF NOT EXISTS form_check_score SMALLINT;

COMMENT ON COLUMN ma_techniques.video_url IS 'URL to technique video (future backfill)';
COMMENT ON COLUMN ma_techniques.animation_key IS 'Key for animated SVG diagram component';
COMMENT ON COLUMN ma_user_lessons.form_check_score IS 'Form Check camera score 0-100 (optional)';
