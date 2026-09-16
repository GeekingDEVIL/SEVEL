# SEVEL — Form Check v2: Gold Standard Upgrade Plan

> Complete redesign spec for the AI-powered form analysis system.
> Goal: best browser-based form checker that exists — no app install, no LiDAR, no subscription.
> Every feature maps to exact files, describes how it works technically,
> flags integration risks, and notes what the user needs to do (if anything).

---

## Architecture Principles

### Video Never Leaves the Device
The form check system runs entirely client-side via MediaPipe Pose (33 body landmarks, WASM/WebGL).
During recording, the camera feed is captured via `MediaRecorder` for local playback on the report card.
Video stays in memory as a `Blob` URL — never uploaded, never persisted to disk. Only numeric results
(scores, angles, tips, rep data) are saved to the database. When the user leaves the report screen,
the video blob is garbage collected. This is a hard rule — no video upload, no video storage, no exceptions.

### Rule Engine Architecture
Instead of hardcoding scoring logic per exercise, all form checks use a **configurable rule engine**.
Each exercise is a config object that maps to reusable check functions. Adding a new exercise means
adding a config — no new analysis code needed. This architecture scales to any human movement:
weightlifting, martial arts, yoga, calisthenics, running, rehab, dance.

### Score Philosophy: Start at 100, Deduct for Faults
Bad form produces a low score. Perfect form stays near 100. The old system started at 50 and added
bonuses, which meant everything scored ~70 regardless of actual form. The new system starts at 100
and deducts points for each detected fault, weighted by severity.

---

## Current State (What's Built)

**Files:**
- `app/components/FormCheckCamera.tsx` — Full-screen camera overlay (lazy-loaded via `next/dynamic`, renders via `createPortal` to document.body)
- `app/lib/formAnalysis.ts` — Pose analysis engine (exercise detection, depth/symmetry/knee-cave/bar-path checks, rep detector, scoring)
- `app/lib/formGuides.ts` — Exercise name → camera angle mapping + SVG silhouette path data
- `app/lib/oneEuroFilter.ts` — 1-Euro jitter smoothing filter + LandmarkSmoother class
- `supabase/migrations/027_form_checks.sql` — DB table for persisting results (already applied)
- `app/(main)/workout/page.tsx` — Wires the Form Check button into exercise cards

**What works today:**
- Full-screen camera with real-time neon skeleton overlay (double-pass glow rendering)
- 1-Euro filter jitter smoothing on all 33 landmarks
- Per-joint color feedback (green/amber/red) based on real-time form checks
- Front/back camera flip
- 3-2-1 countdown before recording with haptic ticks
- Auto-detect exercise type (squat, deadlift, overhead press, bench, general)
- Exercise-specific camera guide with SVG silhouette overlay + distance estimation
- Squat depth analysis, left/right symmetry, knee cave (valgus) detection
- Bar path trajectory extraction
- Back rounding detection for deadlifts
- Auto rep counting with per-rep scoring via state machine
- Haptic cues during recording (form breaks, rep completion)
- Results saved to Supabase `form_checks` table
- 60-second max recording with auto-stop
- Lazy-loaded — zero cost until user taps Form Check

**What's broken / needs overhaul:**
- **Scoring always ~70** — base 50 + small bonuses means no dynamic range
- **Only 4 exercise types scored** — squat, deadlift, bench, OHP. Everything else falls to "general" which gives a meaningless score
- **Camera setup is text-only** — no live position validation, users can record from any angle and get garbage data
- **Results screen is basic** — just a score number and generic tips, no breakdown, no video playback
- **No gesture control** — user must walk to phone to start/stop recording
- **No audio coaching** — missed cues while eyes are on the bar
- **No tempo analysis** — we have timestamps but don't measure eccentric/concentric speed
- **No video playback** — we capture landmarks but discard the camera feed

---

## TIER 1 — Core Engine Rebuild

These fix the fundamental problems. Nothing else matters until scoring is accurate and data quality is ensured.

---

### 1.1 Scoring Engine Rewrite — Rule Engine + Deduction System

**What:** Replace the hardcoded scoring with a configurable rule engine. Score starts at 100, each failed check deducts points weighted by severity. Exercise-specific rubrics define which checks apply.

