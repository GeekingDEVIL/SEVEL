-- Tier 1.2: Add discipline column to exercises for unified category system
-- discipline = training domain (strength, boxing, bjj, etc.)
-- category = movement type (Compound, Isolation, etc.) — stays as-is

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS discipline TEXT NOT NULL DEFAULT 'strength'
  CHECK (discipline IN (
    'strength', 'boxing', 'muay_thai', 'kickboxing',
    'bjj', 'wrestling', 'judo', 'mma',
    'karate', 'taekwondo', 'kung_fu',
    'krav_maga', 'capoeira', 'aikido',
    'calisthenics', 'cardio', 'mobility', 'other'
  ));

-- Existing cardio exercises → discipline 'cardio'
UPDATE exercises SET discipline = 'cardio'
  WHERE body_segment = 'Cardio' AND discipline = 'strength';

-- Seed MA exercises into the main exercises table
-- These use tracking_mode 'rounds_duration' (round-based training)
-- category = 'Isometric' for technique drills (sustained form work)

-- Boxing
INSERT INTO exercises (name, primary_muscle, equipment, category, body_segment, discipline, tracking_mode, difficulty, instructions) VALUES
  ('Jab', 'Shoulders', 'Bodyweight', 'Cardio', 'Full Body', 'boxing', 'rounds_duration', 'Beginner', 'Lead hand straight punch. Snap it back fast, chin tucked.'),
  ('Cross', 'Shoulders', 'Bodyweight', 'Cardio', 'Full Body', 'boxing', 'rounds_duration', 'Beginner', 'Rear hand power punch with full hip rotation.'),
  ('Lead Hook', 'Shoulders', 'Bodyweight', 'Cardio', 'Full Body', 'boxing', 'rounds_duration', 'Beginner', 'Circular punch with lead hand. Elbow at 90°, power from core.'),
  ('Uppercut', 'Shoulders', 'Bodyweight', 'Cardio', 'Full Body', 'boxing', 'rounds_duration', 'Intermediate', 'Rising punch targeting the chin. Drive upward from legs.'),
  ('1-2-3 Combo (Jab-Cross-Hook)', 'Shoulders', 'Bodyweight', 'Cardio', 'Full Body', 'boxing', 'rounds_duration', 'Beginner', 'Classic three-punch combination. Flow from cross into hook.'),
  ('Slip & Roll', 'Core', 'Bodyweight', 'Cardio', 'Full Body', 'boxing', 'rounds_duration', 'Beginner', 'Head movement defense. Bend at knees, eyes on opponent.'),
  ('Heavy Bag Rounds', 'Shoulders', 'Heavy Bag', 'Cardio', 'Full Body', 'boxing', 'rounds_duration', 'Beginner', 'Free-form bag work. Mix combinations, focus on technique and power.'),
  ('Shadow Boxing', 'Shoulders', 'Bodyweight', 'Cardio', 'Full Body', 'boxing', 'rounds_duration', 'Beginner', 'Visualize opponent, practice footwork and combinations.'),
  ('Boxing Footwork Drills', 'Calves', 'Bodyweight', 'Cardio', 'Legs', 'boxing', 'rounds_duration', 'Beginner', 'Push step, pivot, angle changes. Stay on balls of feet.'),
  ('Pad Work', 'Shoulders', 'Focus Mitts', 'Cardio', 'Full Body', 'boxing', 'rounds_duration', 'Intermediate', 'Partner pad work. Accuracy, timing, and combination flow.')
ON CONFLICT DO NOTHING;

