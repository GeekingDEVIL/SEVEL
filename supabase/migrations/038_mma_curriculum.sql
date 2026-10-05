-- MMA curriculum seed — spec item 77
-- Rotating block model: 3 phases x 12 lessons = 36 total
-- Phase 1: Striking Foundations
-- Phase 2: Grappling Foundations
-- Phase 3: Integration & Fight IQ

DO $$
DECLARE
  -- ── Level IDs ──────────────────────────────────────────────
  lv_striking   UUID := gen_random_uuid();
  lv_grappling  UUID := gen_random_uuid();
  lv_integration UUID := gen_random_uuid();

  -- ── Technique IDs ──────────────────────────────────────────
  -- Stance & footwork
  t_mma_stance        UUID := gen_random_uuid();
  t_mma_footwork      UUID := gen_random_uuid();
  t_cage_cutting      UUID := gen_random_uuid();

  -- Strikes (punches)
  t_mma_jab           UUID := gen_random_uuid();
  t_mma_cross         UUID := gen_random_uuid();
  t_mma_hook          UUID := gen_random_uuid();
  t_mma_uppercut      UUID := gen_random_uuid();
  t_one_two           UUID := gen_random_uuid();
  t_jab_cross_hook    UUID := gen_random_uuid();

  -- Kicks
  t_low_kick          UUID := gen_random_uuid();
  t_body_kick         UUID := gen_random_uuid();
  t_teep              UUID := gen_random_uuid();

  -- Dirty boxing / clinch striking
  t_clinch_entry      UUID := gen_random_uuid();
  t_short_elbow       UUID := gen_random_uuid();
  t_clinch_knee       UUID := gen_random_uuid();
  t_collar_tie        UUID := gen_random_uuid();

  -- Wrestling / takedowns
  t_double_leg        UUID := gen_random_uuid();
  t_single_leg        UUID := gen_random_uuid();
  t_sprawl            UUID := gen_random_uuid();
  t_cage_single_leg   UUID := gen_random_uuid();

  -- Clinch grappling
  t_thai_clinch       UUID := gen_random_uuid();
  t_over_under        UUID := gen_random_uuid();
  t_body_lock         UUID := gen_random_uuid();
  t_underhook         UUID := gen_random_uuid();

  -- Ground positions & movement
  t_closed_guard      UUID := gen_random_uuid();
  t_mount             UUID := gen_random_uuid();
  t_side_control      UUID := gen_random_uuid();
  t_back_control      UUID := gen_random_uuid();
  t_shrimp            UUID := gen_random_uuid();
  t_bridge            UUID := gen_random_uuid();
  t_technical_standup UUID := gen_random_uuid();
  t_guard_posture     UUID := gen_random_uuid();

  -- Integration techniques
  t_jab_to_shot       UUID := gen_random_uuid();
  t_overhand_td       UUID := gen_random_uuid();
  t_sprawl_counter    UUID := gen_random_uuid();
  t_td_defense_exit   UUID := gen_random_uuid();
  t_gnp_mount         UUID := gen_random_uuid();
  t_gnp_guard         UUID := gen_random_uuid();
  t_cage_press        UUID := gen_random_uuid();
  t_off_cage_strike   UUID := gen_random_uuid();
  t_range_management  UUID := gen_random_uuid();
  t_round_pacing      UUID := gen_random_uuid();

  -- Conditioning
  t_fighter_burpee    UUID := gen_random_uuid();
  t_sprawl_drill      UUID := gen_random_uuid();

  -- ── Lesson IDs ─────────────────────────────────────────────
  -- Phase 1 lessons (striking)
  ls1_01 UUID := gen_random_uuid();
  ls1_02 UUID := gen_random_uuid();
  ls1_03 UUID := gen_random_uuid();
  ls1_04 UUID := gen_random_uuid();
  ls1_05 UUID := gen_random_uuid();
  ls1_06 UUID := gen_random_uuid();
  ls1_07 UUID := gen_random_uuid();
  ls1_08 UUID := gen_random_uuid();
  ls1_09 UUID := gen_random_uuid();
  ls1_10 UUID := gen_random_uuid();
  ls1_11 UUID := gen_random_uuid();
  ls1_12 UUID := gen_random_uuid();

  -- Phase 2 lessons (grappling)
  ls2_01 UUID := gen_random_uuid();
  ls2_02 UUID := gen_random_uuid();
  ls2_03 UUID := gen_random_uuid();
  ls2_04 UUID := gen_random_uuid();
  ls2_05 UUID := gen_random_uuid();
  ls2_06 UUID := gen_random_uuid();
  ls2_07 UUID := gen_random_uuid();
  ls2_08 UUID := gen_random_uuid();
  ls2_09 UUID := gen_random_uuid();
  ls2_10 UUID := gen_random_uuid();
  ls2_11 UUID := gen_random_uuid();
  ls2_12 UUID := gen_random_uuid();

  -- Phase 3 lessons (integration)
  ls3_01 UUID := gen_random_uuid();
  ls3_02 UUID := gen_random_uuid();
  ls3_03 UUID := gen_random_uuid();
  ls3_04 UUID := gen_random_uuid();
  ls3_05 UUID := gen_random_uuid();
  ls3_06 UUID := gen_random_uuid();
  ls3_07 UUID := gen_random_uuid();
  ls3_08 UUID := gen_random_uuid();
  ls3_09 UUID := gen_random_uuid();
  ls3_10 UUID := gen_random_uuid();
  ls3_11 UUID := gen_random_uuid();
  ls3_12 UUID := gen_random_uuid();

BEGIN

-- ═════════════════════════════════════════════════════════════
-- CURRICULUM LEVELS
-- ═════════════════════════════════════════════════════════════

INSERT INTO ma_curriculum_levels (id, discipline, level_key, level_order, title, subtitle, belt_name, lesson_count) VALUES
  (lv_striking,    'mma', 'mma_striking',    1, 'Striking Foundations',    'Boxing, kicks, and clinch striking for MMA',          NULL, 12),
  (lv_grappling,   'mma', 'mma_grappling',   2, 'Grappling Foundations',   'Wrestling, clinch work, and ground position basics',  NULL, 12),
  (lv_integration, 'mma', 'mma_integration', 3, 'Integration & Fight IQ', 'Transitions, ground-and-pound, wall work, and strategy', NULL, 12);


-- ═════════════════════════════════════════════════════════════
-- TECHNIQUES
-- ═════════════════════════════════════════════════════════════

INSERT INTO ma_techniques (id, discipline, category, subcategory, name, description, difficulty, belt_level, key_points, common_mistakes, steps, coaching_cues, muscles_used, equipment, stance, related_technique_ids) VALUES

-- ── Stance & Footwork ────────────────────────────────────────

(t_mma_stance, 'mma', 'stance', NULL,
 'MMA Fighting Stance',
 'Wider, lower stance than boxing to defend takedowns while keeping hands ready to strike. The foundation of all MMA movement.',
 'beginner', NULL,
 ARRAY['Feet wider than shoulder-width for sprawl base', 'Hands higher than boxing — one at chin, one at forehead level', 'Weight slightly forward on balls of feet', 'Hips lower than boxing stance for takedown defense', 'Chin tucked, eyes forward'],
 ARRAY['Standing too narrow (easy to take down)', 'Hands too low — exposes head to strikes and cant frame on shots', 'Too upright — no base for sprawling', 'Weight on heels — kills reaction time', 'Blading the body too much (exposes back to takedowns)'],
 ARRAY['Stand with feet slightly wider than shoulder-width', 'Stagger feet with lead foot half a step ahead', 'Bend knees to lower hips — think sitting on a bar stool', 'Bring lead hand to chin height, rear hand near cheekbone', 'Keep elbows tucked but not clamped — leave room to frame', 'Distribute weight 55/45 on lead/rear foot', 'Stay on balls of feet — light, ready to move or sprawl'],
 ARRAY['Sit down into your hips — if someone pushed you, youd stay put', 'Imagine youre standing in wet cement up to your ankles — heavy base', 'Hands up like youre holding a phone to each ear'],
 ARRAY['quads', 'glutes', 'core', 'calves', 'shoulders'],
 'none', 'both', ARRAY[]::UUID[]),

(t_mma_footwork, 'mma', 'footwork', 'movement',
 'MMA Footwork — Slide Step',
 'Fundamental movement pattern: push off the trailing foot, slide the lead foot, then bring the trailing foot back to stance width. Maintains base at all times.',
 'beginner', NULL,
 ARRAY['Never cross feet — slide, dont step', 'Always return to stance width after moving', 'Stay low throughout the movement', 'Move the foot closest to the direction you want to go first'],
 ARRAY['Crossing feet mid-step (vulnerable to sweeps and takedowns)', 'Bouncing up and down while moving (breaks base)', 'Taking steps too large (overcommitting position)', 'Feet ending too close together after sliding'],
 ARRAY['From fighting stance, identify the direction to move', 'Push off the opposite foot — e.g., push off rear foot to go forward', 'Slide the lead foot 6–12 inches in the desired direction', 'Immediately drag the trailing foot to restore stance width', 'Reset hips and hands to fighting stance'],
 ARRAY['Think push-slide-reset — three quick beats', 'Your head should stay on the same plane — no bobbing up', 'If I freeze you mid-step, you should still look like youre in stance'],
 ARRAY['calves', 'quads', 'hip flexors', 'core'],
 'none', 'both', ARRAY[]::UUID[]),

(t_cage_cutting, 'mma', 'footwork', 'ring_control',
 'Cage Cutting',
 'Lateral movement pattern to corner an opponent against the cage. Step at 45-degree angles to cut off escape routes instead of chasing.',
 'intermediate', NULL,
 ARRAY['Move at 45-degree angles, not straight forward', 'Keep the opponent between you and the cage', 'Use feints to freeze them before cutting', 'Maintain striking range — dont rush in'],
 ARRAY['Chasing in a straight line (opponent simply circles away)', 'Getting too close too fast (eating counter strikes)', 'Losing stance discipline while cutting angles', 'Cutting without feints (telegraphing your movement)'],
 ARRAY['From fighting stance, identify which direction opponent is circling', 'Step your lead foot 45 degrees toward the cage (cutting off escape)', 'Slide rear foot to re-establish stance', 'Feint a jab to freeze the opponent', 'Take another 45-degree step to continue closing the angle', 'When opponent is within 3 feet of cage, engage or threaten'],
 ARRAY['Think chess, not chase — cut angles, dont run after them', 'Two 45-degree steps equals one straight step but traps them', 'Feint before every angle change — freeze them for a beat'],
 ARRAY['quads', 'glutes', 'hip flexors', 'calves', 'core'],
 'none', 'both', ARRAY[]::UUID[]),

-- ── Strikes (Punches) ────────────────────────────────────────

(t_mma_jab, 'mma', 'strike', 'punch',
 'MMA Jab',
 'The rangefinder. Slightly more retracted than a boxing jab to avoid the lead hand being grabbed. Sets up everything else.',
 'beginner', NULL,
 ARRAY['Throw from chin, return to chin — no lazy returns', 'Snap the punch — speed over power', 'Slight hip rotation adds reach without overcommitting', 'Turn fist over on impact (palm down)', 'Keep rear hand glued to cheek'],
 ARRAY['Dropping the rear hand when jabbing (counter hook target)', 'Leaning forward too much (easy to counter with a takedown)', 'Flaring the elbow outward (telegraphs the punch)', 'Not retracting fast enough (arm gets grabbed in MMA)'],
 ARRAY['From MMA stance, extend lead hand straight toward target', 'Rotate fist so palm faces the floor at full extension', 'Drive with a small push off the rear foot', 'Snap the hand back to guard immediately after contact', 'Reset stance and hands'],
 ARRAY['Pop it out like youre flicking water off your fingertips', 'Throw it and steal it back — dont leave it out there', 'The jab is your measuring stick — know your range'],
 ARRAY['shoulders', 'triceps', 'core', 'calves'],
 'none', 'orthodox', ARRAY[]::UUID[]),

(t_mma_cross, 'mma', 'strike', 'punch',
 'MMA Cross (Straight Right)',
 'Your power punch. Full hip and shoulder rotation generates knockout force. In MMA, slightly shorter extension than boxing to stay balanced.',
 'beginner', NULL,
 ARRAY['Power comes from hip rotation, not the arm', 'Rear foot pivots — heel comes off the ground', 'Hand travels in a straight line to the target', 'Chin stays tucked behind lead shoulder at full extension', 'Dont overextend — keep enough base to defend a shot'],
 ARRAY['Arm-punching without hip rotation (no power)', 'Reaching too far forward (losing balance, vulnerable to takedowns)', 'Pulling the lead hand down while throwing (exposes chin)', 'Rear foot stays flat (kills rotation and power)', 'Chin lifting on impact (asking to get countered)'],
 ARRAY['From MMA stance, initiate the cross by rotating the rear hip forward', 'Pivot the rear foot — heel rises, ball of foot drives rotation', 'Extend the rear hand in a straight line toward the target', 'Turn the fist over so palm faces down at impact', 'Lead hand stays high covering the chin', 'Rotate shoulders so rear shoulder pushes forward', 'Snap hand back to guard and reset stance'],
 ARRAY['Think hips first, hand follows — the arm is just a delivery system', 'Your rear heel should point at the ceiling when you land it', 'Land the cross and imagine being pulled back to stance by a bungee cord'],
 ARRAY['glutes', 'core', 'shoulders', 'rear deltoid', 'triceps', 'quads'],
 'none', 'orthodox', ARRAY[]::UUID[]),