**Where:**
- `app/lib/formAnalysis.ts` — New `FormRuleEngine` class replacing the current `analyzeForm()` scoring block.
- New `app/lib/formRubrics.ts` — Exercise rubric configs (one per exercise category).

**Rule engine check functions (reusable building blocks):**
```
checkJointAngle(joint, min, max, weight)       — is the angle within acceptable range?
checkJointStability(joint, maxDeviation, weight) — how much wobble/drift during the movement?
checkSymmetry(leftJoint, rightJoint, tolerance, weight) — left vs right balance
checkVelocity(joint, minSpeed, maxSpeed, weight) — movement speed (too fast = uncontrolled)
checkPosition(jointA, relativeToB, direction, weight) — is joint A above/below/aligned with B?
checkROM(joint, startAngle, endAngle, weight)   — did they complete full range of motion?
checkTempo(eccentricMs, concentricMs, weight)   — controlled eccentric, appropriate concentric
checkHold(joint, durationMs, maxDrift, weight)  — stability during held positions (yoga/planks)
checkPath(joint, straightness, weight)          — limb/bar path deviation from ideal line
checkLockout(joint, minAngle, weight)           — full extension at top of movement
```

**Exercise rubric example:**
```typescript
{
  id: "squat",
  keywords: ["squat", "goblet", "front squat", "back squat", "zercher"],
  camera: "side",
  checks: [
    { rule: "checkJointAngle", joint: "knee", min: 0, max: 100, label: "Depth", weight: 25,
      deduction: { warn: 10, fail: 25 }, tip: "Push hips back and down to hit parallel" },
    { rule: "checkSymmetry", left: "left_knee", right: "right_knee", tolerance: 8, label: "Symmetry", weight: 15,
      deduction: { warn: 5, fail: 15 }, tip: "Even out both sides — try single-leg mobility drills" },
    { rule: "checkPosition", joint: "shoulder", relativeTo: "hip", direction: "above", label: "Torso Upright", weight: 20,
      deduction: { warn: 8, fail: 20 }, tip: "Keep chest up — brace your core harder" },
    { rule: "checkKneeCave", tolerance: 0.015, label: "Knee Tracking", weight: 20,
      deduction: { warn: 8, fail: 20 }, tip: "Push knees out over your pinky toe on the way up" },
    { rule: "checkLockout", joint: "hip", minAngle: 170, label: "Lockout", weight: 10,
      deduction: { warn: 5, fail: 10 }, tip: "Stand all the way up — squeeze glutes at the top" },
    { rule: "checkTempo", minEccentric: 1500, label: "Controlled Descent", weight: 10,
      deduction: { warn: 5, fail: 10 }, tip: "Slow down the descent — 2-3 seconds down" },
  ]
}
```

**Exercise categories to ship with rubrics:**

| Category | Keywords | Camera | Key Checks |
|---|---|---|---|
| Squat | squat, goblet, zercher, front squat | Side | Depth, knee tracking, torso upright, lockout, tempo |
| Deadlift | deadlift, rdl, romanian, sumo, hip hinge | Side | Back angle, hip hinge, lockout, bar drift, tempo |
| Overhead Press | overhead press, ohp, push press, military, shoulder press | 45° | Bar path, lockout, lean-back, symmetry |
| Bench Press | bench, incline press, decline press, chest press, floor press | Side | Bar path, elbow angle at bottom, lockout, symmetry |
| Lunge | lunge, split squat, bulgarian, step up | Front | Front knee tracking, torso upright, depth, balance/wobble |
| Row | row, cable row, barbell row, dumbbell row, bent over | Side | Body sway, elbow path, torso angle stability, ROM |
| Curl | curl, bicep, hammer curl, preacher | Front | Elbow drift (swinging), shoulder stability, full ROM |
| Pull-up | pull up, pullup, chin up, lat pulldown, pulldown | Front | Full hang, chin over bar / full pull, symmetry, kipping detection |
| Lateral Raise | lateral raise, side raise, front raise | Front | Arm height symmetry, elbow bend, shoulder shrug |
| Tricep Extension | tricep, pushdown, skull crusher, overhead extension | Side | Elbow position locked, full lockout, ROM |
| General | (fallback) | Any | Symmetry + ROM only — "This exercise has limited form analysis" |

**Per-rep scoring:**
- Each rep scored independently using the same rubric
- Overall score = weighted average of all rep scores
- Rep scores naturally drop with fatigue — this is real data, not a penalty

