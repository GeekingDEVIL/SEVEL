-- Karate (Shotokan) curriculum seed — spec item 64

DO $$
DECLARE
  -- ═══════════════════════════════════════════════════════════
  -- Level IDs
  -- ═══════════════════════════════════════════════════════════
  lvl_white  UUID;
  lvl_yellow UUID;
  lvl_green  UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Technique IDs — Stances
  -- ═══════════════════════════════════════════════════════════
  t_zenkutsu   UUID;
  t_kokutsu    UUID;
  t_kiba       UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Technique IDs — Strikes (Level 1)
  -- ═══════════════════════════════════════════════════════════
  t_oi_zuki    UUID;
  t_gyaku_zuki UUID;
  t_age_uke    UUID;
  t_soto_uke   UUID;
  t_gedan_barai UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Technique IDs — Kicks (Level 1)
  -- ═══════════════════════════════════════════════════════════
  t_mae_geri   UUID;
  t_yoko_geri  UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Technique IDs — Kata (Level 1)
  -- ═══════════════════════════════════════════════════════════
  t_taikyoku_shodan UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Technique IDs — Strikes (Level 2)
  -- ═══════════════════════════════════════════════════════════
  t_shuto_uchi UUID;
  t_uraken     UUID;
  t_empi       UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Technique IDs — Kicks (Level 2)
  -- ═══════════════════════════════════════════════════════════
  t_mawashi_geri UUID;
  t_ushiro_geri  UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Technique IDs — Blocks (Level 2)
  -- ═══════════════════════════════════════════════════════════
  t_uchi_uke   UUID;
  t_morote_uke UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Technique IDs — Kata (Level 2)
  -- ═══════════════════════════════════════════════════════════
  t_heian_shodan UUID;
  t_heian_nidan  UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Technique IDs — Advanced (Level 3)
  -- ═══════════════════════════════════════════════════════════
  t_ura_mawashi UUID;
  t_tobi_geri   UUID;
  t_kizami_zuki UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Technique IDs — Combos (Level 3)
  -- ═══════════════════════════════════════════════════════════
  t_combo_sanbon UUID;
  t_combo_gyaku_mawashi UUID;
  t_combo_kizami_gyaku_mae UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Technique IDs — Kata (Level 3)
  -- ═══════════════════════════════════════════════════════════
  t_heian_sandan  UUID;
  t_heian_yondan  UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Technique IDs — Kumite (Level 3)
  -- ═══════════════════════════════════════════════════════════
  t_kumite_kihon   UUID;
  t_kumite_jiyu    UUID;

  -- ═══════════════════════════════════════════════════════════
  -- Lesson IDs
  -- ═══════════════════════════════════════════════════════════
  les_w1  UUID; les_w2  UUID; les_w3  UUID; les_w4  UUID; les_w5  UUID;
  les_w6  UUID; les_w7  UUID; les_w8  UUID; les_w9  UUID; les_w10 UUID;
  les_y1  UUID; les_y2  UUID; les_y3  UUID; les_y4  UUID; les_y5  UUID;
  les_y6  UUID; les_y7  UUID; les_y8  UUID; les_y9  UUID; les_y10 UUID;
  les_g1  UUID; les_g2  UUID; les_g3  UUID; les_g4  UUID; les_g5  UUID;
  les_g6  UUID; les_g7  UUID; les_g8  UUID; les_g9  UUID; les_g10 UUID;

BEGIN

-- ═══════════════════════════════════════════════════════════════
-- 1. CURRICULUM LEVELS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ma_curriculum_levels (id, discipline, level_key, level_order, title, subtitle, belt_name, lesson_count)
VALUES
  (gen_random_uuid(), 'karate', 'white_belt',  1, 'White Belt Foundations', 'Core stances, basic strikes, blocks, and your first kata', 'White Belt (9th Kyu)', 10),
  (gen_random_uuid(), 'karate', 'yellow_belt', 2, 'Yellow/Orange Belt', 'Expanded striking, advanced blocks, and Heian kata series', 'Yellow/Orange Belt (8th-7th Kyu)', 10),
  (gen_random_uuid(), 'karate', 'green_belt',  3, 'Green/Blue Belt', 'Advanced kicks, combinations, kata mastery, and kumite sparring', 'Green/Blue Belt (6th-5th Kyu)', 10)
RETURNING id INTO lvl_white;

SELECT id INTO lvl_white  FROM ma_curriculum_levels WHERE discipline = 'karate' AND level_key = 'white_belt';
SELECT id INTO lvl_yellow FROM ma_curriculum_levels WHERE discipline = 'karate' AND level_key = 'yellow_belt';
SELECT id INTO lvl_green  FROM ma_curriculum_levels WHERE discipline = 'karate' AND level_key = 'green_belt';

-- ═══════════════════════════════════════════════════════════════
-- 2. TECHNIQUES
-- ═══════════════════════════════════════════════════════════════

-- ─── STANCES ─────────────────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'stance', 'basic_stance', 'Zenkutsu-dachi (Front Stance)',
  'The foundational forward stance in Shotokan. Weight distributed 60/40 front/back with a deep, stable base used for powerful forward techniques.',
  'beginner', 'White Belt',
  ARRAY['Front knee bent directly over toes', 'Back leg fully extended and locked', 'Hips square to the front', 'Weight 60% front, 40% back', 'Feet shoulder-width apart laterally'],
  ARRAY['Back knee bending — keep it locked straight', 'Stance too narrow — maintain hip-width lateral distance', 'Leaning forward over the front knee', 'Rear heel lifting off the floor'],
  ARRAY['Begin in musubi-dachi (attention stance) with feet together', 'Step forward with one leg approximately two shoulder-widths', 'Bend the front knee until it is directly over the toes', 'Straighten and lock the back leg completely', 'Press the rear heel firmly into the floor', 'Square the hips to face forward', 'Distribute weight 60% front, 40% back'],
  ARRAY['Sink your hips — imagine sitting into the stance', 'Press the back heel down like you are cracking a walnut', 'Front knee tracks over the big toe', 'Engage your core to stabilize the pelvis'],
  ARRAY['quadriceps', 'glutes', 'hamstrings', 'calves', 'core'],
  'none', 'both', NULL)
RETURNING id INTO t_zenkutsu;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'stance', 'basic_stance', 'Kokutsu-dachi (Back Stance)',
  'A defensive stance with weight shifted to the rear leg (70/30). Used for receiving attacks and executing counter-techniques.',
  'beginner', 'White Belt',
  ARRAY['Weight 70% back, 30% front', 'Back knee bent deeply over the rear foot', 'Front foot points forward, back foot perpendicular', 'Feet on a single line (heel-to-heel alignment)', 'Torso turned 45 degrees (hanmi)'],
  ARRAY['Shifting too much weight forward', 'Feet not on the correct L-shape angle', 'Back knee collapsing inward', 'Standing too upright — hips need to be low'],
  ARRAY['Start in yoi (ready position)', 'Step back with one leg about 1.5 shoulder-widths', 'Turn the rear foot 90 degrees so it is perpendicular', 'Bend the back knee deeply over the rear foot', 'Keep the front leg slightly bent with foot pointing forward', 'Align the front heel with the back heel', 'Turn the torso 45 degrees to the side'],
  ARRAY['Sit into your back leg like a loaded spring', 'Feel the L-shape in your feet', 'Keep the front foot light — you should be able to lift it easily', 'Shoulder over the back hip'],
  ARRAY['quadriceps', 'glutes', 'hamstrings', 'hip_flexors', 'core'],
  'none', 'both', NULL)
RETURNING id INTO t_kokutsu;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'stance', 'basic_stance', 'Kiba-dachi (Horse Stance)',
  'A wide, symmetrical stance resembling riding a horse. Develops lower-body strength and stability. Used for side-facing techniques.',
  'beginner', 'White Belt',
  ARRAY['Feet parallel, about two shoulder-widths apart', 'Both knees bent deeply and pushed outward', 'Weight centered 50/50', 'Back straight and vertical', 'Hips tucked under — no forward lean'],
  ARRAY['Knees caving inward instead of pressing outward', 'Leaning forward from the waist', 'Stance too shallow — sink lower', 'Feet angling outward instead of staying parallel'],
  ARRAY['Stand with feet together', 'Step out to the side about two shoulder-widths', 'Keep both feet parallel pointing forward', 'Bend both knees deeply, pressing them outward', 'Drop the hips straight down', 'Keep the spine vertical and shoulders over hips', 'Tuck the pelvis slightly under'],
  ARRAY['Push your knees apart like spreading the floor', 'Imagine sitting on an invisible horse', 'Drop your center of gravity — lower is stronger', 'Spine straight as a pillar'],
  ARRAY['quadriceps', 'adductors', 'glutes', 'core', 'calves'],
  'none', 'both', NULL)
RETURNING id INTO t_kiba;

-- ─── STRIKES (Level 1) ──────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'strike', 'punch', 'Oi-zuki (Lunge Punch)',
  'A stepping punch where the punching arm and stepping leg move together on the same side. The primary attacking technique in basic Shotokan.',
  'beginner', 'White Belt',
  ARRAY['Punch and step land simultaneously', 'Punching hand and forward foot are on the same side', 'Hikite (pulling hand) retracts sharply to the hip', 'Rotate the fist so knuckles face up at extension', 'Drive from the back leg as you step'],
  ARRAY['Punch arriving before or after the step', 'Forgetting hikite — the pulling hand stays limp', 'Rising up during the step instead of driving forward low', 'Over-extending and losing balance'],
  ARRAY['Begin in zenkutsu-dachi with the opposite arm extended', 'Drive off the back leg to step forward', 'As the front foot lands, punch simultaneously with the same-side arm', 'Rotate the fist from palm-up at the hip to palm-down at extension', 'Retract the opposite hand sharply to the hip (hikite)', 'Finish in a deep zenkutsu-dachi with hips square'],
  ARRAY['Step and punch are ONE beat, not two', 'Squeeze the fist tight at the moment of impact', 'Drive forward from the back leg — do not fall forward', 'Hikite pulls back with equal force to the punch'],
  ARRAY['shoulders', 'triceps', 'core', 'quadriceps', 'glutes', 'lats'],
  'none', 'both', NULL)
RETURNING id INTO t_oi_zuki;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'strike', 'punch', 'Gyaku-zuki (Reverse Punch)',
  'The most powerful hand technique in Shotokan. The rear hand punches while the front foot stays planted, generating power through hip rotation.',
  'beginner', 'White Belt',
  ARRAY['Punch with the rear hand while front foot stays planted', 'Sharp hip rotation drives the punch', 'Shoulders rotate with the hips — not independently', 'Front knee stays over the front toes', 'Fist rotates on extension'],
  ARRAY['Hips not rotating — punching with arm only', 'Lifting the rear heel during rotation', 'Front knee collapsing inward', 'Leaning back away from the target'],
  ARRAY['Start in zenkutsu-dachi with the lead hand in guard', 'Initiate the punch by rotating the rear hip forward', 'Drive the rear fist straight toward the target', 'Rotate the fist from palm-up to palm-down at extension', 'Pull the lead hand to the hip as hikite', 'Lock the hips at the moment of impact for kime (focus)'],
  ARRAY['Your hips launch the punch — the arm just delivers it', 'Snap the hip like cracking a whip', 'Feel the power chain: floor, legs, hips, core, shoulder, fist', 'Kime! Lock everything at the moment of impact'],
  ARRAY['core', 'obliques', 'shoulders', 'triceps', 'glutes', 'quadriceps'],
  'none', 'both', NULL)