(t_mma_hook, 'mma', 'strike', 'punch',
 'MMA Lead Hook',
 'Devastating at close range. The hook travels on a horizontal arc and is the most common knockout punch in MMA. Keep the elbow at 90 degrees.',
 'beginner', NULL,
 ARRAY['Elbow locked at 90 degrees throughout', 'Power comes from hip rotation — pivot the lead foot', 'Hand stays at chin height — horizontal arc, not looping', 'Fist can land with palm facing you or palm down', 'Short, compact arc — tight hooks are fast hooks'],
 ARRAY['Winding up or cocking the hand back before throwing (telegraphs)', 'Elbow dropping below 90 degrees (becomes a looping arm punch)', 'Swinging too wide (slow, easy to duck under)', 'Dropping the rear hand while hooking (counter right hand target)', 'Pivoting too much and losing balance'],
 ARRAY['From MMA stance, begin rotating lead hip and foot', 'Pivot lead foot so toes point outward roughly 90 degrees', 'Keep elbow at 90 degrees and forearm parallel to the ground', 'Drive the fist on a tight horizontal arc toward the target', 'Make contact with the first two knuckles', 'Continue rotating through the target for power', 'Return hand to guard and reset stance'],
 ARRAY['Think of turning a key in a lock — the whole body rotates around the axis', 'If your hook is wider than your shoulders, tighten it up', 'Short hooks finish fights — keep it compact'],
 ARRAY['core obliques', 'shoulders', 'biceps', 'forearms', 'hip rotators', 'calves'],
 'none', 'orthodox', ARRAY[]::UUID[]),

(t_mma_uppercut, 'mma', 'strike', 'punch',
 'MMA Uppercut',
 'A rising punch thrown from below the opponents line of sight. Devastating against opponents ducking into shots or in the clinch. Drop the hand slightly, drive upward with the legs.',
 'intermediate', NULL,
 ARRAY['Power comes from the legs driving upward', 'Slight drop of the hand to load — dont exaggerate it', 'Palm faces you at impact — fist rises vertically', 'Short, compact motion — not a big wind-up', 'Stay balanced — dont lean forward into it'],
 ARRAY['Over-dipping the shoulder or bending at the waist (telegraphs and exposes chin)', 'Throwing from too far away — this is a close-range weapon', 'Rising onto toes and losing base (vulnerable to counter takedown)', 'Using only the arm instead of driving with the legs'],
 ARRAY['From MMA stance, slightly dip the knee on the punching side', 'Drop the punching hand 3–4 inches below chin level', 'Drive upward by extending the legs and rotating the hip', 'Punch rises vertically — palm faces toward you', 'Target the chin or solar plexus', 'Snap hand back to guard as hips return to center'],
 ARRAY['Think of pulling a rope from the floor to the ceiling', 'Its a leg punch — your legs launch it, the arm just delivers', 'Stay close enough to whisper to them — thats uppercut range'],
 ARRAY['quads', 'glutes', 'core', 'biceps', 'shoulders'],
 'none', 'orthodox', ARRAY[]::UUID[]),

(t_one_two, 'mma', 'strike', 'combination',
 'Jab – Cross (1-2)',
 'The fundamental two-punch combination in MMA. The jab measures distance and the cross delivers power. Foundation for all longer combinations.',
 'beginner', NULL,
 ARRAY['Jab sets the range, cross delivers the power', 'No pause between punches — flow as one motion', 'Return to guard between punches', 'Second punch is more committed but dont overextend'],
 ARRAY['Pausing between the jab and cross (opponent recovers)', 'Dropping the lead hand after the jab (exposed to counter)', 'Lunging forward with the cross (losing balance)', 'Both punches having the same speed — jab should be quicker, cross heavier'],
 ARRAY['From MMA stance, throw a quick jab', 'As jab retracts, immediately rotate rear hip', 'Fire the cross in a straight line while jab returns to guard', 'Snap cross back and reset to fighting stance'],
 ARRAY['Pop-bang — quick-quick, no gap', 'Think of the jab as the door opener and the cross walks through it', 'If you can do 1-2 well, you can fight'],
 ARRAY['shoulders', 'triceps', 'core', 'glutes', 'calves'],
 'none', 'orthodox', ARRAY[t_mma_jab, t_mma_cross]),

(t_jab_cross_hook, 'mma', 'strike', 'combination',
 'Jab – Cross – Hook (1-2-3)',
 'The classic three-piece combination. After the cross, the body is already rotated to load the lead hook. In MMA, follow with level change or circle out.',
 'intermediate', NULL,
 ARRAY['The cross rotation naturally loads the hook', 'Keep the hook tight after the cross — dont loop it', 'Each punch flows into the next without resetting', 'After the combo, either exit at an angle or level change'],
 ARRAY['Stopping to reset between punches (kills flow)', 'Hook becomes wider as fatigue sets in', 'Standing still after the combo (easy to counter or shoot on)', 'Forgetting to exit — always move after a combination'],
 ARRAY['From MMA stance, throw the jab', 'Immediately follow with the cross — full hip rotation', 'As cross retracts, pivot lead foot and throw a tight lead hook', 'After the hook lands, step off at a 45-degree angle or level change', 'Reset stance and guard'],
 ARRAY['Pop-bang-crack — three distinct impacts, one motion', 'The hook is free after the cross — your body is already loaded for it', 'Throw the combo and get off the center line — never stand still'],
 ARRAY['shoulders', 'triceps', 'core obliques', 'glutes', 'calves', 'hip rotators'],
 'none', 'orthodox', ARRAY[t_one_two, t_mma_hook]),

-- ── Kicks ─────────────────────────────────────────────────────

(t_low_kick, 'mma', 'kick', 'leg_kick',
 'Low Kick (Leg Kick)',
 'A chopping kick targeting the opponents lead or rear thigh. Damages mobility over time and sets up takedowns. Staple weapon in MMA.',
 'beginner', NULL,
 ARRAY['Shin makes contact, not the foot', 'Turn the hip over — visualize kicking through the target', 'Step the lead foot outward 30 degrees to open the hips', 'Standing leg pivots to allow full hip rotation', 'Arm on the kicking side swings down for counterbalance'],
 ARRAY['Kicking with the foot or instep (risk of foot injury)', 'Not turning the hip over (no power, bounces off)', 'Staying squared up — step the lead foot to angle the hips', 'Dropping hands while kicking (eats a counter hook)', 'Not checking distance — too close kills the kicks power'],
 ARRAY['From MMA stance, take a small step with your lead foot at 30 degrees outward', 'Pivot hard on the lead foot — heel turns toward the target', 'Swing the rear leg in a diagonal arc toward the opponents thigh', 'Turn the hip over completely — shin drives through the target', 'Arm on the kicking side drops for counterbalance, other hand guards chin', 'Leg follows through and returns to stance — dont leave it hanging'],
 ARRAY['Chop through the leg like youre swinging a baseball bat', 'Turn that hip — if your belly button doesnt face the target, you didnt commit', 'Land your shin, not your foot — the shin is a baseball bat, the foot is a twig'],
 ARRAY['hip flexors', 'glutes', 'quads', 'core obliques', 'calves', 'hamstrings'],
 'none', 'orthodox', ARRAY[]::UUID[]),

(t_body_kick, 'mma', 'kick', 'body_kick',
 'Body Kick (Round Kick to Body)',
 'A powerful roundhouse kick targeting the opponents ribs and liver. Same mechanics as the low kick but aimed higher. Can end fights with a single shot to the liver.',
 'intermediate', NULL,
 ARRAY['Same mechanics as low kick — just higher target', 'Shin contacts the ribs, not the foot', 'Full hip turnover is critical for power', 'Step offline slightly before kicking to create the angle', 'Left body kick to the liver is the money shot'],
 ARRAY['Telegraphing by lifting the knee first (should be one motion)', 'Not turning the hip over (kick bounces off ribs)', 'Aiming too high and hitting the arm (blocked)', 'Forgetting to guard the chin — counter hook is coming', 'Kicking from too far away (only the foot connects, no power)'],
 ARRAY['From MMA stance, step lead foot outward at a 30-degree angle', 'Pivot on the lead foot — heel rotates toward target', 'Swing the rear leg in an arc targeting the opponents rib cage', 'Turn the hip over fully — shin drives through the ribs', 'Swinging arm drops for balance, guard hand protects chin', 'Return the leg to stance — dont plant it forward'],
 ARRAY['Same as your low kick but aim at the floating ribs', 'Think of wrapping your shin around their body like a whip', 'A liver shot folds anyone — it doesnt matter how tough they are'],
 ARRAY['hip flexors', 'glutes', 'core obliques', 'quads', 'hamstrings'],
 'none', 'orthodox', ARRAY[t_low_kick]),

(t_teep, 'mma', 'kick', 'push_kick',
 'Teep (Push Kick / Front Kick)',
 'A straight pushing kick to the opponents body or hips. Controls distance, stops forward pressure, and can set up strikes or takedowns. The jab of kicking.',
 'beginner', NULL,
 ARRAY['Push through the target, dont snap at it', 'Ball of the foot makes contact', 'Chamber the knee high before extending', 'Lean the torso back slightly for balance and range', 'Use it to reset distance when opponent pressures'],
 ARRAY['Kicking with toes pointed (risk of toe injury — use ball of foot)', 'Not chambering the knee (kick has no power and is easy to catch)', 'Leaning too far back (lose balance if kick is caught)', 'Throwing it lazily — slow teeps get caught and turned into takedowns'],
 ARRAY['From MMA stance, lift the lead or rear knee to hip height (chambering)', 'Lean the upper body back slightly for counterbalance', 'Extend the leg, pushing through with the ball of the foot', 'Target the opponents solar plexus, hips, or lower abs', 'Push through the target — visualize moving them backward', 'Retract the leg quickly and return to fighting stance'],
 ARRAY['Think of it as a push, not a kick — youre shoving them away with your foot', 'Chamber high, extend fast, retract faster', 'Its your keep-away tool — any time they step in, teep them back out'],
 ARRAY['hip flexors', 'quads', 'core', 'glutes', 'calves'],
 'none', 'both', ARRAY[]::UUID[]),

-- ── Dirty Boxing / Clinch Striking ───────────────────────────

(t_clinch_entry, 'mma', 'grappling', 'clinch',
 'Clinch Entry (Collar Tie)',
 'Closing distance safely to establish the clinch. Use a punch to close the gap, then secure collar ties or an underhook. Critical transition zone in MMA.',
 'beginner', NULL,
 ARRAY['Enter behind a punch — never walk into the clinch naked', 'First contact: hand goes to back of head (collar tie) or underhook', 'Forehead pressure on their chest or chin', 'Stay heavy on them — make them carry your weight', 'Control the bicep with your free hand'],
 ARRAY['Walking into the clinch without a strike (eating punches on entry)', 'Head too far away — get your forehead on them', 'Reaching with arms only (no body pressure = easy to push off)', 'Both hands going to the same place (no control framework)'],
 ARRAY['From MMA stance, throw a jab or cross to close distance', 'As the punch lands or is blocked, step your lead foot inside their stance', 'Place your lead hand on the back of their neck (collar tie grip)', 'Secure an underhook with your rear hand or grab their bicep', 'Press your forehead into their collarbone or chin line', 'Establish heavy hip pressure — make them feel your weight'],
 ARRAY['Punch your way in — the clinch starts with a strike', 'Head position wins the clinch — get your forehead on them first', 'Be heavy — if they feel light, they can push you off'],
 ARRAY['shoulders', 'biceps', 'forearms', 'core', 'neck'],
 'none', 'both', ARRAY[]::UUID[]),

(t_short_elbow, 'mma', 'strike', 'elbow',
 'Short Elbow (Clinch Elbow)',
 'A short-range elbow strike thrown in the clinch or at close range. Uses the sharp point of the elbow to cut or stun. Legal in MMA, devastating when landed cleanly.',
 'intermediate', NULL,
 ARRAY['The elbow point is the weapon — sharp, compact, short range', 'Hip rotation drives the power, same as a hook', 'Keep opposite hand controlling the opponent (collar tie or underhook)', 'Target the temple, jawline, or brow ridge', 'Follow through — dont slap with it'],
 ARRAY['Reaching with the elbow (too far = no power, use a hook instead)', 'Telegraphing with a big wind-up', 'Releasing clinch control to throw — keep one hand controlling', 'Aiming too high or too low — temple and jaw are the targets'],
 ARRAY['From clinch position, keep one hand controlling the opponent (collar tie or wrist)', 'Rotate the hip on the striking side, same as a hook', 'Drive the elbow point in a tight horizontal arc toward the temple or jaw', 'Follow through the target — dont stop at the surface', 'Return to clinch control immediately after striking'],
 ARRAY['Same motion as a hook but half the distance', 'Drive through them like youre trying to touch your own opposite shoulder', 'One hand fights, one hand controls — never let go with both'],
 ARRAY['core obliques', 'shoulders', 'triceps', 'hip rotators'],
 'none', 'both', ARRAY[]::UUID[]),

(t_clinch_knee, 'mma', 'strike', 'knee',
 'Clinch Knee Strike',
 'A rising knee thrown while controlling the opponent in the clinch. Pull their head down while driving the knee up. One of the highest-impact strikes in MMA.',
 'intermediate', NULL,
 ARRAY['Pull the opponents head down as you drive the knee up — double the impact', 'Drive the knee straight up through the solar plexus or ribs', 'Hips thrust forward for maximum power', 'Keep your base foot planted — dont jump into it', 'Alternate knees if you have dominant control'],
 ARRAY['Letting go of clinch control to throw the knee (opponent escapes)', 'Driving knee outward instead of straight up (glances off)', 'Jumping into the knee (lose balance if it misses)', 'Only pulling with arms — use your bodyweight to pull their head down', 'Throwing weak, tentative knees — commit fully'],
 ARRAY['From a dominant clinch position (Thai clinch or collar tie)', 'Pull the opponents head down firmly using bodyweight', 'Drive one knee straight up toward the solar plexus or floating ribs', 'Thrust hips forward at the moment of impact for added force', 'Keep base foot flat on the ground for balance', 'Return the knee to the ground and re-establish clinch control', 'Repeat or transition to another strike'],
 ARRAY['Pull them into the knee — dont just throw it and hope', 'Drive through them — your knee should try to come out the other side', 'Head down, knee up — the two forces meeting is what makes it devastating'],
 ARRAY['hip flexors', 'quads', 'glutes', 'core', 'lats', 'biceps'],
 'none', 'both', ARRAY[t_clinch_entry]),