**Score bands:**
- 90-100: Excellent (green)
- 75-89: Good (teal)
- 50-74: Needs Work (amber)
- 25-49: Poor (orange)
- 0-24: Dangerous (red)

**Integration:**
- `analyzeForm()` calls the rule engine instead of hardcoded checks
- Exercise type detected from `exerciseName` prop (already passed) via keyword matching — NOT from landmark heuristics
- Landmark-based exercise auto-detection kept as fallback only when exerciseName is empty/generic

---

### 1.2 Camera Setup Flow — Live Position Validation

**What:** Full-screen guided setup before recording. Validates camera angle, body distance, landmark visibility, and hold-steady — recording only starts when all conditions are met.

**Where:**
- `app/components/FormCheckCamera.tsx` — New `"setup"` phase between `"ready"` and `"countdown"`.
- `app/lib/formGuides.ts` — Already has angle mapping + silhouettes. Add validation logic.

**Setup flow (3 steps):**

**Step 1: Instruction card (2-3 seconds)**
- Full-screen card: exercise name, required camera angle, animated phone placement diagram
- "Place your phone at hip height, 6-8 feet away, showing your side profile"
- Tap to continue (or auto-advance after 3s if user has done form check before)

**Step 2: Live position validation**
Camera feed active, skeleton drawing. Checklist overlaid:
- ✅ "Full body visible" — all major landmarks (shoulders, hips, knees, ankles) detected with visibility > 0.6
- ✅ "Good distance" — hip landmark width ratio between 0.08 and 0.35 (use existing distance estimation)
- ✅ "Correct angle" — validate landmarks match expected view:
  - Side view: shoulder-to-shoulder distance < 0.08 of frame width (narrow = side-on)
  - Front view: shoulder-to-shoulder distance > 0.12 of frame width (wide = facing camera)
  - 45°: between the two thresholds
- ✅ "Hold steady" — landmark movement below threshold for 1.5 seconds
- Each check animates from grey → green checkmark as it passes
- If wrong angle detected: "Turn sideways for best squat analysis" prompt

**Step 3: Ready**
- All checks green → "Ready! 👍 Thumbs up or tap to start"
- Gesture detection active (see 2.1)
- Manual record button also available

**Smart angle adaptation:**
If the user sets up at a different angle than recommended and we can still extract useful data —
adapt the rubric instead of blocking. Reduce weight of checks that need the recommended angle.
"We recommended side view but analyzed from front — some checks adjusted"

**Integration risks:**
- Validation runs in `processFrame()` during setup phase — lightweight checks only
- Don't block forever — after 10 seconds of failed validation, show "Having trouble? Tap to record anyway"
- Skeleton overlay and silhouette both drawn during setup for visual guidance

---

### 1.3 Results Screen — Report Card Redesign

**What:** Complete overhaul of the results screen into a layered, progressive-disclosure report card with video playback, radar chart, per-rep timeline, fault cards, and coaching.

**Where:**
- `app/components/FormCheckCamera.tsx` — Replace current ResultsView with new report card.

**Layout (top to bottom):**

**Hero: "One Thing to Fix" card**
- Single most impactful coaching cue from all detected faults
- "Focus on this: Push your knees out during the ascent"
- Changes each session as user fixes issues. Feels like a personal coach.
- If no faults: "Form looks solid. Keep it up!"

**Score circle**
- Large animated ring (fills over 1.2s with ease-out, number counts up from 0)
- Color gradient fill based on score band
- Label: "Excellent" / "Good" / "Needs Work" / "Poor"
- Exercise name + duration + rep count below
- Delta arrows if history exists: "↑8 from last session"

**Video player**
- Camera recording with neon skeleton overlay drawn on a synced canvas layer
- Play/pause, scrub bar, 0.5x slow-mo toggle
- Tap a rep in the timeline → video jumps to that rep's start frame
- Pause on any frame to see exact joint angles overlaid
- Video stays in memory as blob URL — never uploaded, discarded on exit

**Radar chart (5 axes):**
- **Depth/ROM** — did they hit full range of motion?
- **Stability** — how smooth/controlled was the movement path?
- **Symmetry** — left vs right balance
- **Tempo** — controlled eccentric, appropriate concentric speed
- **Path** — bar/limb trajectory straightness
- Each axis 0-100, filled area shows the score shape
- Ghost overlay of previous session's radar (20% opacity) if history exists