RETURNING id INTO t_gyaku_zuki;

-- ─── BLOCKS (Level 1) ───────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'defense', 'block', 'Age-uke (Rising Block)',
  'An upward sweeping block used to deflect attacks coming from above, such as downward strikes. The forearm rises to protect the head.',
  'beginner', 'White Belt',
  ARRAY['Blocking arm sweeps upward across the face', 'Forearm finishes one fist-width above the forehead', 'Forearm angled about 45 degrees', 'Wrist rotates during the block', 'Hikite retracts simultaneously'],
  ARRAY['Blocking arm finishing too far forward or back', 'Not rotating the forearm during the sweep', 'Block too close to the head — leave space', 'Forgetting hikite with the opposite hand'],
  ARRAY['Start with the blocking arm at the opposite hip, palm up', 'Begin sweeping the arm upward across the centerline', 'Simultaneously retract the other arm to the hip as hikite', 'Rotate the forearm as it rises so the outer edge deflects', 'Finish with the forearm angled one fist above the forehead', 'Lock the position and maintain zenkutsu-dachi'],
  ARRAY['Sweep across your face like raising a visor', 'The forearm is your shield — angle it to deflect, not absorb', 'Both arms move at the same speed — block and hikite are twins', 'Lock the shoulder down — do not shrug'],
  ARRAY['biceps', 'deltoids', 'forearms', 'core', 'lats'],
  'none', 'both', NULL)
RETURNING id INTO t_age_uke;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'defense', 'block', 'Soto-uke (Outside Block)',
  'A mid-level block where the forearm sweeps from outside to inside across the body, deflecting punches and strikes to the torso.',
  'beginner', 'White Belt',
  ARRAY['Forearm sweeps from outside to inside', 'Elbow stays close to the body at about 90 degrees', 'Block covers the centerline at chest height', 'Hip rotation powers the block', 'Contact made with the outer edge of the forearm'],
  ARRAY['Elbow flaring too far from the body', 'Sweeping too wide — block should be compact', 'No hip rotation — arm-only block is weak', 'Finishing with the fist too far past the centerline'],
  ARRAY['Bring the blocking fist to the opposite ear, elbow raised', 'Rotate the hips and sweep the forearm inward across the body', 'Keep the elbow bent at roughly 90 degrees throughout', 'Stop when the fist reaches the centerline at chest height', 'Simultaneously pull the other hand to the hip as hikite', 'Maintain strong zenkutsu-dachi throughout'],
  ARRAY['Elbow stays glued to your ribs — do not let it fly out', 'Block with your hip rotation, not just your arm', 'Think of sweeping an attack away from your body', 'Compact and sharp — no wide looping motions'],
  ARRAY['forearms', 'biceps', 'obliques', 'core', 'deltoids'],
  'none', 'both', NULL)
RETURNING id INTO t_soto_uke;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'defense', 'block', 'Gedan-barai (Downward Sweep Block)',
  'A powerful downward sweeping block to deflect attacks aimed at the lower body (kicks and low punches). One of the first techniques learned in Shotokan.',
  'beginner', 'White Belt',
  ARRAY['Arm sweeps downward across the body', 'Fist finishes one fist-width above the front knee', 'Forearm fully extended but not locked', 'Hip rotation adds power to the sweep', 'Opposite hand pulls to hip as hikite'],
  ARRAY['Bending forward at the waist during the block', 'Block ending too high — it should reach near knee level', 'No hip engagement — arm sweeps without body connection', 'Starting hand not crossing to the opposite shoulder'],
  ARRAY['Cross the blocking fist to the opposite shoulder, palm facing the ear', 'Rotate the hips and sweep the arm diagonally downward', 'The forearm travels across the centerline', 'Finish with the fist one fist-width above the front knee', 'Simultaneously retract the opposite hand to the hip', 'Keep the back straight — do not lean forward'],
  ARRAY['Sweep it away like clearing a table', 'Start high at the opposite ear, finish low at the front knee', 'Drive the block with your hip — the arm follows', 'Stay tall — do not bow into the block'],
  ARRAY['forearms', 'deltoids', 'core', 'obliques', 'lats'],
  'none', 'both', NULL)
RETURNING id INTO t_gedan_barai;

-- ─── KICKS (Level 1) ────────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'kick', 'basic_kick', 'Mae-geri (Front Kick)',
  'A straight kick delivered with the ball of the foot (koshi). Can target the midsection (chudan) or face (jodan). Fundamental kicking technique.',
  'beginner', 'White Belt',
  ARRAY['Strike with the ball of the foot (koshi), not the toes', 'Chamber the knee high before extending', 'Snap the kick and retract — do not leave the leg extended', 'Supporting leg stays slightly bent', 'Hips thrust forward at the point of impact'],
  ARRAY['Kicking with the toes — pull toes back to expose the ball', 'Not chambering — leg swings like a pendulum', 'Leaning too far back to compensate for the kick', 'Not retracting the kick — leg stays out and is vulnerable'],
  ARRAY['From fighting stance, lift the kicking knee to chamber position', 'Pull the toes back to expose the ball of the foot', 'Snap the lower leg forward, extending through the target', 'Thrust the hips slightly forward at full extension', 'Immediately retract the leg back to chamber', 'Return the foot to the original stance position'],
  ARRAY['Knee up first — always chamber before you kick', 'Snap it out and snap it back — the kick is a whip', 'Pull your toes back hard — kick with the ball of the foot', 'Keep your guard up while you kick'],
  ARRAY['quadriceps', 'hip_flexors', 'calves', 'core', 'glutes'],
  'none', 'both', NULL)
RETURNING id INTO t_mae_geri;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'kick', 'basic_kick', 'Yoko-geri (Side Kick)',
  'A powerful lateral kick delivered with the edge of the foot (sokuto). Can be performed as a snap kick (keage) or thrust kick (kekomi).',
  'beginner', 'White Belt',
  ARRAY['Strike with the edge/blade of the foot (sokuto)', 'Chamber the knee across the body', 'Pivot the supporting foot 180 degrees', 'Extend the kick in a straight line from the hip', 'Lean the torso away from the kick for balance'],
  ARRAY['Kicking with the flat of the foot instead of the edge', 'Not pivoting the supporting foot — limits range and power', 'Knee not chambering high enough before extension', 'Kicking upward instead of thrusting sideways'],
  ARRAY['From kiba-dachi or fighting stance, lift the knee across the body', 'Pivot the supporting foot so the heel points toward the target', 'Thrust the foot laterally, extending the leg in a straight line', 'Strike with the outer edge (sokuto) of the foot', 'Lean the upper body away from the kick for counterbalance', 'Retract the kick back to the chambered position', 'Return to the original stance'],
  ARRAY['Pivot, chamber, thrust — three beats then snap it back', 'Turn your supporting foot completely — your heel aims at the target', 'Push through the target like kicking down a door', 'Blade of the foot — imagine you are stamping on something sideways'],
  ARRAY['glutes', 'hip_abductors', 'quadriceps', 'obliques', 'core', 'calves'],
  'none', 'both', NULL)
RETURNING id INTO t_yoko_geri;

-- ─── KATA (Level 1) ─────────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'forms', 'kata', 'Taikyoku Shodan (First Cause, First Form)',
  'The most basic Shotokan kata, consisting of gedan-barai and oi-zuki in zenkutsu-dachi. Teaches the I-shaped embusen (performance line) and 180/90-degree turns.',
  'beginner', 'White Belt',
  ARRAY['20 movements total', 'Only two techniques: gedan-barai and oi-zuki', 'Performed entirely in zenkutsu-dachi', 'Embusen is an I-shape (forward, turn, back)', 'Each turn begins with gedan-barai', 'Kiai on movements 9 and 17'],
  ARRAY['Losing the embusen line — not returning to the start point', 'Rushing through turns — each turn is a block', 'Inconsistent stance depth throughout the kata', 'No kiai or weak kiai at the designated points', 'Looking down instead of at the imaginary opponent'],
  ARRAY['Bow, announce "Taikyoku Shodan", assume yoi (ready stance)', 'Turn left 90 degrees into zenkutsu-dachi with gedan-barai', 'Step forward with oi-zuki', 'Turn 180 degrees with gedan-barai', 'Step forward with oi-zuki', 'Step forward with oi-zuki', 'Step forward with oi-zuki — KIAI on this punch', 'Turn 90 degrees left with gedan-barai', 'Continue the pattern: gedan-barai on turns, oi-zuki stepping', 'Finish facing the original direction, bow'],
  ARRAY['Every turn is a block against a new attacker', 'Eyes lead the body — look before you turn', 'Same depth of stance on every single step', 'Two kiai points: halfway through and on the final technique', 'You should end on the exact spot where you started'],
  ARRAY['quadriceps', 'glutes', 'core', 'shoulders', 'triceps', 'forearms'],
  'none', 'both', NULL)
RETURNING id INTO t_taikyoku_shodan;

-- ─── STRIKES (Level 2) ──────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'strike', 'hand_strike', 'Shuto-uchi (Knife Hand Strike)',
  'An open-hand strike using the edge of the hand (the knife edge). Can be delivered inward or outward. Often used in combination with shuto-uke (knife hand block).',
  'intermediate', 'Yellow/Orange Belt',
  ARRAY['Strike with the meaty edge of the hand below the pinky', 'Fingers held tightly together, thumb tucked in', 'Hand stays rigid — do not let it flop on contact', 'Hip rotation drives the strike', 'Can target neck, temple, collarbone, or ribs'],
  ARRAY['Fingers splaying apart on contact', 'Striking with the flat of the hand instead of the edge', 'No hip rotation — arm-only strike', 'Thumb sticking out — it should be tucked against the palm'],
  ARRAY['Form the shuto hand: fingers pressed together, thumb tucked', 'Bring the striking hand to the opposite ear, palm facing the ear', 'Rotate the hips toward the target', 'Sweep the hand outward in an arc, striking with the knife edge', 'Follow through slightly then retract', 'Opposite hand pulls to hip as hikite'],
  ARRAY['Your hand is a blade — keep it rigid and tight', 'Edge of the hand, not the palm', 'Power comes from the hips, not just the arm swing', 'Tuck that thumb or you will jam it'],
  ARRAY['forearms', 'deltoids', 'obliques', 'core', 'wrist_extensors'],
  'none', 'both', NULL)
