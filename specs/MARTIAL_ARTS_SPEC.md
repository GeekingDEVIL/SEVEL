# MARTIAL ARTS MODULE — Full Specification

> **Status:** Draft — pending approval before implementation  
> **Module key:** `martial_arts` (already registered in `modules.ts`, phase 3)  
> **Domain:** train  
> **Color:** `239 68 68` (red-500)  
> **Icon:** Swords

---

## 1. Vision

A discipline-agnostic martial arts training system that gives every fighter — from a Day-1 Boxing student to a seasoned BJJ black belt — a gold-standard logging, learning, and progression experience. The module treats martial arts as a **first-class training domain** alongside gym workouts, with its own session structure, its own metrics, and its own XP economy, while sharing a unified schedule, character system, and streak engine with the rest of Sevel.

---

## 1.1 Competitive Landscape & Differentiators

### What exists today (researched Sep 2026)

| App | Focus | Strengths | Weaknesses |
|---|---|---|---|
| **FightCamp** | Boxing/MMA | Punch tracking (1,200 data pts/sec), live round metrics, HR zones, leaderboards | Requires $149+ hardware sensors; Boxing-only punch detection; no technique library |
| **MatTime** | BJJ | 10,000-hour mastery visualization, belt progression tracking, multi-gym support | BJJ-only; no striking disciplines; no form analysis |
| **MMA AI: Cage Coach** | MMA | AI video feedback on uploaded footage, guided plans, nutrition + logging combined | MMA-only; no real-time form check; no RPG/gamification |
| **PunchLab** | Boxing | Free app, guided workouts by coaches, belt tracking | Boxing-only; basic stats |
| **Shadow Boxing App** | Boxing | Free timer, graphs, streaks | Timer-only; no technique tracking |
| **BJJ Notes / FlowRoll** | BJJ | Voice-note logging, AI technique linking, session journaling | BJJ-only; no cross-discipline; no gamification |
| **CloudFit** | Gym display | Round timers, technique demos, digital whiteboards for classes | Gym-management tool, not personal training app |

### What NO app does — our 10 differentiators