**Per-rep timeline:**
- Horizontal row of numbered circles, color-coded by that rep's score
- Tap a rep to expand: angle reached, duration, eccentric/concentric split, specific faults
- Fatigue indicator line if scores drop across the set
- Partial rep badges (flagged reps that didn't hit full ROM)

**Fault cards (expandable):**
- Specific, actionable callouts with severity badge
- "Knee Valgus — Reps 4, 5, 6" (red badge)
- "Depth — Didn't reach parallel on reps 3, 7" (amber badge)  
- "Tempo — Eccentric too fast on reps 5-8 (0.4s vs recommended 2s)" (amber badge)
- Each card has a "How to fix" expandable with specific coaching cue

**Progress footer:**
- "vs Last Session: Score +8, Depth +6°, 2 fewer faults"
- Mini sparkline of last 5 scores for this exercise
- "First form check for this exercise!" if no history

**Progressive disclosure:**
- Default view: One Thing to Fix + score circle + video player
- Scroll down: radar chart + per-rep timeline
- Scroll more: fault cards + progress footer
- Most users see the simple view. Power users dig deeper.

**Screenshot-ready design:**
- Score, exercise name, radar chart all fit in one phone screen
- Looks good as a screenshot without a share button
- Subtle "Analyzed by Sevel" watermark in corner

---

### 1.4 Video Recording for Playback

**What:** Record the camera feed during the session using `MediaRecorder` API for playback on the report card with skeleton overlay.

**Where:**
- `app/components/FormCheckCamera.tsx` — Start `MediaRecorder` when recording begins, stop when recording ends.

**How it works:**
- `new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' })` on the camera stream
- Collect chunks in an array via `ondataavailable`
- On stop: `new Blob(chunks)` → `URL.createObjectURL(blob)` → feed to `<video>` element
- Skeleton overlay: sync a canvas layer on top of the video. On each video `timeupdate`, find the nearest landmark frame by timestamp and draw the skeleton.
- Landmark frames already stored in the `recordedFrames` array with timestamps — just need to sync.

**Storage:**
- 30 seconds at 720p ≈ 3-5MB as webm blob in memory
- Stays as blob URL during report card view
- `URL.revokeObjectURL()` when user closes report or navigates away
- Never saved to disk, IndexedDB, or server

**Playback controls:**
- Play/pause button
- Scrub bar synced to video timeline
- 0.5x / 1x speed toggle
- Tap rep in timeline → `video.currentTime = rep.startTime`

**Integration risks:**
- `MediaRecorder` supported on all modern mobile browsers (Chrome, Firefox, Safari 14.5+)
- Safari may prefer `video/mp4` mimeType — detect and fall back
- Memory: 5MB blob is fine. 60s recording ≈ 10MB max — still manageable
- Must stop MediaRecorder before stopping the camera stream

---

### 1.5 Tempo & Speed Analysis

**What:** Measure eccentric (lowering) vs concentric (lifting) duration for each rep. Flag dangerous speed. Display as timing data per rep.

**Where:**
- `app/lib/formAnalysis.ts` — Add timing to `RepDetector` state machine transitions.
- `RepResult` type gets `eccentricMs` and `concentricMs` fields.

**How it works:**
Using the rep detection state machine timestamps:
- Eccentric = time from phase "descending" start to "bottom"
- Concentric = time from "bottom" to "ascending" end / "top"
- Integrated into the rule engine as `checkTempo` rule

**Scoring:**
- Eccentric under 1s → deduction (too fast, uncontrolled, injury risk)
- Eccentric 1.5-3s → good (controlled)
- Concentric over 5s → flag (grinding, potential failure)
- Rep-to-rep tempo consistency — getting faster = losing control

**Time under tension per rep:**
- Total = eccentric + concentric (excluding lockout hold)
- Displayed on per-rep detail cards

---

### 1.6 Exercise Coverage Expansion

**What:** Expand from 4 exercise types to 10+ with exercise-specific checks. Use exercise name (already passed as prop) instead of guessing from landmarks.

**Where:**
- `app/lib/formRubrics.ts` — New file with rubric configs for all exercise categories
- `app/lib/formAnalysis.ts` — `detectExerciseType()` uses `exerciseName` first, landmark heuristics as fallback only
- `app/lib/formGuides.ts` — Already has 8 categories for camera angles, expand to match rubrics

**New exercise checks:**

| Exercise | What 2D CAN Detect | Camera |
|---|---|---|
| **Lat Pulldown** | Arm symmetry, elbow path, lean-back angle, full ROM at top | Front |
| **Cable Crossover** | Arm symmetry, elbow bend, torso lean, hand path | Front |
| **Bicep Curl** | Elbow drift (swinging), shoulder movement (cheating), full ROM | Front |
| **Tricep Pushdown** | Elbow locked at side vs drifting, full lockout | Side |
| **Lateral Raise** | Arm height symmetry, elbow bend, shoulder shrug | Front |
| **Leg Press** | Knee depth angle, lockout, back position | Side |
| **Lunge** | Knee tracking, torso upright, depth, wobble/balance | Front |
| **RDL** | Hip hinge angle, back flatness, knee bend | Side |
| **Pull-up** | Full hang at bottom, chin over bar, symmetry, kipping | Front |
| **Push-up** | Depth, elbow angle, hip sag (core weakness), head position | Side |

**Honest boundary:**
Exercises where we truly can't extract meaningful form data get: "This exercise has limited form analysis — we can check symmetry and range of motion." Score only on what we can actually measure. No fake 70s.

**Future-proof for martial arts / yoga / calisthenics / running:**
The rule engine architecture means any human movement with definable angle/position/speed checks can be added as a config. Examples:
- Roundhouse kick: hip height, knee extension, guard hand position, kick speed, standing leg balance
- Warrior II: hip angle, knee over ankle, arm alignment, hold stability
- Running gait: foot strike vs hip position, arm swing symmetry, forward lean, knee drive

---

## TIER 2 — Hands-Free & Audio Intelligence

These features make Form Check usable when the phone is across the room.

---

### 2.1 Gesture Control — Thumbs Up to Start, Palm to Stop

**What:** Use MediaPipe Gesture Recognizer to detect hand gestures for hands-free recording control. Phone is propped up 6-8 feet away — user can't tap the screen mid-set.

**Where:**
- `app/components/FormCheckCamera.tsx` — Load Gesture Recognizer alongside Pose Landmarker.
- New gesture detection loop in `processFrame()`.

**Implementation:**
- MediaPipe **Gesture Recognizer** task — same WASM runtime as Pose, ~3MB additional model
- Built-in gesture detection: thumbs up, open palm, fist, victory, pointing

**Gesture mapping:**
| Gesture | Action | Hold Duration |
|---|---|---|
| 👍 Thumbs up | Start countdown → begin recording | 1.0 second |
| 🖐️ Open palm | Stop recording | 1.0 second |
| Manual button | Fallback for both start/stop | Tap |

**UX flow:**
- Setup phase complete, all validation checks green
- "Ready! 👍 Thumbs up to start" prompt appears
- User gives thumbs up → gesture icon appears on screen, ring fills for 1 second
- Ring completes → haptic confirmation + 3-2-1 countdown → recording begins
- During recording: open palm held for 1 second → stop recording
- Gesture detection checks every ~500ms during recording (pose detection takes priority on CPU)
- Disable gesture detection during actual exercise movement — only check when in "top" position / standing still

**Integration risks:**
- Gesture Recognizer runs on the same video feed as Pose Landmarker — both can process the same frame
- Performance: gesture detection is lighter than pose detection. Running both at 30fps may drop to 20fps on low-end devices — fall back to gesture check every 3rd frame
- Thumbs up during exercise (e.g., grip) should not trigger — the 1-second hold + stillness requirement prevents this
- Safari support: test MediaPipe Gesture Recognizer on Safari/iOS WebKit

---

### 2.2 Audio Coaching During Recording

**What:** Spoken cues through the phone speaker while lifting. "Deeper", "Slow down", "Knees out", "Good rep". No UI needed — the voice IS the interface when you can't see the screen.

**Where:**
- `app/components/FormCheckCamera.tsx` — New `AudioCoach` class instantiated during recording.

**Implementation:**
- `SpeechSynthesis` API — zero dependency, works in all browsers
- Short, calm cues — not a drill sergeant. Under 3 words each.
- Only speaks when something is wrong or notably good — silence means you're fine

**Cue library:**
| Trigger | Cue | Cooldown |
|---|---|---|
| Knee cave detected (3+ frames) | "Knees out" | 5 seconds |
| Back rounding detected | "Chest up" | 5 seconds |
| Didn't hit depth on a rep | "Go deeper" | Per rep |
| Eccentric under 1 second | "Slow down" | 5 seconds |
| Good rep scored 85+ | "Good rep" | Per rep |
| Rep counted | *chime sound* (not speech) | Per rep |
| Form breaking down (3+ consecutive warns) | "Watch your form" | 8 seconds |

**Settings:**
- Toggle on/off (default: on)
- Volume follows system media volume
- No cue fires more than once per cooldown period
- Maximum 1 spoken cue at a time — queue and drop if backed up

**Integration risks:**
- `SpeechSynthesis` may be blocked on iOS Safari without a user gesture — trigger it once silently during countdown to "unlock" it
- Voice selection: use default system voice, keep rate at 1.0, pitch at 1.0
- Don't speak during the first 2 seconds of recording (user is getting into position)

---

### 2.3 Intelligent Haptic Language

**What:** Different vibration patterns communicate different information — learned over time. Phone is across the room, user FEELS the feedback without looking.

**Where:**
- `app/components/FormCheckCamera.tsx` — Enhanced haptic patterns in `processFrame()`.

**Pattern language:**
```
Single short pulse  [30]                 — Rep counted
Double pulse        [50, 30, 50]         — Form warning (knee cave, back rounding)
Long buzz           [150]                — Danger — stop, form is breaking down
Triple quick tap    [30, 20, 30, 20, 30] — Great set / recording complete
Ascending pattern   [20, 20, 40, 20, 60] — Score improving across reps
```

**Already partially built** — current haptics fire for form breaks and rep completion. Expand the pattern vocabulary and add distinct patterns per error type so users learn what each means.

---

## TIER 3 — Intelligence & Analysis

These features use the data we already capture to provide deeper insights.

---

### 3.1 Stability / Movement Quality Score

**What:** Measure how smooth and controlled the joint path is during each rep. Wobbly path = poor motor control. Smooth arc = strong, stable movement.

**How it works:**
- For each tracked joint, record its (x, y) path during a rep
- Calculate deviation from an ideal arc (polynomial fit or simple smoothness metric)
- High deviation = low stability score
- Integrated into the rule engine as `checkJointStability` rule

**What this catches:**
- Shaking under load (too heavy)
- Compensatory movements (shifting weight to one side)
- Balance issues on single-leg exercises
- Bar wobble on press movements

---

### 3.2 Partial Rep Detection

**What:** Flag reps that don't complete full ROM. Distinguish full reps from half reps with ~95% accuracy (QuickPose's benchmark).