RETURNING id INTO t_shuto_uchi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'strike', 'hand_strike', 'Uraken-uchi (Backfist Strike)',
  'A fast, snapping strike using the back of the first two knuckles. Primarily a speed technique targeting the temple, bridge of the nose, or face.',
  'intermediate', 'Yellow/Orange Belt',
  ARRAY['Strike with the back of the two large knuckles', 'Elbow acts as the hinge — the forearm snaps out', 'Quick snap out and immediate retraction', 'Primarily a speed technique, not a power technique', 'Can be horizontal (to the side) or vertical (downward)'],
  ARRAY['Using too much shoulder — it should be an elbow snap', 'Not retracting fast enough — leaves the hand exposed', 'Hitting with the fingers instead of the knuckles', 'Telegraphing the strike with a big wind-up'],
  ARRAY['From guard position, bring the fist near the opposite shoulder', 'Snap the forearm outward using the elbow as a pivot', 'Strike the target with the back of the knuckles', 'Immediately snap the hand back to guard position', 'Keep the motion compact and explosive'],
  ARRAY['Snap it like cracking a whip — out and back', 'The elbow is the hinge, the fist is the tip of the whip', 'Speed over power — this is your fastest hand technique', 'Compact motion — no big wind-up'],
  ARRAY['forearms', 'triceps', 'deltoids', 'core'],
  'none', 'both', NULL)
RETURNING id INTO t_uraken;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'strike', 'elbow', 'Empi-uchi (Elbow Strike)',
  'A devastating close-range strike using the point of the elbow. Multiple variations: mae empi (forward), yoko empi (side), mawashi empi (circular), and ushiro empi (rear).',
  'intermediate', 'Yellow/Orange Belt',
  ARRAY['Strike with the point of the elbow', 'Extremely close-range technique', 'Full body rotation maximizes impact', 'Opposite hand grabs the fist of the striking arm at impact', 'Can be delivered forward, sideways, upward, or backward'],
  ARRAY['Standing too far away — empi requires close range', 'Not rotating the hips into the strike', 'Lifting the shoulder — the elbow should travel in a compact arc', 'Forgetting to use the non-striking hand to reinforce'],
  ARRAY['Close the distance to the target — elbow range is very short', 'Bring the striking arm across the body, fist near opposite hip', 'Rotate the hips explosively toward the target', 'Drive the elbow forward and upward into the target', 'Grab the fist of the striking arm with the opposite hand at impact', 'Hold the locked position briefly, then return to guard'],
  ARRAY['Close the gap — you need to be nose-to-nose range', 'Your whole body is behind this — rotate everything', 'The elbow is a battering ram — drive through the target', 'Grab your own fist at impact to lock the strike'],
  ARRAY['core', 'obliques', 'deltoids', 'biceps', 'pectorals'],
  'none', 'both', NULL)
RETURNING id INTO t_empi;

-- ─── KICKS (Level 2) ────────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'kick', 'power_kick', 'Mawashi-geri (Roundhouse Kick)',
  'A circular kick delivered with the ball of the foot or instep. The hip and supporting foot pivot to allow the leg to sweep around in an arc.',
  'intermediate', 'Yellow/Orange Belt',
  ARRAY['Strike with the ball of the foot (koshi) or instep', 'Chamber the knee high to the side', 'Pivot the supporting foot 180 degrees', 'Hips rotate fully into the kick', 'Snap the lower leg around in a whipping arc'],
  ARRAY['Not pivoting the supporting foot — limits hip rotation', 'Kicking upward instead of around — it is a round kick, not a front kick', 'Dropping hands during the kick', 'Not chambering — leg swings in a wide arc with no control'],
  ARRAY['From fighting stance, lift the kicking knee to the side at hip height', 'Begin pivoting the supporting foot so the heel faces the target', 'Rotate the hips into the kick', 'Snap the lower leg around in an arc toward the target', 'Strike with the ball of the foot or instep', 'Retract the leg back to the chambered position', 'Return to fighting stance'],
  ARRAY['Chamber high to the side, then whip it around', 'Your supporting heel must face the target — pivot!', 'Hips drive the kick — let your body rotate fully', 'Snap it back just as fast as it went out'],
  ARRAY['hip_flexors', 'quadriceps', 'glutes', 'obliques', 'core', 'calves'],
  'none', 'both', NULL)
RETURNING id INTO t_mawashi_geri;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'kick', 'power_kick', 'Ushiro-geri (Back Kick)',
  'A straight thrust kick delivered backward. One of the most powerful kicks in karate, using the heel as the striking surface while looking over the shoulder.',
  'intermediate', 'Yellow/Orange Belt',
  ARRAY['Strike with the heel', 'Look over the shoulder at the target before kicking', 'Kick travels in a straight line behind you', 'Chamber the knee before thrusting backward', 'Lean the torso forward for counterbalance'],
  ARRAY['Not looking at the target — you must see where you kick', 'Kicking in a donkey-kick arc instead of a straight line', 'Losing balance because of insufficient forward lean', 'Foot not pulled back (dorsiflexed) to expose the heel'],
  ARRAY['From fighting stance, look over the rear shoulder at the target', 'Shift weight to the front leg', 'Chamber the rear knee toward the chest', 'Thrust the foot straight back toward the target', 'Strike with the heel, toes pointing down', 'Lean the torso forward for balance as you extend', 'Retract the kick and return to stance'],
  ARRAY['Look first, then kick — never kick blind', 'Straight back like a piston — not a mule kick', 'Heel is your weapon — pull your toes toward your shin', 'Lean forward as the leg goes back to stay balanced'],
  ARRAY['glutes', 'hamstrings', 'core', 'quadriceps', 'calves'],
  'none', 'both', NULL)
RETURNING id INTO t_ushiro_geri;

-- ─── BLOCKS (Level 2) ───────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'defense', 'block', 'Uchi-uke (Inside Block)',
  'A mid-level block where the forearm sweeps from inside to outside, deflecting punches and strikes away from the body center.',
  'intermediate', 'Yellow/Orange Belt',
  ARRAY['Forearm sweeps from inside to outside', 'Elbow stays at about 90 degrees', 'Block ends at shoulder width', 'Hip rotation adds power', 'Contact with the inner edge of the forearm'],
  ARRAY['Over-rotating so the block goes too far past the body', 'Elbow extending too far from the ribs', 'No hip engagement — weak arm-only motion', 'Starting position too low — hand should begin at opposite hip'],
  ARRAY['Start with the blocking fist at the opposite hip, palm down', 'Rotate the hips toward the blocking side', 'Sweep the forearm upward and outward from the centerline', 'Keep the elbow bent at 90 degrees', 'Stop when the fist reaches shoulder height at shoulder width', 'Pull the opposite hand to the hip as hikite'],
  ARRAY['Inside to outside — sweep the attack away from your center', 'Elbow stays bent — think of opening a door with your forearm', 'Rotate the hips to add body mass to the block', 'Sharp and compact — no extra motion'],
  ARRAY['forearms', 'biceps', 'obliques', 'core', 'deltoids'],
  'none', 'both', NULL)
RETURNING id INTO t_uchi_uke;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'defense', 'block', 'Morote-uke (Augmented Block)',
  'A reinforced blocking technique where one forearm blocks while the other hand supports it at the elbow, creating a much stronger defensive structure.',
  'intermediate', 'Yellow/Orange Belt',
  ARRAY['Primary forearm executes uchi-uke', 'Supporting fist presses against the inner elbow of the blocking arm', 'Both arms work together for maximum strength', 'Body is in hanmi (half-facing) position', 'Commonly performed in kokutsu-dachi'],
  ARRAY['Supporting hand too far from the blocking elbow', 'Not turning to hanmi — facing full front weakens the block', 'Blocking arm too far from the body', 'Forgetting to engage the core for structural strength'],
  ARRAY['Assume kokutsu-dachi with the body in hanmi position', 'Execute uchi-uke with the lead arm', 'Simultaneously press the rear fist against the inner elbow', 'Both arms lock in position to create a reinforced structure', 'Hips remain in hanmi throughout', 'Hold the structure briefly, then return to ready position'],
  ARRAY['Your back hand becomes a buttress for the blocking arm', 'Fist against the elbow crease — that is the reinforcement', 'Hanmi position — your narrow profile is part of the defense', 'Two arms together are unbreakable'],
  ARRAY['forearms', 'biceps', 'triceps', 'core', 'deltoids', 'lats'],
  'none', 'kokutsu-dachi', NULL)
RETURNING id INTO t_morote_uke;

-- ─── KATA (Level 2) ─────────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'forms', 'kata', 'Heian Shodan (Peaceful Mind, First Level)',
  'The first of the five Heian kata series. Introduces shuto-uke in kokutsu-dachi and age-uke, while building on gedan-barai and oi-zuki from Taikyoku Shodan.',
  'intermediate', 'Yellow/Orange Belt',
  ARRAY['21 movements', 'First kata to use kokutsu-dachi', 'Introduces shuto-uke (knife hand block)', 'Age-uke sequence in the middle section', 'Embusen forms an I-shape', 'Kiai on movements 9 and 17'],
  ARRAY['Mixing up zenkutsu-dachi and kokutsu-dachi transitions', 'Shuto-uke hand position incorrect — fingers must be tight', 'Not enough distinction between stance depths', 'Losing the embusen on the 270-degree turn'],
  ARRAY['Bow and announce "Heian Shodan"', 'Turn left into gedan-barai in zenkutsu-dachi', 'Step forward with oi-zuki', 'Turn 180 degrees, gedan-barai, step with hammer fist and oi-zuki', 'Turn 90 degrees, gedan-barai', 'Three consecutive oi-zuki stepping forward — KIAI on the third', 'Continue with age-uke sequence and shuto-uke in kokutsu-dachi', 'Complete the I-shape embusen, KIAI on the final technique', 'Return to yoi, bow'],
  ARRAY['This kata introduces your back stance — feel the weight shift', 'Shuto-uke is crisp — blade hand, precise angle', 'Transitions between stances must be clean — do not blend them', 'Remember your kiai points: 9 and 17'],
  ARRAY['quadriceps', 'glutes', 'core', 'shoulders', 'triceps', 'forearms', 'lats'],
  'none', 'both', NULL)
RETURNING id INTO t_heian_shodan;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'forms', 'kata', 'Heian Nidan (Peaceful Mind, Second Level)',
  'The second Heian kata. Features more kokutsu-dachi work, side kicks (yoko-geri), and uchi-uke. Develops timing and introduces simultaneous block-strike combinations.',
  'intermediate', 'Yellow/Orange Belt',
  ARRAY['26 movements', 'Heavy use of kokutsu-dachi', 'Introduces yoko-geri keage (side snap kick)', 'Features uchi-uke and simultaneous block-strike', 'Embusen is a modified I-shape', 'Kiai on movements 11 and 26'],
  ARRAY['Side kick too low or not snapping', 'Poor weight distribution in kokutsu-dachi throughout', 'Block-strike combination not simultaneous', 'Rushing through the back-stance sections'],
  ARRAY['Bow and announce "Heian Nidan"', 'Begin with uchi-uke in kokutsu-dachi to the left', 'Continue with block-strike combinations', 'Execute yoko-geri keage in the middle section', 'Transition between kokutsu-dachi and zenkutsu-dachi', 'Build toward the final technique sequence', 'KIAI on movements 11 and 26', 'Return to yoi, bow'],
  ARRAY['This kata lives in kokutsu-dachi — get comfortable sitting back', 'Your side kick snaps up and back — quick and sharp', 'Block and strike at the same time — both hands work independently', 'Feel the rhythm change between the fast and slow sections'],
  ARRAY['quadriceps', 'glutes', 'core', 'hip_flexors', 'shoulders', 'forearms', 'obliques'],
  'none', 'both', NULL)
