-- Add ma_session_type directly to recurring_plans and scheduled_days
-- so users can schedule MA sessions without creating templates first
ALTER TABLE recurring_plans
  ADD COLUMN IF NOT EXISTS ma_session_type TEXT;

ALTER TABLE scheduled_days
  ADD COLUMN IF NOT EXISTS ma_session_type TEXT;