-- Muay Thai
INSERT INTO exercises (name, primary_muscle, equipment, category, body_segment, discipline, tracking_mode, difficulty, instructions) VALUES
  ('Teep (Push Kick)', 'Quads', 'Bodyweight', 'Cardio', 'Full Body', 'muay_thai', 'rounds_duration', 'Beginner', 'Front push kick for distance control. Chamber knee, push with hip.'),
  ('Roundhouse Kick', 'Quads', 'Bodyweight', 'Cardio', 'Full Body', 'muay_thai', 'rounds_duration', 'Beginner', 'Full hip rotation through target. Turn supporting foot, swing arm.'),
  ('Low Kick', 'Quads', 'Bodyweight', 'Cardio', 'Full Body', 'muay_thai', 'rounds_duration', 'Beginner', 'Roundhouse targeting the thigh. Step at 45° angle.'),
  ('Horizontal Elbow', 'Shoulders', 'Bodyweight', 'Cardio', 'Full Body', 'muay_thai', 'rounds_duration', 'Intermediate', 'Close-range slashing elbow. Step into range, lead with shoulder.'),
  ('Straight Knee', 'Quads', 'Bodyweight', 'Cardio', 'Full Body', 'muay_thai', 'rounds_duration', 'Beginner', 'Driving knee strike. Pull opponent in, drive hip forward.'),
  ('Clinch Work', 'Shoulders', 'Bodyweight', 'Cardio', 'Full Body', 'muay_thai', 'rounds_duration', 'Intermediate', 'Double collar tie. Hands behind head, elbows tight, break posture.'),
  ('Shin Check', 'Calves', 'Bodyweight', 'Cardio', 'Full Body', 'muay_thai', 'rounds_duration', 'Beginner', 'Lift shin to block kicks. Knee high, turn shin outward.'),
  ('Muay Thai Bag Work', 'Shoulders', 'Heavy Bag', 'Cardio', 'Full Body', 'muay_thai', 'rounds_duration', 'Beginner', 'Full-weapon bag work — punches, kicks, elbows, knees.')
ON CONFLICT DO NOTHING;

-- BJJ
INSERT INTO exercises (name, primary_muscle, equipment, category, body_segment, discipline, tracking_mode, difficulty, instructions) VALUES
  ('Guard Work (Closed Guard)', 'Core', 'Bodyweight', 'Isometric', 'Full Body', 'bjj', 'rounds_duration', 'Beginner', 'Bottom position with legs wrapped. Break posture, control grips.'),
  ('Armbar Drills', 'Core', 'Bodyweight', 'Isometric', 'Full Body', 'bjj', 'rounds_duration', 'Beginner', 'Practice armbar from guard. Hips high, squeeze knees.'),
  ('Triangle Choke Drills', 'Core', 'Bodyweight', 'Isometric', 'Full Body', 'bjj', 'rounds_duration', 'Intermediate', 'Leg choke from guard. Angle off, pull head down.'),
  ('Hip Escape (Shrimp)', 'Core', 'Bodyweight', 'Cardio', 'Full Body', 'bjj', 'rounds_duration', 'Beginner', 'Fundamental escape movement. Bridge, turn to side, push with foot.'),
  ('Scissor Sweep', 'Core', 'Bodyweight', 'Isometric', 'Full Body', 'bjj', 'rounds_duration', 'Beginner', 'Sweep from closed guard. Shin across stomach, scissor legs.'),
  ('Rear Naked Choke Drills', 'Shoulders', 'Bodyweight', 'Isometric', 'Full Body', 'bjj', 'rounds_duration', 'Beginner', 'Back control choke. Seatbelt first, choking arm under chin.'),
  ('Guard Passing Drills', 'Core', 'Bodyweight', 'Isometric', 'Full Body', 'bjj', 'rounds_duration', 'Intermediate', 'Knee slice, stack pass, toreando. Heavy pressure, clear legs.'),
  ('Positional Sparring', 'Core', 'Bodyweight', 'Cardio', 'Full Body', 'bjj', 'rounds_duration', 'Intermediate', 'Start from specific position. Focus on technique, not strength.'),
  ('Flow Rolling', 'Core', 'Bodyweight', 'Cardio', 'Full Body', 'bjj', 'rounds_duration', 'Intermediate', 'Light, technical rolling. Move through positions smoothly.')
ON CONFLICT DO NOTHING;