RETURNING id INTO t_heian_nidan;

-- ─── ADVANCED TECHNIQUES (Level 3) ──────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'kick', 'advanced_kick', 'Ura-mawashi-geri (Hook Kick / Reverse Roundhouse)',
  'A deceptive kick that hooks around the target from the outside. The foot travels past the target then snaps back, striking with the heel or sole.',
  'advanced', 'Green/Blue Belt',
  ARRAY['Striking surface is the heel or sole of the foot', 'Kick travels past the target then hooks back', 'Requires excellent hip flexibility', 'Chamber is similar to a front kick to disguise the technique', 'Supporting foot pivots fully'],
  ARRAY['Not hooking enough — the kick just brushes past', 'Poor balance due to the rotational demands', 'Telegraphing the kick — chamber should look like mae-geri', 'Kicking too low — the hook requires height to be effective'],
  ARRAY['From fighting stance, raise the knee as if starting mae-geri', 'Extend the leg forward past the target', 'Pivot the supporting foot and rotate the hips', 'Hook the foot back toward the target in a sweeping arc', 'Strike with the heel or sole as the foot passes back through', 'Retract the leg and return to fighting stance'],
  ARRAY['Fake the front kick, then surprise with the hook', 'Past the target, then snap back — like casting a fishing line', 'You need full hip rotation — pivot that supporting foot', 'Height first, then hook — do not drop the kick low'],
  ARRAY['hip_flexors', 'hamstrings', 'glutes', 'obliques', 'quadriceps', 'core'],
  'none', 'both', NULL)
RETURNING id INTO t_ura_mawashi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'kick', 'advanced_kick', 'Tobi-geri (Jumping Kick)',
  'An airborne kick (usually mae-geri or yoko-geri) launched while jumping. The non-kicking knee chambers high to gain height. An advanced technique requiring timing and explosive power.',
  'advanced', 'Green/Blue Belt',
  ARRAY['Non-kicking knee drives upward for height', 'Kick extends at the peak of the jump', 'Land with bent knees to absorb impact', 'Maintain guard with hands throughout the jump', 'Commit fully — half-hearted jumps lose height and power'],
  ARRAY['Not driving the non-kicking knee high enough', 'Kicking before reaching peak height', 'Landing stiff-legged — absorb through bent knees', 'Dropping the hands during the jump', 'Jumping forward without enough upward height'],
  ARRAY['From fighting stance, drive off both feet explosively', 'Pull the non-kicking knee high to gain maximum height', 'At the peak of the jump, extend the kick toward the target', 'Retract the kicking leg while still airborne', 'Land on bent knees in a stable fighting stance', 'Immediately re-establish your guard and distance'],
  ARRAY['Explode off the floor — vertical before horizontal', 'Non-kicking knee drives to the ceiling for height', 'Kick at the top of the arc — not on the way up or down', 'Bend your knees when you land — absorb the impact'],
  ARRAY['quadriceps', 'glutes', 'calves', 'hip_flexors', 'core'],
  'none', 'both', NULL)
RETURNING id INTO t_tobi_geri;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'strike', 'punch', 'Kizami-zuki (Jab / Leading Punch)',
  'A quick, snapping punch thrown with the lead hand without stepping. The karate equivalent of a jab, used to gauge distance, set up combinations, and disrupt the opponent.',
  'advanced', 'Green/Blue Belt',
  ARRAY['Thrown with the lead hand from fighting stance', 'Quick, snapping motion — speed over power', 'Slight forward lean and hip engagement', 'Returns to guard immediately after extension', 'Targets the face (jodan) or solar plexus (chudan)'],
  ARRAY['Over-committing — it is a quick probe, not a power shot', 'Not returning the hand to guard fast enough', 'Leaning too far forward and losing balance', 'No hip rotation at all — a little bit adds significant snap'],
  ARRAY['From fighting stance (kamae), keep the rear hand at guard', 'Snap the lead fist straight toward the target', 'Rotate the hip slightly for added power', 'Extend fully but briefly — do not overreach', 'Snap the fist back to guard position immediately', 'Maintain your stance throughout — do not chase the punch'],
  ARRAY['Fast in, fast out — touch and go', 'Your lead hand is a rangefinder — use it to measure distance', 'Just a small hip turn adds snap without committing', 'Hand comes home to guard as fast as it left'],
  ARRAY['deltoids', 'triceps', 'core', 'obliques'],
  'none', 'both', NULL)
RETURNING id INTO t_kizami_zuki;

-- ─── COMBINATIONS (Level 3) ─────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'strike', 'combination', 'Sanbon-zuki (Triple Punch)',
  'Three consecutive punches executed while stepping forward in zenkutsu-dachi: jodan oi-zuki, chudan gyaku-zuki, chudan oi-zuki. A fundamental combination drill.',
  'advanced', 'Green/Blue Belt',
  ARRAY['Three punches delivered in rapid succession', 'First punch jodan (face), second and third chudan (body)', 'Alternates oi-zuki and gyaku-zuki', 'Each step is deep and committed', 'Rhythm should be even — no pausing between punches'],
  ARRAY['Pausing between punches — they should flow continuously', 'All three punches at the same height — alternate jodan/chudan', 'Steps getting shorter as fatigue sets in', 'Losing hip rotation on the second and third punches'],
  ARRAY['Step forward into zenkutsu-dachi with jodan oi-zuki (face level)', 'Immediately fire gyaku-zuki to chudan (body level)', 'Step forward again with oi-zuki to chudan', 'Each punch includes full hip rotation', 'Hikite on every punch', 'Maintain deep stances throughout the combination'],
  ARRAY['High, middle, middle — jodan, chudan, chudan', 'Do not stop — three punches, one rhythm', 'Every step is as deep as the first — do not get lazy', 'Hips rotate on every single punch'],
  ARRAY['shoulders', 'triceps', 'core', 'obliques', 'quadriceps', 'glutes'],
  'none', 'both', NULL)
RETURNING id INTO t_combo_sanbon;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'strike', 'combination', 'Gyaku-zuki → Mawashi-geri (Reverse Punch to Roundhouse)',
  'A punch-kick combination that uses the hip rotation of gyaku-zuki to load the mawashi-geri. The punch draws the guard, the kick follows to the exposed side.',
  'advanced', 'Green/Blue Belt',
  ARRAY['Gyaku-zuki creates an opening for the kick', 'Hip rotation from the punch pre-loads the kicking hip', 'Kick follows immediately — no pause between techniques', 'Targets different levels: punch to body, kick to head or body', 'Maintain balance throughout the transition'],
  ARRAY['Pausing between the punch and kick — they should be seamless', 'Not using the punch hip rotation to load the kick', 'Dropping the guard hand when transitioning to the kick', 'Losing balance during the punch-to-kick transition'],
  ARRAY['From fighting stance, fire gyaku-zuki to chudan', 'As the punching hip rotates forward, continue the rotation', 'Chamber the rear leg (now loaded from hip rotation)', 'Pivot the supporting foot and fire mawashi-geri', 'Strike with koshi or instep', 'Retract the kick and reset to fighting stance'],
  ARRAY['The punch winds up the kick — let the hip rotation continue', 'Punch draws their guard down, kick goes where their hand was', 'Seamless transition — the opponent should not see the kick coming', 'Your hips never stop rotating — punch flows into kick'],
  ARRAY['core', 'obliques', 'hip_flexors', 'quadriceps', 'glutes', 'shoulders', 'triceps'],
  'none', 'both', NULL)
RETURNING id INTO t_combo_gyaku_mawashi;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'strike', 'combination', 'Kizami-zuki → Gyaku-zuki → Mae-geri (Jab-Cross-Kick)',
  'A three-technique combination starting with a rangefinding jab, followed by a powerful reverse punch, finished with a front kick. Covers hand and foot offense.',
  'advanced', 'Green/Blue Belt',
  ARRAY['Three techniques covering two ranges (punching and kicking)', 'Jab measures distance, cross delivers power, kick finishes', 'Each technique sets up the next', 'Maintains constant forward pressure', 'All three techniques target different levels ideally'],
  ARRAY['Waiting too long between techniques — the combination must flow', 'Mae-geri losing power because the balance was compromised by punches', 'Not maintaining guard between the punches and the kick', 'All techniques going to the same target instead of mixing levels'],
  ARRAY['From kamae, snap kizami-zuki to jodan (rangefinder)', 'Immediately rotate hips and fire gyaku-zuki to chudan', 'Without pausing, chamber the rear knee', 'Deliver mae-geri to chudan or gedan', 'Retract the kick and reset to kamae', 'Maintain guard hand position throughout'],
  ARRAY['Jab, cross, kick — one-two-three, no gaps', 'The jab opens the door, the cross walks through, the kick slams it shut', 'Mix your levels: high, middle, low', 'Forward pressure — make them back up with every beat'],
  ARRAY['deltoids', 'triceps', 'core', 'obliques', 'quadriceps', 'hip_flexors', 'glutes'],
  'none', 'both', NULL)
RETURNING id INTO t_combo_kizami_gyaku_mae;

-- ─── KATA (Level 3) ─────────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'forms', 'kata', 'Heian Sandan (Peaceful Mind, Third Level)',
  'The third Heian kata. Introduces kiba-dachi sequences, empi (elbow strikes), and morote-uke. Features more complex transitions and the first use of fumikomi (stamping kick).',
  'advanced', 'Green/Blue Belt',
  ARRAY['20 movements', 'Heavy use of kiba-dachi', 'Introduces empi-uchi (elbow strikes)', 'Features morote-uke (augmented block)', 'Fumikomi (stamping kick) appears for the first time', 'Kiai on movements 10 and 20'],
  ARRAY['Kiba-dachi too shallow — maintain deep horse stances', 'Elbow strikes lacking hip commitment', 'Fumikomi not stamping down with authority', 'Losing balance during the kiba-dachi to zenkutsu-dachi transitions'],
  ARRAY['Bow and announce "Heian Sandan"', 'Open with uchi-uke in kokutsu-dachi', 'Transition to morote-uke sequences', 'Execute the kiba-dachi section with empi-uchi', 'Perform fumikomi with authority', 'Complete the final sequence with sharp kime', 'KIAI on movements 10 and 20', 'Return to yoi, bow'],
  ARRAY['This kata demands strong horse stances — sit deep', 'Elbow strikes need full hip rotation — short range, big power', 'Stamp the fumikomi like you are breaking the floor', 'The transitions are complex — practice them individually first'],
  ARRAY['quadriceps', 'glutes', 'core', 'obliques', 'biceps', 'deltoids', 'calves'],
  'none', 'both', NULL)