(t_collar_tie, 'mma', 'grappling', 'clinch',
 'Collar Tie Control',
 'Dominant hand position on the back of the opponents neck. From here you can snap them down, set up knees, elbows, or takedowns. The steering wheel of the clinch.',
 'beginner', NULL,
 ARRAY['Cup the back of the neck — dont grab the head', 'Elbow stays heavy and pointed down — creates a wedge', 'Use it to snap their posture down or circle them', 'Free hand can frame, pummel, or strike', 'Active grip — constantly pulling, snapping, or redirecting'],
 ARRAY['Grabbing the top of the head (no control — hand slips off)', 'Passive grip — just holding without pulling or controlling', 'Elbow floating up (no downward pressure, easy to escape)', 'Both hands on the collar tie (no defense or offense with the other hand)'],
 ARRAY['From clinch range, cup your hand on the back of the opponents neck', 'Fingers wrap around the base of the skull, thumb along the neck', 'Drive your elbow downward — creating a heavy wedge on their shoulder', 'Pull their head toward your chest — break their posture', 'Use the other hand to underhook, frame, or control their arm', 'Snap down, circle, or transition to a strike or takedown'],
 ARRAY['Grip the neck like youre holding a football — firm cup, not a squeeze', 'Your elbow is an anchor — keep it heavy and pointed at the floor', 'Whoever controls the head controls the fight'],
 ARRAY['biceps', 'forearms', 'shoulders', 'core', 'lats'],
 'none', 'both', ARRAY[t_clinch_entry]),

-- ── Wrestling / Takedowns ────────────────────────────────────

(t_double_leg, 'mma', 'grappling', 'takedown',
 'Double Leg Takedown',
 'The workhorse takedown: shoot in, grab both legs above the knees, drive through to take the opponent down. Essential wrestling for MMA.',
 'beginner', NULL,
 ARRAY['Level change comes first — drop your hips before shooting', 'Penetration step: lead knee drives between their feet', 'Head goes to the hip — never put your head down', 'Hands lock behind both knees or thighs', 'Drive forward and up at a 45-degree angle to finish'],
 ARRAY['Shooting without a level change (telegraphed, easy to sprawl on)', 'Head down — looking at the floor gets you guillotined', 'Reaching with arms instead of stepping in (no driving power)', 'Stopping after contact — you must drive through to finish', 'Shooting from too far away (easy to react and defend)'],
 ARRAY['From MMA stance, drop your hips and level change (bend knees, not waist)', 'Take a deep penetration step — lead knee drives to the floor between their feet', 'Shoot both hands forward and wrap behind both of their thighs', 'Head posts on their hip — keep your eyes up and head to the side', 'Lock hands behind their legs — gable grip or around the thighs', 'Drive forward at a 45-degree angle while lifting their legs', 'Run through them, turning the corner to finish on top'],
 ARRAY['Level change THEN shoot — never shoot standing tall', 'Your knee should almost kiss the floor on the penetration step', 'Head on the hip, eyes up — this isnt a headbutt, its a tackle', 'Dont stop on contact — drive your feet like youre pushing a sled'],
 ARRAY['quads', 'glutes', 'hamstrings', 'core', 'shoulders', 'traps'],
 'none', 'both', ARRAY[]::UUID[]),

(t_single_leg, 'mma', 'grappling', 'takedown',
 'Single Leg Takedown',
 'Grab one leg and use trips, lifts, or runs to take the opponent down. More versatile than the double leg and safer to shoot in MMA because your head stays to the outside.',
 'beginner', NULL,
 ARRAY['Head goes to the outside of their body (not between their legs)', 'Grab the leg at the knee crease and pull it tight to your chest', 'Keep your hips under you — dont bend at the waist', 'Finish with a trip, lift, or run-the-pipe', 'Can be set up with a jab or level change'],
 ARRAY['Head on the inside (easy to guillotine)', 'Holding the leg too loosely (they pull it out)', 'Bending at the waist instead of the knees (back exposed, weak posture)', 'Not finishing — holding the leg and stalling (they hop out or hit you)', 'Shooting without setting it up (easy to see coming)'],
 ARRAY['From MMA stance, level change by bending the knees', 'Step in with a penetration step — lead foot to the outside of their lead foot', 'Reach and grab behind their lead knee with both hands', 'Pull their leg tight to your chest — hug it like a teddy bear', 'Head goes to the outside of their hip — keep eyes forward', 'Finish by: lifting the leg and running them backward, OR tripping the standing leg with your own foot, OR driving forward to dump them sideways', 'Establish top position after the takedown'],
 ARRAY['Head outside, leg tight to chest — thats your checklist', 'Grab it, hug it, take them for a walk — they cant fight on one leg', 'Set it up with punches — jab, level change, shoot'],
 ARRAY['quads', 'glutes', 'biceps', 'core', 'shoulders', 'hamstrings'],
 'none', 'both', ARRAY[]::UUID[]),

(t_sprawl, 'mma', 'defense', 'takedown_defense',
 'Sprawl',
 'The primary takedown defense: when the opponent shoots, kick your legs back and drive your hips down onto their shoulders. Stops the takedown cold.',
 'beginner', NULL,
 ARRAY['React to the level change — as soon as they shoot, sprawl', 'Kick both legs back simultaneously — explosive hip snap', 'Drive hips DOWN onto their shoulders or upper back', 'Hands push down on their head and neck (cross-face or push)', 'Dont land flat — land on your hips and toes'],
 ARRAY['Sprawling too late (already have your legs — game over)', 'Legs going back but hips staying high (no pressure = they still finish)', 'Landing on your knees instead of your toes (cant redirect weight)', 'Reaching down with arms only (need full body commitment)', 'Not following up — after the sprawl, circle to the back or disengage'],
 ARRAY['As opponent shoots or level changes, immediately react', 'Kick both legs straight back behind you explosively', 'Snap your hips DOWN and drive them into the opponents shoulders', 'Land on the balls of your feet and your hip bones', 'Hands go to their head/neck — cross-face or push down', 'Drive your bodyweight forward through their shoulders', 'Either circle to their back for a go-behind or push off and reset to standing'],
 ARRAY['Hips to the FLOOR — slam your belt buckle onto their neck', 'Think of it like a burpee with bad intentions', 'The faster your hips hit the floor, the less chance they finish the shot'],
 ARRAY['hip flexors', 'glutes', 'core', 'shoulders', 'chest', 'quads'],
 'none', 'both', ARRAY[t_double_leg, t_single_leg]),

(t_cage_single_leg, 'mma', 'grappling', 'takedown',
 'Cage Wrestling — Single Leg Against the Fence',
 'Using the cage to trap the opponent and finish a single leg takedown. The cage removes their ability to circle away, making the finish much easier.',
 'intermediate', NULL,
 ARRAY['Use the cage as a third hand — it stops them from moving backward', 'Press your shoulder into their midsection for control', 'Trip or lift the captured leg while driving into the cage', 'Inside foot position: your feet between theirs', 'Head tight to their body — dont leave space'],
 ARRAY['Giving them space between you and the cage (they escape sideways)', 'Head too low (eating knees or getting guillotined)', 'Not using your feet to trip (relying only on upper body to finish)', 'Stalling with the leg held (burn energy and get hit)'],
 ARRAY['Drive the opponent backward into the cage with forward pressure', 'Secure the single leg — grab behind the knee, head on their hip', 'Pin their back to the cage with your shoulder in their midsection', 'Step your inside foot between their feet for base', 'Finish with a trip: hook their standing foot and drive forward', 'Or finish with a lift: scoop the leg high while pushing forward', 'Establish top position once they hit the ground'],
 ARRAY['The cage is your best training partner — pin them to it and work', 'Drive your shoulder through their belly button — make them uncomfortable', 'Head tight, hips in, feet active — thats cage wrestling in three words'],
 ARRAY['quads', 'glutes', 'shoulders', 'core', 'biceps'],
 'none', 'both', ARRAY[t_single_leg]),

-- ── Clinch Grappling ─────────────────────────────────────────

(t_thai_clinch, 'mma', 'grappling', 'clinch',
 'Thai Clinch (Double Collar Tie)',
 'Both hands clasped behind the opponents head with elbows framing against their collarbones. Dominant position for knees and controlling the fight.',
 'intermediate', NULL,
 ARRAY['Hands interlocked (gable grip) behind the head, NOT the neck', 'Elbows squeeze together in front of their face — creates a frame', 'Pull their head DOWN while your elbows drive INTO their collarbone', 'Hips close to theirs — dont lean back', 'Constantly off-balance them by snapping and circling'],
 ARRAY['Grabbing the neck instead of the head (weak grip, easy to break)', 'Elbows flaring wide (no control, they swim out easily)', 'Leaning back away from them (you pull yourself off balance)', 'Static holding — the clinch is active, always snapping and moving', 'Forgetting to knee (controlling without striking wastes the position)'],
 ARRAY['From clinch range, cup both hands behind the opponents head', 'Interlock fingers with a gable grip (palm to palm)', 'Squeeze elbows together in front of their face', 'Pull their head downward while driving elbows into their collarbones', 'Keep hips close — step in tight', 'Snap their head down and throw a knee', 'Continue controlling, snapping, kneeing, or transition to takedown'],
 ARRAY['Squeeze your elbows like you are trying to touch them together', 'Their head goes where you put it — you are the steering wheel', 'Clinch and knee, clinch and knee — never just hold'],
 ARRAY['biceps', 'forearms', 'core', 'lats', 'hip flexors'],
 'none', 'both', ARRAY[t_collar_tie, t_clinch_entry]),

(t_over_under, 'mma', 'grappling', 'clinch',
 'Over-Under Clinch',
 'One arm underhooks, the other overhooks. A neutral clinch position where both fighters have one of each. From here you can wrestle for position, throw, or disengage.',
 'intermediate', NULL,
 ARRAY['Underhook side: fight for your underhook to be deeper', 'Overhook side: pinch the elbow tight to trap their underhook', 'Constant battle for head position — forehead on their chin', 'Use the underhook to turn their body and create angles', 'Can transition to body lock, throw, or knee from here'],
 ARRAY['Passive clinching — you must actively fight for position every second', 'Underhook too shallow (easy to swim under and take it away)', 'Not using head position (lose the battle for angle)', 'Forgetting you can strike from here — short knees and elbows are legal'],
 ARRAY['From clinch engagement, secure one underhook (arm under their armpit, hand on their back)', 'With the other arm, overhook their underhook (arm over their arm, squeezing it tight)', 'Press forehead into their chin or chest', 'Fight to make your underhook deeper while keeping theirs trapped', 'From here: use underhook to turn them toward the cage, go to body lock, throw a knee, or pummel to double underhooks'],
 ARRAY['Your underhook is your steering wheel — the deeper it is, the more control you have', 'Squeeze that overhook tight — dont let them free their underhook', 'Head position is king — forehead on their chin, push them back'],
 ARRAY['biceps', 'shoulders', 'core', 'lats', 'forearms'],
 'none', 'both', ARRAY[t_underhook]),

(t_body_lock, 'mma', 'grappling', 'clinch',
 'Body Lock',
 'Hands locked around the opponents torso, typically from double underhooks. Powerful position for throws, trips, and cage takedowns.',
 'intermediate', NULL,
 ARRAY['Secure double underhooks first, then lock hands', 'Gable grip (palm to palm) around their lower back', 'Keep your hips under you — drive forward with your legs', 'Head in the center of their chest — heavy forehead pressure', 'Use the lock to lift, trip, or drive them to the cage'],
 ARRAY['Locking hands too high on their back (no leverage for trips or lifts)', 'Standing upright with no hip pressure (easy to break)', 'No forehead pressure (they can push you away)', 'Holding without acting — the body lock is a finishing position, not a rest position'],
 ARRAY['From the clinch, pummel to achieve double underhooks', 'Lock hands behind the opponents lower back (gable grip)', 'Drive forehead into the center of their chest', 'Squeeze elbows tight to their body', 'To finish: drive forward to the cage and trip, or arch backward to throw, or lift and turn to dump sideways'],
 ARRAY['Once you lock the body lock, the clock is ticking — finish the takedown', 'Squeeze like youre trying to pop a balloon between you', 'Head pressure drives them backward — then use your legs to finish'],
 ARRAY['core', 'lats', 'biceps', 'forearms', 'glutes', 'quads'],
 'none', 'both', ARRAY[t_underhook, t_over_under]),

(t_underhook, 'mma', 'grappling', 'clinch',
 'Underhook',
 'Sliding your arm under the opponents armpit to control their body. The most important hand position in MMA clinch fighting. Whoever has the deeper underhook usually wins the exchange.',
 'beginner', NULL,
 ARRAY['Swim your arm under their armpit — hand cups their upper back or shoulder blade', 'Keep your elbow tight to their ribs — dont flare it', 'Head position: forehead into their chin on the underhook side', 'An underhook is not a hug — its a steering wheel, actively redirect them', 'Use it to off-balance, turn, or set up takedowns'],
 ARRAY['Underhook too shallow — hand should be on their back, not their armpit', 'Elbow flaring outward (they swim under and take it away)', 'Being passive with the underhook (just holding instead of working with it)', 'No head position accompanying the underhook (half the battle)'],
 ARRAY['From the clinch, identify the opening under their arm', 'Swim your arm under their armpit in a quick scooping motion', 'Drive your hand up their back — aim for the shoulder blade', 'Keep your elbow pinched tight against their ribs', 'Press your forehead into their chin on the underhook side', 'Use the underhook to steer their body — turn them, push them, or set up a takedown'],
 ARRAY['Swim it deep — if your hand isnt on their back, its not deep enough', 'The underhook is a steering wheel, not a seatbelt — actively use it', 'Win the underhook battle and you win the clinch'],
 ARRAY['shoulders', 'biceps', 'lats', 'core'],
 'none', 'both', ARRAY[]::UUID[]),

-- ── Ground Positions & Movement ──────────────────────────────

