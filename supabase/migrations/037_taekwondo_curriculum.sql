-- Taekwondo (WT) curriculum seed — spec item 65

DO $$
DECLARE
  -- ═══════════════════════════════════════════════════════════════
  -- Level IDs
  -- ═══════════════════════════════════════════════════════════════
  lvl_white  UUID;
  lvl_yellow UUID;
  lvl_green  UUID;
  lvl_blue   UUID;

  -- ═══════════════════════════════════════════════════════════════
  -- Technique IDs — Stances
  -- ═══════════════════════════════════════════════════════════════
  t_ap_seogi   UUID;
  t_ap_kubi    UUID;
  t_dwit_kubi  UUID;

  -- ═══════════════════════════════════════════════════════════════
  -- Technique IDs — Strikes & Blocks (White)
  -- ═══════════════════════════════════════════════════════════════
  t_jireugi     UUID;
  t_arae_makki  UUID;
  t_momtong_makki UUID;
  t_eolgul_makki UUID;

  -- ═══════════════════════════════════════════════════════════════
  -- Technique IDs — Kicks (White)
  -- ═══════════════════════════════════════════════════════════════
  t_ap_chagi     UUID;
  t_dollyo_chagi UUID;

  -- ═══════════════════════════════════════════════════════════════
  -- Technique IDs — Forms (White)
  -- ═══════════════════════════════════════════════════════════════
  t_tg_il UUID;

  -- ═══════════════════════════════════════════════════════════════
  -- Technique IDs — Yellow Belt
  -- ═══════════════════════════════════════════════════════════════
  t_yeop_chagi    UUID;
  t_dwit_chagi    UUID;
  t_naeryo_chagi  UUID;
  t_sonnal_makki  UUID;
  t_deung_jumeok  UUID;
  t_tg_yi         UUID;
  t_tg_sam        UUID;

  -- ═══════════════════════════════════════════════════════════════
  -- Technique IDs — Green Belt
  -- ═══════════════════════════════════════════════════════════════
  t_bandal_chagi       UUID;
  t_dwi_huryeo_chagi   UUID;
  t_biteureo_chagi     UUID;
  t_switch_kick        UUID;
  t_kick_combo         UUID;
  t_tg_sa              UUID;
  t_tg_oh              UUID;

  -- ═══════════════════════════════════════════════════════════════
  -- Technique IDs — Blue Belt
  -- ═══════════════════════════════════════════════════════════════
  t_twi_ap_chagi       UUID;
  t_twi_dollyo_chagi   UUID;
  t_540_kick           UUID;
  t_sparring_strategy  UUID;
  t_tg_yuk             UUID;
  t_tg_chil            UUID;

  -- ═══════════════════════════════════════════════════════════════
  -- Lesson IDs
  -- ═══════════════════════════════════════════════════════════════
  -- White (9 lessons)
  lw1 UUID; lw2 UUID; lw3 UUID; lw4 UUID; lw5 UUID;
  lw6 UUID; lw7 UUID; lw8 UUID; lw9 UUID;
  -- Yellow (9 lessons)
  ly1 UUID; ly2 UUID; ly3 UUID; ly4 UUID; ly5 UUID;
  ly6 UUID; ly7 UUID; ly8 UUID; ly9 UUID;
  -- Green (9 lessons)
  lg1 UUID; lg2 UUID; lg3 UUID; lg4 UUID; lg5 UUID;
  lg6 UUID; lg7 UUID; lg8 UUID; lg9 UUID;
  -- Blue (8 lessons)
  lb1 UUID; lb2 UUID; lb3 UUID; lb4 UUID;
  lb5 UUID; lb6 UUID; lb7 UUID; lb8 UUID;

BEGIN

-- ═══════════════════════════════════════════════════════════════
-- 1. CURRICULUM LEVELS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ma_curriculum_levels (id, discipline, level_key, level_order, title, subtitle, belt_name, lesson_count)
VALUES
  (gen_random_uuid(), 'taekwondo', 'tkd_white',  1, 'White Belt Foundations', '10th–9th Kup: Stances, basic blocks, front & roundhouse kick, Taegeuk Il Jang', 'White Belt', 9),
  (gen_random_uuid(), 'taekwondo', 'tkd_yellow', 2, 'Yellow Belt Development', '8th–7th Kup: Side, back & axe kicks, knife hand, Taegeuk Yi & Sam Jang', 'Yellow Belt', 9),
  (gen_random_uuid(), 'taekwondo', 'tkd_green',  3, 'Green Belt Advancement', '6th–5th Kup: Spinning & twist kicks, combinations, Taegeuk Sa & Oh Jang', 'Green Belt', 9),
  (gen_random_uuid(), 'taekwondo', 'tkd_blue',   4, 'Blue Belt Mastery', '4th–3rd Kup: Jumping kicks, sparring strategy, Taegeuk Yuk & Chil Jang', 'Blue Belt', 8)
RETURNING id INTO lvl_white;

-- Retrieve all level IDs
SELECT id INTO lvl_white  FROM ma_curriculum_levels WHERE discipline = 'taekwondo' AND level_key = 'tkd_white';
SELECT id INTO lvl_yellow FROM ma_curriculum_levels WHERE discipline = 'taekwondo' AND level_key = 'tkd_yellow';
SELECT id INTO lvl_green  FROM ma_curriculum_levels WHERE discipline = 'taekwondo' AND level_key = 'tkd_green';
SELECT id INTO lvl_blue   FROM ma_curriculum_levels WHERE discipline = 'taekwondo' AND level_key = 'tkd_blue';


-- ═══════════════════════════════════════════════════════════════
-- 2. TECHNIQUES
-- ═══════════════════════════════════════════════════════════════