1. **Multi-discipline** — 16 martial arts under one roof, not siloed apps per style
2. **Round-based logging + technique tracking** — rounds, combos, quality ratings, not just a timer
3. **AI form check camera** — MediaPipe pose analysis, zero hardware cost (vs FightCamp's $149 sensors)
4. **RPG character system** — Fight domain → Pugilist/Vanguard/Constrictor/Bladestorm specializations
5. **XP/leveling/achievements** — martial arts sessions earn XP, unlock achievements, contribute to rank
6. **Unified schedule** — gym + martial arts + future running/yoga on one calendar
7. **10K-hour mastery tracking** — per discipline, inspired by MatTime but across all 16 arts
8. **Technique mastery progression** — 6 levels (Unknown → Expert) with form check + sparring gates
9. **Origin stories** — visual card-based narratives with discipline-specific imagery per martial art
10. **Sparring journal** — partner tracking, intensity logging, what-worked/what-failed notes

### Design language (from Dribbble/Behance research)

Top-rated martial arts app UIs consistently use:
- **Dark UI with red/orange accents** — matches our MA module color `239 68 68`
- **Big circular round timer** as the central hero element during active sessions
- **Per-round stats cards** — output, intensity, techniques practiced, stacked vertically
- **Schedule + stats combined views** — upcoming sessions alongside recent performance
- **Full-bleed discipline imagery** with gradient overlays on cards and heroes
- **Minimal chrome during session** — timer dominates, controls are thumb-reachable at bottom

---

## 2. Supported Disciplines (Phase 1 → Phase 2)

### Phase 1 — Core 6
| Discipline | Approx. Techniques | Forms/Kata | Character Spec |
|---|---|---|---|
| Boxing | 50-70 | — | Pugilist |
| Muay Thai | 80-120 | — | Vanguard |
| BJJ | 150-300+ | — | Constrictor |
| Karate | 80-120 | 26 (Shotokan) | Bladestorm |
| Taekwondo | 70-100 | 17 (WTF Poomsae) | Bladestorm |
| MMA | 200+ (aggregate) | — | Vanguard |

### Phase 2 — Expansion
| Discipline | Approx. Techniques | Forms/Kata |
|---|---|---|
| Judo | 100-120 | 8 Kodokan kata |
| Wrestling | 80-120 | — |
| Krav Maga | 100-150 | — |
| Wing Chun | 50-80 | 6 forms |
| Capoeira | 60-90 | — (improvised jogo) |
| Kung Fu / Wushu | 200-500+ | 50-200+ taolu |
| Aikido | 80-120 | 10-15 paired kata |
| Kendo | 40-60 | 10 kata |
| Kalaripayattu | 80-150 | 8-12 meippayattu |
| Silat | 100-200 | 10-30+ jurus |

**Total scope:** ~16 disciplines, ~2,000+ techniques across all.

**Data source:** Fight Encyclopedia open-source dataset (2,057 techniques, 183 martial arts) as seed, curated per discipline.

---

## 3. Origin Stories & Discipline Encyclopedia

Each discipline gets an **origin story page** — a scrollable card-based visual narrative:

### Content per discipline
1. **Hero image** — full-bleed photo (open-source: Unsplash, Pixabay, Wikimedia Commons CC0)
2. **Origin card** — founding location, year, founder/lineage (2-3 sentences)
3. **Philosophy card** — core principles, what makes it unique
4. **Key moments timeline** — 3-5 milestone events (Olympic inclusion, legendary fights, etc.)
5. **Belt/rank system** — if applicable (BJJ belts, Karate dans, TKD belts, etc.)
6. **"Why train this?"** — benefits, body areas targeted, who it suits

### Image sourcing
- **Primary:** Unsplash API (high-quality, free, attribution-free)
- **Secondary:** Pixabay, Rawpixel CC0, Wikimedia Commons
- **Requirement:** Each image must be a perfect contextual match — no generic "person punching" for Kalaripayattu. Each discipline needs discipline-specific imagery.
- **Storage:** Images stored as static assets in the app bundle or served from Supabase Storage bucket.
- **Fallback:** Discipline icon + gradient background if no suitable image found.

---

## 4. Unified Schedule System

### Current state
- `recurring_plans` table: weekday → template_id (gym only)
- `scheduled_days` table: date-specific overrides
- Schedule page: week view with day tiles showing gym templates

### Unified design — `session_type` column

Add a `session_type` column to unify all training types under one schedule:

```
recurring_plans
  + session_type TEXT NOT NULL DEFAULT 'gym'  -- 'gym' | 'martial_arts' | 'running' | ...
  + ma_discipline TEXT                        -- only when session_type = 'martial_arts'
  + ma_session_template_id UUID               -- FK to ma_session_templates (nullable)

scheduled_days
  + session_type TEXT NOT NULL DEFAULT 'gym'
  + ma_discipline TEXT
  + ma_session_template_id UUID
```

### How it works

The schedule page shows **one unified week view**. Each day tile shows:
- **Gym days:** Template name + muscle groups (existing behavior, unchanged)
- **Martial arts days:** Discipline icon + session type (e.g. "Boxing — Pad Work")  
- **Rest days:** Moon icon (existing behavior, unchanged)
- **Future:** Running, Yoga, Calisthenics follow the same pattern

Users tap a day → choose training type → configure:
- Gym: pick template (existing flow)
- Martial Arts: pick discipline → pick session type (technique drill, sparring, pad work, mixed)

### Navigation
- Bottom nav: **Train** tab → swipe between WORKOUT / MARTIAL ARTS (existing pill system)
- Schedule lives in its own tab (existing), shows all training types unified
- The pill at `/martial-arts` goes to the MA hub (discipline browser + recent sessions + quick start)

---

## 5. Session Logging — Round-Based System

Martial arts sessions are fundamentally different from gym workouts. No sets × reps × weight. Instead: **rounds × duration × techniques × intensity**.

### Session structure (5 phases)

```
┌─────────────────────────────────────┐
│  1. WARMUP        (5-15 min)        │
│     → duration + type selector      │
├─────────────────────────────────────┤
│  2. TECHNIQUE DRILLS (15-30 min)    │
│     → per technique: name, reps     │
│       or duration, quality rating   │
├─────────────────────────────────────┤
│  3. PAD/BAG WORK   (10-20 min)     │
│     → rounds (3-5 min each)        │
│     → rest between rounds          │
│     → combo sequences practiced    │
├─────────────────────────────────────┤
│  4. SPARRING       (10-20 min)     │
│     → rounds with duration         │
│     → partner name (optional)      │
│     → intensity: light/med/hard    │
│     → notes: what worked/failed    │
├─────────────────────────────────────┤
│  5. COOLDOWN       (5-10 min)      │
│     → duration + type              │
└─────────────────────────────────────┘
```

### Database tables

```sql
-- Master session table (extends workout_sessions concept)
CREATE TABLE ma_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,          -- 'boxing', 'muay_thai', 'bjj', etc.
  session_type TEXT NOT NULL,        -- 'technique', 'sparring', 'pad_work', 'mixed', 'kata'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_rounds INTEGER DEFAULT 0,
  intensity TEXT DEFAULT 'medium',   -- 'light' | 'medium' | 'hard'
  energy_rating INTEGER,             -- 1-5 post-session
  notes TEXT,
  xp_earned INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual rounds within a session
CREATE TABLE ma_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ma_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_index INTEGER NOT NULL,
  round_type TEXT NOT NULL,          -- 'warmup' | 'technique' | 'pad_work' | 'sparring' | 'cooldown'
  duration_seconds INTEGER,
  rest_seconds INTEGER,
  intensity TEXT,                    -- per-round override
  partner_name TEXT,                 -- sparring only
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Techniques practiced in a round
CREATE TABLE ma_round_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES ma_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES ma_techniques(id),
  reps INTEGER,                      -- if counted (e.g., 50 jabs)
  duration_seconds INTEGER,          -- if timed (e.g., 3 min clinch work)
  quality_rating INTEGER,            -- 1-5 self-assessment
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Technique library (seeded from Fight Encyclopedia)
CREATE TABLE ma_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline TEXT NOT NULL,
  category TEXT NOT NULL,            -- 'punch', 'kick', 'elbow', 'knee', 'submission', 'sweep', 'throw', 'block', 'stance', 'combo'
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'beginner', -- 'beginner' | 'intermediate' | 'advanced'
  belt_level TEXT,                   -- for belt-graded systems
  image_url TEXT,
  video_url TEXT,                    -- future: technique demo clips
  key_points TEXT[],                 -- ["Keep chin tucked", "Rotate hips"]
  common_mistakes TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Forms / Kata tracking
CREATE TABLE ma_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline TEXT NOT NULL,
  name TEXT NOT NULL,                -- "Heian Shodan", "Taegeuk Il Jang"
  description TEXT,
  belt_level TEXT,
  move_count INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ma_form_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ma_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES ma_forms(id),
  repetitions INTEGER DEFAULT 1,
  quality_rating INTEGER,            -- 1-5
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session templates (like gym workout templates)
CREATE TABLE ma_session_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  name TEXT NOT NULL,                -- "Boxing Fundamentals", "BJJ Open Mat"
  session_type TEXT NOT NULL,
  round_count INTEGER DEFAULT 5,
  round_duration_seconds INTEGER DEFAULT 180,
  rest_duration_seconds INTEGER DEFAULT 60,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Logging UI flow

1. **Quick Start:** Tap discipline card → auto-starts timer → log as you go
2. **Template Start:** Pick a saved session template → guided round-by-round flow
3. **During session (dark UI, red accents):**
   - **Big circular round timer** — center screen hero element (counts up or down)
   - **Round indicator pills** — `R1 R2 R3 R4 R5` across top, active round highlighted
   - **Live round stats** — technique count, intensity indicator (like FightCamp's live metrics but without sensors)
   - **Rest timer** — auto-starts between rounds, configurable duration, red progress ring
   - **Technique checklist** — tap to log, long-press for reps/quality, swipe to remove
   - **Sparring mode** — partner name chip, intensity slider (light/med/hard), notes field
   - **Form Check button** — launches camera overlay for current technique (reuses FormCheckCamera)
   - **Minimal chrome** — controls are thumb-reachable at bottom, timer dominates
4. **Session complete — Energy Receipt:**
   - Session summary card (total time, rounds, techniques practiced)
   - Per-round breakdown (expandable: what you did in each round)
   - XP breakdown with Fight domain contribution
   - Technique mastery progress bars (which techniques leveled up)
   - **10K-hour progress ring** — how much closer to mastery in this discipline
   - Streak indicator + next session suggestion
   - Share card (for social/story sharing — future)

---

## 6. Form Check Camera Integration

The existing `FormCheckCamera` component uses MediaPipe Pose Landmarks and can be extended for martial arts:

### Supported checks by discipline

| Discipline | Form Checks |
|---|---|
| Boxing | Stance width, guard height, hip rotation on cross, chin tuck |
| Muay Thai | Kick chamber height, elbow angle on strikes, knee drive |
| Karate | Kata stances (front stance depth, back stance weight), chamber hand position |
| BJJ | Posture in guard (back angle), base width when standing |
| Taekwondo | Kick height, supporting foot pivot, chamber position |

### Implementation approach
- Reuse `FormCheckCamera.tsx`, `formAnalysis.ts`, `formGuides.ts`
- Add new entries to `EXERCISE_PATTERNS` in `formGuides.ts` for MA techniques
- Add MA-specific analysis functions in a new `maFormAnalysis.ts` (same landmark-based approach)
- Camera angle guidance per technique type (side view for kicks, front view for punches)
- New `SILHOUETTE_PATHS` for MA stances (fighting stance, kick position, guard)

### Example guide entries
```typescript
{ keywords: ["jab", "cross", "hook", "uppercut", "punch"],
  guide: { angle: "front", label: "Front View", tip: "Stand 6-8 feet away, full body in frame" } },
{ keywords: ["roundhouse", "front kick", "teep", "push kick"],
  guide: { angle: "side", label: "Side View", tip: "Phone at hip height to see full kick arc" } },
{ keywords: ["kata", "poomsae", "form"],
  guide: { angle: "front", label: "Front View", tip: "Full body visible, 8-10 feet away" } },
```

---

## 7. XP & Character Integration

### XP formula for MA sessions

```
Base XP:
  Technique round:  15 XP per round
  Pad/Bag round:    20 XP per round
  Sparring round:   30 XP per round (highest risk/effort)
  Kata/Form:        25 XP per completion

Multipliers:
  Intensity (hard):    ×1.3
  Duration > 60min:    ×1.2
  Streak bonus:        ×1.1 (3+ consecutive MA sessions)
  New technique:       +10 XP per first-time technique logged

Daily cap: 300 XP (same as gym)
```

### Fight domain stats (from CHARACTER_SYSTEM_SPEC.md)
- **Session frequency** → contributes to Fight domain score
- **Technique diversity** → number of unique techniques logged
- **Sparring logs** → frequency and intensity
- **Combo completion** → practicing multi-hit sequences
- **Form/kata mastery** → completion and quality ratings

### Specialization triggers
| Focus | Specialization | Trigger |
|---|---|---|
| 70%+ Boxing sessions | Pugilist | Replaces Striker |
| 70%+ Kickboxing/MMA sessions | Vanguard | Replaces Striker |
| 70%+ BJJ/Grappling sessions | Constrictor | Replaces Striker |
| 70%+ Karate/TKD sessions | Bladestorm | Replaces Striker |

---

## 8. Technique Mastery System

Each technique has a **mastery level** per user:

```
Level 0: Unknown    — never logged
Level 1: Exposed    — logged 1-5 times
Level 2: Practiced  — logged 6-20 times + avg quality ≥ 3
Level 3: Proficient — logged 21-50 times + avg quality ≥ 4
Level 4: Mastered   — logged 50+ times + avg quality ≥ 4.5 + form check passed
Level 5: Expert     — logged 100+ times + avg quality ≥ 4.5 + used in sparring
```

```sql
CREATE TABLE ma_technique_mastery (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES ma_techniques(id),
  times_practiced INTEGER NOT NULL DEFAULT 0,
  avg_quality NUMERIC DEFAULT 0,
  mastery_level INTEGER NOT NULL DEFAULT 0,
  form_check_passed BOOLEAN DEFAULT false,
  used_in_sparring BOOLEAN DEFAULT false,
  last_practiced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, technique_id)
);
```

### Mastery UI
- Technique browser shows mastery dots (0-5 filled circles)
- Progress bar to next mastery level
- "Master all basics" quest integration (daily quests module)

---

## 8.1 10,000-Hour Mastery Journey

Inspired by MatTime's standout feature — track hours toward mastery per discipline. But we go further: tie it into our RPG system.

### How it works

```sql
-- Per-discipline hour tracking (derived from ma_sessions)
CREATE TABLE ma_discipline_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  total_hours NUMERIC NOT NULL DEFAULT 0,      -- accumulated from session durations
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_techniques_learned INTEGER DEFAULT 0,  -- unique techniques with mastery ≥ 2
  total_sparring_rounds INTEGER DEFAULT 0,
  belt_rank TEXT,                               -- current belt/rank (discipline-specific)
  belt_earned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, discipline)
);
```

### Milestones (gamified)

| Hours | Milestone | RPG Reward |
|---|---|---|
| 10 | First Steps | Achievement unlock + 50 XP |
| 50 | Dedicated Student | Title unlock: "[Discipline] Student" |
| 100 | Committed Practitioner | Specialization eligible (Pugilist, etc.) |
| 250 | Seasoned Fighter | Achievement + cosmetic unlock |
| 500 | Half-Way Warrior | Title unlock: "[Discipline] Warrior" |
| 1,000 | Thousand-Hour Club | Rare achievement + profile badge |
| 2,500 | Living Encyclopedia | Title unlock: "[Discipline] Scholar" |
| 5,000 | Master's Path | Legendary achievement |
| 10,000 | Grand Master | Ultimate title + unique cosmetic + hall of fame |

### UI — Discipline Progress Card

```
┌──────────────────────────────────┐
│  BOXING                    🥊    │
│                                  │
│     ╭─────────────────╮          │
│     │    127.5 hrs     │          │
│     │   ───────────    │          │
│     │   10,000 goal    │          │
│     ╰─────────────────╯          │
│                                  │
│  ████████░░░░░░░░░░  1.3%       │
│                                  │
│  Next: 250 hrs — Seasoned Fighter│
│  42 sessions · 18 techniques     │
│  Belt: Blue                      │
└──────────────────────────────────┘
```

The progress ring uses the discipline's accent color. Shows total hours as a large number, progress bar to next milestone, and key stats underneath.

---

## 8.2 Belt / Rank Progression

For disciplines with formal belt systems, track the user's current rank:

### Supported belt systems

| Discipline | System | Ranks |
|---|---|---|
| BJJ | Belt + stripes | White (4 stripes) → Blue → Purple → Brown → Black |
| Karate | Kyu/Dan | 10th Kyu → 1st Kyu → 1st Dan → 10th Dan |
| Taekwondo | Geup/Dan | 10th Geup → 1st Geup → 1st Dan → 9th Dan |
| Judo | Kyu/Dan | 6th Kyu → 1st Kyu → 1st Dan → 10th Dan |
| Kendo | Kyu/Dan | 6th Kyu → 1st Kyu → 1st Dan → 8th Dan |

### How it works
- User sets their current belt rank in discipline settings (self-reported)
- Belt is displayed on discipline cards, profile, and character sheet
- Belt progression milestones trigger achievements
- Belt color is used as accent on the discipline's UI elements
- No auto-promotion — the user updates when their real instructor promotes them

---

## 9. UI / Navigation

### MA Hub page (`/martial-arts`)

```
┌──────────────────────────────────┐
│  MARTIAL ARTS                    │
│  ┌────────┐ ┌────────┐ ┌──────┐ │
│  │ Boxing │ │Muay Thai│ │ BJJ  │ │
│  │  🥊    │ │  🦵    │ │  🥋  │ │
│  └────────┘ └────────┘ └──────┘ │
│  ┌────────┐ ┌────────┐ ┌──────┐ │
│  │ Karate │ │  TKD   │ │ MMA  │ │
│  │  🥋    │ │  🦶    │ │  ⚔️  │ │
│  └────────┘ └────────┘ └──────┘ │
│                                  │
│  ── RECENT SESSIONS ──          │
│  ┌──────────────────────────┐   │
│  │ Boxing — Pad Work         │   │
│  │ 45 min · 8 rounds · 120XP│   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ BJJ — Open Mat            │   │
│  │ 60 min · 5 rolls · 150XP │   │
│  └──────────────────────────┘   │
│                                  │
│  ── QUICK START ──              │
│  [ Start Free Session ]          │
│  [ Browse Templates ]            │
└──────────────────────────────────┘
```

### Discipline detail page (`/martial-arts/[discipline]`)
1. Origin story hero card
2. Technique browser (filterable by category)
3. Form/Kata list (if applicable)
4. Your mastery progress
5. Session history for this discipline
6. Start session button

### Active session page
- Reuses the full-screen session pattern from gym workouts
- Round timer replaces set tracker
- Technique checklist replaces exercise list
- Same rest timer, same energy receipt at completion

---

## 10. Implementation Phases

### Phase 1 — Foundation (this build)
1. DB migration: `ma_sessions`, `ma_rounds`, `ma_round_techniques`, `ma_techniques`, `ma_forms`, `ma_form_logs`, `ma_session_templates`, `ma_technique_mastery`, `ma_discipline_progress`
2. Schedule integration: `session_type` column on `recurring_plans` and `scheduled_days`
3. Seed technique library (Phase 1 Core 6 disciplines)
4. MA Hub page with discipline cards (dark UI, red accents, full-bleed imagery)
5. Discipline detail page with origin story + technique browser
6. Session logging flow (big circular round timer + round indicator pills + technique checklist)
7. Energy receipt for MA sessions (per-round breakdown + 10K-hour progress ring)
8. XP integration (ma_sessions contribute to Fight domain)
9. Streak integration (MA sessions count as completed training days)
10. 10K-hour mastery tracking per discipline
11. Belt/rank self-reporting for graded disciplines

### Phase 2 — Polish
1. Form Check Camera integration for MA techniques (extend `formGuides.ts` + new `maFormAnalysis.ts`)
2. Technique mastery system + progress UI (6 levels with form check + sparring gates)
3. Session templates (save/reuse favorite session structures)
4. Sparring journal with partner tracking + intensity + notes
5. Combo builder (create custom multi-technique sequences)
6. Live round stats overlay during session (technique count, intensity meter)
7. 10K-hour milestone achievements + title unlocks

### Phase 3 — Expansion
1. Add remaining 10 disciplines (Judo → Silat)
2. Form/Kata video guides
3. MA-specific achievements (per discipline + cross-discipline)
4. MA leaderboard (technique mastery rankings + 10K-hour rankings)
5. Per-round stats comparison (this session vs your average)

---

## 11. Data Model Diagram

```
recurring_plans ──(session_type)──┐
                                   │