(t_closed_guard, 'mma', 'grappling', 'ground_position',
 'Closed Guard (Bottom)',
 'On your back with legs wrapped around the opponents waist. A defensive but active position — control their posture, set up sweeps, submissions, or stand back up.',
 'beginner', NULL,
 ARRAY['Legs locked around their waist — ankles crossed, squeeze with knees', 'Control their posture by pulling their head down with collar ties or wrist control', 'Hips active — constantly creating angles', 'This is NOT a resting position — if youre not attacking, stand up', 'In MMA, prioritize getting back to your feet over playing guard'],
 ARRAY['Lying flat on your back (no hip movement, no offense)', 'Letting them posture up (ground and pound city)', 'Just holding with legs and not using hands to control', 'Getting comfortable on your back — in MMA, the bottom is dangerous'],
 ARRAY['Once on your back, immediately lock your ankles behind their waist', 'Squeeze your knees together for control', 'Grab behind their head or control their wrists — break their posture', 'Keep your hips off the ground — use them to create angles', 'From here: work to stand up (technical standup), sweep them over, or lock up a submission', 'In MMA, always look to improve position or get back to your feet'],
 ARRAY['Your legs are your seatbelt — keep them locked and squeeze', 'If they posture up, you are in trouble — pull them back down immediately', 'In MMA, the bottom is survival mode — get up or sweep, dont camp here'],
 ARRAY['hip flexors', 'core', 'hamstrings', 'glutes', 'biceps'],
 'none', 'both', ARRAY[]::UUID[]),

(t_mount, 'mma', 'grappling', 'ground_position',
 'Mount (Top Position)',
 'Sitting on the opponents torso with your knees on the mat beside their ribs. The most dominant position in MMA — you can strike freely while they have very limited options.',
 'beginner', NULL,
 ARRAY['Knees squeeze their ribs — dont sit upright like a horse', 'Stay low — chest to chest minimizes the bridge', 'Hands post on the mat for base — dont sit up tall', 'Grapevine their legs to prevent the buck (hook your feet inside their legs)', 'When you strike, maintain base — dont lean forward off balance'],
 ARRAY['Sitting up too tall (easy to bridge off)', 'Knees too wide (no squeeze, they escape through the back door)', 'Leaning too far forward when punching (they trap an arm and sweep)', 'No grapevines or hooks (they just buck you off)', 'Celebrating the position instead of finishing — keep working'],
 ARRAY['Establish mount by straddling their torso — knees on the mat next to their ribs', 'Stay low: chest close to their chest', 'Squeeze your knees together for control', 'Grapevine their legs by hooking your feet inside their legs', 'Post one hand on the mat for base while striking with the other', 'When they try to escape, drop your hips and squeeze', 'Stay heavy and work for submissions or ground and pound'],
 ARRAY['Stay low and heavy — imagine youre a sandbag on their chest', 'Squeeze your knees like youre riding a horse through rapids', 'They WILL try to escape — ride it out, keep your base, stay heavy'],
 ARRAY['hip flexors', 'core', 'quads', 'glutes', 'shoulders'],
 'none', 'both', ARRAY[]::UUID[]),

(t_side_control, 'mma', 'grappling', 'ground_position',
 'Side Control (Top)',
 'Perpendicular to the opponent with your chest on theirs, hips driving into them. A high-pressure control position for striking, submissions, and transitions.',
 'beginner', NULL,
 ARRAY['Chest-to-chest pressure — make them feel your weight', 'Near arm: underhook or crossface', 'Far arm: control their hip or underhook their far arm', 'Hips low and driving INTO them — not resting on your knees', 'Toes dug in for drive — stay on your toes, not flat on the mat'],
 ARRAY['Resting on your knees (no pressure, they escape easily)', 'Leaving space between your bodies (they reguard)', 'No crossface or head control (they turn toward you and escape)', 'Staying completely still (need to be threatening attacks to maintain control)', 'Floating on top instead of driving through them'],
 ARRAY['Position yourself perpendicular to the opponent — your chest on their chest', 'Near-side arm: thread under their head for a crossface or underhook their far arm', 'Far-side arm: control their hip to prevent them turning away', 'Drive your hips into their near hip — low and heavy', 'Stay on your toes for drive and mobility', 'Chest pressure is constant — make every breath hard for them', 'From here: transition to mount, attack submissions, or strike'],
 ARRAY['Be a wet blanket — heavy, suffocating, everywhere at once', 'Hips IN, not resting on the mat — drive through them', 'If they cant breathe, they cant think — and if they cant think, they cant escape'],
 ARRAY['core', 'shoulders', 'chest', 'hip flexors', 'lats'],
 'none', 'both', ARRAY[]::UUID[]),

(t_back_control, 'mma', 'grappling', 'ground_position',
 'Back Control (Seatbelt Grip + Hooks)',
 'Behind the opponent with hooks (feet) inside their thighs and arms controlling the seatbelt grip. The highest percentage finishing position in MMA history.',
 'intermediate', NULL,
 ARRAY['Seatbelt grip: one arm over their shoulder, one arm under the opposite armpit, hands clasped', 'Hooks in: feet inside their thighs, heels against inner thighs', 'Stay tight — no space between your chest and their back', 'Choking arm (over the shoulder) is the dangerous one — they must defend it', 'If they try to escape toward your underhook side, take mount; toward your overhook side, re-adjust hooks'],
 ARRAY['Hooks too shallow or feet not engaged (they can peel your legs off)', 'Crossing ankles (they can ankle lock you)', 'Leaning to one side (they escape off the opposite side)', 'Loose seatbelt grip (they can peel your arms and turn)', 'Being flat on your back under them (they can smash backward and escape)'],
 ARRAY['Establish the seatbelt grip from behind — one arm over their shoulder, one under the armpit', 'Clasp hands together — the over-arm is the choking threat', 'Insert both hooks — feet go inside their thighs with heels pressing inward', 'Stay slightly on one hip — not flat on your back', 'Squeeze tight with your arms and legs — no space', 'From here: attack the rear naked choke, strike the sides of the head, or transition if they turn'],
 ARRAY['Seatbelt and hooks — those are your two points of control', 'Stay tight like a backpack — if theres space, they escape into it', 'The back is where fights end — once youre there, finish'],
 ARRAY['biceps', 'forearms', 'hip flexors', 'hamstrings', 'core', 'lats'],
 'none', 'both', ARRAY[]::UUID[]),

(t_shrimp, 'mma', 'conditioning', 'solo_drill',
 'Shrimp (Hip Escape)',
 'The fundamental ground movement: turn to your side, push off with your feet, and slide your hips away from the opponent to create space. The most important escape mechanic.',
 'beginner', NULL,
 ARRAY['Turn to your side — never flat on your back', 'Plant the foot closest to the ground and push your hips away', 'Frame with your arms to create initial space', 'Move your HIPS, not your shoulders — hips create the space', 'Chain multiple shrimps together to fully escape'],
 ARRAY['Staying flat on your back while shrimping (no power)', 'Moving the shoulders instead of the hips (doesnt create space)', 'Not turning fully to the side (halfhearted hip movement)', 'Forgetting to frame first (you need initial space to shrimp into)', 'Only doing one shrimp — usually need 2-3 to fully escape'],
 ARRAY['From bottom position, frame against the opponent to create initial space', 'Turn to your side facing away from them', 'Plant the bottom foot flat on the mat near your hips', 'Push explosively off that foot to slide your hips 12-18 inches away', 'Keep arms framing to maintain the space you created', 'Repeat as needed until you can recover guard or stand up'],
 ARRAY['Frame, turn, push — three beats, every time', 'Move your hips, not your head — your hips are the engine', 'One shrimp creates space, two shrimps create freedom'],
 ARRAY['hip flexors', 'glutes', 'core obliques', 'quads'],
 'none', 'both', ARRAY[]::UUID[]),

(t_bridge, 'mma', 'conditioning', 'solo_drill',
 'Bridge (Upa / Trap and Roll)',
 'Explosive upward hip thrust from bottom mount to reverse the position. Plant your feet, trap one of their arms, and bridge hard to the trapped side to roll them over.',
 'beginner', NULL,
 ARRAY['Plant feet close to your hips for maximum leverage', 'Trap one of their arms — hug it tight to your chest', 'Block the foot on the same side (trap arm and leg on one side)', 'Bridge EXPLOSIVELY — drive your hips to the ceiling', 'Turn into them, not away — roll them over the trapped side'],
 ARRAY['Bridging straight up instead of diagonally over the trapped side', 'Not trapping the arm and leg on the same side (they post and stay on top)', 'Weak bridge — this needs to be explosive, not gradual', 'Waiting too long — bridge when they posture up or throw a punch', 'Not following through to top position after the sweep'],
 ARRAY['From bottom mount, plant both feet flat near your hips', 'Identify one side: trap their arm by hugging it to your chest', 'On the same side, hook their foot with your foot so they cant post', 'Take a deep breath and EXPLODE your hips toward the ceiling', 'Turn diagonally toward the trapped side — roll them over', 'Follow through and end up in their guard on top'],
 ARRAY['Trap the arm, trap the foot, then bridge like youre trying to launch them off', 'Direction matters — bridge over the trapped side, nowhere else', 'Wait for them to reach or punch — thats your window to bridge'],
 ARRAY['glutes', 'hamstrings', 'core', 'quads'],
 'none', 'both', ARRAY[]::UUID[]),

(t_technical_standup, 'mma', 'defense', 'ground_escape',
 'Technical Standup',
 'Safe method to stand up from the ground in MMA while keeping one hand posted behind you and one hand forward as a frame. Prevents the opponent from jumping on you as you rise.',
 'beginner', NULL,
 ARRAY['One hand posts behind you (base), other hand frames forward', 'Lead foot is up (knee toward ceiling), rear foot is flat on the mat', 'Stand up in one explosive motion — dont crawl up slowly', 'Keep your frame hand extended toward the opponent as you rise', 'Immediately reset to MMA fighting stance once standing'],
 ARRAY['Standing up square to the opponent (eat a flying knee or get shot on)', 'Both hands on the mat while standing (no defense)', 'Standing up too slowly (giving them time to close distance)', 'Turning your back while standing (worst possible mistake)', 'Dropping the frame hand before fully standing (vulnerable to strikes)'],
 ARRAY['From the ground, sit up on one hip', 'Place one hand behind you as a base (post)', 'Extend the other hand forward toward the opponent as a frame', 'Bring your lead foot up so the knee points at the ceiling', 'In one motion, push off the posting hand and stand up', 'Keep the frame hand extended as a shield while you rise', 'Immediately step back into MMA fighting stance'],
 ARRAY['Post, frame, stand — thats the recipe', 'Your frame hand is your shield — it stays between you and them until youre up', 'Explode up — dont let them set on you while you slowly climb to your feet'],
 ARRAY['core', 'quads', 'glutes', 'triceps', 'shoulders'],
 'none', 'both', ARRAY[]::UUID[]),

(t_guard_posture, 'mma', 'grappling', 'ground_position',
 'Posturing in Guard (Top)',
 'When inside the opponents closed guard on top, maintain an upright posture by placing hands on their hips and extending your arms. Prevents them from controlling you and sets up passes or ground-and-pound.',
 'intermediate', NULL,
 ARRAY['Hands on their hips or biceps — push away to create distance', 'Back straight, chin up — dont hunch forward', 'Elbows inside their thighs to begin opening the guard', 'If they pull you down, reset posture immediately — this is priority one', 'Good posture = ground-and-pound angles; broken posture = you get submitted'],
 ARRAY['Leaning forward with hands on the mat (broken posture = submission city)', 'Hands in the wrong place — keep them on their hips, not on their chest', 'Letting them pull your head down without fighting back up', 'Trying to strike with broken posture (no power and vulnerable)'],
 ARRAY['Inside their closed guard, sit up tall with a straight back', 'Place both hands firmly on their hip bones', 'Push your arms straight to create distance', 'Keep your chin up and back straight — do not hunch', 'Walk your knees slightly under their hips for a stable base', 'Use this posture to begin working on opening their guard', 'If they break your posture, immediately fight back to this position'],
 ARRAY['Hands on hips, arms straight, back tall — thats your home position in their guard', 'If they pull you down, getting back up is job number one', 'Good posture is what separates getting submitted from landing ground and pound'],
 ARRAY['core', 'triceps', 'shoulders', 'quads'],
 'none', 'both', ARRAY[t_closed_guard]),

-- ── Integration Techniques ───────────────────────────────────

(t_jab_to_shot, 'mma', 'grappling', 'takedown',
 'Jab to Takedown (Strike-to-Shot)',
 'Using the jab to close distance and hide the level change for a double or single leg. The jab freezes their hands high, then you change levels and shoot underneath.',
 'intermediate', NULL,
 ARRAY['Jab must be real — if they dont respect it, the takedown wont work', 'Level change happens AS the jab retracts, not after', 'Seamless transition: jab, level change, penetration step', 'Use the jab hand to guide toward the lead leg on the shot', 'This is the most common takedown setup in MMA'],
 ARRAY['Jab is weak or noncommittal (they dont react to it)', 'Pausing between the jab and the level change (gives them time to react)', 'Standing tall during the shot (telegraphed)', 'Only doing one jab — sometimes 2-3 jabs then shot is more effective'],
 ARRAY['From MMA stance, throw one or two committed jabs at the head', 'As the jab retracts, immediately drop your hips (level change)', 'Take a penetration step — lead knee toward the mat', 'Convert to double or single leg: wrap both legs or grab one', 'Drive forward to complete the takedown', 'Establish top position'],
 ARRAY['Jab, jab, BOOM — the shot hides behind the punches', 'Your jab lifts their hands up, your level change goes under them', 'Make the jab real — if they dont flinch, the setup doesnt work'],
 ARRAY['shoulders', 'quads', 'glutes', 'core', 'hamstrings'],
 'none', 'orthodox', ARRAY[t_mma_jab, t_double_leg, t_single_leg]),

(t_overhand_td, 'mma', 'grappling', 'takedown',
 'Overhand to Takedown',
 'A looping overhand right that naturally drops your level, transitioning directly into a single or double leg. The overhand and the takedown are one motion.',
 'intermediate', NULL,
 ARRAY['The overhand itself creates the level change — you naturally drop', 'Even if the punch misses, youre in perfect position to shoot', 'Commit to the overhand — half-effort defeats the purpose', 'The rear hand arc drops you to takedown depth', 'Works especially well against taller opponents'],
 ARRAY['Not committing to the overhand (no level change happens)', 'Pausing after the punch to decide whether to shoot (window closes)', 'Overhand misses and you stand back up instead of shooting', 'Forgetting to adjust grip from fist to takedown grip quickly'],
 ARRAY['From MMA stance, step forward and throw a committed overhand right', 'Let the arc of the punch naturally drop your level', 'As the punch extends (hit or miss), convert the motion into a penetration step', 'Immediately wrap for a double leg or catch a single leg', 'Drive forward to complete the takedown'],
 ARRAY['Throw the bomb and ride the fall into the shot', 'Hit or miss, youre in position — the overhand IS the setup', 'Two for one: they dodge the punch and eat the takedown'],
 ARRAY['shoulders', 'core', 'quads', 'glutes', 'hamstrings'],
 'none', 'orthodox', ARRAY[t_mma_cross, t_double_leg]),