-- ─── Stances ─────────────────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'stance', 'walking', 'Ap Seogi (Walking Stance)',
  'A natural walking-width stance used for basic movement and fundamentals. The feet are roughly shoulder-width apart, front foot pointing forward.',
  'beginner', 'White Belt',
  ARRAY['Feet shoulder-width apart', 'Front foot points directly forward', 'Weight evenly distributed', 'Knees slightly bent for mobility', 'Back straight, hips square to the front'],
  ARRAY['Feet too narrow — no stability', 'Locking the knees', 'Leaning the torso forward or backward', 'Back foot turned out too far'],
  ARRAY['Stand naturally with feet together', 'Step one foot forward about one shoulder-width', 'Point the front foot straight ahead', 'Turn the rear foot out slightly (about 30°)', 'Bend both knees slightly', 'Square your hips to face forward'],
  ARRAY['Think of railroad tracks — each foot on its own track', 'Soft knees, not stiff', 'Imagine a string pulling the crown of your head upward'],
  ARRAY['quadriceps', 'calves', 'core stabilizers', 'hip flexors'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_ap_seogi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'stance', 'forward', 'Ap Kubi (Front Stance)',
  'A long, deep stance with 70% weight on the front leg. The cornerstone offensive stance in Taekwondo poomsae and self-defense.',
  'beginner', 'White Belt',
  ARRAY['Front knee bent deeply — knee over ankle', 'Rear leg straight but not locked', '70-30 weight distribution front-to-back', 'Both feet flat on the floor', 'Hips face forward, torso upright'],
  ARRAY['Front knee collapsing inward', 'Rear heel lifting off the ground', 'Stance too short — loses power generation', 'Leaning forward over the front leg'],
  ARRAY['Start in ap seogi', 'Slide the front foot forward to 1.5 shoulder widths', 'Bend the front knee until it is over the toes', 'Straighten the rear leg, pressing the heel down', 'Square the hips to the front', 'Engage your core and stand tall'],
  ARRAY['Sink your weight — feel rooted like a tree', 'The front knee aims between big and second toe', 'Push the floor away with your rear foot'],
  ARRAY['quadriceps', 'glutes', 'hamstrings', 'calves', 'core'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_ap_kubi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'stance', 'back', 'Dwit Kubi (Back Stance)',
  'A defensive stance with 70% weight on the rear leg, allowing quick front-leg kicks without weight transfer. Essential for counter-attacking.',
  'beginner', 'White Belt',
  ARRAY['70% weight on the rear leg', 'Rear knee bent deeply, front knee slightly bent', 'Feet form an L-shape (90° angle)', 'Front foot points forward, rear foot perpendicular', 'Torso turned slightly to the side for a smaller target'],
  ARRAY['Weight too far forward — defeats the purpose', 'Front knee locking out', 'Feet on the same line — no lateral balance', 'Hips rotating too far sideways'],
  ARRAY['Stand with feet together', 'Step the front foot forward about one shoulder width', 'Turn the rear foot perpendicular (forming an L)', 'Sit your weight back onto the rear leg — 70%', 'Bend the rear knee deeply', 'Keep front knee softly bent, ready to kick', 'Turn the torso slightly (about 30° off front-facing)'],
  ARRAY['Imagine sitting on a bar stool with your back leg', 'Your front leg is loaded and ready to fire', 'L-shape with the feet — check by looking down'],
  ARRAY['quadriceps', 'glutes', 'calves', 'core', 'hip adductors'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_dwit_kubi;

-- ─── Strikes & Blocks (White) ────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'strike', 'punch', 'Jireugi (Punch)',
  'The standard TKD straight punch. Delivered from the hip with a twisting motion, it targets the solar plexus (momtong jireugi) by default.',
  'beginner', 'White Belt',
  ARRAY['Fist starts at the hip, palm facing up', 'Fist rotates 180° during extension — lands palm-down', 'Opposite hand retracts to the hip simultaneously', 'First two knuckles make contact', 'Elbow stays close to the body during the punch'],
  ARRAY['Flaring the elbow outward', 'Wrist bending on impact — risk of injury', 'Not retracting the opposite hand', 'Punching with the bottom three knuckles', 'Shrugging the shoulders — wastes energy'],
  ARRAY['Begin in ap kubi with both fists at the hips, palms up', 'Extend the punching arm forward, rotating the fist palm-down', 'Simultaneously pull the other fist back to the hip', 'Lock out the arm at full extension for a split second', 'Retract immediately to guard or to the hip'],
  ARRAY['Think of wringing a towel — that rotation is your power', 'Snap it like a whip, don''t push', 'Your pull-back hand generates as much force as the punch'],
  ARRAY['pectorals', 'anterior deltoids', 'triceps', 'core', 'lats'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_jireugi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'defense', 'low block', 'Arae Makki (Low Block)',
  'A downward sweeping block that deflects attacks to the lower body. The forearm sweeps from the opposite shoulder across the body and down.',
  'beginner', 'White Belt',
  ARRAY['Blocking arm sweeps from opposite shoulder to below the waist', 'Fist ends one fist-width above the front thigh', 'Arm slightly bent at the finish — not straight', 'Opposite hand pulls back to the hip', 'Core engaged, exhale sharply on execution'],
  ARRAY['Block ending too high — misses low attacks', 'Sweeping too far past the body center', 'Forgetting to pull the reaction hand back', 'Using only arm strength — no hip rotation'],
  ARRAY['Bring the blocking fist to the opposite ear, palm facing you', 'Pull the other arm straight out in front at shoulder height', 'Sweep the blocking arm diagonally downward across the body', 'Simultaneously pull the front arm back to the hip', 'Finish with the blocking fist one fist above the front thigh', 'Exhale sharply with a "ha" on contact'],
  ARRAY['It''s a diagonal slash, not a straight drop', 'Your whole body should rotate — not just the arm', 'Snap the block like cracking a whip at the end'],
  ARRAY['deltoids', 'biceps', 'core', 'obliques', 'forearm flexors'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_arae_makki;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'defense', 'middle block', 'Momtong Makki (Middle Block)',
  'An inward sweeping block defending the torso. The forearm moves from the hip to the center of the body at solar plexus height.',
  'beginner', 'White Belt',
  ARRAY['Blocking forearm ends vertical, fist at shoulder height', 'Elbow bent at approximately 90°', 'Forearm one fist-width in front of the chest', 'Opposite hand retracts sharply to the hip', 'Block uses hip rotation for power'],
  ARRAY['Forearm ending too high or too low', 'Elbow flaring out wide — weakens the block', 'Not rotating the hips', 'Blocking arm crossing too far past center'],
  ARRAY['Start with the blocking fist at the opposite hip, palm up', 'Extend the other arm forward at chest height', 'Sweep the blocking arm upward and inward across the body', 'Rotate the fist so the palm faces you at the finish', 'Pull the other hand to the hip simultaneously', 'Finish with the elbow at 90° and forearm vertical'],
  ARRAY['Elbow stays close — imagine holding a newspaper under your arm', 'Rotate from the waist, not just the arm', 'Lock the block in place for a beat before resetting'],
  ARRAY['deltoids', 'biceps', 'core', 'obliques', 'lats'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_momtong_makki;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'defense', 'high block', 'Eolgul Makki (High Block)',
  'An upward rising block that deflects attacks to the face and head. The forearm lifts to form a canopy above the forehead.',
  'beginner', 'White Belt',
  ARRAY['Forearm finishes one fist-width above the forehead', 'Arm angled slightly upward — not flat', 'Palm faces away from the face', 'Opposite hand retracts to the hip', 'Wrist remains straight and firm'],
  ARRAY['Arm too close to the head — block collapses on impact', 'Forearm flat — attacks slide into the head', 'Blocking with the wrist instead of the forearm meat', 'Closing the eyes during the block'],
  ARRAY['Bring the blocking fist across to the opposite hip, palm down', 'Extend the other arm upward in front of the face', 'Lift the blocking arm upward, rotating the forearm', 'Pass the arm in front of your face as it rises', 'Finish with the forearm one fist above the forehead, angled up', 'Pull the opposite hand to the hip'],
  ARRAY['You are building a roof over your head', 'The block lifts AND pushes forward — don''t just raise it', 'Think of a windshield wiper going upward'],
  ARRAY['deltoids', 'trapezius', 'triceps', 'core', 'forearm extensors'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_eolgul_makki;

-- ─── Kicks (White) ───────────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'linear', 'Ap Chagi (Front Kick)',
  'The bread-and-butter TKD kick. A snapping linear kick delivered with the ball of the foot, targeting the solar plexus or chin. Fast, efficient, and deceptively powerful.',
  'beginner', 'White Belt',
  ARRAY['Chamber the knee high — thigh at least parallel to the floor', 'Snap the foot out, don''t push', 'Strike with the ball of the foot (pull toes back)', 'Re-chamber before setting the foot down', 'Supporting leg knee is slightly bent', 'Guard stays up throughout'],
  ARRAY['Not chambering — kicking with a straight leg', 'Striking with the toes instead of the ball of the foot', 'Dropping the hands during the kick', 'Leaning too far backward', 'Setting the foot down without re-chambering'],
  ARRAY['From fighting stance, shift weight to the rear/supporting leg', 'Lift the kicking knee straight up — chamber', 'Snap the lower leg forward, pulling the toes back', 'Strike with the ball of the foot', 'Snap the leg back to the chambered position', 'Return the foot to the ground in stance'],
  ARRAY['Knee comes up first like loading a spring', 'Snap and return — your foot should barely linger at extension', 'Think of kicking through the target, not at it', 'The kick is just the bottom half — the knee drive is the engine'],
  ARRAY['hip flexors', 'quadriceps', 'core', 'calves', 'tibialis anterior'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_ap_chagi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'circular', 'Dollyo Chagi (Roundhouse Kick)',
  'The signature TKD kick. A circular kick powered by hip rotation, striking with the instep or ball of the foot. The most-used scoring technique in WT competition.',
  'beginner', 'White Belt',
  ARRAY['Pivot the supporting foot 180° — heel faces the target', 'Hip turns over fully — this is where the power comes from', 'Strike with the instep (dorsum of the foot)', 'Knee points at the target during chamber', 'Kick travels in a horizontal arc', 'Re-chamber after contact'],
  ARRAY['Not pivoting the support foot — kills range and power', 'Kicking upward instead of across', 'Telegraphing by leaning back too early', 'Dropping the hands — leaves the head exposed', 'Incomplete hip turnover'],
  ARRAY['From fighting stance, shift weight to the support leg', 'Chamber the kicking knee, pointing it at the target', 'Pivot the support foot so the heel faces the target', 'Rotate the hip over as you extend the kick horizontally', 'Strike with the instep — foot slightly pointed', 'Snap the leg back to chamber', 'Return to fighting stance'],
  ARRAY['Your support foot pivot is 80% of the kick''s power', 'Think of your hip as a door hinge — swing it open', 'The kick should feel like whipping a towel', 'Aim to kick through the target by 6 inches'],
  ARRAY['hip flexors', 'quadriceps', 'gluteus medius', 'obliques', 'calves', 'hip rotators'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_dollyo_chagi;

-- ─── Forms (White) ───────────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'forms', 'taegeuk', 'Taegeuk Il Jang (Poomsae 1)',
  'The first Taegeuk poomsae, representing the trigram of Keon (heaven/sky). Introduces walking stance with low blocks, middle blocks, and front kicks combined with punches. 18 movements.',
  'beginner', 'White Belt',
  ARRAY['18 total movements in an I-shaped pattern', 'Begins and ends at the same spot', 'Uses only ap seogi and ap kubi stances', 'Includes arae makki, momtong makki, and momtong jireugi', 'Includes ap chagi with middle punch', 'Each turn should be sharp — snap the head first'],
  ARRAY['Not returning to the starting position', 'Sloppy transitions between stances', 'Rushing through — poomsae should have rhythm', 'Blocks and punches lacking conviction', 'Forgetting to kihap (shout) on the last movement'],
  ARRAY['Begin in attention stance (charyeot), bow (kyeong-nye)', 'Turn left into left ap kubi with left arae makki', 'Step forward right ap seogi with right momtong jireugi', 'Turn right 180° into right ap kubi with right arae makki', 'Step forward left ap seogi with left momtong jireugi', 'Turn left 90° into left ap kubi with left momtong makki', 'Right ap chagi, land right ap kubi, right momtong jireugi', 'Continue pattern through 18 movements', 'End with kihap on final momtong jireugi', 'Return to joonbi (ready stance)'],
  ARRAY['Walk the I-shape before adding techniques', 'Head snaps first on every turn — your body follows', 'Each technique should have a clear start and stop', 'Breathe naturally; exhale on every technique'],
  ARRAY['full body', 'core', 'quadriceps', 'hip flexors', 'deltoids'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_tg_il;


-- ═══════════════════════════════════════════════════════════════
-- Yellow Belt Techniques
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'linear', 'Yeop Chagi (Side Kick)',
  'A powerful thrusting kick delivered sideways using the blade (knife edge) of the foot. One of TKD''s most versatile kicks — used for stopping, pushing, and scoring.',
  'intermediate', 'Yellow Belt',
  ARRAY['Strike with the blade (knife edge) of the foot', 'Chamber by bringing the knee across the body toward the opposite shoulder', 'Thrust out sideways — don''t arc', 'Pivot support foot so heel points at the target', 'Lean torso away from the kick for counterbalance', 'Hips stack vertically at full extension'],
  ARRAY['Hitting with the flat of the foot instead of the blade', 'Chamber too low — loses height and power', 'Not pivoting the support foot — causes hip and knee strain', 'Kicking in a roundhouse arc instead of thrusting straight', 'Dropping the guard hand'],
  ARRAY['From fighting stance, shift weight to the support leg', 'Lift kicking knee high, pulling it across toward the opposite shoulder', 'Pivot the support foot so the heel faces the target', 'Thrust the foot out sideways, extending the hip', 'Strike with the blade of the foot — toes pulled back', 'Lean the upper body away for balance', 'Snap back to the chambered position', 'Return to stance'],
  ARRAY['Think of stomping on a wall beside you', 'Your heel, hip, and shoulder should form one straight line at extension', 'The chamber is the aiming mechanism — take your time with it'],
  ARRAY['hip abductors', 'gluteus medius', 'quadriceps', 'obliques', 'core', 'calves'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_yeop_chagi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'linear', 'Dwit Chagi (Back Kick)',
  'A devastating straight-line kick delivered backward by turning the body. Maximum power comes from the hip thrust. One of TKD''s hardest-hitting techniques.',
  'intermediate', 'Yellow Belt',
  ARRAY['Look over your shoulder first to spot the target', 'Turn the body and thrust the heel straight back', 'Strike with the heel — not the sole', 'The kick travels in a straight line, not an arc', 'Keep the kicking leg''s knee pointing downward during the thrust', 'Full hip extension at the moment of impact'],
  ARRAY['Not looking before kicking — missing the target', 'Turning into a spinning hook kick by accident (curving the path)', 'Striking with the sole instead of the heel', 'Bending forward too much — losing balance', 'Spinning too fast and losing control'],
  ARRAY['From fighting stance, look over your rear shoulder', 'Pivot on the front foot, turning your back toward the target', 'Chamber the kicking knee close to the body', 'Thrust the heel straight back toward the target', 'Drive through with the hip — full extension', 'Retract the leg and spin back to face the target', 'Reset to fighting stance'],
  ARRAY['Eyes first, then the body follows', 'Think of thrusting a piston straight back', 'Your heel is a battering ram — drive it through the target', 'The power comes from the hip thrust, not the spin'],
  ARRAY['glutes', 'hamstrings', 'hip extensors', 'core', 'quadriceps', 'calves'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_dwit_chagi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'downward', 'Naeryo Chagi (Axe Kick)',
  'A dramatic dropping kick where the leg is raised high and brought down on the target like an axe. Targets the collarbone, shoulder, or face. A TKD specialty that requires flexibility.',
  'intermediate', 'Yellow Belt',
  ARRAY['Raise the leg straight up past the target height', 'Drop the heel down onto the target using gravity plus hip drive', 'Keep the leg straight or near-straight throughout', 'Strike with the heel or the back of the calf', 'Lean slightly back for counterbalance', 'Pull toes back to present the heel'],
  ARRAY['Not raising the leg high enough — kick fizzles out', 'Bending the knee too much — converts to a crescent kick', 'Leaning too far back and losing balance', 'No downward force — just letting the leg fall', 'Telegraphing by swinging the arms'],
  ARRAY['From fighting stance, shift weight to the support leg', 'Swing the kicking leg straight up, leading with the heel', 'Raise the leg above the target height', 'Actively drive the heel downward onto the target', 'Use your hip flexors and abs to accelerate the drop', 'Follow through past the target', 'Return to fighting stance'],
  ARRAY['Your leg is the handle of an axe, your heel is the blade', 'Go UP first — you need height to have something to drop', 'Use your abs to accelerate the downstroke', 'Flexibility is your friend — stretch those hammies'],
  ARRAY['hip flexors', 'rectus abdominis', 'hamstrings', 'glutes', 'quadriceps'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_naeryo_chagi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'defense', 'knife hand', 'Sonnal Makki (Knife Hand Block)',
  'An elegant open-hand block using the blade of the hand. Performed in back stance, it covers a wide area and sets up counter-attacks. A defining movement of Taegeuk poomsae.',
  'intermediate', 'Yellow Belt',
  ARRAY['Block uses the knife edge of the hand — fingers together, thumb tucked', 'Performed in dwit kubi (back stance)', 'Front hand blocks, rear hand guards at the solar plexus', 'Block sweeps from the opposite ear outward', 'Fingers point upward at the finish', 'Hip rotation drives the block'],
  ARRAY['Fingers splayed apart — weakens the hand', 'Front hand going too far past center', 'Not settling into back stance properly', 'Rear hand position sloppy or too low', 'No hip rotation — blocking with arm strength only'],
  ARRAY['Begin in ready stance', 'Step back into dwit kubi', 'Bring the blocking hand to the opposite ear, palm facing ear', 'Extend the other hand forward, palm down', 'Sweep the blocking hand outward across the body', 'Finish with the knife hand at shoulder height, elbow bent', 'Simultaneously bring the other hand to the solar plexus, palm up', 'Exhale sharply on execution'],
  ARRAY['Your hand is a blade — fingers tight, thumb tucked under', 'Back stance with knife hand — they are a pair, always together', 'The rear hand guards your heart like a shield'],
  ARRAY['deltoids', 'lats', 'core', 'obliques', 'forearm extensors', 'quadriceps'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_sonnal_makki;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'strike', 'backfist', 'Deung Jumeok (Backfist Strike)',
  'A whipping strike using the back of the fist. Quick and deceptive, targeting the temple or bridge of the nose. Commonly used as a setup or in poomsae.',
  'intermediate', 'Yellow Belt',
  ARRAY['Strike with the back of the first two knuckles', 'Elbow leads the motion — the fist follows like a whip', 'Wrist stays firm on contact', 'Can be horizontal (temple) or vertical (nose bridge)', 'Fast snap back after contact — don''t leave the hand out'],
  ARRAY['Reaching with the arm — elbow should lead', 'Striking with the fingers instead of the knuckle back', 'Wrist buckling on impact', 'No snap — pushing instead of whipping', 'Telegraphing with the shoulder'],
  ARRAY['From guard or hip position, bring the fist to the opposite shoulder', 'Drive the elbow toward the target', 'When the elbow reaches its limit, whip the fist out', 'Strike with the back of the knuckles', 'Snap the fist back immediately after contact', 'Return to guard or hip'],
  ARRAY['Your elbow is the sling, your fist is the stone', 'Think of cracking a whip — power comes at the tip', 'Speed over power — this is a sniper shot, not a cannon'],
  ARRAY['forearm extensors', 'triceps', 'deltoids', 'core', 'lats'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_deung_jumeok;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'forms', 'taegeuk', 'Taegeuk Yi Jang (Poomsae 2)',
  'The second Taegeuk poomsae, representing Tae (joyfulness/lake). Introduces high block and front kick to the face. Builds on Il Jang with more complex combinations. 18 movements.',
  'intermediate', 'Yellow Belt',
  ARRAY['18 movements in an I-shaped pattern', 'Introduces eolgul makki (high block)', 'Includes ap chagi to eolgul (face level)', 'Uses both ap kubi and ap seogi', 'Combinations become two-step sequences', 'Rhythm should alternate between slow preparation and fast execution'],
  ARRAY['Confusing the pattern with Il Jang', 'High blocks too low — must be above the forehead', 'Front kicks lacking height for eolgul level', 'Losing the I-shaped line — drifting off axis', 'Inconsistent stance lengths'],
  ARRAY['Begin in attention stance, bow, ready position', 'Follow the I-shaped walking pattern', 'Execute blocks, punches, and kicks per the pattern', 'Incorporate eolgul makki on the appropriate turns', 'Maintain consistent stance depth throughout', 'Kihap on the final technique', 'Return to ready position'],
  ARRAY['Same floor pattern as Il Jang — but the techniques evolve', 'High block: build a roof, don''t just raise your hand', 'The front kick should SNAP up to face height — no lazy feet'],
  ARRAY['full body', 'core', 'hip flexors', 'deltoids', 'quadriceps'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_tg_yi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'forms', 'taegeuk', 'Taegeuk Sam Jang (Poomsae 3)',
  'The third Taegeuk poomsae, representing Ri (fire/sun). Introduces knife hand block in back stance and sonnal makki. More dynamic with increased use of front kicks. 20 movements.',
  'intermediate', 'Yellow Belt',
  ARRAY['20 movements — longer than Il and Yi Jang', 'Introduces sonnal makki in dwit kubi', 'First poomsae to use back stance extensively', 'More front kicks integrated into combinations', 'Introduces the concept of simultaneous block-and-counter', 'Pattern expands the I-shape with diagonal steps'],
  ARRAY['Poor back stance — weight not shifted properly', 'Knife hand block sloppy — fingers splayed', 'Rushing the extra movements', 'Not distinguishing between ap kubi and dwit kubi transitions', 'Kicks lacking re-chamber before stepping down'],
  ARRAY['Begin in attention stance, bow, ready position', 'Follow the expanded I-shaped pattern', 'Execute knife hand blocks in proper back stance', 'Transition smoothly between front and back stances', 'Front kicks flow into stepping punches', 'Maintain awareness of the diagonal movements', 'Kihap on the final technique', 'Return to ready position'],
  ARRAY['Fire — this poomsae should have more intensity than the first two', 'Back stance knife hand is the star — make it sharp', 'Feel the difference: front stance pushes forward, back stance loads for a counter'],
  ARRAY['full body', 'core', 'hip flexors', 'quadriceps', 'lats', 'deltoids'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_tg_sam;


-- ═══════════════════════════════════════════════════════════════
-- Green Belt Techniques
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'circular', 'Bandal Chagi (Crescent Kick)',
  'An inside-to-outside crescent arc kick that sweeps past the target in a wide curve. Used to slap weapons away, strike the head, or set up combinations. Flashy and fast.',
  'intermediate', 'Green Belt',
  ARRAY['Leg travels in a wide arc from inside to outside (or outside to inside)', 'Strike with the flat of the foot or the ball', 'Leg stays relatively straight during the arc', 'Hip drives the sweeping motion', 'Follow through past the target — don''t stop at contact', 'Keep guard hands up throughout'],
  ARRAY['Bending the knee — converts it into a roundhouse', 'Arc too tight — no sweep coverage', 'Dropping the guard hands for momentum', 'Leaning too far back — losing balance', 'No hip involvement — kicking with the leg only'],
  ARRAY['From fighting stance, shift weight to the support leg', 'Swing the kicking leg inward across the body', 'Arc the leg upward in a wide sweeping motion', 'Sweep past the target area at the apex', 'Continue the arc outward, following through', 'Control the descent and return to stance'],
  ARRAY['Draw a big crescent moon in the air with your foot', 'Your hip is a catapult launcher', 'The foot should whistle through the air — that''s the right speed'],
  ARRAY['hip flexors', 'hip adductors', 'hip abductors', 'obliques', 'quadriceps', 'core'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_bandal_chagi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'spinning', 'Dwi Huryeo Chagi (Spinning Hook Kick)',
  'A devastating spinning kick where the heel whips around in a tight hook at head level. The spin generates tremendous centrifugal force. A highlight-reel knockout kick in WT competition.',
  'advanced', 'Green Belt',
  ARRAY['Look over the shoulder to spot the target before spinning', 'Spin on the ball of the support foot', 'The hook is tight — not a wide spinning crescent', 'Strike with the heel or bottom of the foot', 'The knee is the hinge — extend at the right moment', 'Re-chamber quickly and face the opponent', 'Guard hand sweeps with the spin for protection'],
  ARRAY['Spinning blindly without looking first', 'Turning it into a wide spinning crescent — losing the hook', 'Losing balance during the spin', 'Kicking too high or too low — not tracking the target', 'Taking too long to face forward again — vulnerability window'],
  ARRAY['From fighting stance, look over your lead shoulder', 'Pivot on the lead foot, spinning the body away', 'As you reach 180° spin, chamber the kicking knee', 'Spot the target over your shoulder', 'Extend the leg in a tight hook arc at head height', 'Strike with the heel', 'Snap the leg back after contact', 'Continue the rotation back to fighting stance'],
  ARRAY['Eyes lock on — spin — eyes lock on again', 'The hook is a tight question mark shape, not a wide swing', 'Speed of the spin creates the power — don''t try to muscle it', 'This kick ends fights — practice it until it''s second nature'],
  ARRAY['hip rotators', 'glutes', 'hamstrings', 'obliques', 'core', 'calves'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_dwi_huryeo_chagi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'linear', 'Biteureo Chagi (Twist Kick)',
  'A deceptive kick that starts like a front kick but twists to strike from a different angle. The foot turns inward at the last moment, landing on the instep. Excellent for scoring in sparring.',
  'intermediate', 'Green Belt',
  ARRAY['Chamber looks identical to ap chagi — that''s the deception', 'At extension, twist the hip inward so the foot angles across', 'Strike with the instep or ball of the foot', 'The twist happens in the hip, not just the ankle', 'Target is usually the floating ribs or liver', 'Speed is everything — the setup is the disguise'],
  ARRAY['Telegraphing the twist too early — reveals the angle', 'Not twisting the hip — just turning the foot', 'Losing the chamber — kicking without knee drive', 'Aiming too high — the twist reduces height', 'Over-rotating and losing balance'],
  ARRAY['From fighting stance, lift the knee as if doing ap chagi', 'Begin extending as if throwing a front kick', 'At mid-extension, twist the hip inward', 'Angle the foot across the target', 'Strike with the instep at the twisted angle', 'Snap back to chamber', 'Return to stance'],
  ARRAY['Set up with front kicks first — make them believe it', 'The twist is in the LAST MOMENT — late rotation', 'Think of your hip as a steering wheel turning inward', 'One of TKD''s smartest kicks — use the brain, not just the body'],
  ARRAY['hip flexors', 'hip rotators', 'quadriceps', 'obliques', 'core'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_biteureo_chagi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'footwork', 'Switch Kick (Bakkuo Chagi)',
  'A stance-switch into an immediate kick — typically a roundhouse. The rapid foot switch changes the lead leg and launches the kick in one explosive movement. A staple of TKD sparring.',
  'intermediate', 'Green Belt',
  ARRAY['The switch and kick happen as one seamless motion', 'Jump slightly during the switch — don''t just step', 'The kick fires the instant the lead leg becomes the rear', 'Landing foot should be in position to pivot for the kick', 'Guard stays up — the switch should not drop the hands', 'Can be used with dollyo, yeop, or ap chagi'],
  ARRAY['Telegraphing the switch with a big hop', 'Two separate movements instead of one fluid motion', 'Landing flat-footed on the switch — kills the kick''s timing', 'Dropping the hands during the switch', 'Not fully committing to the kick after switching'],
  ARRAY['From fighting stance with left foot forward', 'Spring off both feet, switching lead and rear', 'As the new rear foot (originally front) touches down, pivot', 'Immediately fire the new lead leg (originally rear) into a kick', 'Execute the kick (dollyo, yeop, etc.) from the switched position', 'Return to stance — either original or switched'],
  ARRAY['It''s a skip, not a jump — stay low to the ground', 'Switch and kick are ONE — if there''s a pause, you''re doing two things', 'Use this to change angles — the switch moves your whole position', 'The opponent expects the rear leg kick — the switch gives them the other one'],
  ARRAY['calves', 'quadriceps', 'hip flexors', 'glutes', 'core'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_switch_kick;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'combination', 'Double & Triple Kick Combinations',
  'Multi-kick sequences fired rapidly without setting the foot down between kicks. A defining feature of TKD sparring — double roundhouse, roundhouse-axe, and front-roundhouse combos.',
  'advanced', 'Green Belt',
  ARRAY['Keep the kicking leg in the air between kicks', 'Re-chamber between each kick — don''t just swing', 'Each kick in the combo has a distinct target', 'Support leg must pivot to accommodate angle changes', 'Core engaged throughout — this is an ab workout', 'Speed comes from the re-chamber, not from rushing'],
  ARRAY['Setting the foot down between kicks — kills the combo', 'Losing height with each successive kick', 'Forgetting to re-chamber — just flailing', 'Support leg not adjusting — strain on the knee', 'Running out of gas on the third kick'],
  ARRAY['From fighting stance, fire kick #1 (e.g., dollyo to body)', 'Re-chamber without setting the foot down', 'Adjust the support foot pivot if changing kick type', 'Fire kick #2 (e.g., dollyo to head)', 'Re-chamber again if doing a triple', 'Fire kick #3 (e.g., naeryo chagi)', 'Set the foot down and return to stance'],
  ARRAY['Think of your leg as a machine gun — chamber, fire, chamber, fire', 'The secret is core strength — your abs hold the leg up', 'Low-high is the classic: first kick opens the guard, second scores', 'Practice holding the chamber between kicks — balance is king'],
  ARRAY['hip flexors', 'rectus abdominis', 'obliques', 'quadriceps', 'glutes', 'calves'],
  'kicking shield', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_kick_combo;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'forms', 'taegeuk', 'Taegeuk Sa Jang (Poomsae 4)',
  'The fourth Taegeuk poomsae, representing Jin (thunder). Introduces side kick, knife hand strike, and double knife hand block. More powerful movements reflecting thunder''s intensity. 20 movements.',
  'intermediate', 'Green Belt',
  ARRAY['20 movements with thunder-like intensity', 'Introduces yeop chagi (side kick)', 'Includes sonnal momtong makki (double knife hand block)', 'Introduces jebipoom mokchigi (swallow form neck strike)', 'Stances become deeper and more deliberate', 'Power comes from strong hip rotation on every technique'],
  ARRAY['Side kick in poomsae thrown with poor form', 'Double knife hand block with uneven hand positions', 'Stances becoming shallow as fatigue sets in', 'Losing the thunder energy — each technique should crack like lightning', 'Not distinguishing between slow preparatory and fast execution moves'],
  ARRAY['Begin in attention stance, bow, ready position', 'Follow the I-pattern with diagonal variations', 'Execute side kicks with full chamber and thrust', 'Perform double knife hand blocks with precision', 'Drive powerful hip rotation into every technique', 'Kihap on the final movement', 'Return to ready position'],
  ARRAY['Thunder shakes the earth — let each technique land with that conviction', 'Side kicks in poomsae are held longer than in sparring — show control', 'The double knife hand block frames your center like armor'],
  ARRAY['full body', 'core', 'hip abductors', 'quadriceps', 'deltoids', 'lats'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_tg_sa;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'forms', 'taegeuk', 'Taegeuk Oh Jang (Poomsae 5)',
  'The fifth Taegeuk poomsae, representing Son (wind). Introduces hammer fist, elbow strike, and jumping cross stance. Flowing but powerful — wind can be a gentle breeze or a hurricane. 20 movements.',
  'advanced', 'Green Belt',
  ARRAY['20 movements with wind-like flow', 'Introduces me-jumeok naeryo chigi (hammer fist)', 'Introduces palkup dollyo chigi (elbow strike)', 'Includes the first jumping movement (cross stance landing)', 'Flow between techniques should be seamless', 'Emphasizes connecting movements without pausing'],
  ARRAY['Hammer fist lacking downward power', 'Elbow strike with wrong trajectory', 'Jump too high or not controlled on landing', 'Losing the flowing quality — becoming staccato', 'Cross stance landing unstable'],
  ARRAY['Begin in attention stance, bow, ready position', 'Execute with flowing transitions between movements', 'Perform hammer fist with full hip drop', 'Execute elbow strikes at close range with body rotation', 'Jump into cross stance with controlled landing', 'Maintain continuous movement — wind does not stop', 'Kihap on the final movement', 'Return to ready position'],
  ARRAY['Wind flows — but a hurricane is still wind; bring power within the flow', 'The hammer fist falls like a gavel — gravity plus muscle', 'Elbows are close-range weapons — you should feel the opponent''s breath', 'The jump should be smooth, not jarring — land like a cat'],
  ARRAY['full body', 'core', 'deltoids', 'triceps', 'quadriceps', 'calves'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_tg_oh;


-- ═══════════════════════════════════════════════════════════════
-- Blue Belt Techniques
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'jumping', 'Twi-eo Ap Chagi (Jumping Front Kick)',
  'An airborne front kick that adds height and forward momentum. The jump closes distance and the kick snaps out at the peak. Used to score over a blocking guard or to stop a charging opponent.',
  'advanced', 'Blue Belt',
  ARRAY['Drive the non-kicking knee up to generate lift', 'Kick fires at the peak of the jump — not on the way up', 'Same chamber and snap mechanics as ground ap chagi', 'Land on the support foot first, absorb with bent knee', 'Arms pump upward to assist the jump', 'Time the snap so contact happens at maximum height'],
  ARRAY['Kicking on the way up — haven''t reached full height yet', 'Jumping forward but not UP — no height advantage', 'Forgetting to chamber — just swinging the leg in the air', 'Landing stiff-legged — bad for the knees', 'Neglecting the guard while airborne'],
  ARRAY['From fighting stance, take a quick skip step forward', 'Jump off the support foot, driving the opposite knee up', 'At the peak of the jump, chamber the kicking leg', 'Snap the front kick out — ball of the foot strikes', 'Re-chamber while still airborne', 'Land on the support foot with a bent knee to absorb', 'Settle into fighting stance'],
  ARRAY['The non-kicking knee is your rocket booster — drive it UP', 'Kick at the TOP of the arc — you are briefly flying', 'Land soft — cat feet, not elephant feet', 'In competition, the jump scores even if the kick is blocked — commit to it'],
  ARRAY['hip flexors', 'quadriceps', 'calves', 'glutes', 'core', 'tibialis anterior'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_twi_ap_chagi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'jumping', 'Twi-eo Dollyo Chagi (Jumping Roundhouse)',
  'The aerial roundhouse — TKD''s most exciting scoring technique. The jump elevates the kick to head height, and the full hip turnover in the air generates spectacular power. Highlight-reel material.',
  'advanced', 'Blue Belt',
  ARRAY['Jump and rotate simultaneously — the spin starts from the ground', 'Non-kicking knee drives upward for maximum height', 'Full hip turnover happens in the air', 'Support foot would be pivoted if on the ground — in the air, the hip does the work', 'Strike with the instep at or above head height', 'Land facing the target, ready to follow up'],
  ARRAY['Not jumping high enough — becomes a regular roundhouse', 'Hip turnover incomplete — no power in the air', 'Landing off-balance after the kick', 'Dropping the guard while jumping', 'Kicking during the ascent instead of at the peak'],
  ARRAY['From fighting stance, skip step to build momentum', 'Spring off the support leg while driving the opposite knee up', 'In the air, chamber the kicking leg with knee toward target', 'Rotate the hip over and extend the roundhouse at peak height', 'Strike with the instep at head level or above', 'Re-chamber the leg while descending', 'Land on the support foot, absorb, return to stance'],
  ARRAY['You are a spinning top that also goes UP', 'The airtime is your canvas — paint the kick at the peak', 'This kick won Olympic gold medals — earn it through practice', 'The jump should feel like you''re being launched, not hopping'],
  ARRAY['quadriceps', 'hip flexors', 'glutes', 'hip rotators', 'obliques', 'calves', 'core'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_twi_dollyo_chagi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'jumping', '540 Kick (Introductory)',
  'The iconic 540-degree spinning kick — a full 360 rotation in the air plus the 180° chamber-to-extension. The ultimate expression of TKD''s aerial kicking. At this level, introduction and controlled practice only.',
  'expert', 'Blue Belt',
  ARRAY['540° total rotation — body spins 1.5 times', 'The kick is essentially a jumping spinning roundhouse', 'Start the spin from the ground before jumping', 'Spot the target twice — once before the jump, once mid-spin', 'The non-kicking leg tucks to accelerate the spin', 'Land on the non-kicking foot after completion'],
  ARRAY['Not committing to the full spin — bailing halfway', 'Spinning without jumping — needs both height and rotation', 'Losing visual tracking of the target', 'Landing on the kicking foot — should land on the non-kicking foot', 'Attempting full power before mastering the rotation', 'Neglecting to practice the ground spin before going airborne'],
  ARRAY['Start with a setup step — slightly diagonal approach', 'Pivot on the front foot, initiating the spin', 'Jump off the pivot foot while continuing the spin', 'Tuck the non-kicking leg to accelerate rotation', 'At 360° (facing the target again), extend the kick', 'Complete the final 180° of rotation with the kick extended', 'Land on the non-kicking foot', 'Absorb and stabilize'],
  ARRAY['Master the spin on the ground before adding the jump', 'Speed of rotation comes from the arms and the tuck — not from trying harder', 'Spot, spin, spot, kick — visual reference is everything', 'This is the PhD of kicking — be patient with yourself', 'Practice on mats — you will fall at first and that is normal'],
  ARRAY['quadriceps', 'hip flexors', 'hip rotators', 'glutes', 'obliques', 'core', 'calves'],
  'crash mat', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_540_kick;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'kick', 'strategy', 'Sparring Strategy & Tactics',
  'The mental game of WT-style sparring. Covers distance management, timing, feinting, counter-attacking, and reading the opponent. Technique means nothing without strategy.',
  'advanced', 'Blue Belt',
  ARRAY['Maintain fighting distance — just out of the opponent''s kick range', 'Use feints to draw reactions and create openings', 'Counter-attacking scores more reliably than attacking', 'The first kick is a question, the second is the answer', 'Control the center of the ring', 'Vary rhythm — predictable fighters get read and countered'],
  ARRAY['Standing too close — eating kicks', 'Standing too far — wasting energy closing distance', 'Always being the aggressor — good fighters bait you', 'Ignoring feints — reacting to everything is exhausting', 'Fighting with the same rhythm — becomes predictable'],
  ARRAY['Establish your fighting distance by extending your front leg', 'Use small steps and slides to manage distance', 'Feint with a slight knee lift to test the opponent''s reaction', 'If they react to the feint, attack the opening they create', 'If they don''t react, probe with a light kick', 'Set up scoring kicks with preliminary techniques', 'After scoring, exit immediately — don''t linger', 'Analyze the opponent''s patterns: what do they throw first?'],
  ARRAY['Sparring is chess with your feet', 'Every exchange is a conversation — ask questions with feints', 'The best fighters don''t work harder, they time better', 'Distance is your shield — manage it like oxygen', 'After you score, MOVE — don''t admire your work'],
  ARRAY['full body', 'fast-twitch muscles', 'cardiovascular system'],
  'sparring gear', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_sparring_strategy;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'forms', 'taegeuk', 'Taegeuk Yuk Jang (Poomsae 6)',
  'The sixth Taegeuk poomsae, representing Gam (water). Introduces single knife hand to the neck and palm block. Movements should flow like water — continuous and adaptive. 23 movements.',
  'advanced', 'Blue Belt',
  ARRAY['23 movements — longest poomsae yet', 'Introduces hansonnal mok chigi (single knife hand neck strike)', 'Includes batangson makki (palm block)', 'Adds dollyo chagi within the pattern', 'Water-like quality: continuous flow between techniques', 'Introduces more complex direction changes'],
  ARRAY['Losing the flowing quality — becoming robotic', 'Knife hand neck strike at the wrong angle', 'Palm block with the wrist collapsed', 'Roundhouse kick within poomsae losing form due to unfamiliarity', 'Hesitating on the more complex directional changes'],
  ARRAY['Begin in attention stance, bow, ready position', 'Execute techniques with water-like continuous flow', 'Perform single knife hand strikes to the neck with precision', 'Execute palm blocks with a firm, open hand', 'Integrate dollyo chagi smoothly within the pattern', 'Navigate complex direction changes without hesitation', 'Kihap on the final movement', 'Return to ready position'],
  ARRAY['Water flows around obstacles — let your movements adapt', 'The knife hand to the neck is precise as a surgeon''s scalpel', 'Your palm block meets force with a firm open hand — absorb and redirect', 'Roundhouse in poomsae is controlled, not wild — show mastery'],
  ARRAY['full body', 'core', 'hip flexors', 'hip rotators', 'deltoids', 'quadriceps'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_tg_yuk;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'taekwondo', 'forms', 'taegeuk', 'Taegeuk Chil Jang (Poomsae 7)',
  'The seventh Taegeuk poomsae, representing Gan (mountain). Introduces tiger stance (beom seogi), backfist, palm pressing block, and knee strike. Mountain-like stability and immovable presence. 25 movements.',
  'advanced', 'Blue Belt',
  ARRAY['25 movements — strong and grounded throughout', 'Introduces beom seogi (tiger stance)', 'Includes batangson momtong an-makki (inward palm block)', 'Introduces mureup chigi (knee strike)', 'Mountain stability — low center of gravity, deliberate power', 'Techniques should feel heavy and rooted'],
  ARRAY['Tiger stance too upright — should be deep and coiled', 'Knee strike lacking hip drive', 'Inward palm block crossed too far past center', 'Losing the heavy, rooted quality — becoming too light', 'Rushing through the 25 movements — this one demands patience'],
  ARRAY['Begin in attention stance, bow, ready position', 'Sink into tiger stance with control and power', 'Execute backfist strikes with whipping speed', 'Perform inward palm blocks with full body rotation', 'Drive knee strikes upward from the hip', 'Maintain mountain-like stability throughout', 'Kihap on the final movement', 'Return to ready position'],
  ARRAY['You are the mountain — unmovable, patient, ancient', 'Tiger stance: sit low, coil like a spring, ready to pounce', 'Knee strike drives up from the earth through your hip — not just a leg lift', 'The mountain does not rush — every movement is deliberate and heavy'],
  ARRAY['full body', 'core', 'quadriceps', 'glutes', 'hip flexors', 'deltoids', 'lats'],
  'none', 'both', ARRAY[]::UUID[])
RETURNING id INTO t_tg_chil;


-- ═══════════════════════════════════════════════════════════════
-- 3. LESSONS — WHITE BELT (9 Lessons)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'taekwondo', 1, 1,
  'Your First Stance',
  'Ap seogi — the natural starting point',
  10,
  ARRAY['Stand tall, stay relaxed', 'Railroad tracks — each foot on its own line', 'Soft knees, never locked'],
  ARRAY['Feet too close together', 'Locking the knees', 'Leaning forward'],
  'Stance Freeze',
  'Assume ap seogi, close your eyes for 10 seconds, then open and check: are your feet shoulder-width? Knees soft? Hips square? Repeat 5 times.',
  3, 'none',
  'Can I hold ap seogi with my eyes closed for 10 seconds without losing balance?',
  ARRAY[]::UUID[])
RETURNING id INTO lw1;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'taekwondo', 2, 1,
  'The Power Stance',
  'Ap kubi — your offensive foundation',
  10,
  ARRAY['Sink your weight — feel rooted', 'Front knee over the ankle, never past the toes', 'Press the rear heel into the ground'],
  ARRAY['Front knee collapsing inward', 'Rear heel lifting', 'Stance too short'],
  'Wall Push Test',
  'Assume ap kubi with your front foot near a wall. Push against the wall for 5 seconds — if your rear heel lifts, your stance is wrong. Adjust and repeat 8 times per side.',
  3, 'none',
  'Can I push against a wall in ap kubi for 5 seconds without my rear heel lifting?',
  ARRAY[]::UUID[])
RETURNING id INTO lw2;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'taekwondo', 3, 2,
  'The Counter Stance',
  'Dwit kubi — loaded and ready',
  10,
  ARRAY['70% weight on the rear leg — sit back', 'L-shape with the feet', 'Front leg is your trigger — keep it ready'],
  ARRAY['Weight too far forward', 'Feet on the same line', 'Front knee locked'],
  'Weight Shift Check',
  'In dwit kubi, lift your front foot 2 inches off the ground. If you stumble, your weight is too far forward. Practice lifting and replacing 10 times per side.',
  3, 'none',
  'Can I lift my front foot off the ground from dwit kubi without stumbling?',
  ARRAY[]::UUID[])
RETURNING id INTO lw3;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'taekwondo', 4, 2,
  'The TKD Punch',
  'Jireugi — hip rotation meets fist rotation',
  10,
  ARRAY['Wring the towel — rotate the fist fully', 'Pull-back hand is just as important as the punch', 'Snap, don''t push'],
  ARRAY['Flaring the elbow', 'Wrist bending', 'Not retracting the opposite hand'],
  'Mirror Punch Drill',
  'Stand in ap kubi facing a mirror. Throw 20 slow punches per side, watching for fist rotation, elbow path, and simultaneous pull-back. Then 20 fast. 3 sets.',
  4, 'none',
  'Can I punch with full fist rotation and simultaneous pull-back 20 times without error?',
  ARRAY[]::UUID[])
RETURNING id INTO lw4;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'taekwondo', 5, 3,
  'The Three Blocks',
  'Arae, momtong, eolgul makki — defend every level',
  12,
  ARRAY['Every block starts from the opposite side', 'Hip rotation drives each block', 'Exhale sharply on every block'],
  ARRAY['Blocks too slow — no snap', 'Forgetting the reaction hand', 'No hip rotation — arm-only blocking'],
  'Three-Level Drill',
  'From ap kubi: low block, middle block, high block, switch sides. 10 sets. Focus on the starting position of each block and the sharp exhale.',
  5, 'none',
  'Can I perform all three blocks in sequence without mixing up the starting positions?',
  ARRAY[]::UUID[])
RETURNING id INTO lw5;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'taekwondo', 6, 3,
  'The Front Kick',
  'Ap chagi — TKD''s bread and butter',
  12,
  ARRAY['Knee comes up FIRST — load the spring', 'Strike with the ball of the foot — pull toes back', 'Snap and return — don''t leave the leg out', 'The kick is just the bottom half; the chamber is the engine'],
  ARRAY['Not chambering — straight-leg kick', 'Hitting with the toes', 'Dropping the hands'],
  'Chair Chamber Drill',
  'Stand next to a chair. Lift your knee to chamber height and hold for 3 seconds, then snap the kick, hold extension 1 second, re-chamber and hold 3 seconds. 10 per leg.',
  4, 'none',
  'Can I hold the chamber position for 3 seconds before kicking without wobbling?',
  ARRAY[]::UUID[])
RETURNING id INTO lw6;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'taekwondo', 7, 4,
  'The Roundhouse',
  'Dollyo chagi — the signature TKD kick',
  12,
  ARRAY['Pivot the support foot 180° — heel faces the target', 'Hip turns over fully — this IS the power', 'Kick travels horizontal, not upward', 'Re-chamber before setting down'],
  ARRAY['Not pivoting the support foot', 'Kicking upward instead of across', 'Incomplete hip turnover', 'Dropping the guard'],
  'Slow-Motion Pivot Drill',
  'Practice the kick in 4 frozen steps: chamber, pivot, extend (hold 2 sec), re-chamber. Use a wall or chair for balance. 10 per side, then 10 at normal speed.',
  5, 'none',
  'When I roundhouse kick, does my support foot heel face the target at full extension?',
  ARRAY[]::UUID[])
RETURNING id INTO lw7;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'taekwondo', 8, 4,
  'Block-Counter Combinations',
  'Linking defense to offense',
  12,
  ARRAY['Block first, then punch or kick — sequence matters', 'The block should flow directly into the counter', 'Reset your guard between combinations'],
  ARRAY['Pausing too long between block and counter', 'Counter without resetting the guard', 'Losing stance integrity during the combo'],
  'Block-Punch Ladder',
  'Arae makki + jireugi, momtong makki + jireugi, eolgul makki + jireugi. Each combo 10 times. Then add ap chagi as the counter instead of jireugi. 3 full ladders.',
  5, 'none',
  'Can I perform block-punch at each level without pausing between the block and the counter?',
  ARRAY[]::UUID[])
RETURNING id INTO lw8;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'taekwondo', 9, 5,
  'Taegeuk Il Jang',
  'Your first poomsae — 18 movements of purpose',
  15,
  ARRAY['Walk the I-shape before adding techniques', 'Head snaps first on every turn', 'Each technique has a clear start and stop', 'Kihap on the final movement'],
  ARRAY['Drifting off the I-shaped line', 'Sloppy transitions between stances', 'Rushing — poomsae should have rhythm', 'Not returning to the starting spot'],
  'Section Practice',
  'Break Il Jang into 3 sections of 6 moves. Practice each section 5 times perfectly before connecting them. Then perform the full poomsae 3 times with a 1-minute rest between.',
  8, 'none',
  'Can I perform Taegeuk Il Jang and return to within one foot of my starting position?',
  ARRAY[]::UUID[])
RETURNING id INTO lw9;


-- ═══════════════════════════════════════════════════════════════
-- 3b. LESSONS — YELLOW BELT (9 Lessons)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'taekwondo', 1, 5,
  'The Side Kick',
  'Yeop chagi — the versatile wall-breaker',
  12,
  ARRAY['Chamber across the body — knee to opposite shoulder', 'Thrust sideways, don''t arc', 'Blade of the foot strikes — pull toes back and down', 'Heel-hip-shoulder line at full extension'],
  ARRAY['Hitting with the flat foot', 'Chamber too low', 'Not pivoting the support foot', 'Arcing like a roundhouse'],
  'Wall Thrust Drill',
  'Stand sideways to a wall, about one kick-length away. Chamber and thrust your side kick to touch the wall with the blade of your foot. Hold 3 seconds, retract. 10 per side.',
  4, 'none',
  'At full extension, can I draw a straight line from my heel through my hip to my shoulder?',
  ARRAY[]::UUID[])
RETURNING id INTO ly1;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'taekwondo', 2, 6,
  'The Back Kick',
  'Dwit chagi — the piston behind you',
  12,
  ARRAY['Eyes first — look over the shoulder', 'Thrust the heel straight back, not in an arc', 'Power comes from the hip thrust', 'Don''t confuse this with spinning hook kick'],
  ARRAY['Not looking before kicking', 'Curving into a hook kick path', 'Striking with the sole, not the heel', 'Bending too far forward'],
  'Target Spot Drill',
  'Place a target (pillow, pad) at hip height behind you. Turn head, spot target, pivot, thrust heel into target. Check: did you hit with the heel? Was the path straight? 10 per side.',
  4, 'kicking pad or pillow',
  'Can I consistently hit a target behind me with my heel in a straight line?',
  ARRAY[]::UUID[])
RETURNING id INTO ly2;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'taekwondo', 3, 6,
  'The Axe Kick',
  'Naeryo chagi — height meets gravity',
  12,
  ARRAY['GO UP FIRST — you need altitude to drop', 'Drive the heel down with abs, don''t just let the leg fall', 'Keep the leg relatively straight', 'Lean slightly back for balance'],
  ARRAY['Not getting enough height', 'Bending the knee', 'Just letting the leg fall — no active drop', 'Leaning too far back'],
  'Height Mark Drill',
  'Place a mark on a wall above your head height. Swing the leg up to touch the mark, then actively drive the heel down. Count only reps where you reach the mark. 8 per leg.',
  4, 'none',
  'Can I raise my leg above my own head height and actively drive the heel down with control?',
  ARRAY[]::UUID[])
RETURNING id INTO ly3;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'taekwondo', 4, 7,
  'Knife Hand Defense',
  'Sonnal makki — the elegant guard',
  12,
  ARRAY['Hand is a blade — fingers tight, thumb tucked', 'Always paired with dwit kubi', 'Rear hand guards the solar plexus', 'Block sweeps from the opposite ear'],
  ARRAY['Fingers splayed', 'Wrong stance — must be back stance', 'Rear hand position sloppy', 'No hip rotation'],
  'Stance-Block Integration',
  'Step into dwit kubi + sonnal makki. Hold 3 seconds — check hand position, stance depth, weight distribution. Step forward into ap kubi + momtong jireugi. Alternate 10 times per side.',
  4, 'none',
  'Can I step into a sonnal makki in dwit kubi with proper finger position and 70% rear weight?',
  ARRAY[]::UUID[])
RETURNING id INTO ly4;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'taekwondo', 5, 7,
  'The Backfist',
  'Deung jumeok — speed over power',
  10,
  ARRAY['Elbow leads — fist follows like a whip', 'Strike with the back of the knuckles', 'Snap back immediately', 'This is a precision tool, not a sledgehammer'],
  ARRAY['Reaching with the arm', 'Hitting with fingers', 'No snap — pushing', 'Telegraphing with the shoulder'],
  'Speed Snap Drill',
  'From guard, throw 10 slow backfists focusing on the elbow-lead whip mechanic. Then 10 at full speed. Listen for the snap of your dobok sleeve — that''s the right speed. 3 rounds.',
  3, 'none',
  'Can I hear my sleeve snap when I throw a backfist at full speed?',
  ARRAY[]::UUID[])
RETURNING id INTO ly5;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'taekwondo', 6, 8,
  'Kick Review & Combinations',
  'Linking kicks from white and yellow belt',
  12,
  ARRAY['Every kick starts with a chamber', 'Re-chamber between kicks if combining', 'Guard stays up through all kicks', 'Vary your targets — body, head, legs'],
  ARRAY['Skipping the chamber on familiar kicks', 'Guard dropping during combinations', 'Same target every time — becomes predictable'],
  'Kick Circuit',
  'Ap chagi right + left, dollyo chagi right + left, yeop chagi right + left, dwit chagi right + left. That''s 1 round. 5 rounds with 30 seconds rest between.',
  5, 'none',
  'Can I perform all four kick types in sequence without dropping my guard?',
  ARRAY[]::UUID[])
RETURNING id INTO ly6;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'taekwondo', 7, 8,
  'Taegeuk Yi Jang',
  'Poomsae 2 — the joy of progress',
  15,
  ARRAY['Same I-pattern but new techniques', 'High block: build a roof above your head', 'Front kicks to face level — demand that height', 'Rhythm: slow preparation, fast execution'],
  ARRAY['Confusing with Il Jang', 'High blocks too low', 'Front kicks not reaching face level', 'Inconsistent stance depth'],
  'Compare & Contrast',
  'Perform Il Jang once, then Yi Jang once. Note where the patterns match and where they differ. Repeat both 3 times. This builds the mental map.',
  8, 'none',
  'Can I perform Yi Jang without accidentally inserting any Il Jang movements?',
  ARRAY[]::UUID[])
RETURNING id INTO ly7;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'taekwondo', 8, 9,
  'Taegeuk Sam Jang',
  'Poomsae 3 — fire and knife hands',
  15,
  ARRAY['More intensity — this is fire', 'Back stance knife hand is the star', 'Feel the difference between front and back stance', 'More kicks integrated — maintain form'],
  ARRAY['Poor back stance', 'Knife hand block sloppy', 'Rushing the extra 2 movements', 'Kicks losing re-chamber'],
  'Stance Transition Focus',
  'Practice just the stance transitions in Sam Jang without techniques — step into ap kubi, then dwit kubi, ap kubi, dwit kubi. Get the footwork perfect, then layer techniques on top. 5 reps.',
  8, 'none',
  'Can I transition between ap kubi and dwit kubi fluidly in the Sam Jang pattern?',
  ARRAY[]::UUID[])
RETURNING id INTO ly8;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'taekwondo', 9, 9,
  'Yellow Belt Assessment',
  'Review all yellow belt techniques & poomsae',
  15,
  ARRAY['Perform each technique 5 times with full focus', 'Run through Yi Jang and Sam Jang back-to-back', 'Self-evaluate: which technique needs the most work?', 'This is a checkpoint, not a test — be honest'],
  ARRAY['Rushing through to finish', 'Ignoring weaknesses', 'Not performing poomsae at full quality'],
  'Full Review Circuit',
  'Yeop chagi x5 each side, dwit chagi x5 each side, naeryo chagi x5 each side, sonnal makki x5 each side, deung jumeok x10. Then Yi Jang once, Sam Jang once. Note your weakest technique.',
  8, 'none',
  'Can I name my weakest yellow belt technique and describe what I need to fix?',
  ARRAY[]::UUID[])
RETURNING id INTO ly9;


-- ═══════════════════════════════════════════════════════════════
-- 3c. LESSONS — GREEN BELT (9 Lessons)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'taekwondo', 1, 10,
  'The Crescent Arc',
  'Bandal chagi — sweeping the target',
  12,
  ARRAY['Draw a crescent moon with your foot', 'Hip drives the arc — not just the leg', 'Keep the leg relatively straight', 'Follow through past the target'],
  ARRAY['Bending the knee — becomes a roundhouse', 'Arc too tight', 'Dropping hands for momentum', 'No hip involvement'],
  'Arc Path Drill',
  'Hang a string or belt from a doorframe at head height. Practice sweeping past it with bandal chagi — the foot should brush the string from inside to outside. 10 per leg.',
  4, 'string or belt hung from doorframe',
  'Can my foot consistently brush a target on a sweeping crescent arc without bending the knee?',
  ARRAY[]::UUID[])
RETURNING id INTO lg1;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'taekwondo', 2, 10,
  'The Spinning Hook',
  'Dwi huryeo chagi — the highlight-reel knockout',
  15,
  ARRAY['Look over your shoulder FIRST — never spin blind', 'The hook is a tight question mark, not a wide swing', 'Speed of the spin creates the power', 'Strike with the heel'],
  ARRAY['Spinning blindly', 'Wide crescent instead of tight hook', 'Losing balance', 'Taking too long to face forward after'],
  'Ground Spin Drill',
  'Before going airborne: pivot on the lead foot and spin 360° while looking over your shoulder. Do this 10 times until the spin is smooth and you can spot a target on the wall. Then add the kick.',
  5, 'none',
  'Can I spin 360° on my support foot and spot a target at the 180° point?',
  ARRAY[]::UUID[])
RETURNING id INTO lg2;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'taekwondo', 3, 11,
  'The Twist Kick',
  'Biteureo chagi — the deception specialist',
  12,
  ARRAY['Chamber looks like ap chagi — that IS the trick', 'Twist the HIP, not just the foot', 'Late rotation — the disguise fails if you twist early', 'Targets the ribs and liver'],
  ARRAY['Telegraphing the twist', 'Twisting only the foot without hip', 'Losing the chamber', 'Over-rotating'],
  'Front Kick Fake Drill',
  'Throw 3 real ap chagi, then 1 biteureo chagi. Partner or mirror — can you tell the difference in the first half of the motion? If yes, the disguise needs work. 5 sets per leg.',
  4, 'none',
  'Can a training partner NOT tell whether I am throwing ap chagi or biteureo chagi until the moment of contact?',
  ARRAY[]::UUID[])
RETURNING id INTO lg3;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'taekwondo', 4, 11,
  'The Switch Kick',
  'Change your lead, change the fight',
  12,
  ARRAY['Switch and kick are ONE motion — no pause', 'Stay low during the switch — skip, don''t hop', 'Guard stays up through the switch', 'Can combine with dollyo, yeop, or ap'],
  ARRAY['Telegraphing with a big jump', 'Two separate movements', 'Landing flat-footed on the switch', 'Dropping hands during switch'],
  'Switch Sprint',
  'From fighting stance, do 10 switches without kicking — just the foot change. Focus on speed and keeping hands up. Then do 10 switch roundhouse kicks. Rest 30 sec. 3 sets.',
  4, 'none',
  'Can I switch my stance 10 times in a row without my hands dropping below my chin?',
  ARRAY[]::UUID[])
RETURNING id INTO lg4;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'taekwondo', 5, 12,
  'Multi-Kick Combinations',
  'Double and triple kicks without setting down',
  15,
  ARRAY['Keep the kicking leg in the air between kicks', 'Re-chamber between each kick', 'Each kick has a distinct target', 'Core holds the leg up — this is an ab workout'],
  ARRAY['Setting the foot down between kicks', 'Losing height on each successive kick', 'Forgetting to re-chamber', 'Running out of gas on kick 3'],
  'Double Kick Builder',
  'Start with double dollyo chagi (body then head) — 5 per leg. Then dollyo + naeryo — 5 per leg. Then triple: dollyo body + dollyo head + naeryo — 3 per leg. Rest as needed.',
  6, 'kicking shield',
  'Can I throw a double kick (body then head) without setting my foot down between kicks?',
  ARRAY[]::UUID[])
RETURNING id INTO lg5;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'taekwondo', 6, 12,
  'Advanced Kick Integration',
  'Mixing basic and advanced kicks in live combos',
  15,
  ARRAY['Start with a basic kick to set up the advanced one', 'Read the situation — which opening does the first kick create?', 'Speed changes keep the opponent guessing', 'Every combo should end with you in fighting stance'],
  ARRAY['Always using the same combo', 'Telegraphing the second kick', 'Not returning to stance after', 'Combos too slow — practice for speed'],
  'Freestyle Combo Rounds',
  '2-minute rounds: throw a different kick combo every 10 seconds. No combo repeated. Shadowbox or use a bag. Focus on variety and returning to guard. 3 rounds with 1-min rest.',
  6, 'heavy bag (optional)',
  'Can I throw 10 different kick combinations in 2 minutes without repeating any?',
  ARRAY[]::UUID[])
RETURNING id INTO lg6;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'taekwondo', 7, 13,
  'Taegeuk Sa Jang',
  'Poomsae 4 — the thunder cracks',
  15,
  ARRAY['Thunder energy — each technique lands with conviction', 'Side kicks in poomsae: full chamber, slow thrust, show control', 'Double knife hand block frames your center', 'Deeper stances than previous poomsae'],
  ARRAY['Side kick sloppy in poomsae', 'Double knife hand uneven', 'Stances too shallow', 'Losing thunder intensity'],
  'Power Isolation',
  'Identify the 3 most powerful moments in Sa Jang. Practice those 3 transitions 10 times each with maximum intensity. Then perform the full poomsae 3 times, channeling that energy throughout.',
  8, 'none',
  'Can I perform Sa Jang with consistent depth in every stance and a visible kihap spirit on every technique?',
  ARRAY[]::UUID[])