RETURNING id INTO t_heian_sandan;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'forms', 'kata', 'Heian Yondan (Peaceful Mind, Fourth Level)',
  'The fourth Heian kata and often considered the most athletic. Features slow-fast rhythm changes, double-hand techniques, yoko-geri keage, and a dramatic cross-arm block sequence.',
  'advanced', 'Green/Blue Belt',
  ARRAY['27 movements', 'Introduces slow/fast rhythm (tension/speed contrast)', 'Features yoko-geri keage combined with uraken', 'Juji-uke (cross block) appears dramatically', 'Double-hand techniques throughout', 'Kiai on movements 13 and 25'],
  ARRAY['Not distinguishing between slow and fast sections — rhythm matters', 'Juji-uke too high or too low', 'Side kick and backfist not simultaneous', 'Losing composure during the dramatic cross-block opening'],
  ARRAY['Bow and announce "Heian Yondan"', 'Begin with slow haiwan-uke (back arm block) sequence', 'Transition into fast combination series', 'Execute yoko-geri keage with simultaneous uraken', 'Perform the dramatic juji-uke (cross block)', 'Navigate the embusen with clean transitions', 'KIAI on movements 13 and 25', 'Return to yoi, bow'],
  ARRAY['This kata has drama — slow sections are slow, fast sections explode', 'Side kick and backfist happen at the exact same instant', 'The cross block is a statement — make it powerful and precise', 'Let the audience feel the rhythm change'],
  ARRAY['quadriceps', 'glutes', 'core', 'hip_flexors', 'deltoids', 'forearms', 'obliques', 'lats'],
  'none', 'both', NULL)
RETURNING id INTO t_heian_yondan;

-- ─── KUMITE (Level 3) ───────────────────────────────────────

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'strike', 'kumite', 'Kihon Kumite (Basic Sparring Drill)',
  'Pre-arranged sparring where attacker and defender agree on techniques in advance. One partner attacks with a specified technique, the other blocks and counters. Builds timing and distance awareness.',
  'advanced', 'Green/Blue Belt',
  ARRAY['Both partners know the attack and defense in advance', 'Attacker commits fully to the assigned technique', 'Defender blocks then immediately counters', 'Proper maai (distancing) is essential', 'Control is paramount — techniques stop before contact'],
  ARRAY['Attacker not committing — half-hearted attacks teach nothing', 'Defender anticipating — wait to see the attack, then react', 'Standing too close or too far — maai must be correct', 'Counter-attack lacking kime — finish with full focus'],
  ARRAY['Partners face each other in fighting stance at correct maai', 'Attacker announces or signals the predetermined technique', 'Attacker steps in and delivers the attack with full commitment', 'Defender reads the attack, executes the assigned block', 'Defender immediately delivers the predetermined counter', 'Both partners return to fighting stance', 'Switch roles and repeat'],
  ARRAY['Attacker: your job is to teach your partner — commit to the attack', 'Defender: wait until you see it — do not jump the gun', 'Maai is everything — too far is wasted motion, too close is dangerous', 'Control means your technique COULD land but DOES NOT'],
  ARRAY['quadriceps', 'core', 'shoulders', 'forearms', 'glutes'],
  'none', 'both', NULL)
RETURNING id INTO t_kumite_kihon;

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids)
VALUES (gen_random_uuid(), 'karate', 'strike', 'kumite', 'Jiyu Kumite (Free Sparring Fundamentals)',
  'Introduction to free sparring where partners move freely and choose their own attacks and defenses. Focus on distance management, timing, and controlled technique application.',
  'advanced', 'Green/Blue Belt',
  ARRAY['Free choice of attacks and defenses', 'Constant movement and footwork', 'Control — all techniques stop before full contact', 'Distance management (maai) is the primary skill', 'Read the opponent and react — do not just attack blindly'],
  ARRAY['Standing still — keep moving with light footwork', 'Closing eyes during exchanges', 'Swinging wildly without technique', 'Forgetting blocks — offense and defense must coexist', 'Excessive contact — sparring is controlled, not a fight'],
  ARRAY['Both partners bow and assume kamae (fighting stance)', 'Move freely with light, bouncing footwork', 'Use distance management to control the range', 'Look for openings and commit to clean techniques', 'Block or evade incoming attacks and counter', 'Maintain composure and control at all times', 'Bow to partner when time is called'],
  ARRAY['Keep moving — a stationary target is easy to hit', 'Eyes open, breathe, stay calm', 'Quality over quantity — one clean technique beats three sloppy ones', 'Sparring is a conversation — listen as much as you speak'],
  ARRAY['quadriceps', 'calves', 'core', 'shoulders', 'hip_flexors', 'glutes'],
  'none', 'both', NULL)
RETURNING id INTO t_kumite_jiyu;

-- ─── Update related_technique_ids ────────────────────────────
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_gyaku_zuki, t_kizami_zuki] WHERE id = t_oi_zuki;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_oi_zuki, t_kizami_zuki] WHERE id = t_gyaku_zuki;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_soto_uke, t_gedan_barai] WHERE id = t_age_uke;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_age_uke, t_uchi_uke] WHERE id = t_soto_uke;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_age_uke, t_soto_uke] WHERE id = t_gedan_barai;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_yoko_geri, t_mawashi_geri] WHERE id = t_mae_geri;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_mae_geri, t_ushiro_geri] WHERE id = t_yoko_geri;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_uraken, t_empi] WHERE id = t_shuto_uchi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_shuto_uchi, t_kizami_zuki] WHERE id = t_uraken;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_shuto_uchi, t_uraken] WHERE id = t_empi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_mae_geri, t_ura_mawashi] WHERE id = t_mawashi_geri;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_yoko_geri, t_tobi_geri] WHERE id = t_ushiro_geri;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_soto_uke, t_morote_uke] WHERE id = t_uchi_uke;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_uchi_uke, t_age_uke] WHERE id = t_morote_uke;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_oi_zuki, t_gyaku_zuki] WHERE id = t_kizami_zuki;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_mawashi_geri, t_tobi_geri] WHERE id = t_ura_mawashi;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_mae_geri, t_ura_mawashi] WHERE id = t_tobi_geri;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_zenkutsu, t_kokutsu] WHERE id = t_kiba;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_kokutsu, t_kiba] WHERE id = t_zenkutsu;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_zenkutsu, t_kiba] WHERE id = t_kokutsu;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_heian_shodan] WHERE id = t_taikyoku_shodan;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_taikyoku_shodan, t_heian_nidan] WHERE id = t_heian_shodan;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_heian_shodan, t_heian_sandan] WHERE id = t_heian_nidan;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_heian_nidan, t_heian_yondan] WHERE id = t_heian_sandan;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_heian_sandan] WHERE id = t_heian_yondan;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_kumite_jiyu] WHERE id = t_kumite_kihon;
UPDATE ma_techniques SET related_technique_ids = ARRAY[t_kumite_kihon] WHERE id = t_kumite_jiyu;

-- ═══════════════════════════════════════════════════════════════
-- 3. LESSONS — Level 1: White Belt Foundations
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'karate', 1, 1,
  'The Foundation: Zenkutsu-dachi',
  'Learn the most important stance in Shotokan karate',
  12,
  ARRAY['Sink into the stance — low is strong', 'Hips face forward, back heel glued to the floor', 'Feel the burn in your front thigh — that means you are low enough'],
  ARRAY['Standing too tall with insufficient knee bend', 'Rear heel lifting off the floor', 'Feet on the same line — maintain hip-width lateral spacing'],
  'Stance Walking',
  'Walk forward and backward in zenkutsu-dachi across the room. Each step must be deep with a 2-second hold at each position. Complete 10 steps forward and 10 steps backward without standing up.',
  5, 'none',
  'Can you hold zenkutsu-dachi for 30 seconds with your back heel on the floor?',
  NULL)
RETURNING id INTO les_w1;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'karate', 2, 1,
  'Back Stance & Horse Stance',
  'Master kokutsu-dachi and kiba-dachi for defensive and lateral work',
  12,
  ARRAY['Kokutsu: sit back on the rear leg — front foot should feel light', 'Kiba: push your knees apart like spreading the floor', 'Transition between the three stances smoothly'],
  ARRAY['Weight too far forward in kokutsu-dachi', 'Knees caving inward in kiba-dachi', 'Standing up between stance transitions'],
  'Three-Stance Rotation',
  'Alternate between zenkutsu-dachi, kokutsu-dachi, and kiba-dachi on command (or every 5 seconds). Perform 3 rounds of 10 transitions without standing up between stances.',
  5, 'none',
  'Can you transition between all three stances without losing your balance or standing up?',
  ARRAY[les_w1])
RETURNING id INTO les_w2;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'karate', 3, 2,
  'Your First Punch: Oi-zuki',
  'Learn the lunge punch — step and strike as one',
  12,
  ARRAY['Step and punch land at the SAME instant', 'Hikite! Pull the other hand to the hip with equal force', 'Drive forward from the back leg — do not fall into the stance'],
  ARRAY['Punch arriving before or after the step', 'Weak hikite — the pulling hand is just as important', 'Rising up during the step instead of staying low'],
  'Ten-Count Oi-zuki Line',
  'Line up facing a wall. Step forward with oi-zuki 10 times across the room in zenkutsu-dachi. Focus on simultaneous step-and-punch timing. Walk back and repeat twice.',
  5, 'none',
  'Does your punch and front foot land at exactly the same moment on every step?',
  ARRAY[les_w1])
RETURNING id INTO les_w3;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'karate', 4, 2,
  'The Power Punch: Gyaku-zuki',
  'Generate devastating power through hip rotation',
  12,
  ARRAY['Hips FIRST, then the arm — the hip launches the punch', 'Snap the hip like cracking a whip', 'Kime! Lock everything at the point of impact'],
  ARRAY['Punching with the arm only — no hip rotation', 'Rear heel lifting during rotation', 'Leaning backward away from the target'],
  'Stationary Gyaku-zuki Reps',
  'In a solid zenkutsu-dachi, throw 20 gyaku-zuki focusing purely on hip rotation. Pause between each to reset the hip. Then do 20 more at full speed. Feel the difference.',
  5, 'none',
  'Can you feel the power chain from the floor through your hip into the fist?',
  ARRAY[les_w1, les_w3])
RETURNING id INTO les_w4;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'karate', 5, 3,
  'Rising Block: Age-uke',
  'Protect your head with the forearm shield',
  10,
  ARRAY['Sweep across your face like raising a visor', 'One fist-width above the forehead at the finish', 'Both arms move at the same speed — block and hikite together'],
  ARRAY['Block finishing too close to the head', 'Not rotating the forearm during the sweep', 'Shrugging the shoulder up — keep it down'],
  'Block-Counter Drill',
  'From zenkutsu-dachi, alternate age-uke then gyaku-zuki in place. Perform 10 block-counter pairs on each side. The block and counter should be distinct motions with crisp transitions.',
  4, 'none',
  'Does your forearm finish at a 45-degree angle one fist above your forehead?',
  ARRAY[les_w1, les_w4])
RETURNING id INTO les_w5;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'karate', 6, 3,
  'Outside Block & Downward Sweep',
  'Learn soto-uke and gedan-barai to cover mid and low attacks',
  12,
  ARRAY['Soto-uke: elbow stays glued to the ribs', 'Gedan-barai: start at the opposite ear, sweep down to the knee', 'Both blocks are powered by hip rotation, not arm strength'],
  ARRAY['Soto-uke elbow flying out from the body', 'Gedan-barai finishing too high — it must reach knee level', 'No hip rotation on either block'],
  'Block Combination Line',
  'Walk forward in zenkutsu-dachi: step 1 gedan-barai, step 2 soto-uke, step 3 age-uke, repeat. Perform 3 lengths of the room, adding gyaku-zuki counter after each block on the second pass.',
  5, 'none',
  'Can you perform gedan-barai, soto-uke, and age-uke in sequence with correct form on each?',
  ARRAY[les_w5])