(t_sprawl_counter, 'mma', 'strike', 'counter',
 'Sprawl to Counter Strike',
 'After successfully sprawling on a takedown attempt, immediately transition to strikes — short punches, knees, or elbows to the exposed opponent on their knees.',
 'intermediate', NULL,
 ARRAY['After the sprawl, opponent is on their knees and hands — vulnerable', 'Short hooks and uppercuts to the exposed head', 'Knees to the body from the front headlock position', 'Transition to a front headlock or guillotine if striking is blocked', 'Dont let them recover to their feet — punish the failed shot'],
 ARRAY['Standing up and backing away after the sprawl (wasting the advantage)', 'Throwing wild punches from poor position (losing balance)', 'Letting them stand back up without penalty', 'Forgetting about knees — short punches arent the only option'],
 ARRAY['After a successful sprawl, keep heavy hip pressure on their shoulders', 'Control their head with one hand (crossface or top of head)', 'Throw short hooks and uppercuts with the free hand to their exposed head', 'Alternatively, drive knees into their body from the front', 'If they turtle up, transition to a front headlock position', 'Look to take their back or disengage to your feet with distance'],
 ARRAY['They shot and failed — now they pay the tax', 'Short, sharp punches — you dont need knockouts from here, just damage', 'Control the head, free hand strikes — simple and effective'],
 ARRAY['shoulders', 'core', 'triceps', 'hip flexors', 'quads'],
 'none', 'both', ARRAY[t_sprawl]),

(t_td_defense_exit, 'mma', 'defense', 'takedown_defense',
 'Takedown Defense to Exit',
 'After stuffing a takedown with a sprawl or whizzer, safely disengage back to striking range rather than staying in the clinch. Circle away, push off, and reset your stance.',
 'intermediate', NULL,
 ARRAY['After the sprawl, dont stay on top of them — create distance', 'Push off their head/shoulders as you circle your hips away', 'Get your feet under you quickly — one knee up, then stand', 'Circle to the outside (away from their power hand) as you reset', 'Hands up immediately — expect a counter as you separate'],
 ARRAY['Staying draped over them after the sprawl (gives them a chance to reguard)', 'Standing straight up in front of them (eat an uppercut or knee)', 'Turning your back while disengaging', 'Not resetting stance before they close distance again'],
 ARRAY['After sprawling successfully and defending the takedown', 'Push off the opponents head or shoulders with both hands', 'Circle your hips away from them laterally', 'Bring one knee up and get your feet under you', 'Push off and step backward at a 45-degree angle', 'Reset to MMA fighting stance with hands up immediately', 'Re-establish your desired range'],
 ARRAY['Sprawl, punish, get out — three-step process', 'Dont hang around on top — youre a striker, get back to your feet', 'Circle away at an angle — never back up in a straight line'],
 ARRAY['core', 'quads', 'shoulders', 'hip flexors'],
 'none', 'both', ARRAY[t_sprawl]),

(t_gnp_mount, 'mma', 'strike', 'ground_and_pound',
 'Ground-and-Pound from Mount',
 'Delivering strikes from the mounted position — the most dominant striking position on the ground. Short punches and elbows while maintaining balance and position.',
 'intermediate', NULL,
 ARRAY['Stay low and heavy — dont sit up tall to punch', 'Post one hand, strike with the other — alternate', 'Short punches: hooks and hammerfists are most effective from mount', 'Elbows are devastating from here — use them', 'If they turn away, take the back; if they try to push you, stay heavy'],
 ARRAY['Sitting up tall to throw big punches (they bridge you off)', 'Striking with both hands simultaneously (no base, easy to sweep)', 'Chasing the finish wildly (lose position trying to land the big one)', 'Forgetting about elbows — they are your best weapon from mount', 'Not grapevining when they try to escape (they buck you off)'],
 ARRAY['From mount position, stay chest-to-chest initially', 'Post one hand on the mat beside their head for base', 'With the free hand, throw short hooks or hammerfists to the exposed side of their head', 'Switch: post the other hand and strike with the first', 'Mix in short elbows — drop them from a 6-inch range', 'When they react by turning their head, attack the exposed side', 'If they give their back, transition to back control', 'If they bridge, ride it out with grapevines and reset'],
 ARRAY['Stay low, stay heavy, pick your shots — position before punches', 'Post and punch — one hand is always on the mat', 'Short shots from mount are like dropping bombs from above — devastating'],
 ARRAY['shoulders', 'triceps', 'core', 'hip flexors', 'forearms'],
 'none', 'both', ARRAY[t_mount]),

(t_gnp_guard, 'mma', 'strike', 'ground_and_pound',
 'Ground-and-Pound from Inside Guard',
 'Striking while inside the opponents closed or open guard. Requires good posture to generate power and avoid submissions. The key is posture, posture, posture.',
 'intermediate', NULL,
 ARRAY['Posture first — hands on hips, back straight, then strike', 'Short punches only — hammerfists and short hooks', 'Never put both hands on the mat (broken posture = submitted)', 'One hand posts on their hip for base, other hand strikes', 'Stand up in guard to create more striking angles if possible'],
 ARRAY['Broken posture while striking (they grab your head and submit you)', 'Leaning forward to reach them with punches (defeats the purpose of posture)', 'Ignoring the guard — they will sweep or submit you if you dont respect it', 'Big wind-up punches (they see it coming and sweep during the wind-up)'],
 ARRAY['Establish posture inside their guard — hands on hips, back straight', 'One hand stays on their hip for base', 'With the free hand, throw short hammerfists or hooks', 'Keep your head up — dont lean forward', 'Alternate hands but always keep one posted', 'If they open their guard, consider passing or standing up for better angles', 'If they break your posture, regain it immediately before striking again'],
 ARRAY['Posture is life — lose it and they will submit you', 'Short shots, not haymakers — accuracy from this position beats power', 'One hand fights, one hand bases — never both off the mat'],
 ARRAY['core', 'shoulders', 'triceps', 'quads'],
 'none', 'both', ARRAY[t_guard_posture, t_closed_guard]),

(t_cage_press, 'mma', 'grappling', 'wall_work',
 'Cage Press (Wall-and-Stall Recovery)',
 'Pinning the opponent against the cage with shoulder pressure to control the fight. Used to grind, recover energy, set up takedowns, or prevent the opponent from creating offense.',
 'intermediate', NULL,
 ARRAY['Shoulder drives into their sternum or solar plexus — heavy pressure', 'Underhook position on at least one side', 'Feet staggered for base — lead foot between theirs', 'Head tight to their body — dont give them space', 'From here: throw knees, set up takedowns, or just grind and recover'],
 ARRAY['Not driving with your legs (no pressure, they push you off)', 'Head too high or too far away (they hit you with uppercuts and elbows)', 'Both arms doing the same thing (need one controlling, one threatening)', 'Being purely passive — even if you are recovering, throw an occasional knee'],
 ARRAY['Drive the opponent backward until their back touches the cage', 'Shoulder in their sternum — drive your weight into them through your legs', 'Secure at least one underhook', 'Stagger your feet — lead foot between theirs for base', 'Head tight to their chest or shoulder', 'Control one of their wrists with your free hand', 'From here: throw short knees, work for takedowns, or grind and recover energy'],
 ARRAY['Make them carry your weight — they should feel every pound', 'Drive through them, not into them — your power comes from your legs', 'The cage is your friend — use it to nullify their movement'],
 ARRAY['quads', 'glutes', 'core', 'shoulders', 'chest'],
 'none', 'both', ARRAY[t_underhook]),

(t_off_cage_strike, 'mma', 'strike', 'wall_work',
 'Off-Cage Striking',
 'Creating angles and striking while you or the opponent is near the cage. Push off the cage to generate power, circle to create angles, and fire strikes as the opponent peels off the fence.',
 'intermediate', NULL,
 ARRAY['Use the cage as a wall to push off for explosive strikes', 'Angle off after striking — dont stay planted against the fence', 'When the opponent is on the cage, throw at the openings they give you', 'Uppercuts and hooks work best against someone on the cage', 'Short elbows in the phone booth range are devastating'],
 ARRAY['Staying squared up against the cage (easy to hold or take down)', 'Throwing straight punches only (hooks and uppercuts are better at close range)', 'Not moving off after striking (gives them the cage to push off of)', 'Forgetting clinch strikes — elbows and knees are legal at this range'],
 ARRAY['When opponent is pressed against the cage, identify openings', 'At mid-range: throw hooks and uppercuts to their body and head', 'At close range: short elbows and knees', 'After striking, circle off at a 45-degree angle', 'If YOU are on the cage, push off with your back foot to generate power', 'Fire a counter combination as you push off the fence', 'Immediately circle away to reset to center octagon'],
 ARRAY['The cage makes them a stationary target — make them pay for it', 'Uppercuts and hooks when theyre on the fence — straight punches bounce off the guard', 'Strike and move — hit them and circle, dont stay in the pocket'],
 ARRAY['core obliques', 'shoulders', 'quads', 'calves', 'hip rotators'],
 'none', 'both', ARRAY[t_mma_hook, t_mma_uppercut, t_short_elbow]),

(t_range_management, 'mma', 'footwork', 'strategy',
 'Range Management',
 'Controlling the distance between you and your opponent to fight at your preferred range. Kicking range, punching range, clinch range, and grappling range each favor different tools.',
 'intermediate', NULL,
 ARRAY['Four ranges in MMA: kicking > punching > clinch > ground', 'Identify YOUR best range and fight to maintain it', 'Use footwork and feints to control distance — not just walking', 'The teep and jab are your primary range-management tools', 'Circle, dont back up in a straight line — angles create escapes'],
 ARRAY['Backing up in a straight line (getting trapped on the cage)', 'Not using feints to freeze the opponent before moving', 'Fighting at the opponents preferred range instead of your own', 'Static feet — range management requires constant adjustment', 'Panicking when the range collapses instead of managing it'],
 ARRAY['Identify the range you want: kicking, boxing, clinch, or grappling', 'Use the jab and teep to maintain your preferred distance', 'When they advance, circle laterally — dont retreat straight back', 'Use feints (shoulder feints, foot feints) to freeze their advance', 'If they close the distance, clinch effectively or disengage with a push', 'Constantly adjust — range is not static, its a flowing conversation'],
 ARRAY['The fighter who controls the range controls the fight', 'Circle, dont run — backing up in a straight line leads to the fence', 'Jab, teep, and footwork are your rangefinders — use all three'],
 ARRAY['calves', 'quads', 'core', 'hip flexors'],
 'none', 'both', ARRAY[t_mma_jab, t_teep, t_mma_footwork]),

(t_round_pacing, 'mma', 'conditioning', 'strategy',
 'Round Pacing & Energy Management',
 'Managing energy output across 3 or 5 rounds. Knowing when to push the pace, when to recover, and how to maintain a sustainable output throughout the fight.',
 'intermediate', NULL,
 ARRAY['First minute: feel them out, establish your jab, find your range', 'Clinch or cage work to recover when gassed', 'Burst and recover pattern: 10-15 seconds of high output, then reset', 'Deep breathing between exchanges — exhale on every strike', 'Last 30 seconds of each round: increase output (judges remember the ending)'],
 ARRAY['Going 100% from the opening bell (gas out in round 2)', 'No recovery strategy — just standing in the pocket trading when tired', 'Holding breath during exchanges (burns energy twice as fast)', 'Same pace every round (predictable, no surges to create damage)', 'Not increasing output at the end of rounds (missing judge impression points)'],
 ARRAY['Round start: 30 seconds at 70% to establish rhythm and range', 'Middle of round: alternate 10-15 second bursts of offense with recovery phases', 'Recovery phases: clinch work, cage pressing, circling with jabs', 'Breathe: exhale sharply on every strike, deep breaths during resets', 'Last 30 seconds: increase pace to 85-90% — finish the round strong', 'Between rounds: deep controlled breathing, game-plan adjustment', 'If winning: maintain pace, dont take risks; if losing: increase output in later rounds'],
 ARRAY['Fights are won by the fighter who is freshest in round 3', 'Burst and recover — nobody can fight at 100% for 15 minutes', 'Finish every round like you are stealing it from the judges'],
 ARRAY['cardiovascular system', 'all major muscle groups', 'respiratory muscles'],
 'none', 'both', ARRAY[]::UUID[]),

-- ── Conditioning ─────────────────────────────────────────────

(t_fighter_burpee, 'mma', 'conditioning', 'solo_drill',
 'Fighter Burpee (Sprawl-to-Standup Drill)',
 'A combat-specific conditioning drill combining a sprawl with a technical standup. Builds the explosive capacity needed for takedown defense and scrambles.',
 'beginner', NULL,
 ARRAY['Full sprawl: chest to floor, hips down', 'Immediately perform a technical standup (post, frame, stand)', 'Add punches at the top: throw a 1-2 before dropping again', 'Explosive hip extension on the sprawl — snap those hips down', 'Keep your chin tucked and eyes up throughout'],
 ARRAY['Doing a push-up instead of a sprawl (must be hips-first)', 'Standing up casually instead of explosive technical standup', 'Forgetting to add strikes at the top (this is a fight drill, not CrossFit)', 'Rounding the back on standup (exposes you to strikes in a real fight)'],
 ARRAY['From fighting stance, drop into a full sprawl — hips to the floor', 'Chest touches the mat, legs extended back', 'Immediately tuck one knee underneath and post one hand behind', 'Perform a technical standup to fighting stance', 'Throw a jab-cross combination', 'Immediately drop into the next sprawl', 'Repeat for the drill duration'],
 ARRAY['Sprawl like someone just shot on you, get up like they are about to', 'The faster you get back to your feet, the fitter you become for fighting', 'This is the most fight-specific conditioning drill there is'],
 ARRAY['full body', 'quads', 'glutes', 'core', 'chest', 'shoulders'],
 'none', 'both', ARRAY[t_sprawl, t_technical_standup]),