RETURNING id INTO lg7;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'taekwondo', 8, 13,
  'Taegeuk Oh Jang',
  'Poomsae 5 — flowing like the wind',
  15,
  ARRAY['Wind flows — but a hurricane is still wind', 'Hammer fist drops like a gavel', 'Elbow strike at close range with body rotation', 'First jump — land like a cat in cross stance'],
  ARRAY['Hammer fist lacking power', 'Elbow strike wrong trajectory', 'Jump too high or uncontrolled landing', 'Losing flow — becoming staccato'],
  'Jump Landing Practice',
  'Practice just the jump in Oh Jang — the cross-stance landing. Jump 10 times, focusing on soft quiet landing with correct foot placement. Then integrate it into the full poomsae. 3 full runs.',
  8, 'none',
  'Can I land the jump in Oh Jang silently with both feet in the correct cross-stance position?',
  ARRAY[]::UUID[])
RETURNING id INTO lg8;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'taekwondo', 9, 14,
  'Green Belt Assessment',
  'Review all green belt techniques & poomsae',
  15,
  ARRAY['Perform each advanced kick 5 times per side', 'Run Sa Jang and Oh Jang back-to-back', 'Test your combos — can you improvise?', 'Identify your strongest and weakest kick'],
  ARRAY['Rushing through', 'Avoiding the hard techniques', 'Not performing poomsae at competition quality'],
  'Complete Review',
  'Bandal chagi x5, dwi huryeo chagi x5, biteureo chagi x5, switch kick x5 (each leg). Double kick combo x5 each leg. Sa Jang, then Oh Jang. Note your strongest and weakest technique.',
  8, 'none',
  'Can I name my top 3 techniques and my weakest technique with specific improvement targets?',
  ARRAY[]::UUID[])