**How it works:**
- Compare each rep's min angle to the rubric's depth threshold
- If angle > threshold by more than 15°: partial rep
- Marked with a distinct badge on the per-rep timeline
- Partial reps scored separately — don't drag down the full rep average
- "3 of 8 reps were partial — didn't reach full depth"

---

### 3.3 Fatigue Detection & Auto-Suggestions

**What:** Track score degradation across reps within a set. Surface when form breaks down.

**Metrics:**
- Per-rep score trend line — detect downward slope
- ROM decrease across reps (depth getting shallower)
- Tempo increase across reps (reps getting faster = less control)
- Stability decrease across reps (more wobble)

**Output:**
- "Form broke down after rep 5 of 8 — consider reducing weight by 5-10%"
- Fatigue curve visualization on the per-rep timeline
- Worst rep callout: "Rep 7 had the weakest form (52/100)"

---

### 3.4 Form Memory Across Sessions

**What:** Track recurring faults across multiple sessions. Surface persistent issues and celebrate improvements.

**Where:**
- Query `form_checks` table for historical data on results screen.

**Features:**
- "Knee valgus detected in 4 of last 5 squat sessions" — escalating urgency in the "One Thing to Fix" card
- "You fixed your knee cave — hasn't appeared in 3 sessions!" — celebrate improvements
- Historical comparison auto-surfaced (no extra screen):
  - Score: 74 → 82 ↑
  - Depth: 98° → 91° ↑ (lower = deeper = better for squat)
  - Faults: 5 → 2 ↓