(t_sprawl_drill, 'mma', 'conditioning', 'solo_drill',
 'Sprawl Drill (Reaction Training)',
 'Explosive repeated sprawls to build the reflexive takedown defense. Focus on hip speed and heavy hip contact with the floor.',
 'beginner', NULL,
 ARRAY['Snap hips to the floor — speed is everything', 'Land on toes and hips, not knees', 'Immediately bounce back to stance after each sprawl', 'Eyes up throughout — dont look at the floor', 'Add a level change trigger: when you see something (partner, timer), sprawl'],
 ARRAY['Landing on knees instead of toes and hips', 'Slow hip descent (a real takedown wont wait for you)', 'Not getting back to stance between reps (training sloppiness)', 'Looking down at the mat while sprawling'],
 ARRAY['From MMA stance, react to a cue (timer beep, shadow, or self-initiated)', 'Kick both legs explosively backward', 'Snap hips to the floor — hips should slam the mat', 'Land on balls of feet and hip bones', 'Immediately push back up to fighting stance', 'Reset hands and eyes forward', 'Repeat on the next cue'],
 ARRAY['Your hips should sound like a clap when they hit the mat', 'Think of it as a race between your hips and the floor — your hips should win violently', 'Back to stance, back to stance — the sprawl means nothing if you cant recover'],
 ARRAY['hip flexors', 'glutes', 'core', 'quads', 'chest', 'calves'],
 'none', 'both', ARRAY[t_sprawl]);


-- ═════════════════════════════════════════════════════════════
-- PHASE 1 LESSONS — Striking Foundations
-- ═════════════════════════════════════════════════════════════

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites) VALUES

(ls1_01, lv_striking, 'mma', 1, 1,
 'The MMA Stance',
 'Your base for everything — wider and lower than boxing',
 10,
 ARRAY['Sit into your hips — imagine a bar stool', 'Hands up like youre holding a phone to each ear', 'Stay on the balls of your feet, light and ready'],
 ARRAY['Too narrow like a boxing stance', 'Hands too low — MMA needs higher guard', 'Weight on the heels'],
 'Stance Shadow Drill', 'Assume MMA stance, move in all 4 directions using slide steps. Every 10 seconds, freeze and check: are your feet wide enough? Are your hands high? Are your hips low? Reset and repeat.', 3, 'none',
 'Can you hold MMA stance for 60 seconds while moving without your feet crossing or your hands dropping?',
 ARRAY[]::UUID[]),

(ls1_02, lv_striking, 'mma', 2, 1,
 'The MMA Jab',
 'Your rangefinder — quick, snapping, retract fast',
 10,
 ARRAY['Pop it out and steal it back — dont leave the hand out', 'Jab is your measuring tape — know your range', 'Slight hip turn adds reach without overcommitting'],
 ARRAY['Leaving the jab out (gets grabbed in MMA)', 'Dropping the rear hand', 'Leaning too far forward'],
 'Jab Intervals', 'Throw 10 jabs, move laterally, throw 10 more. Focus on speed and retraction. Every set, alternate between head-level and body-level jabs.', 3, 'none',
 'Can you throw 30 jabs in 30 seconds with full retraction and without dropping your rear hand?',
 ARRAY[ls1_01]::UUID[]),

(ls1_03, lv_striking, 'mma', 3, 2,
 'The Cross & 1-2 Combo',
 'Adding power — hip rotation drives the straight right',
 12,
 ARRAY['Hips first, hand follows — the arm is just the delivery system', 'Rear heel rises to the ceiling on the cross', 'Jab opens the door, cross walks through it'],
 ARRAY['Arm-punching without hip rotation', 'Overextending and losing balance', 'Pausing between the jab and cross'],
 '1-2 on the Heavy Bag', 'Throw 1-2 combinations for 2-minute rounds with 30-second rest. Focus on the pop of the jab followed by the power of the cross. Watch for hip rotation on every cross.', 4, 'heavy bag',
 'Can you throw a 1-2 combo where the cross has visible hip rotation and your chin stays tucked behind the lead shoulder?',
 ARRAY[ls1_02]::UUID[]),

(ls1_04, lv_striking, 'mma', 4, 2,
 'The Lead Hook',
 'The knockout punch — short, compact, devastating',
 12,
 ARRAY['Turn the key — whole body rotates around the axis', 'Keep the hook tighter than your shoulders width', 'Elbow locked at 90 degrees throughout'],
 ARRAY['Winding up (telegraphing)', 'Elbow dropping (looping arm punch)', 'Dropping the rear hand while hooking'],
 'Hook Accuracy Drill', 'Using focus mitts or shadow boxing, throw only lead hooks for 2 minutes. Alternate between head and body hooks. Focus on keeping the 90-degree elbow angle and full hip rotation.', 3, 'none',
 'Can you throw a hook where your pivot foot turns 90 degrees and your elbow stays at chin height?',
 ARRAY[ls1_03]::UUID[]),

(ls1_05, lv_striking, 'mma', 5, 3,
 'The 1-2-3 Combination',
 'Three punches that flow as one — jab, cross, hook',
 12,
 ARRAY['Pop-bang-crack — three impacts, one motion', 'The cross naturally loads the hook', 'After the combo, move off the center line'],
 ARRAY['Resetting between punches', 'Hook gets wider as combo continues', 'Standing still after the combination'],
 '1-2-3 Combo Flow', 'Throw the 1-2-3 combination slowly 10 times, focusing on flow. Then increase speed for 10 more. Then add a step off at 45 degrees after each combo. Total: 30 reps.', 4, 'none',
 'Can you throw a 1-2-3 where all three punches connect within 1 second and you exit at an angle?',
 ARRAY[ls1_04]::UUID[]),

(ls1_06, lv_striking, 'mma', 6, 3,
 'The Low Kick',
 'Chop the tree down — target the thigh with your shin',
 12,
 ARRAY['Chop through the leg like a baseball bat', 'Turn that hip — belly button faces the target', 'Shin contacts, not the foot — shin is a bat, foot is a twig'],
 ARRAY['Kicking with the instep or foot', 'Not turning the hip over', 'Dropping hands while kicking'],
 'Low Kick + Reset', 'Throw a low kick, immediately reset to MMA stance, throw a jab, then another low kick. Alternate sides. 10 reps each side. Focus on returning to stance between each kick.', 4, 'heavy bag',
 'Can you throw a low kick where your hip turns over fully and you return to stance with hands up?',
 ARRAY[ls1_01]::UUID[]),

(ls1_07, lv_striking, 'mma', 7, 4,
 'The Teep (Push Kick)',
 'Your keep-away tool — push them back to your range',
 10,
 ARRAY['Push, dont snap — youre shoving them away with your foot', 'Chamber high, extend fast, retract faster', 'Use it any time they step toward you'],
 ARRAY['Kicking with toes instead of ball of foot', 'Not chambering — no power', 'Throwing lazily — slow teeps get caught'],
 'Teep Range Control', 'Partner or shadow: as the imaginary opponent steps forward, throw a teep to reset the distance. 15 reps per side. If solo, step forward then immediately teep and step back.', 3, 'none',
 'Can you throw a teep that would push someone backward while maintaining your balance?',
 ARRAY[ls1_01]::UUID[]),

(ls1_08, lv_striking, 'mma', 8, 4,
 'Body Kick',
 'The fight-ender — shin to the ribs, same mechanics as low kick',
 12,
 ARRAY['Same as low kick but aim at the floating ribs', 'Wrap your shin around their body like a whip', 'A liver shot folds anyone'],
 ARRAY['Telegraphing by lifting knee first', 'Not turning hip over', 'Kicking from too far away'],
 'High-Low Kick Combos', 'Alternate between low kick and body kick on the bag or in shadow. 2 low kicks, 1 body kick — repeat for 2 minutes. Focus on the hip turnover being identical for both heights.', 4, 'heavy bag',
 'Can you throw a body kick that makes audible contact at rib height with full hip turnover?',
 ARRAY[ls1_06]::UUID[]),

(ls1_09, lv_striking, 'mma', 9, 5,
 'Clinch Entry & Collar Tie',
 'Closing the distance safely — punch your way into the clinch',
 12,
 ARRAY['Punch your way in — clinch starts with a strike', 'Head position wins — get your forehead on them first', 'Be heavy — make them carry your weight'],
 ARRAY['Walking into clinch without a strike', 'Head too far away', 'No body pressure'],
 'Clinch Entry Drill', 'Shadow drill: throw a 1-2, step in, establish collar tie, hold 3 seconds, disengage, reset. Repeat 10 times. Focus on the transition from punching to grappling.', 3, 'none',
 'Can you go from punching range to collar tie control in one smooth motion without pausing?',
 ARRAY[ls1_05]::UUID[]),

(ls1_10, lv_striking, 'mma', 10, 5,
 'Short Elbows in the Clinch',
 'Close-range devastation — the elbow is a short-range hook',
 10,
 ARRAY['Same motion as a hook but half the distance', 'Drive through them — try to touch your own opposite shoulder', 'One hand fights, one hand controls'],
 ARRAY['Reaching with the elbow (too far)', 'Releasing clinch control', 'Big telegraph wind-up'],
 'Collar Tie to Elbow', 'From collar tie position, snap their head down slightly, throw a short elbow with the free hand. 10 reps each side. Focus on maintaining the collar tie grip throughout.', 3, 'none',
 'Can you throw a short elbow while maintaining collar tie control without losing your grip?',
 ARRAY[ls1_09]::UUID[]),

(ls1_11, lv_striking, 'mma', 11, 6,
 'Clinch Knees',
 'Pull them into the knee — double the force',
 12,
 ARRAY['Pull them into it — dont just throw and hope', 'Knee drives straight up through the solar plexus', 'Head down, knee up — two forces meeting'],
 ARRAY['Letting go of clinch to throw knee', 'Knee going outward not upward', 'Jumping into the knee'],
 'Clinch Knee Barrage', 'From Thai clinch or collar tie, throw alternating knees for 30-second rounds. Rest 15 seconds between rounds. 4 rounds. Focus on pulling the head down as you drive each knee up.', 4, 'thai pads or heavy bag',
 'Can you throw 10 alternating knees in 30 seconds while maintaining clinch control throughout?',
 ARRAY[ls1_09]::UUID[]),

(ls1_12, lv_striking, 'mma', 12, 6,
 'Striking Phase Review — Full Combinations',
 'Putting it all together: punches, kicks, clinch, dirty boxing',
 15,
 ARRAY['Flow between ranges: punching, kicking, clinch', 'Every combination ends with movement — step off or clinch', 'Mix levels: head, body, legs'],
 ARRAY['Only throwing punches (forgetting kicks and clinch)', 'Standing still between combinations', 'Not returning to stance between exchanges'],
 'Full MMA Striking Round', 'Shadow box a full 3-minute round: must include at least 3 punch combos, 2 kicks, 1 clinch entry with knee or elbow, and 3 angular exits. This is your Phase 1 test.', 5, 'none',
 'Can you shadow box for 3 minutes incorporating punches, kicks, clinch work, and defensive footwork without pausing?',
 ARRAY[ls1_11]::UUID[]);


-- ═════════════════════════════════════════════════════════════
-- PHASE 2 LESSONS — Grappling Foundations
-- ═════════════════════════════════════════════════════════════

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites) VALUES

(ls2_01, lv_grappling, 'mma', 1, 7,
 'The Sprawl',
 'Takedown defense 101 — hips to the floor, explode',
 10,
 ARRAY['Hips to the floor — slam your belt buckle down', 'Land on toes and hips, never knees', 'Get back to stance immediately after'],
 ARRAY['Landing on knees', 'Slow hip descent', 'Not recovering to stance between reps'],
 'Sprawl Reaction Drill', 'Set a timer for random beeps. On each beep, sprawl from fighting stance and immediately return to stance. 20 sprawls total. Focus on explosive hip speed — hips should slam the mat.', 3, 'none',
 'Can you sprawl and return to fighting stance in under 2 seconds on a reaction cue?',
 ARRAY[]::UUID[]),

(ls2_02, lv_grappling, 'mma', 2, 7,
 'The Double Leg Takedown',
 'The workhorse shot — level change, penetrate, drive through',
 12,
 ARRAY['Level change THEN shoot — never shoot standing tall', 'Knee kisses the floor on the penetration step', 'Head on the hip, eyes up — tackle, not headbutt'],
 ARRAY['Shooting without level change', 'Head down looking at floor', 'Stopping on contact instead of driving through'],
 'Shadow Double Legs', 'From stance, practice level change to penetration step. Drive the lead knee to the floor between imaginary opponents feet. Lock arms behind air and drive forward 3 steps. 10 reps each side.', 4, 'none',
 'Can you perform a level change and penetration step where your knee almost touches the floor and you drive forward 3 steps?',
 ARRAY[ls2_01]::UUID[]),

(ls2_03, lv_grappling, 'mma', 3, 8,
 'The Single Leg Takedown',
 'Grab one leg, finish with trips or drives',
 12,
 ARRAY['Head outside, leg tight to chest', 'Set it up with punches — jab, level change, shoot', 'Grab it, hug it, take them for a walk'],
 ARRAY['Head on the inside (guillotine bait)', 'Holding the leg loosely', 'Bending at the waist not knees'],
 'Single Leg Entries', 'Practice single leg entries from jab setups: jab-jab-shoot for the lead leg. Focus on head placement to the outside. 10 reps per side. Use a heavy bag or pillow as the leg.', 4, 'none',
 'Can you perform a single leg where your head is outside their body and the imaginary leg is tight to your chest?',
 ARRAY[ls2_02]::UUID[]),

(ls2_04, lv_grappling, 'mma', 4, 8,
 'Cage Wrestling — Single Leg on the Fence',
 'Use the cage as your training partner',
 12,
 ARRAY['The cage is your best friend — pin them to it', 'Shoulder through their belly button', 'Head tight, hips in, feet active'],
 ARRAY['Giving space between you and the cage', 'Head too low', 'Not using feet to trip'],
 'Wall Single Leg Finish', 'Against a wall, practice driving a training partner or dummy into the wall, securing the single leg, and finishing with a trip (hook the standing foot) or a lift. 8 reps.', 4, 'wall or cage',
 'Can you drive someone into the wall, secure a single leg, and finish with a trip in one smooth sequence?',
 ARRAY[ls2_03]::UUID[]),

