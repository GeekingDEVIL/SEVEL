# Martial Arts Module — Learn-First Redesign

> **Status:** Active build  
> **Goal:** Rebuild MA from session-logging tool → teaching system for people who've never trained  
> **Approach:** Structured curriculum (guided paths) + animated technique visuals + technique library (encyclopedia) + practice mode (drills)  
> **Research:** See [MA_TEACHING_RESEARCH.md](MA_TEACHING_RESEARCH.md) for professional methodology deep-dive

---

## Philosophy

The current MA module assumes users already train and want to log sessions. The redesign flips this: **teach first, log second**. A user who has never thrown a punch should be able to open Boxing, start Lesson 1, and learn proper stance by the end of it — no gym or partner needed.

Users are **complete beginners** — every screen assumes zero knowledge. No jargon without explanation. No "you should know this." The app is their coach.

**What we keep (untouched):**
- Hub page with all 6 discipline image cards + category badges (Striking, Grappling+Belts, etc.)
- Session history from `ma_sessions` table
- Discipline stats (sessions, hours)
- All existing DB schema (curriculum tables, techniques, practice logs)

---

## 1. Technique Visuals (MVP + Long-term)

### 1.1 MVP: Animated SVG/CSS Technique Diagrams

Every technique gets a **stick-figure-style animated diagram** showing the motion path. These are generated as inline SVG/CSS in the app — no external assets needed.

**Format:** Step-sequence animation
```
Frame 1: Starting position (stance)
Frame 2: Wind-up / chamber
Frame 3: Full extension / strike
Frame 4: Return to guard
```

**Implementation:**
- Each technique has an `animation_key` field mapping to a React component
- Components use CSS `@keyframes` + SVG to animate a stick figure
- Arrows/arcs show the motion path (red for strikes, blue for defense, green for footwork)
- "Play" button loops the animation; "Step" button advances frame by frame
- Color-coded body parts highlight which muscles/limbs are active

**Step-by-step illustration cards:**
- Below the animation, numbered frames showing each phase as a static comic-strip breakdown
- Each frame has a 1-line caption ("Rotate hip forward", "Extend fist straight", "Snap back to guard")
- These work even when animation is disabled (accessibility, low-power mode)

### 1.2 Long-term: Video Demonstrations

Schema is ready for backfilling real video demos as they're produced.

```sql
ALTER TABLE ma_techniques
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS animation_key TEXT;
```

**Video spec (when filming):**
- ~30 seconds per technique
- Angles: front view + side view
- Sequence: slow-motion execution → full-speed execution → common mistake demo
- Host on Supabase Storage or Cloudflare R2
- `video_url` nullable — app works perfectly without it, gets better with it

**Priority:** The app ships with text + animated diagrams. Videos are backfilled per-technique over time. The UI shows video when available, falls back to animation, falls back to step-by-step text.

---

## 2. Discipline Paths (Curriculum)

### 2.1 Supported Disciplines

All 6 from the hub. Curriculum content added in phases.

| Discipline | Focus | Solo-friendly | Curriculum Phase |
|-----------|-------|---------------|-----------------|
| **Boxing** | Hands, footwork, head movement, defense | ★★★★★ | Phase 1 (now) |
| **Muay Thai** | 8-limb striking: fists, elbows, knees, kicks | ★★★★☆ | Phase 1 (now) |
| **Karate** | Kihon (basics), Kata (forms), Kumite (sparring concepts) | ★★★★★ | Phase 2 |
| **Taekwondo** | Kicks, poomsae (forms), flexibility | ★★★★★ | Phase 2 |
| **BJJ** | Positions, escapes, solo movement drills, concepts | ★★☆☆☆ | Phase 3 |
| **MMA** | Cross-discipline integration, striking focus for solo | ★★★☆☆ | Phase 3 |

### 2.2 Path Structure

```
Discipline
  └── Level (e.g. "Foundations", "Beginner", "Intermediate", "Advanced")
       └── Week (e.g. Week 1, Week 2...)
            └── Lesson (e.g. "Stance & Guard", "The Jab")
                 ├── Animated technique diagram (SVG/CSS)
                 ├── Step-by-step illustration cards
                 ├── Coaching cues (what to feel / think about)
                 ├── Common mistakes (what NOT to do)
                 ├── Solo drill with timer (practice routine, 5-15 min)
                 └── Self-check (self-assessment)
```

### 2.3 Curriculum Scope Per Discipline

Based on professional teaching research:

**Boxing (4 Levels × 12 Lessons = 48 total)**
| Level | Lessons | Focus |
|-------|---------|-------|
| Foundations | 12 | Stance, jab, cross, hook, uppercut, basic defense, movement |
| Beginner | 12 | Body shots, advanced combos, counter-punching, feinting |
| Intermediate | 12 | Advanced combos, fighting styles, ring craft, round management |
| Advanced | 12 | Switch-hitting, southpaw, advanced defense, personal style |

**Muay Thai (3 Levels × 12 Lessons = 36 total)**
| Level | Lessons | Focus |
|-------|---------|-------|
| Foundations | 12 | Stance, teep, roundhouse, low kick, check, elbows, knees, clinch |
| Weapons Dev | 12 | Advanced kicks, elbow entries, knee combos, clinch sweeps |
| Fight IQ | 12 | Counters, feints, distance management, ring craft |

**Karate (3 Belt Levels × 10 Lessons = 30 total)**
| Level | Lessons | Focus |
|-------|---------|-------|
| White Belt | 10 | Kihon basics, Taikyoku Shodan kata, stances, blocks, front kick |
| Yellow Belt | 10 | Heian Shodan kata, combinations, roundhouse kick |
| Green Belt | 10 | Heian Nidan kata, speed work, knife-hand, back stance |

**Taekwondo (4 Kup Levels × ~9 Lessons = 35 total)**
| Level | Lessons | Focus |
|-------|---------|-------|
| 10th Kup (White) | 8 | Stance, basic blocks, front punch, etiquette |
| 9th Kup (White-Yellow) | 9 | Front kick, roundhouse, Taegeuk Il Jang |
| 8th Kup (Yellow) | 9 | Side kick, back kick basics, Taegeuk Ee Jang |
| 7th Kup (Yellow-Green) | 9 | Turning kick, axe kick, Taegeuk Sam Jang |