-- Karate / TKD
INSERT INTO exercises (name, primary_muscle, equipment, category, body_segment, discipline, tracking_mode, difficulty, instructions) VALUES
  ('Kata Practice', 'Core', 'Bodyweight', 'Isometric', 'Full Body', 'karate', 'rounds_duration', 'Beginner', 'Formal sequence of techniques. Strong stances, precise movements.'),
  ('Front Kick (Mae Geri)', 'Quads', 'Bodyweight', 'Cardio', 'Full Body', 'karate', 'rounds_duration', 'Beginner', 'Snapping front kick. Chamber high, snap with ball of foot.'),
  ('Reverse Punch (Gyaku-Zuki)', 'Shoulders', 'Bodyweight', 'Cardio', 'Full Body', 'karate', 'rounds_duration', 'Beginner', 'Rear hand punch. Strong hip rotation, snap punch back.'),
  ('TKD Roundhouse (Dollyo Chagi)', 'Quads', 'Bodyweight', 'Cardio', 'Full Body', 'taekwondo', 'rounds_duration', 'Beginner', 'Turning kick with instep. Full hip turnover, quick return.'),
  ('Side Kick (Yop Chagi)', 'Quads', 'Bodyweight', 'Cardio', 'Full Body', 'taekwondo', 'rounds_duration', 'Intermediate', 'Thrusting side kick with blade of foot. Chamber across body.'),
  ('Back Kick (Dwit Chagi)', 'Glutes', 'Bodyweight', 'Cardio', 'Full Body', 'taekwondo', 'rounds_duration', 'Intermediate', 'Spinning back kick. Look over shoulder first, thrust with heel.')
ON CONFLICT DO NOTHING;

-- Calisthenics (bodyweight strength that isn't already in the gym exercises)
INSERT INTO exercises (name, primary_muscle, equipment, category, body_segment, discipline, tracking_mode, difficulty, instructions) VALUES
  ('Muscle Up', 'Lats', 'Pull-Up Bar', 'Compound', 'Back', 'calisthenics', 'weight_reps', 'Advanced', 'Explosive pull-up transitioning to dip position above the bar.'),
  ('Handstand Push-Up', 'Shoulders', 'Bodyweight', 'Compound', 'Shoulders', 'calisthenics', 'weight_reps', 'Advanced', 'Inverted press from handstand. Wall-assisted or freestanding.'),
  ('L-Sit', 'Abs', 'Bodyweight', 'Isometric', 'Core', 'calisthenics', 'duration_only', 'Intermediate', 'Legs held parallel to floor in seated position. Straight arms.'),
  ('Front Lever Hold', 'Lats', 'Pull-Up Bar', 'Isometric', 'Back', 'calisthenics', 'duration_only', 'Advanced', 'Horizontal body hold under the bar. Full body tension.'),
  ('Planche Lean', 'Shoulders', 'Bodyweight', 'Isometric', 'Shoulders', 'calisthenics', 'duration_only', 'Advanced', 'Forward-leaning plank. Shift weight past wrists progressively.'),
  ('Pistol Squat', 'Quads', 'Bodyweight', 'Compound', 'Legs', 'calisthenics', 'weight_reps', 'Intermediate', 'Single-leg squat. Full depth, non-working leg extended forward.')
ON CONFLICT DO NOTHING;

-- Mobility
INSERT INTO exercises (name, primary_muscle, equipment, category, body_segment, discipline, tracking_mode, difficulty, instructions) VALUES
  ('Hip 90/90 Stretch', 'Glutes', 'Bodyweight', 'Isometric', 'Legs', 'mobility', 'duration_only', 'Beginner', 'Seated with both legs at 90° angles. Rotate between internal and external.'),
  ('Thoracic Spine Rotation', 'Core', 'Bodyweight', 'Isometric', 'Core', 'mobility', 'duration_only', 'Beginner', 'Side-lying rotation opening the chest. Controlled breath.'),
  ('Shoulder Dislocates', 'Shoulders', 'Resistance Band', 'Isometric', 'Shoulders', 'mobility', 'weight_reps', 'Beginner', 'Wide-grip band pass-throughs overhead and behind. Gradual narrowing.'),
  ('Couch Stretch', 'Quads', 'Bodyweight', 'Isometric', 'Legs', 'mobility', 'duration_only', 'Beginner', 'Rear foot on wall/couch. Deep hip flexor and quad stretch.'),
  ('World''s Greatest Stretch', 'Core', 'Bodyweight', 'Isometric', 'Full Body', 'mobility', 'weight_reps', 'Beginner', 'Lunge with rotation and reach. Hits hip flexors, hamstrings, thoracic spine.')
ON CONFLICT DO NOTHING;