(ls2_05, lv_grappling, 'mma', 5, 9,
 'The Underhook & Over-Under Clinch',
 'Winning the hand-fighting battle in the clinch',
 10,
 ARRAY['Swim it deep — hand on their back, not armpit', 'The underhook is a steering wheel — actively use it', 'Head position is king — forehead on their chin'],
 ARRAY['Underhook too shallow', 'Being passive', 'No head position'],
 'Pummeling Drill', 'Solo or with partner: practice swimming for underhooks. Start in over-under position. Every 5 seconds, switch which side has the underhook by swimming under. 2 minutes continuous.', 3, 'none',
 'Can you pummel from over-under to switch the underhook side 10 times in 60 seconds?',
 ARRAY[]::UUID[]),

(ls2_06, lv_grappling, 'mma', 6, 9,
 'Thai Clinch & Body Lock',
 'Dominant clinch positions for knees and takedowns',
 12,
 ARRAY['Elbows squeeze together in the Thai clinch — create the frame', 'Body lock: once you lock it, finish the takedown — dont stall', 'Active clinching — snap, circle, knee, repeat'],
 ARRAY['Grabbing neck instead of head in Thai clinch', 'Passive holding without attacking', 'Loose body lock'],
 'Clinch Position Flow', 'Flow drill: collar tie → Thai clinch → knee strike → over-under → body lock → simulated takedown. Cycle through 5 times. Focus on smooth transitions between positions.', 4, 'none',
 'Can you flow through collar tie, Thai clinch, over-under, and body lock without stopping?',
 ARRAY[ls2_05]::UUID[]),

(ls2_07, lv_grappling, 'mma', 7, 10,
 'Ground Movement — Shrimp & Bridge',
 'The two essential escapes: hip escapes and explosive bridges',
 10,
 ARRAY['Shrimp: frame, turn, push — move your hips, not shoulders', 'Bridge: trap arm and foot on same side, explode diagonally', 'These are the foundation of every ground escape in MMA'],
 ARRAY['Shrimping flat on back (no power)', 'Bridging straight up instead of over the trapped side', 'Moving shoulders instead of hips during shrimp'],
 'Shrimp + Bridge Ladder', 'Shrimp the full length of the mat (or 10 shrimps), then bridge 5 times in place. Repeat back the other direction. 2 full sets. Focus on explosive hip movement for both.', 4, 'mat',
 'Can you shrimp 10 lengths and perform 5 explosive bridges without pausing?',
 ARRAY[]::UUID[]),

(ls2_08, lv_grappling, 'mma', 8, 10,
 'Technical Standup',
 'Getting back to your feet safely — the #1 priority on the ground',
 10,
 ARRAY['Post, frame, stand — thats the recipe', 'Frame hand stays between you and them until youre up', 'Explode up — dont let them set on you while you climb'],
 ARRAY['Standing up square to opponent', 'Both hands on mat while rising', 'Turning your back'],
 'Technical Standup Reps', 'From seated position, perform technical standup to fighting stance. After standing, throw a 1-2 combo, then sit back down. 15 reps. Time yourself — try to get each standup under 1.5 seconds.', 3, 'none',
 'Can you perform a technical standup to fighting stance with frame hand extended in under 1.5 seconds?',
 ARRAY[ls2_07]::UUID[]),

(ls2_09, lv_grappling, 'mma', 9, 11,
 'Guard Basics — Bottom & Top',
 'Understanding closed guard from both perspectives',
 12,
 ARRAY['Bottom: pull their posture down, work to sweep or stand up', 'Top: posture is life — hands on hips, back straight', 'In MMA, the bottom of guard is survival mode — get up'],
 ARRAY['Bottom: lying flat and passive', 'Top: leaning forward with broken posture', 'Bottom: getting comfortable instead of working to escape'],
 'Guard Posture Drill', 'From top of guard position (or simulated with a pillow between legs): practice establishing posture — hands on hips, back straight. Break posture, re-establish. 10 reps. Then practice the bottom: pull imaginary opponent down, hip out, attempt to stand.', 4, 'mat',
 'Can you re-establish posture from a broken position inside guard within 3 seconds?',
 ARRAY[ls2_07]::UUID[]),

(ls2_10, lv_grappling, 'mma', 10, 11,
 'Mount & Side Control (Top)',
 'Dominant ground positions — stay heavy, stay active',
 12,
 ARRAY['Mount: stay low and heavy like a sandbag', 'Side control: chest-to-chest, hips driving through them', 'Both positions: if youre not attacking, youre losing the position'],
 ARRAY['Sitting up tall in mount', 'Resting on knees in side control', 'Being purely passive — always threaten something'],
 'Position Maintenance Drill', 'Using a pillow or grappling dummy: hold mount for 30 seconds (low base, grapevines), then transition to side control for 30 seconds (heavy hips, crossface). Alternate for 3 minutes total.', 4, 'mat',
 'Can you maintain mount for 30 seconds on a resisting partner or shifting dummy without being rolled?',
 ARRAY[ls2_09]::UUID[]),

(ls2_11, lv_grappling, 'mma', 11, 12,
 'Back Control',
 'The highest-finishing position in MMA history',
 12,
 ARRAY['Seatbelt and hooks — those are your two points of control', 'Stay tight like a backpack — no space', 'The back is where fights end — once there, finish'],
 ARRAY['Hooks too shallow', 'Crossing ankles (ankle lock)', 'Loose seatbelt grip'],
 'Back Control Drill', 'From behind a grappling dummy or pillow stack: establish seatbelt grip and hooks. Practice adjusting when they turn left (adjust hooks) and right. Hold each position 15 seconds. 8 reps.', 4, 'mat',
 'Can you establish back control with seatbelt and hooks in under 3 seconds?',
 ARRAY[ls2_10]::UUID[]),

(ls2_12, lv_grappling, 'mma', 12, 12,
 'Grappling Phase Review — Takedown to Position',
 'Full sequence: takedown entry, establish position, control',
 15,
 ARRAY['Chain everything: shot to top position to control', 'If the takedown fails, sprawl and reset', 'Treat grappling like a flowchart: if this, then that'],
 ARRAY['Only drilling one technique in isolation', 'Forgetting standup transitions', 'Not chaining together multiple skills'],
 'Complete Grappling Flow', 'Full 3-minute grappling round: start standing, shoot a double leg, establish side control, transition to mount, take the back (simulated). Then reset standing and sprawl on an imaginary shot. Repeat the cycle for the full round.', 5, 'mat',
 'Can you flow from a standing shot through side control, mount, and back control in one continuous sequence?',
 ARRAY[ls2_11]::UUID[]);


-- ═════════════════════════════════════════════════════════════
-- PHASE 3 LESSONS — Integration & Fight IQ
-- ═════════════════════════════════════════════════════════════

INSERT INTO ma_lessons (id, level_id, discipline, lesson_order, week, title, subtitle, duration_min, coaching_cues, common_mistakes, drill_name, drill_description, drill_duration_min, drill_equipment, self_check, prerequisites) VALUES

(ls3_01, lv_integration, 'mma', 1, 13,
 'Jab to Takedown',
 'Hide the shot behind your punches — strike to grapple',
 12,
 ARRAY['Jab lifts their hands, level change goes under', 'Make the jab real — if they dont flinch, the setup fails', 'Jab, jab, BOOM — the shot hides behind the punches'],
 ARRAY['Weak or fake jab (no reaction from opponent)', 'Pausing between jab and level change', 'Shooting from too far away'],
 'Jab-to-Shot Combos', 'Shadow drill: throw 2 jabs, then level change into a double leg penetration step. 10 reps. Then throw 1 jab + 1 cross, level change into a single leg. 10 reps. Focus on seamless transitions.', 4, 'none',
 'Can you transition from a committed jab to a penetration step without any visible pause?',
 ARRAY[]::UUID[]),

(ls3_02, lv_integration, 'mma', 2, 13,
 'Overhand to Takedown',
 'The two-for-one — the punch drops your level for free',
 12,
 ARRAY['The overhand IS the level change — ride the fall into the shot', 'Hit or miss, youre in position to shoot', 'Commit to the punch — half effort defeats the purpose'],
 ARRAY['Not committing to the overhand', 'Pausing after the punch instead of shooting', 'Standing back up after a miss'],
 'Overhand-to-Shot Drill', 'Shadow or bag: throw a fully committed overhand right, and as your level naturally drops, convert into a double leg penetration step. 10 reps. Focus on one fluid motion — no reset between punch and shot.', 4, 'none',
 'Can you throw an overhand and convert to a takedown entry in one continuous motion?',
 ARRAY[ls3_01]::UUID[]),

(ls3_03, lv_integration, 'mma', 3, 14,
 'Sprawl to Counter Striking',
 'Punish the failed takedown — they shot, now they pay',
 12,
 ARRAY['Short sharp punches — damage, not knockouts from this position', 'Control the head, free hand strikes', 'They shot and failed — now they pay the tax'],
 ARRAY['Standing up and backing away after sprawl', 'Losing position throwing wild punches', 'Letting them stand back up unpunished'],
 'Sprawl-to-Strike Drill', 'Sprawl on cue, immediately throw 3 short punches (hooks/uppercuts) to the air or a ground-level bag, then circle to create distance and reset. 10 reps. Focus on staying heavy on the sprawl while striking.', 4, 'none',
 'Can you sprawl and deliver 3 short strikes within 2 seconds before resetting to stance?',
 ARRAY[ls3_01]::UUID[]),

(ls3_04, lv_integration, 'mma', 4, 14,
 'Takedown Defense to Exit',
 'Stuff the shot and get back to your game plan',
 10,
 ARRAY['Sprawl, punish, get out — three-step process', 'Circle away at an angle — never straight backward', 'Hands up immediately — expect a counter as you separate'],
 ARRAY['Staying draped over them after sprawl', 'Standing straight up in front of them', 'Backing up in a straight line'],
 'Defense-to-Exit Circuit', 'Sprawl, push off, circle away at 45 degrees, reset stance, throw a 1-2 combination. 12 reps. Focus on the speed of the entire sequence — sprawl to striking ready in under 3 seconds.', 3, 'none',
 'Can you go from sprawl to fully reset fighting stance with a combo thrown in under 3 seconds?',
 ARRAY[ls3_03]::UUID[]),

(ls3_05, lv_integration, 'mma', 5, 15,
 'Ground-and-Pound from Mount',
 'The most dominant striking position — post and punch',
 12,
 ARRAY['Stay low, stay heavy, pick your shots', 'Post and punch — one hand always on the mat', 'Short shots from mount are devastating'],
 ARRAY['Sitting up tall to punch (get bridged off)', 'Both hands striking simultaneously (no base)', 'Chasing the finish and losing position'],
 'Mount GnP Drill', 'On a ground bag or pillow: hold mount position, alternate short hooks and hammerfists. 30-second rounds x 4. One hand always posted. Focus on maintaining heavy base while striking with controlled power.', 4, 'mat or ground bag',
 'Can you throw 20 controlled strikes from mount in 30 seconds while maintaining base?',
 ARRAY[]::UUID[]),

(ls3_06, lv_integration, 'mma', 6, 15,
 'Ground-and-Pound from Guard',
 'Posture first — then pick your shots from inside guard',
 12,
 ARRAY['Posture is life — lose it and they submit you', 'Short shots, not haymakers — accuracy beats power here', 'One hand fights, one hand bases — never both off the mat'],
 ARRAY['Broken posture while striking', 'Leaning forward to reach them', 'Big wind-up punches'],
 'Guard GnP Posture Drill', 'Simulate being inside guard (kneel with a resistance band or pillow between legs). Practice establishing posture, breaking it, re-establishing, then throwing 3 short strikes. Cycle 10 times.', 4, 'mat',
 'Can you maintain upright posture inside guard while throwing 10 strikes without being pulled forward?',
 ARRAY[ls3_05]::UUID[]),

(ls3_07, lv_integration, 'mma', 7, 16,
 'Cage Pressing & Wall Work',
 'Using the cage to grind, recover, and control',
 12,
 ARRAY['Make them carry your weight — every pound', 'Drive through them, not into them — power from legs', 'The cage nullifies their movement — use that'],
 ARRAY['Not driving with legs (no pressure)', 'Head too high (eating uppercuts)', 'Purely passive (throw occasional knees)'],
 'Wall Press Drill', 'Against a wall: practice driving in with shoulder pressure. Secure an underhook, establish heavy base for 15 seconds, throw 2 knees, then disengage. 8 reps. Focus on making the wall carry your weight.', 4, 'wall',
 'Can you hold cage press position with heavy shoulder pressure for 15 seconds while throwing knees?',
 ARRAY[]::UUID[]),

(ls3_08, lv_integration, 'mma', 8, 16,
 'Off-Cage Striking',
 'The cage makes them a target — make them pay',
 12,
 ARRAY['Uppercuts and hooks when theyre on the fence', 'Short elbows in the phone booth range', 'Strike and move — hit and circle, dont stay in the pocket'],
 ARRAY['Only straight punches against the fence', 'Staying in the pocket after striking', 'Forgetting clinch strikes — elbows and knees are options'],
 'Cage Striking Combos', 'Against a wall or heavy bag: practice hook-uppercut-elbow combinations at close range. After each 3-strike combo, circle out at 45 degrees. 10 reps each side.', 4, 'heavy bag or wall pad',
 'Can you throw a hook-uppercut-elbow combo and exit at an angle in under 2 seconds?',
 ARRAY[ls3_07]::UUID[]),

(ls3_09, lv_integration, 'mma', 9, 17,
 'Range Management',
 'Control the distance, control the fight',
 12,
 ARRAY['The fighter who controls the range controls the fight', 'Circle, dont run — straight retreats lead to the fence', 'Jab, teep, and footwork are your three rangefinders'],
 ARRAY['Backing up in a straight line', 'Fighting at opponents preferred range', 'Static feet — range needs constant adjustment'],
 'Range Control Shadow Round', '3-minute shadow boxing round focused entirely on range: jab to maintain distance, teep when they advance, circle when they pressure. No power shots allowed — this round is about distance control only.', 5, 'none',
 'Can you shadow box for 3 minutes using only jabs, teeps, and footwork without backing up in a straight line?',
 ARRAY[]::UUID[]),