RETURNING id INTO les_w6;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'karate', 7, 4,
  'Front Kick: Mae-geri',
  'The fundamental kicking technique — chamber, snap, retract',
  12,
  ARRAY['Knee up FIRST — always chamber before extending', 'Pull toes back — strike with the ball of the foot', 'Snap it out and snap it back — the kick is a whip'],
  ARRAY['Kicking with the toes instead of the ball of the foot', 'Not chambering — the leg swings like a pendulum', 'Not retracting the kick after extension'],
  'Slow-Motion Mae-geri',
  'Perform mae-geri in extreme slow motion: 3 seconds to chamber, 3 seconds to extend, 3 seconds to retract, 3 seconds to return. This builds control and balance. 8 reps each leg.',
  5, 'none',
  'Can you hold the chambered position (knee up) for 5 seconds without wobbling?',
  ARRAY[les_w1])
RETURNING id INTO les_w7;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'karate', 8, 4,
  'Side Kick: Yoko-geri',
  'Develop the powerful lateral thrust kick',
  12,
  ARRAY['Pivot your supporting foot completely — heel toward target', 'Chamber across the body, then thrust sideways', 'Blade of the foot — imagine stamping sideways on the floor'],
  ARRAY['Not pivoting the supporting foot at all', 'Kicking upward instead of thrusting laterally', 'Using the flat of the foot instead of the edge'],
  'Yoko-geri Balance Hold',
  'Chamber the kick, extend to full yoko-geri position, and hold for 5 seconds. Retract to chamber and hold for 3 seconds. Return to stance. 6 reps each leg.',
  5, 'none',
  'Can you extend yoko-geri and hold it at full extension for 5 seconds on each leg?',
  ARRAY[les_w7])
RETURNING id INTO les_w8;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'karate', 9, 5,
  'Taikyoku Shodan — Learning the Form',
  'Break down your first kata move by move',
  15,
  ARRAY['Every turn is a block against a new attacker', 'Eyes lead — look where you are going before you turn', 'Consistent stance depth on every single step'],
  ARRAY['Losing the I-shaped embusen line', 'Rushing through turns — each turn begins with gedan-barai', 'Forgetting kiai on movements 9 and 17'],
  'Kata Segment Practice',
  'Break Taikyoku Shodan into four segments (about 5 moves each). Practice each segment 5 times before connecting them. Then perform the full kata 3 times.',
  8, 'none',
  'Can you perform Taikyoku Shodan from start to finish and end within one step of your starting position?',
  ARRAY[les_w3, les_w6])
RETURNING id INTO les_w9;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_white, 'karate', 10, 5,
  'White Belt Review & Integration',
  'Combine all techniques and refine your first kata',
  15,
  ARRAY['Quality over speed — slow is smooth, smooth is fast', 'Every technique has kime — lock the body at the moment of completion', 'Show spirit — your attitude is part of your karate'],
  ARRAY['Rushing through techniques without proper form', 'Inconsistent stances as fatigue builds', 'Going through the motions without focus or intensity'],
  'Full Technique Circuit',
  'Set a timer for 8 minutes. Cycle through: 10 oi-zuki (walking), 10 gyaku-zuki (stationary), 10 age-uke, 10 soto-uke, 10 gedan-barai, 10 mae-geri each leg, 10 yoko-geri each leg, 1 full Taikyoku Shodan. Rest 30 seconds, repeat if time allows.',
  8, 'none',
  'Can you demonstrate all white belt techniques with correct form and perform Taikyoku Shodan confidently?',
  ARRAY[les_w9])
RETURNING id INTO les_w10;

-- ═══════════════════════════════════════════════════════════════
-- 3b. LESSONS — Level 2: Yellow/Orange Belt
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'karate', 1, 6,
  'Knife Hand: Shuto-uchi',
  'Master the open-hand blade strike',
  12,
  ARRAY['Your hand is a blade — fingers pressed, thumb tucked', 'Edge of the hand strikes, not the palm or fingers', 'Hips drive the strike just like a punch'],
  ARRAY['Fingers spreading apart on contact', 'Striking with the flat palm instead of the edge', 'Thumb poking out — tuck it or risk injury'],
  'Shuto Target Drill',
  'Place your open palm at face height as a target reference. Practice shuto-uchi from both sides, aiming to stop the blade precisely at the palm. 15 reps each side focusing on accuracy and edge alignment.',
  4, 'none',
  'Can you consistently strike with the knife edge of the hand with all fingers tight?',
  ARRAY[les_w10])
RETURNING id INTO les_y1;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'karate', 2, 6,
  'Speed Strikes: Uraken & Empi',
  'Add the backfist snap and devastating elbow to your arsenal',
  12,
  ARRAY['Uraken: elbow is the hinge, fist is the whip tip', 'Empi: close the distance — elbows need nose-to-nose range', 'Speed for uraken, power for empi'],
  ARRAY['Uraken: too much shoulder — keep it as an elbow snap', 'Empi: standing too far away', 'Not retracting uraken fast enough after the snap'],
  'Close-Range Combo',
  'Shadow drill: jab (kizami-zuki motion) → uraken → empi. Start slow to learn the range transitions, then build speed. 10 combinations each side. Focus on the distance change between techniques.',
  5, 'none',
  'Can you deliver uraken as a sharp snap and empi with full hip rotation in sequence?',
  ARRAY[les_y1])
RETURNING id INTO les_y2;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'karate', 3, 7,
  'Roundhouse Kick: Mawashi-geri',
  'The powerful circular kick — pivot, chamber, whip',
  12,
  ARRAY['Chamber to the side at hip height — not in front', 'Pivot the supporting heel to face the target', 'Hips rotate fully — do not short-change the rotation'],
  ARRAY['Not pivoting the supporting foot', 'Chambering in front like a front kick instead of to the side', 'Dropping hands while kicking'],
  'Progressive Mawashi-geri',
  'Phase 1: Chamber-hold-return (no kick) x10 each leg. Phase 2: Chamber-extend-retract at 50% speed x10. Phase 3: Full speed x10. Focus on the chamber-first principle.',
  5, 'none',
  'Can you chamber the knee to the side at hip height and pivot your support foot before extending the kick?',
  ARRAY[les_w7])
RETURNING id INTO les_y3;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'karate', 4, 7,
  'Back Kick: Ushiro-geri',
  'The piston kick — look, load, thrust',
  12,
  ARRAY['LOOK FIRST — never kick blind', 'Straight back like a piston, not a mule kick', 'Heel is your weapon — pull toes toward your shin'],
  ARRAY['Not looking at the target before kicking', 'Kicking in a curved arc instead of a straight line', 'Losing balance from insufficient forward lean'],
  'Wall Ushiro-geri',
  'Stand about one leg-length from a wall. Look over your shoulder and practice thrusting ushiro-geri to lightly touch the wall with your heel. 10 reps each leg. The wall teaches straight-line alignment.',
  5, 'wall',
  'Can you look over your shoulder, kick in a straight line, and touch a specific spot on the wall with your heel?',
  ARRAY[les_y3])
RETURNING id INTO les_y4;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'karate', 5, 8,
  'Inside Block & Augmented Block',
  'Expand your defensive toolkit with uchi-uke and morote-uke',
  12,
  ARRAY['Uchi-uke: inside to outside — sweep attacks away from center', 'Morote-uke: fist reinforces the blocking elbow', 'Both blocks require hip rotation to be effective'],
  ARRAY['Uchi-uke: over-rotating past the centerline', 'Morote-uke: supporting hand too far from the elbow', 'No hip engagement on either block'],
  'Block Recognition Drill',
  'Assign each block a number: 1=age-uke, 2=soto-uke, 3=gedan-barai, 4=uchi-uke, 5=morote-uke. Call random numbers (or use a metronome beat to cycle through) and execute the block. 3 minutes of rapid-fire block switching.',
  4, 'none',
  'Can you execute all five blocks correctly when called by name without hesitation?',
  ARRAY[les_w6])
RETURNING id INTO les_y5;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'karate', 6, 8,
  'Heian Shodan — First Heian Kata',
  'Learn the kata that introduces kokutsu-dachi and shuto-uke',
  15,
  ARRAY['This kata introduces your back stance — feel the weight shift', 'Shuto-uke is crisp — blade hand, precise angle', 'Clean transitions between zenkutsu-dachi and kokutsu-dachi'],
  ARRAY['Mixing up stances during transitions', 'Shuto-uke hand position sloppy', 'Losing the embusen on the 270-degree turn'],
  'Heian Shodan Walkthrough',
  'Learn the kata in three sections. Practice each section 5 times individually. Then connect section 1+2 (5 times), section 2+3 (5 times), then full kata 3 times. Focus on stance correctness at each position.',
  8, 'none',
  'Can you perform Heian Shodan and correctly distinguish every zenkutsu-dachi from every kokutsu-dachi?',
  ARRAY[les_w9, les_y5])
RETURNING id INTO les_y6;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'karate', 7, 9,
  'Heian Nidan — Building Complexity',
  'Tackle the second Heian kata with its kicks and block-strike combos',
  15,
  ARRAY['Heavy kokutsu-dachi kata — get comfortable in back stance', 'Side kick snaps up and back — quick and sharp', 'Block and strike at the same time — independence of hands'],
  ARRAY['Side kick too low or not snapping back', 'Block-strike combinations not simultaneous', 'Rushing through the back-stance sections'],
  'Heian Nidan Breakdown',
  'Isolate the yoko-geri keage sequence and practice 10 reps in isolation. Then isolate the simultaneous block-strike and practice 10 reps. Finally, run the full kata 5 times.',
  8, 'none',
  'Can you perform the side kick and the simultaneous block-strike sections smoothly within the kata?',
  ARRAY[les_y6, les_y3])
RETURNING id INTO les_y7;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'karate', 8, 9,
  'Block-Counter Combinations',
  'Chain blocks into immediate counter-attacks',
  12,
  ARRAY['The block creates the opening — the counter exploits it', 'No pause between block and counter — react instantly', 'Different blocks set up different counters'],
  ARRAY['Pausing too long between block and counter', 'Counter-attacking without resetting the guard', 'Using the same counter after every block — vary your responses'],
  'Five Block-Counter Pairs',
  'Practice these five combos 10 times each: age-uke → gyaku-zuki, soto-uke → gyaku-zuki, gedan-barai → mae-geri, uchi-uke → uraken, morote-uke → empi. Switch sides halfway.',
  5, 'none',
  'Can you chain each of the five blocks into its designated counter without hesitation?',
  ARRAY[les_y5, les_y2])