**BJJ (2 Levels × 12 Lessons = 24 total, adapted for solo)**
| Level | Lessons | Focus |
|-------|---------|-------|
| Combatives | 12 | Solo movement drills, positional knowledge, escape concepts |
| Positional Mastery | 12 | Guard concepts, submission mechanics, takedown drills |

**MMA (4 Blocks × 9 Lessons = 36 total)**
| Level | Lessons | Focus |
|-------|---------|-------|
| Stand-Up | 9 | MMA stance, basic strikes, kick defense |
| Clinch & Takedowns | 9 | Clinch control, takedown concepts, sprawl drills |
| Ground | 9 | Position recognition, escape movement, guard concepts |
| Integration | 9 | Combining ranges, transition drills, MMA shadow rounds |

---

## 2b. Discipline Origins Tab (✅ Already Built — Preserve)

Each discipline page has a **Learn / Origins** tab bar. The Origins tab is fully built and must be preserved through all redesign work.

### What's in the Origins Tab

Data lives in `DISCIPLINE_ORIGINS` in `martialArtsEngine.ts`. All 6 Phase 1 disciplines have complete origin data.

| Section | Content |
|---------|---------|
| **Origin Story** | Expandable story card with founding date, origin country, full history text |
| **Timeline** | Vertical timeline with era periods, titles, descriptions, and historical images (where available) |
| **Philosophy** | Highlighted quote card with the discipline's core philosophy |
| **Key Figures** | Horizontal carousel of 3 key figures per discipline (circular portraits → tap opens full-screen bio sheet with hero image, Origins/Career/Legacy sections) |
| **Fun Fact** | Amber-accented card with a discipline-specific fun fact |

### Disciplines with Origins Data

- **Boxing** — From 688 BC to modern era, Jack Broughton / Muhammad Ali / Sugar Ray Robinson
- **Muay Thai** — Muay Boran origins, Nai Khanomtom / Samart Payakaroon / Buakaw Banchamek
- **BJJ** — Judo roots to Gracie family, Hélio Gracie / Royce Gracie / Mitsuyo Maeda
- **Karate** — Okinawan secret art to Olympics, Gichin Funakoshi / Mas Oyama / Anko Itosu
- **Taekwondo** — Ancient Taekkyon to Olympic sport, General Choi / Kim Un-yong / Hwang Kee
- **MMA** — Ancient pankration to UFC, Bruce Lee / Royce Gracie / Dana White

### Components

- `FigureCard` — Circular portrait carousel card → full-screen bio overlay with spring animation
- `parseBioSections()` — Splits bio text into Origins/Career/Legacy sections for structured display
- Tab bar in `DisciplinePath` — `"learn" | "origins"` toggle

### Rule

**Never remove or reduce the Origins tab.** All redesign work adds to it, never replaces it. New disciplines added to the curriculum must also have `DISCIPLINE_ORIGINS` entries written before launch.

---

## 3. Guided Onboarding Flow

When a noob taps a discipline for the first time, show a **30-second intro** instead of dumping them into a lesson list:

```
┌─────────────────────────────────┐
│ 🥊 Welcome to Boxing            │
│                                 │
│ The sweet science — hands,      │
│ footwork, defense. Perfect for  │
│ beginners.                      │
│                                 │
│ What you'll learn first:        │
│ • Proper boxing stance          │
│ • The jab (most important punch)│
│ • How to move like a boxer      │
│                                 │
│ Equipment needed: None          │
│ Space needed: 6x6 feet          │
│                                 │
│ ┌─────────────────────────────┐ │
│ │    Start Your Journey →     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

Button drops them directly into Lesson 1.

---

## 4. One-Lesson-At-A-Time Progression

The UI shows lessons progressively, not all at once:

- **Current lesson** shown prominently (big card, "Continue" / "Start" button)
- **Completed lessons** shown as a compact progress bar / trail above
- **Locked lessons** hidden entirely (not greyed out — hidden)
- Each lesson completion unlocks the next with a celebration animation
- Users can tap completed lessons to review them

This prevents overwhelm — the noob only ever sees "here's what's next."

---

## 5. Lesson Experience (The Core)

Each lesson is a **guided session** (15–25 min) with this flow:

### 5.1 Lesson Flow

```
1. INTRO
   "Today you'll learn: The Jab"
   Why it matters (1 paragraph)
   Estimated time: 12 min

2. TECHNIQUE VISUAL
   ┌──────────────────────┐
   │  [Animated SVG of    │
   │   stick figure doing │
   │   the technique]     │
   │                      │
   │   ▶ Play  ⏭ Step    │
   └──────────────────────┘
   
   Step-by-step illustration cards below:
   [1. Stance] → [2. Extend] → [3. Rotate] → [4. Snap back]

3. KEY POINTS
   • Speed over power — it's a whip, not a push
   • Return to guard is as important as the punch
   • "Imagine flicking a towel — quick and sharp"

4. DRILL TIMER
   ┌──────────────────────┐
   │  Jab Ladder           │
   │  Round 1 of 3         │
   │  ┌──────────────┐     │
   │  │    1:47      │     │
   │  └──────────────┘     │
   │  [Pause]  [Skip]      │
   └──────────────────────┘

5. COMMON MISTAKES
   ✗ Dropping the rear hand while jabbing
   ✗ Winding up before throwing
   ✗ Pushing instead of snapping

6. FORM CHECK (Camera)
   ┌──────────────────────────────────┐
   │  📹 Check Your Form              │
   │                                  │
   │  Use your camera to check your   │
   │  technique. The app will analyze │
   │  your stance, guard, and punch   │
   │  path in real-time.              │
   │                                  │
   │  [Open Form Check]               │
   └──────────────────────────────────┘
   
   → Opens FormCheckCamera with MA-specific analysis
   → Real-time color feedback on joints (green/yellow/red)
   → Post-recording score + tips specific to this technique
   → Score saved alongside lesson self-rating