RETURNING id INTO lg9;


-- ═══════════════════════════════════════════════════════════════
-- 3d. LESSONS — BLUE BELT (8 Lessons)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_blue, 'taekwondo', 1, 14,
  'Jumping Front Kick',
  'Twi-eo ap chagi — take your front kick to the sky',
  12,
  ARRAY['Non-kicking knee is your rocket booster — drive it UP', 'Kick at the PEAK of the jump', 'Land soft — cat feet', 'Guard stays up while airborne'],
  ARRAY['Kicking on the way up', 'Jumping forward but not UP', 'Forgetting to chamber', 'Landing stiff-legged'],
  'Height Builder',
  'Alternate: 3 regular ap chagi, then 1 jumping ap chagi. The jump version should reach higher than your standing kick by at least 6 inches. 5 sets per leg. Use a target if available.',
  5, 'kicking pad (optional)',
  'Does my jumping front kick reach at least 6 inches higher than my standing front kick?',
  ARRAY[]::UUID[])
RETURNING id INTO lb1;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_blue, 'taekwondo', 2, 15,
  'Jumping Roundhouse',
  'Twi-eo dollyo chagi — TKD''s Olympic showstopper',
  15,
  ARRAY['You are a spinning top that also goes UP', 'Non-kicking knee drives height', 'Full hip turnover in the air', 'Strike at or above head height', 'Land facing the target'],
  ARRAY['Not jumping high enough', 'Incomplete hip turnover in the air', 'Landing off-balance', 'Kicking during ascent instead of at peak'],
  'Progressive Jump Drill',
  'Step 1: standing roundhouse to head height x5. Step 2: small hop roundhouse x5. Step 3: full jump roundhouse x5. Each leg. Focus on incrementally adding height while keeping form.',
  6, 'none',
  'Can I throw a jumping roundhouse that reaches head height and land balanced on my support foot?',
  ARRAY[]::UUID[])