(ls3_10, lv_integration, 'mma', 10, 17,
 'Cage Cutting & Pressure',
 'Corner them systematically — chess, not chase',
 12,
 ARRAY['Two 45-degree steps equals one straight step but traps them', 'Feint before every angle change', 'Think chess, not chase — cut angles, dont run after them'],
 ARRAY['Chasing in a straight line', 'Getting too close too fast', 'Cutting without feints'],
 'Cage Cutting Footwork Drill', 'Shadow drill in a small area: imagine the opponent circling right. Take 2 steps at 45 degrees to cut them off, feint, 2 more steps, then throw a 1-2 when they are trapped. 10 reps each direction.', 4, 'none',
 'Can you systematically cut off an opponents circle using 45-degree steps and feints?',
 ARRAY[ls3_09]::UUID[]),

(ls3_11, lv_integration, 'mma', 11, 18,
 'Round Pacing & Energy Management',
 'Fights are won by who is freshest in round 3',
 12,
 ARRAY['Burst and recover — nobody fights at 100% for 15 minutes', 'Finish every round like you are stealing it from the judges', 'Clinch and cage work to recover when gassed'],
 ARRAY['Going 100% from the opening bell', 'No recovery strategy', 'Same pace every round'],
 'Pacing Simulation', '3-minute round: first 30 seconds at 70% (jabs, teeps, movement), then alternate 15-second bursts at 90% with 15-second recovery phases (clinch work, light movement). Final 30 seconds at 85%. Track your perceived exertion throughout.', 5, 'none',
 'Can you manage your energy through a 3-minute round and still throw quality combinations in the final 30 seconds?',
 ARRAY[]::UUID[]),

(ls3_12, lv_integration, 'mma', 12, 18,
 'Full MMA Integration — Fight Simulation',
 'Everything together: strike, grapple, transition, manage the round',
 15,
 ARRAY['Flow between all ranges: kicking, boxing, clinch, ground, back up', 'Use fight IQ: read the situation and choose the right tool', 'This is your graduation — show what you have learned'],
 ARRAY['Only doing one thing (staying in punching range the whole time)', 'No transitions between ranges', 'Ignoring energy management'],
 'MMA Integration Round', 'Full 5-minute MMA shadow round: must include at least 5 punch combos, 3 kicks, 2 clinch entries with strikes, 1 takedown, 1 ground position (simulated), 1 technical standup, 2 sprawls, and multiple range changes. This is your Phase 3 final test.', 5, 'none',
 'Can you shadow a complete 5-minute MMA round incorporating all ranges and transitions smoothly?',
 ARRAY[ls3_11]::UUID[]);


-- ═════════════════════════════════════════════════════════════
-- LESSON ↔ TECHNIQUE MAPPINGS
-- ═════════════════════════════════════════════════════════════

INSERT INTO ma_lesson_techniques (lesson_id, technique_id, focus, teaching_notes) VALUES

-- Phase 1: Striking Foundations

-- Lesson 1: MMA Stance
(ls1_01, t_mma_stance, 'primary', 'Core of the lesson — spend at least 5 minutes on stance alone'),
(ls1_01, t_mma_footwork, 'primary', 'Basic movement in MMA stance — slide steps in all directions'),

-- Lesson 2: MMA Jab
(ls1_02, t_mma_jab, 'primary', 'The jab is the most important punch — emphasize retraction speed in MMA'),
(ls1_02, t_mma_stance, 'review', 'Quick stance check before drilling the jab'),

-- Lesson 3: Cross & 1-2
(ls1_03, t_mma_cross, 'primary', 'Focus on hip rotation as the power source'),
(ls1_03, t_one_two, 'primary', 'Link jab to cross seamlessly — pop-bang rhythm'),
(ls1_03, t_mma_jab, 'review', 'Review jab mechanics before adding the cross'),

-- Lesson 4: Lead Hook
(ls1_04, t_mma_hook, 'primary', 'The knockout punch — short and compact'),
(ls1_04, t_one_two, 'review', 'Warm up with 1-2 combos before adding the hook'),

-- Lesson 5: 1-2-3 Combination
(ls1_05, t_jab_cross_hook, 'primary', 'Three punches flowing as one motion'),
(ls1_05, t_mma_hook, 'review', 'Review hook mechanics — watch for widening arc'),
(ls1_05, t_mma_footwork, 'review', 'Emphasize angular exit after the 1-2-3'),

-- Lesson 6: Low Kick
(ls1_06, t_low_kick, 'primary', 'Shin contact, full hip turnover — the MMA staple kick'),
(ls1_06, t_mma_stance, 'review', 'MMA stance allows kicks — note how wider base helps'),

-- Lesson 7: Teep (Push Kick)
(ls1_07, t_teep, 'primary', 'The jab of kicking — controls distance'),
(ls1_07, t_mma_footwork, 'review', 'Range management with footwork before introducing the teep'),

-- Lesson 8: Body Kick
(ls1_08, t_body_kick, 'primary', 'Same mechanics as low kick, higher target — devastating'),
(ls1_08, t_low_kick, 'review', 'Compare low kick and body kick mechanics — identical hip motion'),

-- Lesson 9: Clinch Entry & Collar Tie
(ls1_09, t_clinch_entry, 'primary', 'Transition from striking to clinch — always enter behind a punch'),
(ls1_09, t_collar_tie, 'primary', 'Dominant hand position for clinch control'),
(ls1_09, t_one_two, 'review', 'Use the 1-2 as the entry vehicle into the clinch'),

-- Lesson 10: Short Elbows
(ls1_10, t_short_elbow, 'primary', 'Close-range devastation from clinch'),
(ls1_10, t_collar_tie, 'review', 'Maintain collar tie control while throwing elbows'),

-- Lesson 11: Clinch Knees
(ls1_11, t_clinch_knee, 'primary', 'Pull head down, drive knee up — two forces meeting'),
(ls1_11, t_collar_tie, 'review', 'Collar tie is the setup for knees'),
(ls1_11, t_clinch_entry, 'review', 'Review clinch entry to chain into knee strikes'),

-- Lesson 12: Phase 1 Review
(ls1_12, t_mma_stance, 'review', 'Foundation check — stance should be automatic by now'),
(ls1_12, t_jab_cross_hook, 'review', 'Full boxing combinations at speed'),
(ls1_12, t_low_kick, 'review', 'Integrate kicks with punch combos'),
(ls1_12, t_clinch_entry, 'review', 'Transition from striking to clinch work'),
(ls1_12, t_clinch_knee, 'review', 'Clinch striking should flow from clinch entry'),
(ls1_12, t_mma_footwork, 'review', 'Angular movement between combinations'),


-- Phase 2: Grappling Foundations

-- Lesson 1: Sprawl
(ls2_01, t_sprawl, 'primary', 'The most important defensive skill in MMA grappling'),
(ls2_01, t_sprawl_drill, 'primary', 'Sprawl conditioning drill for building the reflex'),

-- Lesson 2: Double Leg
(ls2_02, t_double_leg, 'primary', 'The workhorse takedown — level change is everything'),
(ls2_02, t_sprawl, 'review', 'Review sprawl before learning what you are defending against'),

-- Lesson 3: Single Leg
(ls2_03, t_single_leg, 'primary', 'More versatile than the double — head to the outside'),
(ls2_03, t_double_leg, 'review', 'Compare single and double leg entry mechanics'),

-- Lesson 4: Cage Single Leg
(ls2_04, t_cage_single_leg, 'primary', 'The cage removes their escape — easier to finish'),
(ls2_04, t_single_leg, 'review', 'Single leg mechanics apply but with cage assistance'),

-- Lesson 5: Underhook & Over-Under
(ls2_05, t_underhook, 'primary', 'The most important hand position in MMA clinch fighting'),
(ls2_05, t_over_under, 'primary', 'Neutral clinch position — learn to fight for advantage from here'),

-- Lesson 6: Thai Clinch & Body Lock
(ls2_06, t_thai_clinch, 'primary', 'Dominant clinch for knees and snapping'),
(ls2_06, t_body_lock, 'primary', 'Power clinch for throws and takedowns'),
(ls2_06, t_underhook, 'review', 'Underhooks transition into body lock'),

-- Lesson 7: Shrimp & Bridge
(ls2_07, t_shrimp, 'primary', 'The essential ground escape movement'),
(ls2_07, t_bridge, 'primary', 'Explosive escape from bottom mount'),

-- Lesson 8: Technical Standup
(ls2_08, t_technical_standup, 'primary', 'Getting back to your feet safely is priority one'),
(ls2_08, t_shrimp, 'review', 'Shrimp creates space before standing up'),
(ls2_08, t_fighter_burpee, 'primary', 'Conditioning drill combining sprawl and technical standup'),

-- Lesson 9: Guard Basics
(ls2_09, t_closed_guard, 'primary', 'Understanding guard from bottom — control posture or stand up'),
(ls2_09, t_guard_posture, 'primary', 'Understanding guard from top — posture is life'),
(ls2_09, t_shrimp, 'review', 'Shrimping is the key escape mechanic from bottom'),

-- Lesson 10: Mount & Side Control
(ls2_10, t_mount, 'primary', 'Most dominant top position in MMA'),
(ls2_10, t_side_control, 'primary', 'High-pressure control position'),
(ls2_10, t_bridge, 'review', 'Bridge is the escape from bottom mount'),

-- Lesson 11: Back Control
(ls2_11, t_back_control, 'primary', 'The highest-finishing position in MMA history'),
(ls2_11, t_mount, 'review', 'Mount transitions to back control when they turn away'),

-- Lesson 12: Phase 2 Review
(ls2_12, t_double_leg, 'review', 'Full takedown from standing'),
(ls2_12, t_side_control, 'review', 'Establish after takedown'),
(ls2_12, t_mount, 'review', 'Transition from side control'),
(ls2_12, t_back_control, 'review', 'Take the back when they turn'),
(ls2_12, t_sprawl, 'review', 'Defensive sequence'),
(ls2_12, t_technical_standup, 'review', 'Getting back to feet'),


-- Phase 3: Integration & Fight IQ

-- Lesson 1: Jab to Takedown
(ls3_01, t_jab_to_shot, 'primary', 'The most common takedown setup in MMA'),
(ls3_01, t_mma_jab, 'review', 'The jab must be real for the setup to work'),
(ls3_01, t_double_leg, 'review', 'Review the double leg that follows the jab'),

-- Lesson 2: Overhand to Takedown
(ls3_02, t_overhand_td, 'primary', 'The punch naturally creates the level change'),
(ls3_02, t_jab_to_shot, 'review', 'Compare setups: jab-to-shot vs overhand-to-shot'),

-- Lesson 3: Sprawl to Counter
(ls3_03, t_sprawl_counter, 'primary', 'Punish the failed takedown attempt'),
(ls3_03, t_sprawl, 'review', 'The sprawl sets up the counter strikes'),

-- Lesson 4: TD Defense to Exit
(ls3_04, t_td_defense_exit, 'primary', 'Complete the sequence: defend and get back to your game'),
(ls3_04, t_sprawl_counter, 'review', 'After countering, create distance and reset'),

-- Lesson 5: GnP from Mount
(ls3_05, t_gnp_mount, 'primary', 'The most dominant striking position on the ground'),
(ls3_05, t_mount, 'review', 'Maintaining mount is critical for ground-and-pound'),

-- Lesson 6: GnP from Guard
(ls3_06, t_gnp_guard, 'primary', 'Striking from inside guard — posture is everything'),
(ls3_06, t_guard_posture, 'review', 'Posture must be established before striking'),
(ls3_06, t_gnp_mount, 'review', 'Compare GnP from mount vs guard — very different dynamics'),

-- Lesson 7: Cage Press
(ls3_07, t_cage_press, 'primary', 'Using the cage to control and grind'),
(ls3_07, t_underhook, 'review', 'Underhook is essential for effective cage work'),
(ls3_07, t_clinch_knee, 'review', 'Throw knees from the cage press position'),

-- Lesson 8: Off-Cage Striking
(ls3_08, t_off_cage_strike, 'primary', 'Striking near and off the cage'),
(ls3_08, t_mma_hook, 'review', 'Hooks and uppercuts work best against the cage'),
(ls3_08, t_short_elbow, 'review', 'Short elbows in phone booth range'),

-- Lesson 9: Range Management
(ls3_09, t_range_management, 'primary', 'Controlling distance controls the fight'),
(ls3_09, t_mma_jab, 'review', 'Jab is the primary range-management tool'),
(ls3_09, t_teep, 'review', 'Teep pushes them back to your preferred distance'),
(ls3_09, t_mma_footwork, 'review', 'Footwork is the engine of range management'),

-- Lesson 10: Cage Cutting
(ls3_10, t_cage_cutting, 'primary', 'Systematic pressure — cut angles, dont chase'),
(ls3_10, t_range_management, 'review', 'Range management supports cage cutting'),
(ls3_10, t_one_two, 'review', 'Punish them with combos once they are trapped'),

-- Lesson 11: Round Pacing
(ls3_11, t_round_pacing, 'primary', 'Energy management across the fight'),
(ls3_11, t_range_management, 'review', 'Range management is low-energy — use it to recover'),
(ls3_11, t_cage_press, 'review', 'Cage pressing is a recovery tool when tired'),

-- Lesson 12: Full Integration Review
(ls3_12, t_jab_to_shot, 'review', 'Striking to takedown transitions'),
(ls3_12, t_sprawl_counter, 'review', 'Takedown defense to counter striking'),
(ls3_12, t_gnp_mount, 'review', 'Ground-and-pound from top'),
(ls3_12, t_cage_press, 'review', 'Wall work and cage control'),
(ls3_12, t_off_cage_strike, 'review', 'Striking near the cage'),
(ls3_12, t_range_management, 'review', 'Distance control and fight strategy'),
(ls3_12, t_round_pacing, 'review', 'Energy management throughout'),
(ls3_12, t_technical_standup, 'review', 'Getting back to feet when taken down');

END $$;