7. SELF-CHECK
   "Can you throw 10 jabs without losing your stance?"
   "Film from the side — is your arm going straight?"

8. RATE YOURSELF
   ⭐⭐⭐⭐⭐ → saves to ma_user_lessons

9. COMPLETION
   🎉 +95 XP
   Technique unlocked: Jab
   Form check score: 82/100
   Next up: Movement Basics
```

### 5.2 Drill Timer

Built-in round timer that runs during the lesson:
- Configurable rounds × duration (e.g. "3 rounds of 2 minutes")
- Rest timer between rounds
- Audio cues: bell to start, bell to stop
- Keeps screen awake (uses existing Wake Lock)

### 5.3 Form Check Integration

Each lesson has a **"Check Your Form"** button that opens the existing `FormCheckCamera` component with MA-specific analysis rules. This reuses the entire MediaPipe pose detection pipeline we already built for gym exercises.

**How it works in the lesson:**
1. User completes the drill section
2. "Check Your Form" button appears — optional but encouraged
3. Camera opens with MA-specific guide (camera angle, distance, positioning)
4. User performs the technique for 5–15 seconds
5. Real-time skeleton overlay with color-coded joints (green = good, yellow = warn, red = bad)
6. Post-recording: score out of 100 + specific tips
7. Score saved to `ma_user_lessons.form_check_score`

**What gets checked per technique category:**

See Section 5.4 below for full MA analysis rules.

### 5.4 MA Form Check Analysis Rules

Extends the existing `formAnalysis.ts` with MA-specific exercise types and joint checks. The existing infrastructure (MediaPipe landmarks, `checkFormRealtime`, joint/connection status coloring, `RepDetector`) all carries over — we just add new analysis functions.

**New exercise types added to `FormAnalysisResult.exerciseType`:**
```typescript
type ExerciseType = 
  // existing
  | "squat" | "deadlift" | "bench" | "overhead_press" | "general"
  // new MA types
  | "ma_stance" | "ma_punch" | "ma_kick" | "ma_elbow" 
  | "ma_knee" | "ma_guard" | "ma_form";
```

**Detection:** MA types are passed explicitly from the lesson context (not auto-detected like gym exercises), since we know exactly which technique the user is practicing.

#### Stance Check (`ma_stance`)
Camera angle: **Front view**

| Check | Landmarks | Good | Warn | Bad |
|-------|-----------|------|------|-----|
| **Feet width** | Ankle-to-ankle distance vs shoulder width | 0.8–1.2× shoulder width | 0.6–0.8× or 1.2–1.5× | <0.6× or >1.5× |
| **Weight balance** | Hip center relative to ankle midpoint | Centered (±5%) | Off-center 5–10% | Off-center >10% |
| **Knee bend** | Hip-Knee-Ankle angle | 155–175° (slight bend) | 175–180° (locked) or <150° (too deep) | Locked + leaning |
| **Shoulder level** | Left vs right shoulder Y | <2° tilt | 2–5° tilt | >5° tilt |
| **Guard height** | Wrist Y relative to shoulder Y | Wrists at or above chin (shoulder-nose midpoint) | Wrists between shoulder and chin | Wrists below shoulders |

**Tips generated:**
- "Feet too narrow — widen to shoulder width for stability"
- "Knees are locked — keep a slight bend for mobility"
- "Guard is low — bring your hands up to protect your chin"
- "Weight is shifting left — center your hips over your feet"

#### Guard Check (`ma_guard`)
Camera angle: **Front view**

| Check | Landmarks | Good | Warn | Bad |
|-------|-----------|------|------|-----|
| **Hand height** | Wrist Y vs nose Y | Both wrists at chin level (near nose Y) | One hand low | Both hands below chin |
| **Elbow tuck** | Elbow X vs torso edge (hip-shoulder line) | Elbows close to ribs | One elbow flaring | Both elbows flaring |
| **Chin tuck** | Nose Y relative to shoulder midpoint | Chin slightly down | Chin neutral | Chin up (exposed) |
| **Symmetry** | Left/right wrist position symmetry | Symmetric guard | Slight asymmetry | One hand completely dropped |

#### Punch Analysis (`ma_punch`)
Camera angle: **Side view** (to see extension path)

| Check | Landmarks | Good | Warn | Bad |
|-------|-----------|------|------|-----|
| **Extension line** | Shoulder-Elbow-Wrist alignment at full extension | Straight line (<10° deviation) | 10–20° deviation (looping) | >20° deviation (wild punch) |
| **Rear hand** | Non-punching wrist stays at chin height | Stays at chin | Drops to shoulder | Drops below shoulder |
| **Hip rotation** | Hip angle change during punch | >15° rotation (power generation) | 5–15° rotation | <5° (arm-punching) |
| **Return speed** | Time from extension to guard return | Fast snap-back (<0.3s) | Moderate (0.3–0.6s) | Slow/lingering (>0.6s) |
| **Shoulder protection** | Punching shoulder rises to cover chin | Shoulder up | Partial coverage | Chin exposed |

**Rep detection for punches:** Track wrist extension cycles (wrist moves forward past shoulder plane, returns). Each rep scored individually.

#### Kick Analysis (`ma_kick`)
Camera angle: **Front or 45° view**

| Check | Landmarks | Good | Warn | Bad |
|-------|-----------|------|------|-----|
| **Hip rotation** | Hip angle relative to camera at peak extension | >60° rotation (hip turned over) | 30–60° (partial turnover) | <30° (no hip rotation — slap kick) |
| **Standing foot pivot** | Standing ankle rotation during kick | Heel lifts/rotates toward target | Partial rotation | Flat-footed (no rotation) |
| **Chamber** | Knee-to-hip angle before extension | Knee clearly chambers (compact) | Partial chamber | No chamber (leg swings from ground) |
| **Guard maintenance** | Both wrists during kick | Hands stay at chin | One hand drops | Both hands drop |
| **Return to stance** | Post-kick body position | Returns to balanced stance | Stumbles slightly | Falls off balance |
| **Kick height** | Kicking ankle Y at peak | Consistent with target level | Inconsistent | Way off target |

#### Elbow Analysis (`ma_elbow`)
Camera angle: **Front view**

| Check | Landmarks | Good | Warn | Bad |
|-------|-----------|------|------|-----|
| **Range** | Distance traveled (short arc, close range) | Tight, compact motion | Slightly wide | Arm fully extended (not an elbow) |
| **Hip rotation** | Same as hook analysis | Full rotation | Partial | Arm only |
| **Guard** | Non-striking hand | At chin | Dropping | Completely down |

#### Knee Analysis (`ma_knee`)
Camera angle: **Side view**

| Check | Landmarks | Good | Warn | Bad |
|-------|-----------|------|------|-----|
| **Hip drive** | Hip-Knee angle at peak + hip thrust forward | Hip visibly drives forward | Partial hip drive | Just lifting the knee (no hip) |
| **Standing foot rise** | Standing ankle lifts onto ball of foot | Rises onto toes | Partial rise | Flat-footed |
| **Height** | Knee Y at peak relative to hip Y | Knee reaches above waist | Knee at waist | Knee below waist |
| **Guard** | Wrist positions during knee | Hands at chin or pulling down (clinch sim) | One hand drops | Both hands drop |

#### Form/Kata Analysis (`ma_form`)
Camera angle: **Front view**

For kata (Karate) and poomsae (TKD), the analysis is more about general body mechanics:

| Check | Landmarks | Good | Warn | Bad |
|-------|-----------|------|------|-----|
| **Balance** | Center of mass stability over time | Minimal sway | Moderate sway | Stumbling/stepping out |
| **Symmetry** | Left vs right side execution | Even on both sides | Slight favoring | Strong asymmetry |
| **Level changes** | Stance depth consistency | Consistent depth in stances | Varying depth | Standing too tall in stances |
| **Flow** | Smoothness of transitions (velocity variance) | Smooth, deliberate | Choppy with pauses | Jerky, rushed |

#### Implementation Notes

**What to add to `formAnalysis.ts`:**
```typescript
// New function: checkMaFormRealtime() 
// Called instead of checkFormRealtime() when exerciseType starts with "ma_"
// Uses same JointStatus map return type
// Same color-coded skeleton overlay — no UI changes needed