RETURNING id INTO lb2;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_blue, 'taekwondo', 3, 15,
  '540 Kick Introduction',
  'The PhD of TKD kicking — begin the journey',
  15,
  ARRAY['Master the spin on the ground FIRST', 'Speed comes from the arms and the tuck, not effort', 'Spot, spin, spot, kick', 'This is a long-term project — patience is mandatory'],
  ARRAY['Not committing to the full spin', 'Spinning without jumping', 'Losing visual tracking', 'Attempting full power before mastering rotation'],
  '540 Progression',
  'Phase 1: 360° spin on the ground, no kick — 10 reps. Phase 2: 360° spin + slow roundhouse at the end — 5 reps. Phase 3: add a small hop to the spin — 5 reps. Do on mats only.',
  6, 'crash mat',
  'Can I complete a 360° standing spin with visual tracking and throw a controlled roundhouse at the end?',
  ARRAY[]::UUID[])
RETURNING id INTO lb3;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_blue, 'taekwondo', 4, 16,
  'Sparring Fundamentals',
  'Distance, timing, and the mental game',
  15,
  ARRAY['Distance is your shield — manage it like oxygen', 'Every exchange is a conversation — feints are your questions', 'Counter-attacking scores more than attacking', 'The best fighters don''t work harder, they time better'],
  ARRAY['Standing too close or too far', 'Always attacking — never reading', 'Ignoring feints', 'Fighting with the same rhythm'],
  'Distance Management Drill',
  'Shadow spar: slide forward to kicking range, throw 1 technique, slide back out. 2-minute rounds. Count how many times you enter and exit without getting stuck at close range. Goal: 15+ clean entries.',
  5, 'none',
  'Can I manage fighting distance — entering and exiting — without getting stuck in close range?',
  ARRAY[]::UUID[])
