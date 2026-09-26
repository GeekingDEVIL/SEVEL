-- Tier 1.1: Add tracking_mode to exercises for unified session engine
-- Standardizes how each exercise is tracked (what input fields to show)
-- Keeps existing tracking_method column as-is (used by ExerciseDatabaseModal display)

-- Create enum-like check constraint for tracking_mode values
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS tracking_mode TEXT NOT NULL DEFAULT 'weight_reps'
  CHECK (tracking_mode IN ('weight_reps', 'rounds_duration', 'duration_only', 'distance_time'));

-- Set tracking_mode for existing exercises based on their category/body_segment
-- Cardio exercises (body_segment = 'Cardio') → distance_time
UPDATE exercises SET tracking_mode = 'distance_time'
  WHERE body_segment = 'Cardio' AND tracking_mode = 'weight_reps';

-- All other existing exercises stay as weight_reps (the default) which is correct
-- for Compound, Isolation, Isometric categories