// New function: analyzeMaForm()
// Called instead of analyzeForm() for MA exercises
// Returns same FormAnalysisResult type but with MA-specific checks

// New addition to formGuides.ts:
// MA technique guides with camera angle + positioning
// e.g. { keywords: ["jab", "cross", "hook"], 
//        guide: { angle: "side", label: "Side View", 
//                 tip: "Place phone at chest height, 6 feet away" }}
```

**What to add to `FormCheckCamera.tsx`:**
- Accept optional `maExerciseType` prop (passed from lesson context)
- When set, skip auto-detection and use the specified MA analysis
- Show MA-specific tips overlay during recording (e.g. "Keep your guard up!")
- Post-recording results use MA terminology ("Guard: Good", "Hip rotation: Needs work")

**What to add to `formGuides.ts`:**
```typescript
// New MA exercise patterns
{ keywords: ["stance", "orthodox", "southpaw", "muay thai stance"],
  guide: { angle: "front", label: "Front View", 
           tip: "Stand facing the camera, full body in frame" }},
{ keywords: ["jab", "cross", "straight", "1-2"],
  guide: { angle: "side", label: "Side View", 
           tip: "Place phone at chest height to see punch path" }},
{ keywords: ["hook", "uppercut", "body hook"],
  guide: { angle: "angle45", label: "45° Angle", 
           tip: "Slight angle to see rotation and hook path" }},
{ keywords: ["roundhouse", "kick", "low kick", "teep"],
  guide: { angle: "front", label: "Front View", 
           tip: "Face camera to see hip rotation and kick height" }},
{ keywords: ["elbow", "horizontal elbow"],
  guide: { angle: "front", label: "Front View", 
           tip: "Face camera, step back so upper body fills frame" }},
{ keywords: ["knee", "straight knee"],
  guide: { angle: "side", label: "Side View", 
           tip: "Side view to see hip drive and knee height" }},
{ keywords: ["kata", "poomsae", "form", "taegeuk"],
  guide: { angle: "front", label: "Front View", 
           tip: "Step back — full body in frame for the entire form" }},
```

**DB change:**
```sql
ALTER TABLE ma_user_lessons
  ADD COLUMN IF NOT EXISTS form_check_score INTEGER CHECK (form_check_score BETWEEN 0 AND 100);