RETURNING id INTO lb4;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_blue, 'taekwondo', 5, 16,
  'Feints & Counter Strategy',
  'Making the opponent react to shadows',
  15,
  ARRAY['Feint with a slight knee lift — watch the reaction', 'If they react: attack the opening they create', 'If they don''t react: probe with a light kick', 'After scoring, EXIT immediately'],
  ARRAY['Feints too obvious — full movements instead of hints', 'Not following up when the feint works', 'Staying in range after scoring', 'Only feinting one way — becomes predictable'],
  'Feint & Fire',
  'Shadow spar: feint with a knee chamber, then based on the imagined reaction, choose your follow-up. 2-minute round: feint + technique every 8 seconds. Vary which kick you use after the feint. 3 rounds.',
  5, 'none',
  'Can I feint convincingly enough to draw a reaction from a training partner?',
  ARRAY[]::UUID[])
RETURNING id INTO lb5;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_blue, 'taekwondo', 6, 17,
  'Taegeuk Yuk Jang',
  'Poomsae 6 — flow like water',
  15,
  ARRAY['Water flows around obstacles — adapt', 'Knife hand to neck: precise as a scalpel', 'Palm block with a firm open hand', 'Roundhouse in poomsae is controlled, not wild'],
  ARRAY['Losing the flowing quality', 'Knife hand at wrong angle', 'Wrist collapsed on palm block', 'Roundhouse losing form in the pattern'],
  'Flow Focus',
  'Perform Yuk Jang at half speed — focus entirely on seamless transitions between techniques. No pauses, no jerky movements. Then at full speed. Compare how the flow feels. 3 full runs at each speed.',
  8, 'none',
  'Can I perform Yuk Jang with zero pauses between techniques — continuous water-like movement?',
  ARRAY[]::UUID[])