scheduled_days ──(session_type)───┤
                                   │
                      ┌────────────┘
                      ▼
              ┌─────────────┐
              │ ma_sessions  │
              └──────┬──────┘
                     │ 1:N
              ┌──────┴──────┐
              │  ma_rounds   │
              └──────┬──────┘
                     │ 1:N
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐    ┌──────────────┐
│ma_round_techniques│    │ ma_form_logs  │
└────────┬─────────┘    └──────┬───────┘
         │ N:1                  │ N:1
    ┌────┴─────┐          ┌────┴────┐
    │ma_techniques│        │ma_forms  │
    └──────────┘          └─────────┘

    ┌──────────────────────┐
    │ ma_technique_mastery  │ (user × technique)
    └──────────────────────┘
    
    ┌──────────────────────┐
    │ ma_session_templates  │ (user-created)
    └──────────────────────┘
```

---

## 12. Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Separate `ma_sessions` vs extend `workout_sessions` | **Separate table** | Session structure is fundamentally different (rounds vs sets). Avoids polluting gym queries with nullable MA columns. |
| Discipline-specific vs generic techniques | **Generic table with discipline column** | One `ma_techniques` table with `discipline` filter. Avoids 16 technique tables. |
| Schedule integration | **Column on existing tables** | Adding `session_type` to `recurring_plans` is minimal, non-breaking, and keeps one schedule view. |
| Round timer vs set tracker | **Separate UI component** | Gym's `useWorkoutSession` is too gym-specific to extend. New `useMaSession` hook with round-based state. |
| Image storage | **Static assets + Supabase Storage** | Open-source images curated via Unsplash connector at build time. User form check videos go to Supabase Storage. |
| 10K-hour tracking | **Derived + cached** | `ma_discipline_progress` is updated on session complete (like `user_stats`). Avoids expensive aggregation queries. |
| Belt tracking | **Self-reported** | No auto-promotion — the user updates when their instructor promotes them. Avoids gamifying something that should be earned on the mat. |
| Dark UI for sessions | **Discipline-specific** | MA sessions use dark mode with red accents (research-backed — all top MA apps use dark UI). Gym stays as-is. |
| Form check approach | **Camera only, no sensors** | FightCamp needs $149 hardware. We use MediaPipe landmarks at zero cost — the phone IS the sensor. |

---

## 13. Non-Breaking Guarantees

Per the hard-line rule: **UI can change but functionality must not break.**

- `workout_sessions` table: **untouched**
- `exercise_set_logs` table: **untouched**
- `recurring_plans` table: new column with `DEFAULT 'gym'` — all existing rows remain gym sessions
- `scheduled_days` table: new column with `DEFAULT 'gym'` — all existing rows remain gym sessions
- Schedule page: gym view is the default, MA days appear only when scheduled
- Streak engine: MA sessions count as training days (additive, never removes gym credit)
- XP engine: MA XP adds to total (additive, never modifies gym XP calculation)
- Hub page: MA card appears only when module is enabled (existing module gate system)

---

## 14. Why This Beats Everything (Competitive Summary)

| Feature | FightCamp | MatTime | MMA AI | Sevel |
|---|---|---|---|---|
| Disciplines supported | 1 (Boxing) | 1 (BJJ) | 1 (MMA) | **16** |
| Session logging | Punch count only | Time only | Video review | **Rounds + techniques + quality** |
| Form analysis | $149 sensors | None | Upload video | **Real-time camera (free)** |
| Technique mastery | None | None | None | **6-level progression system** |
| 10K-hour tracking | None | ✓ (BJJ only) | None | **All 16 disciplines** |
| Belt/rank tracking | None | ✓ (BJJ only) | None | **5 belt systems** |
| RPG/gamification | None | None | None | **Full character system + XP + specializations** |
| Unified schedule | None | None | None | **Gym + MA + future modules** |
| Achievements | None | None | None | **Per-discipline + cross-discipline** |
| Sparring journal | None | Basic | None | **Partner + intensity + notes** |
| Origin stories | None | None | None | **Visual card-based narratives** |
| Price | $149+ hardware + $40/mo | Free / $5/mo | Freemium | **Free** |

**Bottom line:** No single app combines multi-discipline coverage, round-based logging with technique tracking, AI form analysis, RPG gamification, and unified scheduling. Sevel does all of it with zero hardware cost.