- Sparkline of last 5-10 scores for this exercise
- Asymmetry trending: "Left side consistently weaker for 3 sessions — add unilateral work"

---

### 3.5 Auto-Detect Rest Periods (Multi-Set Support)

**What:** When user stands still between sets, automatically pause analysis. Resume when movement starts. No manual start/stop per set.

**How it works:**
- Detect movement below threshold for 15+ seconds = rest period
- Segment recording into sets automatically
- Show per-set breakdown on results: "Set 1: 85, Set 2: 81, Set 3: 72"
- "Your form dropped on set 3 — consider reducing weight"

---

### 3.6 Ghost Overlay on Video Playback

**What:** Semi-transparent "ideal form" skeleton overlaid on their video during playback. Shows the gap between their movement and textbook form.

**How it works:**
- Reference skeleton data for common exercises (stored as angle sequences)
- During playback, draw ideal skeleton at 20% opacity alongside real skeleton
- Aligned at hip position for body-size independence
- Only shown when user taps a specific rep — not always visible (avoids clutter)

---

## TIER 4 — Polish & Gamification

---

### 4.1 Analyzing Phase — Scan Animation

Replace the spinner during analysis with a "scanning" animation: gradient line sweeps over the last skeleton frame, text cycles through "Analyzing depth..." → "Checking symmetry..." → "Measuring tempo..."