```

This stores the best form check score alongside the self-rating, giving users two metrics: subjective (how they felt) and objective (what the camera saw).

---

## 6. Technique Library (Encyclopedia)

Separate from lessons — a searchable reference for all techniques.

### 6.1 Technique Card Format

```
┌─────────────────────────────────┐
│ TECHNIQUE: Jab                  │
│                                 │
│ [Animated SVG diagram]          │
│ [Video player if video_url set] │
│                                 │
│ Category: Strikes > Punches     │
│ Difficulty: ⬤○○○○               │
│ Equipment: None                 │
│ Stance: Orthodox                │
│                                 │
│ STEP-BY-STEP:                   │
│ 1. From guard, extend lead fist │
│ 2. Rotate fist palm-down        │
│ 3. Push off ball of lead foot   │
│ 4. Exhale sharply — short 'tss' │
│ 5. Snap back same speed         │
│ 6. Keep rear hand at cheek      │
│                                 │
│ KEY POINTS:                     │
│ • Snap, not push                │
│ • Speed > power                 │
│ • Straight line — shortest path │
│                                 │
│ COMMON MISTAKES:                │
│ ✗ Dropping rear hand            │
│ ✗ Leaning forward               │
│ ✗ Flaring elbow out             │
│                                 │
│ COACHING CUES:                  │
│ 💡 "Flick a towel"              │
│ 💡 "Chin behind lead shoulder"  │
│                                 │
│ MUSCLES: shoulders, triceps,    │
│ core, calves                    │
│                                 │
│ RELATED: Cross, 1-2 Combo       │
│ TAUGHT IN: Lesson 2 — The Jab  │
│                                 │
│ MASTERY: ⬤ Learned              │
│ Practice count: 12/50           │
│ Avg rating: 3.8/5              │
└─────────────────────────────────┘
```

### 6.2 Visual Priority

Each technique card shows visuals in this priority:
1. **Video** (if `video_url` is set) — full demo
2. **Animation** (if `animation_key` is set) — animated SVG stick figure
3. **Step illustrations** — always present as static fallback

### 6.3 Filtering & Search

- By discipline (multi-select pills)
- By category / subcategory
- By difficulty tier
- By equipment needed (none / bag / pads / partner)
- By mastery status (unlearned / learned / practiced / mastered)
- Full-text search on name + description

---

## 7. Daily Practice Mode

After completing lessons, users need a way to **keep drilling** their learned techniques.

### 7.1 Quick Drill Generator

"Give me something to practice" — generates a focused drill from techniques the user has learned.

```
Input:  discipline, duration (5/10/15/20 min), focus (optional category)
Output: {
  warmup:     "2 min: stance switches, light bouncing, arm circles"
  rounds: [
    { technique: "Jab", reps: "3 x 30 seconds", rest: "15s" },
    { technique: "Cross", reps: "3 x 30 seconds", rest: "15s" },
    { technique: "Jab-Cross", reps: "3 x 45 seconds", rest: "20s" },
  ]
  cooldown:   "1 min: shake out, deep breathing, shoulder stretches"
  total_time: "~10 min"
}
```

Rules:
- Only includes techniques the user has completed in curriculum
- Mixes review (older techniques) with recent (last 1-2 lessons)
- Respects equipment filter
- Progressive: more advanced users get harder combos and higher intensity

### 7.2 Combo Builder

Users can chain techniques into named combos and save them.

### 7.3 Practice Session Logging

Logs to `ma_practice_logs`. Feeds into:
- Total practice hours per discipline
- Technique practice frequency (for mastery tracking)
- Streak tracking
- XP rewards

This is where existing session history ties in — old `ma_sessions` data still shows on the hub.

---

## 8. Progression & Gamification

### 8.1 Technique Mastery (5-tier)

| Tier | Requirement | Visual |
|------|-------------|--------|
| **Unlearned** | Haven't taken the lesson | Locked icon |
| **Learned** | Completed the lesson | Unlocked icon |
| **Drilled** | Practiced 10+ times | Bronze ring |
| **Proficient** | 25+ practices, 3.5+ avg rating | Silver ring |
| **Mastered** | 50+ practices, 4.0+ avg rating | Gold ring |

### 8.2 Discipline Progress

Per-discipline dashboard showing:
- Current level + lessons completed / total
- Total practice hours
- Techniques learned / total in discipline
- Current belt/rank
- Next milestone

### 8.3 XP & Celebrations

- Complete a lesson → XP (50 + duration_min × 3)
- Complete a level → belt/rank badge + bonus XP
- Daily practice → streak maintenance
- Cross-discipline milestones ("Cross-Trainer" for 2+ disciplines)

---

## 9. Page UI/UX Redesign

### 9.1 Hub View Polish

| Change | Description |
|--------|-------------|
| **Parallax discipline cards** | Background image scrolls slower than card content — creates depth |
| **Active discipline highlight** | In-progress lesson → animated border pulse + "Continue" badge instead of plain chevron |
| **Stats strip** | Replace 3 plain boxes with single horizontal strip: icon + number pairs separated by thin dividers |
| **Session history timeline** | Replace stacked list with horizontal scrollable timeline, date dots that expand on tap |
| **Streak flames** | If trained Boxing 3 days straight, show flame + "3-day streak" on the card. Grows with consecutive days |
| **Weekly training report card** | "This week: 3 Boxing, 1 Muay Thai. 8 unique techniques. Suggestion: revisit footwork" |
| **"Today's Training" card** | Top of hub: "Boxing Lesson 4: The Cross — 12 min" with one tap to start. Duolingo-style "here's your lesson" |

### 9.2 Discipline Path Redesign

| Change | Description |
|--------|-------------|
| **Full-bleed discipline header** | Gradient header bleeding to edges with discipline color. Large name, tagline, origin image faded behind |
| **Visual journey map** | Replace flat week-accordion with vertical path nodes (Duolingo-style). Completed = filled, current = pulsing/glowing, locked = dimmed. Connected by a trail |
| **"Next lesson" card** | Prominent card at top of Learn tab showing exactly what's next, one tap to start |
| **Lesson cards with left accent** | 3px left border in discipline color. Filled = completed, outlined = current, none = locked |
| **Week dividers as sticky headers** | Lay all lessons flat with week headers as sticky dividers. No accordions. Current week auto-scrolls into view |
| **Floating progress ring** | Small circular progress indicator fixed top-right showing overall discipline completion |
| **Swipe between disciplines** | Horizontal swipe on discipline path to jump Boxing → Muay Thai. Dot indicator shows current discipline |
| **Progress path background art** | Faded discipline-themed art behind path nodes: boxing ring for Boxing, Thai temple for Muay Thai, dojo for Karate |
| **Belt/rank progression UI** | Visual belt display instead of plain "Level 1". Boxing = glove colors, BJJ/Karate/TKD = real belts |

### 9.3 Lesson Experience Redesign

| Change | Description |
|--------|-------------|
| **Step-by-step guided flow** | Replace scroll view with full-screen cards that advance through stages: Intro → Visual → Key Points → Drill Timer → Common Mistakes → Form Check → Self-Check → Rate → Complete |
| **Progress bar** | Horizontal bar across top showing which step you're on |
| **Lesson intro cinematic** | 2-second full-screen title card: lesson name in large type, discipline color wash, technique count. Sets the mood |
| **"What you'll learn" preview** | Before starting: 3-item preview of techniques, drill, estimated time |
| **Full-width technique hero** | Technique fills entire width with colored gradient background. Name in display type |
| **Coaching cues as callout strips** | Horizontal strips with icon on left (eye = "watch for", hand = "focus on"). Scannable |
| **Step numbers as watermarks** | Step number rendered at 48px / 10% opacity behind step text. Visual anchoring |
| **Completion receipt** | Energy-receipt-style summary: XP earned, techniques learned, discipline progress, "6/14 techniques unlocked" with filled/empty dot grid |
| **Post-lesson insights** | "You've now learned 6/14 Boxing techniques" + mini technique grid |
| **Discipline-themed confetti** | Boxing gloves for Boxing, lotus petals for Karate, tiger stripes for Muay Thai |
| **Session timer** | Subtle timer in header showing elapsed time once lesson starts |
| **Auto-scroll during drills** | Auto-scroll to keep current step visible when drill timer is running |

### 9.4 Technique Library Redesign

| Change | Description |
|--------|-------------|
| **Grid view option** | 2-column grid with technique name + category badge + difficulty dot. Toggle between list/grid |
| **Category pills** | Horizontal scrollable pills: All / Strikes / Kicks / Defense / Footwork. One-tap filtering |
| **Technique cards with stance silhouettes** | Small silhouette showing correct stance (orthodox vs southpaw) on each card |
| **Technique mastery rings** | Circular progress ring per technique. Tap for "Jab: practiced 12 times, last drilled 2 days ago" |

### 9.5 Typography & Spacing

- **Bigger lesson titles** — 11px → 13px for scannability
- **More vertical breathing room** — +4-8px padding between lesson rows
- **Monospace labels consistency** — `text-[8px] font-mono tracking-widest` for ALL section labels (WEEK 1, PROGRESS, KEY POINTS, TIMELINE, etc.)

### 9.6 Color & Theming

- **Discipline color as full page accent** — inside Boxing, everything shifts to red (progress bars, active states, borders, accents). Muay Thai = gold. Already have `colorRgb`, apply it aggressively
- **Gradient backgrounds on key cards** — "next lesson" and drill cards get subtle gradient from discipline color at 5% opacity
- **Dark surface hierarchy** — 3 distinct levels: page bg, card bg (`fg-03`), elevated card bg (`fg-06`)
- **Glowing current lesson node** — neon-tinged accent border on current lesson in the journey map

### 9.7 Micro-interactions

- **Skeleton-to-content transitions** — shimmer morphs into real content with subtle scale-up
- **Parallax on discipline cards** — image layer moves slower than text layer on scroll
- **Pull-to-refresh animation** — discipline-themed: mini boxing glove / kick animation while refreshing

### 9.8 Navigation & Flow

- **Floating "Continue Training" pill** — persistent bottom pill across entire app showing current lesson. One tap to resume
- **Breadcrumb trail** — "Boxing → Week 2 → Lesson 5: The Hook" at top, each segment tappable

---

## 10. Training Intelligence

### 10.1 Adaptive Difficulty

- User rates lesson ≤ 2 → suggest a review session before advancing
- User rates 5/5 three times in a row → offer to skip ahead or unlock bonus content
- Track technique-level confidence, not just lesson completion

### 10.2 Training Calendar & Suggestions

- **Training calendar** — weekly view of what was trained, rest days marked
- **"Today's Focus"** — based on staleness: "Haven't practiced jab in 8 days → Refresh: Boxing Fundamentals"
- **Muscle recovery awareness** — tie into workout system. Heavy leg day → don't suggest kick-heavy Muay Thai lesson that evening

### 10.3 Combination Chains

- When jab + cross + hook are all learned → unlock "1-2-3 Combo Drill"
- Visual dependency graph showing how techniques build on each other
- Combo milestones as achievements

---

## 11. Content Depth

### 11.1 Warm-up & Cool-down Routines

Per-discipline warm-ups auto-prepended to lessons:
- **Boxing** — jump rope, shadow boxing, shoulder rolls
- **Muay Thai** — skip knee, hip circles, shadow kicks
- **BJJ** — hip escapes, bridges, shrimps
- **Karate** — stretching kata, joint rotations
- **TKD** — dynamic leg stretches, balance drills

### 11.2 Sparring/Partner Drill Library

- Clearly labeled "Partner Drills" section within technique library
- Solo-adapted alternatives shown alongside each partner drill
- Useful when user goes to a real gym

### 11.3 Daily Challenge

- "Today's challenge: 100 jabs in 3 minutes" with built-in timer
- Rotates daily across disciplines user is learning
- Celebration animation on completion, streak tracking

---

## 12. Social Proof & Motivation

### 12.1 Belt/Rank Progression UI

Visual belt display that changes as user progresses:
- **Boxing** — glove colors (white → red → blue → black → gold)
- **Muay Thai** — armband colors (white → yellow → green → blue → red)
- **BJJ** — real belt system (white → blue → purple → brown → black)
- **Karate** — kyu belt system (white → yellow → orange → green → blue → brown → black)
- **TKD** — kup system (white → yellow → green → blue → red → black)

### 12.2 Community Stats

- "347 people are learning Boxing right now"
- "You're in the top 20% of Muay Thai students"
- Approximated from user base, updated periodically

### 12.3 Sound Design & Haptics

- **Audio cues** (optional, toggle in settings):
  - Boxing bell for round start/end
  - Gong for lesson completion
  - Whoosh for technique transitions
- **Haptic feedback**: vibrate on drill timer intervals, completion, belt promotions

---

## 13. Accessibility & Comfort

- **Font size control** — A/A+ toggle for lesson content (technique descriptions can be dense)
- **Left-handed mode** — mirror technique descriptions and visuals for southpaw users. Stance data already in DB
- **Offline-first lessons** — cache current + next lesson for training without signal. PWA shell already exists, add lesson data caching

---

## 14. What Makes This Different From YouTube

| YouTube | SEVEL MA |
|---------|----------|
| Random videos, no order | Structured progression — can't skip ahead |
| No practice timer | Built-in drill timer IS your coach |
| No tracking | Mastery tracking — Learned → Mastered over weeks |
| No history | "47 sessions, 23 hours of boxing" |
| Passive watching | Active learning with self-checks + form check camera |
| No gamification | XP, belts, streaks, achievements, daily challenges |
| No visuals for every technique | Animated diagrams for every technique |
| No adaptive coaching | Suggests review when struggling, skips ahead when confident |
| No warm-up/cool-down | Auto-prepended discipline-specific routines |

---

## 15. Database Changes

### 15.1 Existing Tables (Keep As-Is)

All tables from `034_ma_curriculum.sql` are already created:
- `ma_curriculum_levels` — levels within a discipline
- `ma_lessons` — individual lessons
- `ma_lesson_techniques` — which techniques each lesson teaches
- `ma_user_lessons` — user progress through lessons
- `ma_practice_logs` — practice session logs
- `ma_combos` — user-saved combos

### 15.2 New Migration: Video & Animation Support

```sql
-- Add video and animation fields to ma_techniques
ALTER TABLE ma_techniques
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS animation_key TEXT;
```

### 15.3 Tables Kept for History

- `ma_sessions` — old session history. **Do NOT drop.** Still displayed on hub page.
- All old tables preserved — stop writing new data to them, but historical data remains visible.

---

## 16. Build Order

### Tier 1: Foundation + Page Redesign (Build First)

1. ✅ DB migration — curriculum tables created (`034_ma_curriculum.sql`)
2. ✅ Seed Boxing Foundations (11 lessons, 14 techniques)
3. ✅ Seed Muay Thai Foundations (11 lessons, 9 techniques)
4. ✅ Hub page with discipline cards + session history
5. ✅ Discipline path page with lesson list
6. ✅ Basic lesson view + completion
6b. ✅ Origins tab restored (Learn/Origins tab bar, timeline, philosophy, key figures, fun fact)
7. ✅ DB migration — add `video_url` + `animation_key` to `ma_techniques`, add `form_check_score` to `ma_user_lessons` (`035_ma_technique_enhancements.sql`)
8. ✅ Typography & spacing pass (bigger titles 22px, breathing room, monospace label consistency)
9. ✅ Discipline color as full page accent (colorRgb on progress border, lesson left-accent, filter pills, header bg tint)
10. ✅ Dark surface hierarchy (3-level depth: page bg → card bg → elevated card) + stats strip redesign + fix pre-existing divideColor bug

### Tier 2: Discipline Path Redesign

11. ✅ Full-bleed discipline header with gradient + origin image background
12. ✅ Visual journey map replacing week accordions (flat lessons with sticky week dividers)
13. ✅ "Next lesson" prominent card at top of Learn tab (UP NEXT with Play icon + XP/duration)
14. ✅ Lesson cards with left accent borders (filled/outlined/none)
15. ✅ Floating progress ring (SVG circle top-right of header, shows completion %)
16. ✅ Belt/rank progression UI (belt_name pill in header next to tagline)
17. ✅ Streak flames on discipline cards (hub view — flame badge with day count when 2+ consecutive days)
18. ✅ Active discipline highlight with discipline-color border + glow + "Continue" badge

### Tier 3: Lesson Experience Redesign

19. ✅ Step-by-step guided flow (Intro → Techniques → Drill → Mistakes → Self-Check → Rate → Complete)
20. ✅ Lesson progress bar across top (animated, discipline-colored)
21. ✅ Lesson intro cinematic (full-screen title card with discipline color wash + lesson number watermark)
22. ✅ "What you'll learn" preview before starting (numbered technique list with categories)
23. ✅ Full-width technique hero with gradient background (per-technique cards with category/difficulty badges)
24. ✅ Coaching cues as callout strips with Sparkles icons
25. ✅ Step numbers as large watermarks (technique steps, drill, mistakes, selfcheck all have watermarks)
26. ✅ Built-in drill timer with Start/Pause/Reset (live elapsed counter)
27. ✅ Session timer in header (elapsed time, stops on completion)
28. ✅ Auto-scroll during active drills
29. ✅ Completion receipt (XP earned, time, rating, techniques learned as pills, animated trophy)
30. ✅ Post-lesson insights (techniques learned section with discipline-colored pills)

### Tier 4: Form Check Integration

31. ✅ Add MA exercise types to `formAnalysis.ts` (stance, punch, kick, elbow, knee, form)
32. ✅ Add MA guides to `formGuides.ts` (camera angles per technique type)
33. ✅ Wire FormCheckCamera into lesson flow with `maExerciseType` prop
34. ✅ MA-specific real-time joint checks (`checkMaFormRealtime`)
35. ✅ MA-specific post-recording analysis (`analyzeMaForm`)

### Tier 5: Technique Visuals & Library

36. ✅ Build animated SVG technique diagram components (stick figures)
37. ✅ Build step-by-step illustration cards
38. ✅ Technique library grid view option (2-col grid + list toggle)
39. ✅ Category pills (scrollable horizontal filter)
40. ✅ Technique cards with stance silhouettes
41. ✅ Technique mastery rings (per-technique progress)

### Tier 6: Hub Intelligence & Navigation

42. ✅ "Today's Training" card on hub (one-tap to start next lesson)
43. ✅ Hub stats strip redesign (icon + number pairs) — done in Tier 2
44. ✅ Session history as horizontal timeline
45. ✅ Floating "Continue Training" pill (app-wide, persistent)
46. ✅ Breadcrumb trail navigation
47. ✅ Swipe between disciplines on path view
48. ✅ Parallax scroll on discipline cards
49. ✅ Skeleton-to-content transitions
50. ✅ Pull-to-refresh with discipline animation

### Tier 7: Training Intelligence

51. ✅ Adaptive difficulty (suggest review when ratings low, skip-ahead when high)
52. ✅ Training calendar (weekly view of sessions + rest days)
53. ✅ "Today's Focus" based on technique staleness
54. ✅ Muscle recovery awareness (tie into workout system)
55. ✅ Combination chains (unlock combos when prerequisites met)
56. ✅ Visual technique dependency graph

### Tier 8: Content Expansion

57. ✅ Warm-up & cool-down routines per discipline
58. ✅ Expand Boxing seed (12 Foundations + Beginner level = 24 lessons)
59. ✅ Expand Muay Thai seed (12 Foundations + Weapons Dev = 24 lessons)
60. ✅ Expand technique library (14+9 → 40+ Boxing, 30+ Muay Thai)
61. ✅ Daily challenge system (rotating challenges + timer + celebration)
62. ✅ Sparring/partner drill library
63. ✅ Guided onboarding flow (first-time discipline intro)

### Tier 9: More Disciplines + Practice

64. ✅ Seed Karate curriculum (3 belt levels, ~30 lessons, kata focus)
65. ✅ Seed Taekwondo curriculum (4 kup levels, ~35 lessons, poomsae focus)
66. ✅ Build Daily Practice mode (drill generator + combo builder)
67. ✅ Build practice timer UI
68. ✅ 5-tier mastery tracking
69. ✅ Form Check for kata/poomsae (balance + flow over longer recordings)

### Tier 10: Polish & Social

70. ✅ Sound design (boxing bell, gong, whoosh — optional toggle)
71. ✅ Haptic feedback (drill intervals, completion, belt promotions)
72. ✅ Community stats ("347 learning Boxing", "top 20% Muay Thai")
73. ✅ Font size control (A/A+ toggle for lesson content)
74. ✅ Left-handed mode (mirror for southpaw)
75. 🔲 Offline-first lesson caching
76. ✅ Seed BJJ curriculum (12 solo-adapted lessons, foundations level)
77. ✅ Seed MMA curriculum (36 lessons, rotating block model)
78. ✅ Intermediate levels for Boxing & Muay Thai (6 lessons each)
79. ✅ Cross-discipline achievements
80. ✅ Practice recommendations based on mastery gaps
81. 🔲 Video backfill (film + upload when ready)

### Tier 12: Stick Figure Animation System v2

**Coverage & Infrastructure**

82. ✅ Programmatic fallback animations — auto-generate a generic animation per technique category (strikes = arm extension, kicks = leg arc, defense = head shift, grappling = crouch) so every technique gets a figure instantly, even without hand-authored poses
83. ✅ Hand-refine core technique animations — manually author high-quality pose data for the ~20 most-used techniques (body shots, parry, uppercuts, switch kick, elbows, BJJ shrimp/bridge, etc.)
84. ✅ Build `<TechniqueChip>` component — reusable mini stick figure that appears anywhere a technique name is mentioned; tappable to expand to full animation. One component, wire everywhere.
85. ✅ Wire `<TechniqueChip>` into all views — lessons, practice mode, daily challenges, technique library, recovery warnings, mastery tracking
86. ✅ Show stick figures in Schedule during MA sessions — when a workout session is an MA lesson, display mini stick figures next to each technique in the session breakdown

**Visual Learning Upgrades**

87. ✅ Muscle heat overlay — highlight which muscles fire on each animation frame using `muscles_used` data; limbs glow with intensity based on engagement (e.g., legs glow red on kicks, shoulders on punches)
88. ✅ Power chain arrows — animated arrows showing force transfer path (feet → hips → shoulders → fist) to teach beginners that power comes from the ground, not the arm
89. ✅ Weight distribution indicators — shade/size the foot carrying more weight in each frame; critical for kicks, pivots, and stance shifts where balance is everything
90. ✅ Angle indicators — display joint angles on key frames (e.g., "90°" on the elbow during a hook, "45°" on diagonal elbow) to reinforce form cues visually
91. ✅ Common mistake poses — show a second "ghost" stick figure in red demonstrating the WRONG form next to the correct one ("This, not that"); driven by existing `common_mistakes` data

**Two-Figure Interactions**

92. ✅ Opponent figure — add a second stick figure showing the target/opponent; jab lands on opponent's face, check blocks incoming kick, clinch shows both figures
93. ✅ Counter visualization — "they throw X → you do Y" as a two-figure animated sequence; defense-counter pairs shown together
94. ✅ Range circles — show the effective distance of each technique as a subtle arc on the ground plane beneath the figure

**Playback & Practice Mode**

95. ✅ Combo animations — chain multiple techniques into one continuous animation (jab → cross → hook plays as a single fluid sequence instead of 3 separate cards)
96. ✅ Mirror mode for animations — flip the stick figure for southpaw view, synced with the existing left-handed mode toggle
97. ✅ Speed control — slow-mo / normal / fast playback for technique animations; slider or tap-to-cycle
98. ✅ Shadow-along metronome — the figure performs a combo on an adjustable BPM beat, user follows along in real time; visual coach calling combos
99. ✅ Breathing cues — inhale/exhale markers synced to animation frames; exhale on strike, inhale on return
100. ✅ Rep loop animation — the figure loops a technique continuously at chosen speed for drilling along; like a training partner who never gets tired
101. ✅ Trail lines on all techniques — show the path of fist/foot/elbow/knee through the motion arc (data field `trail` already exists, extend to all techniques)

**Progression & Gamification**

102. ✅ Figure evolution by mastery — at "unlearned" the figure is grey wireframe; gains discipline color at "learned", motion trails at "drilled", glow effect at "proficient", particle aura at "mastered"
103. ✅ Technique cards — each animated figure becomes a collectible card with stats (damage type, speed, difficulty, muscles); card-collection UI in the Library
104. ✅ Combo creator — drag techniques into a timeline, watch the figure chain them; save custom combos, name them, share them

**Practical Tools**

105. ✅ Printable technique sheets — export a technique's key frames as a static image strip (PNG/PDF); pin-on-the-wall format for training space
106. ✅ Bird's-eye footwork diagram — top-down view showing foot positions and movement paths; critical for pivots, angles, and stance switches that are hard to see from the front view

---

## 17. Non-Goals (for now)

- ~~Video content~~ → Animated SVG diagrams for MVP, video_url schema ready for later
- Real-time sparring tracking
- Weapon training
- Instructor/class integration
- Live sessions with other users
- AI opponent / shadow sparring game