RETURNING id INTO les_y8;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'karate', 9, 10,
  'Kick Combination Drills',
  'Build kicking power and transitions between kick types',
  12,
  ARRAY['Each kick returns to chamber before the next one goes out', 'Keep your guard up between kicks', 'Pivot foot adjusts for each kick type — front, round, side, back'],
  ARRAY['Dropping the chambered knee between kicks', 'Losing balance during kick transitions', 'Guard hands dropping after the first kick'],
  'Four-Kick Ladder',
  'From fighting stance, execute: mae-geri, mawashi-geri, yoko-geri, ushiro-geri — all with the same leg without putting it down. This is challenging. Start slow with a wall for balance. 3 sets each leg.',
  5, 'none',
  'Can you perform all four kicks on one leg without touching down between them (even slowly)?',
  ARRAY[les_y3, les_y4])
RETURNING id INTO les_y9;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_yellow, 'karate', 10, 10,
  'Yellow Belt Review & Kata Showcase',
  'Polish all yellow belt material and refine both Heian kata',
  15,
  ARRAY['Both Heian kata performed with spirit and precision', 'Every technique shows kime — focus and commitment', 'Demonstrate the progression from white to yellow belt skills'],
  ARRAY['Reverting to sloppy stances under fatigue', 'Kata performed mechanically without spirit', 'Forgetting newly learned techniques in favor of old favorites'],
  'Full Yellow Belt Circuit',
  'Perform: Heian Shodan, rest 30s, Heian Nidan, rest 30s, then 2 minutes of free shadow work using all yellow belt techniques. Finish with 5 slow-motion block-counter combinations. Self-assess your weakest area.',
  8, 'none',
  'Can you perform both Heian kata back-to-back and demonstrate all yellow belt techniques with confident kime?',
  ARRAY[les_y7, les_y8])
RETURNING id INTO les_y10;

-- ═══════════════════════════════════════════════════════════════
-- 3c. LESSONS — Level 3: Green/Blue Belt
-- ═══════════════════════════════════════════════════════════════

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'karate', 1, 11,
  'The Hook Kick: Ura-mawashi-geri',
  'Disguise a front kick chamber into a deceptive hook',
  12,
  ARRAY['Fake the front kick, then surprise with the hook', 'Past the target, then snap back — like casting a fishing line', 'Full hip rotation — pivot the supporting foot completely'],
  ARRAY['Not hooking enough — the kick just passes by', 'Telegraphing the kick with a different chamber than mae-geri', 'Kicking too low — the hook needs height to be effective'],
  'Mae-geri to Ura-mawashi Transition',
  'Throw 5 mae-geri, then on the 6th, convert to ura-mawashi-geri. Repeat until the chamber for both looks identical. The goal is deception. 3 sets each leg.',
  5, 'none',
  'Can a training partner tell whether you are throwing mae-geri or ura-mawashi-geri from the chamber alone?',
  ARRAY[les_y9])
RETURNING id INTO les_g1;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'karate', 2, 11,
  'Jumping Kick: Tobi-geri',
  'Take your kicks airborne with explosive power',
  12,
  ARRAY['Explode off the floor — vertical before horizontal', 'Non-kicking knee drives to the ceiling for height', 'Kick at the top of the arc, not on the way up or down'],
  ARRAY['Not enough height — drive the non-kicking knee harder', 'Kicking on the way up instead of at the peak', 'Landing stiff-legged — absorb through bent knees'],
  'Progressive Tobi-geri',
  'Phase 1: Jump and chamber (no kick), focusing on height — 10 reps. Phase 2: Jump, chamber, kick at half speed — 8 reps. Phase 3: Full-speed tobi mae-geri — 6 reps. Land softly every time.',
  5, 'none',
  'Can you consistently kick above waist height while airborne and land in a stable stance?',
  ARRAY[les_w7])
RETURNING id INTO les_g2;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'karate', 3, 12,
  'The Karate Jab: Kizami-zuki',
  'Develop the quick lead-hand rangefinder',
  10,
  ARRAY['Fast in, fast out — touch and go', 'Just a small hip turn adds snap without over-committing', 'Lead hand is your rangefinder — use it to measure distance'],
  ARRAY['Over-committing and leaning too far forward', 'No hip engagement at all — even a small turn helps', 'Not returning the hand to guard fast enough'],
  'Kizami-zuki Speed Drill',
  'Set a timer for 2 minutes. From kamae, throw continuous kizami-zuki at the highest tempo you can maintain with good form. Count your total reps. Rest 1 minute, repeat trying to beat your count.',
  4, 'none',
  'Can you throw 50+ clean kizami-zuki in 2 minutes while maintaining guard between each?',
  ARRAY[les_w4])
RETURNING id INTO les_g3;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'karate', 4, 12,
  'Sanbon-zuki: Triple Punch',
  'Master the three-punch stepping combination',
  12,
  ARRAY['High, middle, middle — jodan, chudan, chudan', 'Do not stop between punches — three beats, one rhythm', 'Every step is as deep as the first — maintain stances'],
  ARRAY['All three punches at the same height', 'Steps getting shorter as fatigue sets in', 'Losing hip rotation on the second and third punches'],
  'Sanbon-zuki Line Drill',
  'Walk the length of the room performing sanbon-zuki: 3 punches per forward step. Return and repeat. Third pass: add kiai on the third punch of every sequence. 3 full lengths.',
  5, 'none',
  'Can you deliver all three punches at the correct levels (jodan-chudan-chudan) with deep stances maintained throughout?',
  ARRAY[les_w3, les_w4])
RETURNING id INTO les_g4;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'karate', 5, 13,
  'Punch-Kick Combinations',
  'Chain hand and foot techniques into fluid attack sequences',
  12,
  ARRAY['Punch sets up the kick, kick finishes the sequence', 'Hips flow continuously from technique to technique', 'Forward pressure — make the imaginary opponent retreat'],
  ARRAY['Pausing too long between punch and kick', 'Dropping guard during transitions', 'All techniques going to the same target level'],
  'Three Combination Drill',
  'Drill three combinations 10 times each: (1) gyaku-zuki → mawashi-geri, (2) kizami-zuki → gyaku-zuki → mae-geri, (3) oi-zuki → uraken → mawashi-geri. Both sides. Focus on seamless transitions.',
  5, 'none',
  'Can you flow from punches to kicks without a visible pause or loss of balance?',
  ARRAY[les_g3, les_g4])
RETURNING id INTO les_g5;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'karate', 6, 13,
  'Heian Sandan — Elbows and Horse Stance',
  'Learn the kata that demands strong kiba-dachi and empi',
  15,
  ARRAY['This kata demands deep horse stances — sit low', 'Elbow strikes need full hip commitment', 'Stamp the fumikomi like you are cracking the floor'],
  ARRAY['Kiba-dachi too shallow — go deeper', 'Elbow strikes without hip rotation — arm only', 'Fumikomi lacking authority — make noise'],
  'Heian Sandan Isolation Work',
  'Isolate the kiba-dachi + empi sequence and practice 10 reps. Separately practice the fumikomi stamping section 10 reps. Then assemble the full kata 5 times.',
  8, 'none',
  'Can you perform the kiba-dachi section with powerful empi strikes and an authoritative fumikomi stamp?',
  ARRAY[les_y7, les_y2])
RETURNING id INTO les_g6;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'karate', 7, 14,
  'Heian Yondan — Rhythm and Drama',
  'The most athletic Heian kata — master slow/fast contrasts',
  15,
  ARRAY['Slow sections are slow, fast sections EXPLODE', 'Side kick and backfist happen at the exact same instant', 'The juji-uke is a statement — make it powerful'],
  ARRAY['No rhythm distinction between slow and fast sections', 'Side kick and backfist not simultaneous', 'Losing composure during the dramatic sections'],
  'Rhythm Training',
  'Perform Heian Yondan at half speed, exaggerating the slow/fast contrast. Slow sections take twice as long, fast sections are at full speed. This trains the dynamic contrast. 5 full runs with this method.',
  8, 'none',
  'Can you clearly demonstrate the rhythm changes between the slow and fast sections of Heian Yondan?',
  ARRAY[les_g6])
RETURNING id INTO les_g7;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'karate', 8, 14,
  'Kihon Kumite: Basic Sparring',
  'Learn controlled partner sparring with predetermined techniques',
  12,
  ARRAY['Attacker commits fully — half-hearted attacks teach nothing', 'Defender waits to see the attack, then reacts — no anticipation', 'Maai is everything — correct distance makes it work'],
  ARRAY['Attacker not committing to the technique', 'Defender jumping before the attack comes', 'Standing too close or too far', 'Counter-attack lacking focus and kime'],
  'Solo Kihon Kumite Simulation',
  'Without a partner: shadow 5 attack sequences (step in with oi-zuki), then 5 defense sequences (gedan-barai → gyaku-zuki counter). Practice maintaining correct distance from an imaginary opponent. Focus on full commitment both attacking and defending.',
  5, 'none',
  'Can you execute a full attack-then-counter sequence with committed techniques and correct distancing?',
  ARRAY[les_y8])
RETURNING id INTO les_g8;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'karate', 9, 15,
  'Jiyu Kumite: Free Sparring Intro',
  'Apply your techniques in free-movement sparring fundamentals',
  12,
  ARRAY['Keep moving — a stationary target is easy to hit', 'Eyes open, breathe, stay calm', 'Quality over quantity — one clean technique beats three sloppy ones'],
  ARRAY['Standing still like a statue', 'Closing eyes during movement', 'Swinging wildly without form', 'Forgetting to block — offense and defense coexist'],
  'Shadow Sparring',
  'Set a timer for 3 rounds of 2 minutes with 1-minute rest. Move freely, throw combinations, practice blocking imaginary attacks, and work on distance management. Each round focus on something different: round 1 footwork, round 2 hands, round 3 kicks.',
  8, 'none',
  'Can you move freely for 2 minutes while throwing clean techniques and maintaining your guard?',
  ARRAY[les_g8])
RETURNING id INTO les_g9;

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites)
VALUES (gen_random_uuid(), lvl_green, 'karate', 10, 15,
  'Green Belt Review & Kata Showcase',
  'Demonstrate mastery of all four Heian kata and sparring readiness',
  15,
  ARRAY['Four kata performed with increasing intensity and spirit', 'All advanced techniques demonstrated with control and kime', 'Show your growth from white belt to here'],
  ARRAY['Kata performed without variation in spirit', 'Techniques reverting to early bad habits under pressure', 'No connection between the kata and the fighting applications'],
  'Green Belt Gauntlet',
  'Perform in sequence: Taikyoku Shodan, Heian Shodan, Heian Nidan, Heian Sandan, Heian Yondan — 30 seconds rest between each. Then 2 minutes of shadow kumite using all your favorite combinations. Finish by bowing and reflecting on your journey.',
  10, 'none',
  'Can you perform all five kata back-to-back with confidence, spirit, and correct form throughout?',
  ARRAY[les_g7, les_g9])
RETURNING id INTO les_g10;

-- ═══════════════════════════════════════════════════════════════
-- 4. LESSON–TECHNIQUE LINKS
-- ═══════════════════════════════════════════════════════════════

-- ─── White Belt Lessons ──────────────────────────────────────

-- Lesson W1: Zenkutsu-dachi
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_w1, t_zenkutsu, 'primary', 'The entire lesson focuses on perfecting front stance depth, foot placement, and weight distribution');