---

### 4.2 Form Gamification — Streaks, PBs, Achievements

| Achievement | Criteria | Rarity |
|---|---|---|
| Perfect Form | Score 95+ on any exercise | Rare |
| Symmetry Master | L/R delta under 3° | Uncommon |
| Deep Squatter | Below parallel 5 sessions in a row | Uncommon |
| Consistency King | 10 form checks in 30 days | Rare |
| Iron Posture | Deadlift with 0 back rounding flags, 3 sessions | Rare |
| Rep Machine | 10+ reps all scoring 80+ | Epic |
| Form Streak | 5 consecutive sessions scoring 80+ | Rare |
| Tempo Master | All reps with 2-3s eccentrics for 3 sessions | Epic |

Wire into existing `achievements` table and `checkAchievements()` system.

**Form XP:**
- Earn XP for good form scores, not just completing sets
- Bonus XP for improving on previous session
- Ties into the existing character/leveling system

---

### 4.3 Shareable Results Card

Generate a 1080×1920 image (Instagram Story format) with score ring, exercise name, radar chart, rep count, key metrics. `canvas.toBlob()` → `navigator.share({ files: [...] })`. Subtle "Analyzed by Sevel" watermark.

---

### 4.4 Low Light Warning

Sample brightness every ~60 frames. If mean luminance < 40/255, show advisory banner: "Low light — accuracy may be reduced". Auto-dismiss when light improves.

---

### 4.5 Ambient Sound Design

Subtle audio feedback beyond speech cues:
- Soft chime on each good rep
- Slightly lower tone on a weak rep
- Ascending tone sequence when finishing with improving scores
- Off by default, toggle in settings

---

### 4.6 Battery / Performance Guard

If `navigator.getBattery()` reports below 15%, warn that camera processing is battery-intensive. If frame processing time exceeds 100ms consistently, auto-reduce canvas resolution to maintain smooth overlay.

---

### 4.7 Orientation Lock

Lock screen to portrait via `screen.orientation.lock('portrait')` when Form Check opens. Fallback: "Rotate to portrait" overlay if landscape detected.

---

## FUTURE — Expanding Beyond Weightlifting

The rule engine architecture makes these possible without new analysis code — just new configs.

### Martial Arts
- **Punches:** wrist velocity, shoulder rotation, guard hand position, hip rotation
- **Kicks:** hip height, knee chamber, extension at contact, standing leg balance, recovery to guard
- **Stances:** width, weight distribution, knee bend, back angle
- **Combos:** transition speed, return to guard between strikes
- **Shadow boxing:** full session form analysis

### Yoga & Mobility
- **Pose accuracy:** compare landmarks against reference pose template
- **Hold stability:** measure wobble/drift during held poses
- **Alignment:** "hips aren't square", "back knee should be at 90°"
- **Flexibility tracking:** measure angles over weeks (hamstring, hip flexor, shoulder)