RETURNING id INTO lb6;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_blue, 'taekwondo', 7, 17,
  'Taegeuk Chil Jang',
  'Poomsae 7 — immovable as the mountain',
  15,
  ARRAY['You are the mountain — unmovable, patient, ancient', 'Tiger stance: sit low, coil like a spring', 'Knee strike drives from the earth through the hip', 'Every movement is deliberate and heavy'],
  ARRAY['Tiger stance too upright', 'Knee strike lacking hip drive', 'Inward palm block too far past center', 'Losing the heavy, rooted quality'],
  'Tiger Stance Endurance',
  'Hold tiger stance (beom seogi) for 15 seconds each side — deep and low. Then perform the sections of Chil Jang that use tiger stance 5 times each. Full Chil Jang 3 times to finish.',
  8, 'none',
  'Can I hold tiger stance for 15 seconds deep enough that my rear thigh burns?',
  ARRAY[]::UUID[])
RETURNING id INTO lb7;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_blue, 'taekwondo', 8, 18,
  'Blue Belt Assessment',
  'Review all blue belt techniques & poomsae',
  15,
  ARRAY['Perform each jumping kick 5 times per side', 'Run Yuk Jang and Chil Jang back-to-back', 'Shadow spar for 2 minutes using all your techniques', 'Rate yourself honestly: what needs the most work?'],
  ARRAY['Avoiding the 540 drill because it is hard', 'Rushing poomsae', 'Not shadow sparring with intent', 'Ignoring weaknesses'],
  'Comprehensive Test',
  'Twi-eo ap chagi x5, twi-eo dollyo x5, 540 spin drill x5 (each leg). Shadow spar 2 min. Yuk Jang once, Chil Jang once. Write down your 3 strongest and 3 weakest areas.',
  8, 'crash mat (for 540 drill)',
  'Can I perform all 7 Taegeuk poomsae in sequence without major errors in any of them?',
  ARRAY[]::UUID[])
RETURNING id INTO lb8;


-- ═══════════════════════════════════════════════════════════════
-- 4. LESSON-TECHNIQUE LINKS
-- ═══════════════════════════════════════════════════════════════

-- ─── White Belt Lesson Links ─────────────────────────────────

INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (lw1, t_ap_seogi,  'primary', 'Introduce natural stance — the home base of TKD'),
  (lw2, t_ap_kubi,   'primary', 'Teach the offensive stance with wall push test for depth'),
  (lw2, t_ap_seogi,  'review',  'Reinforce walking stance as the starting position'),
  (lw3, t_dwit_kubi, 'primary', 'Introduce the defensive counter-stance'),
  (lw3, t_ap_kubi,   'review',  'Compare front and back stance weight distribution'),
  (lw4, t_jireugi,   'primary', 'Teach the fundamental punch with fist rotation'),
  (lw4, t_ap_kubi,   'review',  'Punching from front stance to reinforce proper base'),
  (lw5, t_arae_makki,   'primary', 'Low, middle, and high blocks in one session'),
  (lw5, t_momtong_makki, 'primary', 'Compare starting positions of all three blocks'),
  (lw5, t_eolgul_makki,  'primary', 'Emphasize that each block defends a different zone'),
  (lw6, t_ap_chagi,  'primary', 'First kick — emphasize chamber over everything'),
  (lw6, t_ap_kubi,   'review',  'Review stance since kicks start from it'),
  (lw7, t_dollyo_chagi, 'primary', 'The signature kick — pivot is everything'),
  (lw7, t_ap_chagi,      'review',  'Compare linear vs circular kick mechanics'),
  (lw8, t_arae_makki,    'review', 'Block-counter combinations using all three blocks'),
  (lw8, t_momtong_makki, 'review', 'Practice flowing from block directly to counter'),
  (lw8, t_eolgul_makki,  'review', 'Link high block to jireugi and ap chagi counters'),
  (lw8, t_jireugi,       'review', 'The counter after the block'),
  (lw8, t_ap_chagi,      'review', 'Alternate counter: kick instead of punch after block'),
  (lw9, t_tg_il,         'primary', 'First poomsae — all white belt techniques together'),
  (lw9, t_ap_seogi,      'review', 'Poomsae uses walking stance transitions'),
  (lw9, t_ap_kubi,       'review', 'Front stance throughout Il Jang'),
  (lw9, t_arae_makki,    'review', 'Low blocks on the turns'),
  (lw9, t_momtong_makki, 'review', 'Middle blocks in the pattern'),
  (lw9, t_jireugi,       'review', 'Punches connect to blocks and kicks in poomsae'),
  (lw9, t_ap_chagi,      'review', 'Front kicks integrated into stepping combinations');