-- Lesson W2: Back Stance & Horse Stance
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_w2, t_kokutsu, 'primary', 'Introduce back stance with emphasis on 70/30 weight distribution'),
  (les_w2, t_kiba,    'primary', 'Introduce horse stance with emphasis on knee-out position'),
  (les_w2, t_zenkutsu, 'review', 'Review front stance as the baseline for comparison');

-- Lesson W3: Oi-zuki
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_w3, t_oi_zuki,  'primary', 'Focus on simultaneous step-and-punch coordination'),
  (les_w3, t_zenkutsu, 'review', 'Reinforces front stance since oi-zuki is delivered in zenkutsu-dachi');

-- Lesson W4: Gyaku-zuki
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_w4, t_gyaku_zuki, 'primary', 'Emphasize hip rotation as the primary power source'),
  (les_w4, t_oi_zuki,    'review', 'Compare lunge punch with reverse punch to highlight hip mechanics');

-- Lesson W5: Age-uke
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_w5, t_age_uke,    'primary', 'Teach the upward sweep path and finish position'),
  (les_w5, t_gyaku_zuki, 'review', 'Practice block-counter: age-uke followed by gyaku-zuki');

-- Lesson W6: Soto-uke & Gedan-barai
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_w6, t_soto_uke,    'primary', 'Outside-to-inside sweep at chest height'),
  (les_w6, t_gedan_barai, 'primary', 'Downward sweep from shoulder to knee level'),
  (les_w6, t_age_uke,     'review', 'Combine all three blocks in a walking drill');

-- Lesson W7: Mae-geri
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_w7, t_mae_geri, 'primary', 'Chamber-extend-retract cycle; emphasize ball-of-foot contact'),
  (les_w7, t_zenkutsu, 'review', 'Maintain stance stability while kicking');

-- Lesson W8: Yoko-geri
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_w8, t_yoko_geri, 'primary', 'Focus on supporting foot pivot and blade-of-foot contact'),
  (les_w8, t_mae_geri,  'review', 'Compare front kick chamber with side kick chamber'),
  (les_w8, t_kiba,      'review', 'Horse stance used as the base position for side kick drill');

-- Lesson W9: Taikyoku Shodan
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_w9, t_taikyoku_shodan, 'primary', 'Learn the full kata move by move'),
  (les_w9, t_gedan_barai,     'review', 'Gedan-barai is the turning block throughout the kata'),
  (les_w9, t_oi_zuki,         'review', 'Oi-zuki is the stepping punch throughout the kata');

-- Lesson W10: White Belt Review
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_w10, t_taikyoku_shodan, 'review', 'Full kata performance as capstone'),
  (les_w10, t_oi_zuki,         'review', 'Demonstrate with full kime'),
  (les_w10, t_gyaku_zuki,      'review', 'Show hip rotation mastery'),
  (les_w10, t_age_uke,         'review', 'All blocks reviewed in circuit'),
  (les_w10, t_soto_uke,        'review', 'All blocks reviewed in circuit'),
  (les_w10, t_gedan_barai,     'review', 'All blocks reviewed in circuit'),
  (les_w10, t_mae_geri,        'review', 'Both kicks reviewed'),
  (les_w10, t_yoko_geri,       'review', 'Both kicks reviewed');

-- ─── Yellow Belt Lessons ─────────────────────────────────────

-- Lesson Y1: Shuto-uchi
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_y1, t_shuto_uchi,  'primary', 'Focus on knife-edge alignment and finger tightness'),
  (les_y1, t_gyaku_zuki,  'review', 'Compare open-hand and closed-fist hip-driven strikes');

-- Lesson Y2: Uraken & Empi
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_y2, t_uraken, 'primary', 'Teach the elbow-hinge snap mechanism'),
  (les_y2, t_empi,   'primary', 'Teach close-range elbow strike with full body rotation'),
  (les_y2, t_shuto_uchi, 'review', 'Close-range striking comparison');

-- Lesson Y3: Mawashi-geri
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_y3, t_mawashi_geri, 'primary', 'Focus on side-chamber and supporting-foot pivot'),
  (les_y3, t_mae_geri,     'review', 'Compare front-kick and roundhouse chamber positions');

-- Lesson Y4: Ushiro-geri
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_y4, t_ushiro_geri, 'primary', 'Straight-line backward thrust with visual confirmation'),
  (les_y4, t_mawashi_geri, 'review', 'Practice kick transitions: roundhouse to back kick');

-- Lesson Y5: Uchi-uke & Morote-uke
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_y5, t_uchi_uke,  'primary', 'Inside-to-outside sweep path'),
  (les_y5, t_morote_uke, 'primary', 'Reinforced block structure with fist-to-elbow support'),
  (les_y5, t_soto_uke,   'review', 'Compare uchi-uke (inside-out) with soto-uke (outside-in)');

-- Lesson Y6: Heian Shodan
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_y6, t_heian_shodan, 'primary', 'Full kata breakdown with stance identification'),
  (les_y6, t_kokutsu,      'review', 'Back stance used extensively in this kata'),
  (les_y6, t_gedan_barai,  'review', 'Gedan-barai on all turning movements');

-- Lesson Y7: Heian Nidan
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_y7, t_heian_nidan,  'primary', 'Second Heian kata with side kick and block-strike combos'),
  (les_y7, t_yoko_geri,    'review', 'Side kick appears in this kata as keage (snap kick)'),
  (les_y7, t_uchi_uke,     'review', 'Uchi-uke used throughout the kata');

-- Lesson Y8: Block-Counter Combinations
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_y8, t_age_uke,     'primary', 'Age-uke → gyaku-zuki counter combination'),
  (les_y8, t_soto_uke,    'primary', 'Soto-uke → gyaku-zuki counter combination'),
  (les_y8, t_gedan_barai, 'primary', 'Gedan-barai → mae-geri counter combination'),
  (les_y8, t_uchi_uke,    'primary', 'Uchi-uke → uraken counter combination'),
  (les_y8, t_morote_uke,  'primary', 'Morote-uke → empi counter combination'),
  (les_y8, t_gyaku_zuki,  'review', 'Counter punch used after most blocks'),
  (les_y8, t_uraken,      'review', 'Backfist as counter after uchi-uke'),
  (les_y8, t_empi,        'review', 'Elbow strike as counter after morote-uke');

-- Lesson Y9: Kick Combinations
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_y9, t_mae_geri,     'primary', 'First kick in the four-kick ladder'),
  (les_y9, t_mawashi_geri, 'primary', 'Second kick in the four-kick ladder'),
  (les_y9, t_yoko_geri,    'primary', 'Third kick in the four-kick ladder'),
  (les_y9, t_ushiro_geri,  'primary', 'Fourth kick in the four-kick ladder');

-- Lesson Y10: Yellow Belt Review
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_y10, t_heian_shodan,  'review', 'First Heian kata performance'),
  (les_y10, t_heian_nidan,   'review', 'Second Heian kata performance'),
  (les_y10, t_shuto_uchi,    'review', 'All yellow belt techniques in shadow work'),
  (les_y10, t_uraken,        'review', 'All yellow belt techniques in shadow work'),
  (les_y10, t_empi,          'review', 'All yellow belt techniques in shadow work'),
  (les_y10, t_mawashi_geri,  'review', 'All yellow belt techniques in shadow work'),
  (les_y10, t_ushiro_geri,   'review', 'All yellow belt techniques in shadow work');

-- ─── Green Belt Lessons ──────────────────────────────────────

-- Lesson G1: Ura-mawashi-geri
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_g1, t_ura_mawashi, 'primary', 'Teach the deceptive hook kick with mae-geri comparison'),
  (les_g1, t_mae_geri,    'review', 'Front kick as disguise and comparison for the hook kick');

-- Lesson G2: Tobi-geri
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_g2, t_tobi_geri, 'primary', 'Progressive approach: jump only, then chamber, then full kick'),
  (les_g2, t_mae_geri,  'review', 'Ground-based front kick as the foundation for the airborne version');

-- Lesson G3: Kizami-zuki
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_g3, t_kizami_zuki, 'primary', 'Speed-focused lead hand technique for distance measurement'),
  (les_g3, t_gyaku_zuki,  'review', 'Compare jab (speed) vs reverse punch (power)');

-- Lesson G4: Sanbon-zuki
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_g4, t_combo_sanbon, 'primary', 'Three-punch stepping combination drill'),
  (les_g4, t_oi_zuki,      'review', 'First and third punches are oi-zuki variants'),
  (les_g4, t_gyaku_zuki,   'review', 'Second punch is gyaku-zuki');

-- Lesson G5: Punch-Kick Combinations
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_g5, t_combo_gyaku_mawashi,    'primary', 'Gyaku-zuki to mawashi-geri hip flow'),
  (les_g5, t_combo_kizami_gyaku_mae, 'primary', 'Three-technique jab-cross-kick sequence'),
  (les_g5, t_kizami_zuki,            'review', 'Lead hand as rangefinder in combinations'),
  (les_g5, t_mawashi_geri,           'review', 'Roundhouse as the finishing kick in combos');

-- Lesson G6: Heian Sandan
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_g6, t_heian_sandan, 'primary', 'Third Heian kata with kiba-dachi and empi focus'),
  (les_g6, t_kiba,         'review', 'Horse stance used extensively in this kata'),
  (les_g6, t_empi,         'review', 'Elbow strikes featured in the kiba-dachi section'),
  (les_g6, t_morote_uke,   'review', 'Augmented block appears in this kata');

-- Lesson G7: Heian Yondan
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_g7, t_heian_yondan, 'primary', 'Fourth Heian kata with rhythm and drama focus'),
  (les_g7, t_yoko_geri,    'review', 'Side kick appears with simultaneous uraken'),
  (les_g7, t_uraken,       'review', 'Backfist delivered simultaneously with the side kick');

-- Lesson G8: Kihon Kumite
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_g8, t_kumite_kihon, 'primary', 'Pre-arranged attack-and-counter partner drill (or shadow version)'),
  (les_g8, t_oi_zuki,      'review', 'Standard attack technique in basic kumite'),
  (les_g8, t_gedan_barai,  'review', 'Standard defensive block in basic kumite'),
  (les_g8, t_gyaku_zuki,   'review', 'Standard counter-attack in basic kumite');

-- Lesson G9: Jiyu Kumite
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_g9, t_kumite_jiyu, 'primary', 'Free sparring movement, timing, and distance management'),
  (les_g9, t_kizami_zuki, 'review', 'Jab as the primary tool for controlling distance in kumite'),
  (les_g9, t_mae_geri,    'review', 'Front kick as a safe mid-range attack option');

-- Lesson G10: Green Belt Review
INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES
  (les_g10, t_taikyoku_shodan, 'review', 'First kata in the five-kata gauntlet'),
  (les_g10, t_heian_shodan,    'review', 'Second kata in the gauntlet'),
  (les_g10, t_heian_nidan,     'review', 'Third kata in the gauntlet'),
  (les_g10, t_heian_sandan,    'review', 'Fourth kata in the gauntlet'),
  (les_g10, t_heian_yondan,    'review', 'Fifth kata in the gauntlet'),
  (les_g10, t_kumite_jiyu,     'review', 'Shadow kumite with all combinations');

END $$;