### Calisthenics
- **Push-ups:** depth, elbow angle, hip sag, head position
- **Pull-ups:** full hang, chin over bar, kipping detection, symmetry
- **Dips:** depth, forward lean, elbow flare
- **Handstands:** body line, shoulder angle, balance deviation
- **Pistol squats:** depth, balance, non-working leg position

### Running & Cardio
- **Running form:** foot strike vs hip, arm swing symmetry, forward lean, knee drive
- **Jump rope:** jump height consistency, arm position
- **Box jumps:** landing position, knee valgus on landing, hip extension

### Rehab & Physical Therapy
- **ROM tracking:** exact joint angles during rehab exercises over weeks
- **Gait analysis:** stride length, symmetry, hip drop
- **Compensation detection:** "favoring your right side"

### Dance & Movement
- **Choreography matching:** compare pose sequence against reference video frame-by-frame
- **Rhythm sync:** are movements hitting musical beats?

### Coach Mode
User holds the phone and records their training partner. Skeleton + real-time feedback shown on screen. Shared results sent to lifter's account via QR code or friend link.

---

## Build Order Summary

| Priority | Feature | Effort | Depends On |
|---|---|---|---|
| **TIER 1 — Core** | | | |
| 1.1 | Scoring engine rewrite + rule engine | Large | — |
| 1.2 | Camera setup flow + validation | Medium | — |
| 1.3 | Report card UI redesign | Large | 1.1 (scoring data) |
| 1.4 | Video recording for playback | Medium | — |
| 1.5 | Tempo & speed analysis | Medium | 1.1 (rule engine) |
| 1.6 | Exercise coverage expansion (10+ types) | Large | 1.1 (rule engine) |
| **TIER 2 — Hands-Free** | | | |
| 2.1 | Gesture control (thumbs up / palm) | Medium | — |
| 2.2 | Audio coaching during recording | Medium | 1.1 (real-time checks) |
| 2.3 | Intelligent haptic language | Small | 1.1 (real-time checks) |
| **TIER 3 — Intelligence** | | | |
| 3.1 | Stability / movement quality score | Medium | 1.1 (rule engine) |
| 3.2 | Partial rep detection | Small | 1.1 (rep detection) |
| 3.3 | Fatigue detection + auto-suggestions | Medium | 1.1 (per-rep scoring) |
| 3.4 | Form memory across sessions | Medium | DB (already built) |
| 3.5 | Auto-detect rest periods (multi-set) | Medium | 1.1 (rep detection) |
| 3.6 | Ghost overlay on playback | Large | 1.4 (video playback) |
| **TIER 4 — Polish** | | | |
| 4.1 | Analyzing scan animation | Small | — |
| 4.2 | Form gamification (streaks, XP, achievements) | Medium | DB (already built) |
| 4.3 | Shareable results card | Medium | 1.3 (report card) |
| 4.4 | Low light warning | Small | — |
| 4.5 | Ambient sound design | Small | — |
| 4.6 | Battery / performance guard | Small | — |
| 4.7 | Orientation lock | Small | — |

---

## Technical Notes

- **Canvas 2D context CANNOT use CSS custom properties** — must use hardcoded color strings for all skeleton/overlay drawing
- **1-Euro Filter** already implemented (minCutoff=1.0, beta=0.007, dCutoff=1.0) — apply to raw landmarks before drawing, use RAW landmarks for analysis
- **Double-pass neon rendering** already implemented — Pass 1: thick glow (shadowBlur:16), Pass 2: thin white crisp line
- **Per-joint color feedback** already implemented — STATUS_COLORS: good (#00ffaa), warn (#ffb800), bad (#ff4466)
- **PWA service worker** (`sevel-v1`) caches compiled JS — pre-cache MediaPipe WASM + model files for offline gym use
- **Lazy loading** via `next/dynamic` with `ssr: false` — Form Check adds zero to initial bundle
- **`navigator.vibrate()`** for haptics — Android Chrome only, graceful no-op on Safari
- **`SpeechSynthesis`** for audio cues — unlock with silent utterance during countdown on iOS
- **`MediaRecorder`** for video capture — webm on Chrome/Firefox, may need mp4 fallback on Safari
- **MediaPipe Gesture Recognizer** — ~3MB model, same WASM runtime as Pose Landmarker
