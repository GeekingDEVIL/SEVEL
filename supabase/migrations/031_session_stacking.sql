-- Allow multiple session types per weekday (gym + MA on same day)
-- Change unique constraint from (user_id, weekday, sex) to (user_id, weekday, sex, session_type)

ALTER TABLE recurring_plans DROP CONSTRAINT IF EXISTS recurring_plans_user_weekday_sex_key;
ALTER TABLE recurring_plans ADD CONSTRAINT recurring_plans_user_weekday_sex_type_key
  UNIQUE (user_id, weekday, sex, session_type);