-- ─── Yellow Belt Lesson Links ────────────────────────────────

INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (ly1, t_yeop_chagi,   'primary', 'Side kick — emphasize blade of foot and thrust, not arc'),
  (ly1, t_ap_chagi,     'review',  'Compare front kick chamber with side kick chamber'),
  (ly2, t_dwit_chagi,   'primary', 'Back kick — eyes first, then the piston thrust'),
  (ly2, t_yeop_chagi,   'review',  'Review side kick to compare linear kick mechanics'),
  (ly3, t_naeryo_chagi, 'primary', 'Axe kick — height first, then gravity plus abs'),
  (ly3, t_dollyo_chagi, 'review',  'Review roundhouse to contrast horizontal vs vertical arc'),
  (ly4, t_sonnal_makki, 'primary', 'Knife hand block paired with back stance'),
  (ly4, t_dwit_kubi,    'review',  'Back stance is the mandatory partner of sonnal makki'),
  (ly5, t_deung_jumeok, 'primary', 'Backfist — elbow leads, fist whips'),
  (ly5, t_jireugi,      'review',  'Compare straight punch to whipping backfist'),
  (ly6, t_ap_chagi,      'review', 'Kick circuit — all kicks in sequence'),
  (ly6, t_dollyo_chagi,  'review', 'Linking different kicks in a circuit'),
  (ly6, t_yeop_chagi,    'review', 'Side kick in the sequence'),
  (ly6, t_dwit_chagi,    'review', 'Back kick in the sequence'),
  (ly7, t_tg_yi,         'primary', 'Second poomsae — builds on Il Jang with high block'),
  (ly7, t_eolgul_makki,  'review', 'High block is the new technique in Yi Jang'),
  (ly7, t_tg_il,         'review', 'Compare and contrast with Il Jang'),
  (ly8, t_tg_sam,        'primary', 'Third poomsae — fire element with knife hand'),
  (ly8, t_sonnal_makki,  'review', 'Knife hand block in context of poomsae'),
  (ly8, t_dwit_kubi,     'review', 'Back stance transitions in Sam Jang'),
  (ly9, t_yeop_chagi,    'review', 'Full yellow belt kick review'),
  (ly9, t_dwit_chagi,    'review', 'Back kick review'),
  (ly9, t_naeryo_chagi,  'review', 'Axe kick review'),
  (ly9, t_sonnal_makki,  'review', 'Knife hand block review'),
  (ly9, t_deung_jumeok,  'review', 'Backfist review'),
  (ly9, t_tg_yi,         'review', 'Yi Jang poomsae review'),
  (ly9, t_tg_sam,        'review', 'Sam Jang poomsae review');

-- ─── Green Belt Lesson Links ─────────────────────────────────

INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (lg1, t_bandal_chagi,     'primary', 'Crescent kick — wide arc with straight leg'),
  (lg1, t_dollyo_chagi,     'review',  'Compare the arc of crescent vs roundhouse'),
  (lg2, t_dwi_huryeo_chagi, 'primary', 'Spinning hook kick — ground spin first, then add the kick'),
  (lg2, t_dwit_chagi,       'review',  'Compare back kick line vs spinning hook arc'),
  (lg3, t_biteureo_chagi,   'primary', 'Twist kick — deception through late hip rotation'),
  (lg3, t_ap_chagi,         'review',  'Front kick is the disguise — practice both to make them identical'),
  (lg4, t_switch_kick,      'primary', 'Switch kick — stance change flows into immediate kick'),
  (lg4, t_dollyo_chagi,     'review',  'Roundhouse is the most common kick to pair with the switch'),
  (lg5, t_kick_combo,       'primary', 'Multi-kick sequences without touching down'),
  (lg5, t_dollyo_chagi,     'review',  'Double roundhouse is the gateway combo'),
  (lg5, t_naeryo_chagi,     'review',  'Roundhouse-to-axe is a classic pairing'),
  (lg6, t_bandal_chagi,     'review',  'Integrate all advanced kicks into live combos'),
  (lg6, t_dwi_huryeo_chagi, 'review',  'Spinning hook in a combination context'),
  (lg6, t_biteureo_chagi,   'review',  'Twist kick as a follow-up in combos'),
  (lg6, t_switch_kick,      'review',  'Switch kick as a combo opener'),
  (lg7, t_tg_sa,            'primary', 'Fourth poomsae — thunder energy with side kick'),
  (lg7, t_yeop_chagi,       'review',  'Side kick in the context of Sa Jang poomsae'),
  (lg7, t_sonnal_makki,     'review',  'Double knife hand block in Sa Jang'),
  (lg8, t_tg_oh,            'primary', 'Fifth poomsae — wind with hammer fist and jump'),
  (lg8, t_tg_sa,            'review',  'Run Sa Jang before Oh Jang for continuity'),
  (lg9, t_bandal_chagi,     'review',  'Green belt assessment — all techniques'),
  (lg9, t_dwi_huryeo_chagi, 'review',  'Spinning hook review'),
  (lg9, t_biteureo_chagi,   'review',  'Twist kick review'),
  (lg9, t_switch_kick,      'review',  'Switch kick review'),
  (lg9, t_kick_combo,       'review',  'Multi-kick combo review'),
  (lg9, t_tg_sa,            'review',  'Sa Jang poomsae review'),
  (lg9, t_tg_oh,            'review',  'Oh Jang poomsae review');

-- ─── Blue Belt Lesson Links ──────────────────────────────────

INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (lb1, t_twi_ap_chagi,     'primary', 'Jumping front kick — non-kicking knee drives the lift'),
  (lb1, t_ap_chagi,         'review',  'Review standing front kick to compare chamber mechanics'),
  (lb2, t_twi_dollyo_chagi, 'primary', 'Jumping roundhouse — the Olympic showstopper'),
  (lb2, t_dollyo_chagi,     'review',  'Review standing roundhouse for hip turnover comparison'),
  (lb3, t_540_kick,         'primary', '540 introduction — ground spin progression'),
  (lb3, t_twi_dollyo_chagi, 'review',  'Review jumping roundhouse as the aerial foundation'),
  (lb4, t_sparring_strategy, 'primary', 'Sparring fundamentals — distance and timing'),
  (lb4, t_dollyo_chagi,      'review',  'Roundhouse as the primary sparring tool'),
  (lb4, t_ap_chagi,          'review',  'Front kick for distance management in sparring'),
  (lb5, t_sparring_strategy, 'primary', 'Feints and counter-strategy development'),
  (lb5, t_switch_kick,       'review',  'Switch kick as a feint-to-attack tool'),
  (lb5, t_biteureo_chagi,    'review',  'Twist kick as a counter after reading a reaction'),
  (lb6, t_tg_yuk,            'primary', 'Sixth poomsae — water-like continuous flow'),
  (lb6, t_sonnal_makki,      'review',  'Knife hand techniques within Yuk Jang'),
  (lb6, t_dollyo_chagi,      'review',  'Roundhouse kick integration in poomsae'),
  (lb7, t_tg_chil,           'primary', 'Seventh poomsae — mountain stability and tiger stance'),
  (lb7, t_tg_yuk,            'review',  'Run Yuk Jang before Chil Jang for flow contrast'),
  (lb8, t_twi_ap_chagi,      'review',  'Blue belt assessment — all jumping kicks'),
  (lb8, t_twi_dollyo_chagi,  'review',  'Jumping roundhouse review'),
  (lb8, t_540_kick,          'review',  '540 spin drill review'),
  (lb8, t_sparring_strategy, 'review',  'Shadow sparring assessment'),
  (lb8, t_tg_yuk,            'review',  'Yuk Jang poomsae review'),
  (lb8, t_tg_chil,           'review',  'Chil Jang poomsae review');

-- ═══════════════════════════════════════════════════════════════
-- 5. Wire up related_technique_ids
-- ═══════════════════════════════════════════════════════════════

UPDATE ma_techniques SET related_technique_ids = ARRAY[t_ap_kubi, t_dwit_kubi]      WHERE id = t_ap_seogi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_ap_seogi, t_dwit_kubi]      WHERE id = t_ap_kubi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_ap_seogi, t_ap_kubi]        WHERE id = t_dwit_kubi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_deung_jumeok]               WHERE id = t_jireugi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_momtong_makki, t_eolgul_makki] WHERE id = t_arae_makki;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_arae_makki, t_eolgul_makki]    WHERE id = t_momtong_makki;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_arae_makki, t_momtong_makki]   WHERE id = t_eolgul_makki;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_dollyo_chagi, t_twi_ap_chagi]  WHERE id = t_ap_chagi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_ap_chagi, t_bandal_chagi, t_twi_dollyo_chagi] WHERE id = t_dollyo_chagi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_tg_yi, t_tg_sam]            WHERE id = t_tg_il;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_ap_chagi, t_dwit_chagi]     WHERE id = t_yeop_chagi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_yeop_chagi, t_dwi_huryeo_chagi] WHERE id = t_dwit_chagi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_ap_chagi, t_dollyo_chagi]   WHERE id = t_naeryo_chagi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_arae_makki, t_momtong_makki] WHERE id = t_sonnal_makki;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_jireugi]                    WHERE id = t_deung_jumeok;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_tg_il, t_tg_sam]            WHERE id = t_tg_yi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_tg_yi, t_tg_sa]             WHERE id = t_tg_sam;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_dollyo_chagi]               WHERE id = t_bandal_chagi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_dwit_chagi, t_540_kick]     WHERE id = t_dwi_huryeo_chagi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_ap_chagi]                   WHERE id = t_biteureo_chagi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_dollyo_chagi, t_ap_chagi]   WHERE id = t_switch_kick;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_dollyo_chagi, t_naeryo_chagi] WHERE id = t_kick_combo;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_tg_sam, t_tg_oh]            WHERE id = t_tg_sa;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_tg_sa, t_tg_yuk]            WHERE id = t_tg_oh;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_ap_chagi]                   WHERE id = t_twi_ap_chagi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_dollyo_chagi, t_540_kick]   WHERE id = t_twi_dollyo_chagi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_twi_dollyo_chagi, t_dwi_huryeo_chagi] WHERE id = t_540_kick;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_tg_oh, t_tg_chil]           WHERE id = t_tg_yuk;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_tg_yuk]                     WHERE id = t_tg_chil;

END $$;
