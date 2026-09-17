# MARTIAL ARTS MODULE — Full Specification

> **Status:** Phase 1 — P0 complete, P1 partially built  
> **Module key:** `martial_arts` (already registered in `modules.ts`, phase 3)  
> **Domain:** train  
> **Color:** `239 68 68` (red-500)  
> **Icon:** Swords  
> **Budget:** $0 target — free tools & open-source only. Hard cap $20 one-time if no free alternative exists.

---

# PRIORITY MAP

Every feature is tagged **P0 → P3**. Build in order — never jump ahead.

| Tier | Meaning | When |
|------|---------|------|
| **P0** | MVP — app is incomplete without it | Phase 1 build |
| **P1** | Core experience — makes it feel like a real product | Phase 1 polish |
| **P2** | Differentiator — what makes us better than every competitor | Phase 2 |
| **P3** | Gold standard — things no one else has done | Phase 3+ |

---

# TABLE OF CONTENTS

1. [Vision & Competitive Landscape](#1-vision--competitive-landscape)
2. [Supported Disciplines](#2-supported-disciplines)
3. [P0 — Database Schema](#3-p0--database-schema)
4. [P0 — Session Logging (Round-Based)](#4-p0--session-logging-round-based)
5. [P0 — Technique Library & Seed Data](#5-p0--technique-library--seed-data)
6. [P0 — MA Hub Page & Navigation](#6-p0--ma-hub-page--navigation)
7. [P0 — Unified Schedule Integration](#7-p0--unified-schedule-integration)
8. [P0 — XP & Streak Integration](#8-p0--xp--streak-integration)
9. [P0 — Round Timer System](#9-p0--round-timer-system)
10. [P1 — Session Templates](#10-p1--session-templates)
11. [P1 — Technique Mastery System (6-Level)](#11-p1--technique-mastery-system-6-level)
12. [P1 — 10K-Hour Mastery Journey](#12-p1--10k-hour-mastery-journey)
13. [P1 — Belt / Rank Progression](#13-p1--belt--rank-progression)
14. [P1 — Progressive Disclosure](#14-p1--progressive-disclosure)
15. [P1 — Discipline Detail Pages & Origin Stories](#15-p1--discipline-detail-pages--origin-stories)
16. [P1 — Hub Dashboard Card](#16-p1--hub-dashboard-card)
17. [P1 — Warm-Up & Cool-Down Routines](#17-p1--warm-up--cool-down-routines)
18. [P2 — Style DNA](#18-p2--style-dna)
19. [P2 — Sparring Journal & Partner Log](#19-p2--sparring-journal--partner-log)
20. [P2 — Combo Builder](#20-p2--combo-builder)
21. [P2 — Move Tree (Technique Skill Tree)](#21-p2--move-tree-technique-skill-tree)
22. [P2 — Training Balance & Fatigue Crossover](#22-p2--training-balance--fatigue-crossover)
23. [P2 — Data Insights & Heatmaps](#23-p2--data-insights--heatmaps)
24. [P2 — MA-Specific Achievements](#24-p2--ma-specific-achievements)
25. [P2 — Streak Variants](#25-p2--streak-variants)
26. [P2 — Video Reference Slots](#26-p2--video-reference-slots)
27. [P2 — Form Check Camera](#27-p2--form-check-camera)
28. [P3 — Readiness Score & Recovery](#28-p3--readiness-score--recovery)
29. [P3 — Training Periodization & Fight Camp](#29-p3--training-periodization--fight-camp)
30. [P3 — Audio Coaching Cues](#30-p3--audio-coaching-cues)
31. [P3 — Punch/Kick Counter (Accelerometer)](#31-p3--punchkick-counter-accelerometer)
32. [P3 — Reflex & Reaction Training](#32-p3--reflex--reaction-training)
33. [P3 — Training Load Monitoring (ACWR)](#33-p3--training-load-monitoring-acwr)
34. [P3 — Mental Training & Visualization](#34-p3--mental-training--visualization)
35. [P3 — Gym / Dojo Profiles](#35-p3--gym--dojo-profiles)
36. [P3 — Technique of the Week](#36-p3--technique-of-the-week)
37. [P3 — Competition Management](#37-p3--competition-management)
38. [P3 — Social & Sharing](#38-p3--social--sharing)
39. [P3 — Phase 2 Disciplines (Expansion)](#39-p3--phase-2-disciplines-expansion)
40. [Non-Breaking Guarantees](#40-non-breaking-guarantees)
41. [Key Decisions](#41-key-decisions)
42. [Data Model Diagram](#42-data-model-diagram)
43. [Design Language](#43-design-language)
44. [Competitive Summary](#44-competitive-summary)
45. [Free Tools & Resources](#45-free-tools--resources)

---

## Build Status (as of Sep 2026)

### Completed (Live)

| Feature | Files | Notes |
|---|---|---|
| **Database schema** | `supabase/migrations/029_martial_arts.sql` | 11 tables + schedule integration + RLS |
| **Engine library** | `app/lib/martialArtsEngine.ts` | 6 disciplines, ~25 techniques each, origins, key figures, eras, warm-ups |
| **Plan library** | `app/lib/martialArtsPlanLibrary.ts` | Pre-built training plans per discipline |
| **MA hub page** | `app/(main)/martial-arts/page.tsx` | Discipline picker with hero images, discipline detail view |
| **Discipline detail view** | (same file, `DisciplineView` component) | Tabbed UI: Train / Learn / History |
| **Train tab** | — | Beginner quick-start card, session type list, training plans, warm-up |
| **Learn tab** | — | "Start Here" beginner section, category filter pills, technique browser with key points & common mistakes, belt progression |
| **History tab** | — | Origin story, era timeline with images, philosophy quote, key figures with circular photos, fun fact |
| **Discipline hero images** | `public/ma/*.jpg` | 6 Unsplash images (boxing, muay-thai, bjj, karate, taekwondo, mma) |
| **History era images** | `public/ma/history/*.jpg` | 12 images — origin + modern per discipline |
| **Key figure images** | `public/ma/figures/*.jpg` | 19 action shots — 3 per discipline + Muhammad Ali |
| **Module integration** | `modules.ts` registry | MA card on hub, bottom nav pill, module gate |

### In Progress / Not Yet Built

| Feature | Priority | Status |
|---|---|---|
| **Round timer system** | P0 | Engine exists, UI not wired |
| **Active session UI** | P0 | Session phases defined, full session flow not built |
| **Session logging to Supabase** | P0 | Tables ready, no write hooks yet |
| **Technique mastery tracking** | P1 | Tables ready, no UI |
| **10K-hour progress** | P1 | Tables ready, no UI |
| **Belt/rank management** | P1 | Data model in engine, no edit UI |
| **Session templates** | P1 | Table ready, no UI |
| **Style DNA** | P2 | Not started |
| **Sparring journal** | P2 | Not started |
| **Combo builder** | P2 | Not started |
| **Form check camera (MA)** | P2 | Not started |
| **All P3 features** | P3 | Not started |

---

## 1. Vision & Competitive Landscape

A discipline-agnostic martial arts training system that gives every fighter — from a Day-1 Boxing student to a seasoned BJJ black belt — a gold-standard logging, learning, and progression experience. The module treats martial arts as a **first-class training domain** alongside gym workouts, with its own session structure, its own metrics, and its own XP economy, while sharing a unified schedule, character system, and streak engine with the rest of Sevel.

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
| **Kimurawear** | Muay Thai/Boxing | Sensor gloves, live combo detection | Hardware-dependent ($80+ gloves); limited techniques |
| **StrikeTec** | Boxing | Sensor wraps, punch speed/power | Hardware-dependent; boxing only; company shut down |
| **Kiai.ai** | MMA | AI video analysis, technique recognition | Video-upload only; no real-time; subscription model |

### Our 12 differentiators (what no one else does)

1. **Multi-discipline** — 16 martial arts under one roof, not siloed apps per style
2. **Round-based logging + technique tracking** — rounds, combos, quality ratings, not just a timer
3. **AI form check camera** — MediaPipe pose analysis, zero hardware cost
4. **RPG character system** — Fight domain specializations (Pugilist/Vanguard/Constrictor/Bladestorm)
5. **XP/leveling/achievements** — martial arts sessions earn XP, unlock achievements, contribute to rank
6. **Unified schedule** — gym + martial arts + future modules on one calendar
7. **10K-hour mastery tracking** — per discipline, across all 16 arts
8. **Technique mastery progression** — 6 levels (Unknown → Expert) with form check + sparring gates
9. **Training load monitoring** — acute:chronic workload ratio, cross-training fatigue detection
10. **Style DNA** — auto-generated fighting identity from actual training data
11. **Sparring journal** — partner tracking, intensity logging, what-worked/what-failed notes
12. **Free, forever** — no hardware, no subscription, no locked content

---

## 2. Supported Disciplines

### Phase 1 — Core 6 (P0)

| Discipline | Approx. Techniques | Forms/Kata | Character Spec |
|---|---|---|---|
| Boxing | 50-70 | — | Pugilist |
| Muay Thai | 80-120 | — | Vanguard |
| BJJ | 150-300+ | — | Constrictor |
| Karate | 80-120 | 26 (Shotokan) | Bladestorm |
| Taekwondo | 70-100 | 17 (WTF Poomsae) | Bladestorm |
| MMA | 200+ (aggregate) | — | Vanguard |

### Phase 2 — Expansion (P3)

Judo, Wrestling, Krav Maga, Wing Chun, Capoeira, Kung Fu/Wushu, Aikido, Kendo, Kalaripayattu, Silat

**Total scope:** ~16 disciplines, ~2,000+ techniques across all.

**Data source:** Fight Encyclopedia open-source dataset (2,057 techniques, 183 martial arts) as seed, curated per discipline.

---

## 3. P0 — Database Schema

All tables live in migration `029_martial_arts.sql`.

### Core tables

```sql
-- Technique library (seeded from curated data per discipline)
CREATE TABLE ma_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline TEXT NOT NULL,
  category TEXT NOT NULL,         -- 'punch','kick','elbow','knee','submission','sweep','throw','block','stance','combo','form'
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT DEFAULT 'beginner',
  belt_level TEXT,
  key_points TEXT[],
  common_mistakes TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Forms / Kata library
CREATE TABLE ma_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  belt_level TEXT,
  move_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Master session table (separate from workout_sessions — rounds ≠ sets)
CREATE TABLE ma_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  session_type TEXT NOT NULL,        -- 'technique','sparring','pad_work','bag_work','shadowbox','conditioning','kata','flow_roll','mixed'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  total_rounds INTEGER DEFAULT 0,
  intensity TEXT DEFAULT 'medium',
  energy_rating INTEGER,
  notes TEXT,
  xp_earned INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual rounds within a session
CREATE TABLE ma_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ma_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_index INTEGER NOT NULL,
  round_type TEXT NOT NULL,
  duration_seconds INTEGER,
  rest_seconds INTEGER,
  intensity TEXT,
  partner_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Techniques practiced in a round
CREATE TABLE ma_round_techniques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES ma_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES ma_techniques(id),
  reps INTEGER,
  duration_seconds INTEGER,
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Form/Kata logs per session
CREATE TABLE ma_form_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ma_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES ma_forms(id),
  repetitions INTEGER DEFAULT 1,
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session templates (user-created reusable session structures)
CREATE TABLE ma_session_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  name TEXT NOT NULL,
  session_type TEXT NOT NULL,
  round_count INTEGER DEFAULT 5,
  round_duration_seconds INTEGER DEFAULT 180,
  rest_duration_seconds INTEGER DEFAULT 60,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Technique mastery per user (6-level system)
CREATE TABLE ma_technique_mastery (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES ma_techniques(id),
  times_practiced INTEGER NOT NULL DEFAULT 0,
  avg_quality NUMERIC DEFAULT 0,
  mastery_level INTEGER NOT NULL DEFAULT 0,
  form_check_passed BOOLEAN DEFAULT false,
  used_in_sparring BOOLEAN DEFAULT false,
  video_ref TEXT,
  last_practiced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, technique_id)
);

-- Per-discipline hour + progress tracking (10K-hour journey)
CREATE TABLE ma_discipline_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_techniques_learned INTEGER DEFAULT 0,
  total_sparring_rounds INTEGER DEFAULT 0,
  belt_rank TEXT,
  belt_earned_at TIMESTAMPTZ,
  gym_name TEXT,
  instructor TEXT,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_session_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, discipline)
);

-- User's custom combos
CREATE TABLE ma_custom_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discipline TEXT NOT NULL,
  name TEXT NOT NULL,
  technique_ids UUID[] NOT NULL,
  difficulty TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aggregated stats across all disciplines
CREATE TABLE ma_user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_sessions INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 0,
  total_mat_time_seconds INTEGER DEFAULT 0,
  total_sparring_sessions INTEGER DEFAULT 0,
  techniques_drilled INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  last_session_date DATE,
  style_dna TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Schedule integration

```sql
ALTER TABLE recurring_plans
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'gym',
  ADD COLUMN IF NOT EXISTS ma_discipline TEXT,
  ADD COLUMN IF NOT EXISTS ma_session_template_id UUID REFERENCES ma_session_templates(id) ON DELETE SET NULL;

ALTER TABLE scheduled_days
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'gym',
  ADD COLUMN IF NOT EXISTS ma_discipline TEXT,
  ADD COLUMN IF NOT EXISTS ma_session_template_id UUID REFERENCES ma_session_templates(id) ON DELETE SET NULL;
```

### Indexes

```sql
CREATE INDEX idx_ma_techniques_discipline ON ma_techniques(discipline);
CREATE INDEX idx_ma_sessions_user_date ON ma_sessions(user_id, date DESC);
CREATE INDEX idx_ma_sessions_user_discipline ON ma_sessions(user_id, discipline);
CREATE INDEX idx_ma_rounds_session ON ma_rounds(session_id);
```

### RLS

- All user tables: `user_id = auth.uid()` for SELECT/INSERT/UPDATE/DELETE
- `ma_techniques` and `ma_forms`: public read (`USING (true)`) — seeded library data

---

## 4. P0 — Session Logging (Round-Based)

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

### Session types

| Type | Description | Best for |
|------|-------------|----------|
| Technique Drill | Focused repetition of specific techniques | Solo training, class drills |
| Pad Work | Rounds on focus mitts or Thai pads | With a partner/coach |
| Bag Work | Heavy bag, speed bag, double-end bag | Solo training |
| Shadow Work | Shadowboxing or shadow grappling | Solo, anywhere |
| Sparring | Live rounds with a training partner | Partner required |
| Flow Roll | Light positional grappling | Grappling disciplines |
| Forms / Kata | Traditional forms, kata, poomsae | Traditional disciplines |
| Conditioning | Sport-specific cardio and strength | All disciplines |
| Mixed | Combination of multiple types | Full class sessions |

### Logging UI flow

1. **Quick Start:** Tap discipline card → auto-starts timer → log as you go
2. **Template Start:** Pick a saved session template → guided round-by-round flow
3. **During session (dark UI, discipline accent color):**
   - **Big circular round timer** — center screen hero element
   - **Round indicator pills** — `R1 R2 R3 R4 R5` across top, active highlighted
   - **Technique checklist** — tap to log, long-press for reps/quality
   - **Sparring mode** — partner name chip, intensity slider, notes field
   - **Minimal chrome** — controls thumb-reachable at bottom, timer dominates
4. **Session complete — Energy Receipt:**
   - Session summary card (total time, rounds, techniques)
   - Per-round breakdown (expandable)
   - XP breakdown with Fight domain contribution
   - Technique mastery progress bars
   - 10K-hour progress ring
   - Streak indicator + next session suggestion

---

## 5. P0 — Technique Library & Seed Data

### Phase 1 seed: ~25 essential techniques per Core 6 discipline

> **Status: BUILT** — `martialArtsEngine.ts`

Seeded from `martialArtsEngine.ts` which contains the full library with:
- Technique name, description, difficulty level
- Body regions targeted
- Key coaching points (3-5 per technique)
- Common mistakes to avoid (2-3 per technique)
- Category classification (punch, kick, submission, etc.)

### Engine data types (key additions)

```typescript
type DisciplineOrigin = {
  tagline: string;
  founded: string;
  origin: string;
  philosophy: string;
  story: string;
  keyFigures: { name: string; role: string; imageUrl?: string }[];
  eras: { period: string; title: string; description: string; imageUrl?: string }[];
  funFact: string;
};

type DisciplineInfo = {
  id: string; name: string; icon: string; colorRgb: string;
  categories: string[]; imageUrl: string; /* hero image path */
  tags: string[]; /* e.g. "Striking", "Grappling", "Belts" */
  beltSystem?: { name: string; ranks: string[] };
};
```

Each discipline includes 3 eras (origin, middle, present) with optional images, and 3 key figures with action shot photos.

### Categories

punch, kick, elbow, knee, clinch, takedown, sweep, submission, escape, guard, pass, block, stance, combo, throw, form

### Combo library

Pre-built combos linking technique sequences:
- Boxing: 1-2, 1-2-3, 1-2-3-2, 1-2 Body, Uppercut-Hook
- Muay Thai: 1-2-Kick, Teep-Roundhouse, Low Kick-Cross, Clinch-Knee
- BJJ: Armbar-Triangle Chain, Sweep to Mount
- More per discipline added iteratively

---

## 6. P0 — MA Hub Page & Navigation

> **Status: BUILT** — live at `/martial-arts`

### MA Hub page (`/martial-arts`)

Full-bleed discipline cards stacked vertically, each with:
- Unsplash hero image background with dark gradient overlay
- Discipline name + tagline (e.g. "Boxing — The Sweet Science")
- Category badges (Striking, Grappling, Traditional, Belts)
- Chevron to enter discipline detail view

Tapping a card opens the `DisciplineView` inline (same page, with back button).

### Navigation

- Bottom nav: **Train** tab → swipe between WORKOUT / MARTIAL ARTS (existing pill system)
- Schedule lives in its own tab (existing), shows all training types unified
- The pill at `/martial-arts` goes to the MA hub

### Discipline detail view (inline, not separate route)

Tabbed interface with **Train / Learn / History** tabs (see Section 15 for full detail).
Uses `AnimatePresence` from Framer Motion for tab transition animations.

State management:
- `activeTab`: "train" | "learn" | "history"
- `activeTechCat`: selected technique category filter
- `historyStoryExpanded`: toggle for full origin story text

---

## 7. P0 — Unified Schedule Integration

### Current state

- `recurring_plans` table: weekday → template_id (gym only)
- `scheduled_days` table: date-specific overrides

### Unified design

Add `session_type` column to existing tables (DEFAULT 'gym' — non-breaking):

The schedule page shows **one unified week view**. Each day tile shows:
- **Gym days:** Template name + muscle groups (existing, unchanged)
- **Martial arts days:** Discipline icon + session type
- **Rest days:** Moon icon (existing, unchanged)

Users tap a day → choose training type → configure:
- Gym: pick template (existing flow)
- Martial Arts: pick discipline → pick session type

---

## 8. P0 — XP & Streak Integration

### XP formula

```
Base XP per round:
  Technique:     15 XP
  Pad/Bag:       20 XP
  Sparring:      30 XP (highest risk/effort)
  Kata/Form:     25 XP per completion
  Shadow:        15 XP
  Conditioning:  15 XP
  Mixed:         18 XP

Multipliers:
  Intensity (hard):    ×1.3
  Duration > 60min:    ×1.2
  Streak (3+):         ×1.1
  New technique:       +10 XP each

Daily cap: 300 XP (same as gym)
```

### Fight domain stats

- Session frequency → Fight domain score
- Technique diversity → unique techniques logged
- Sparring logs → frequency and intensity
- Combo completion → multi-hit sequences
- Form/kata mastery → completion and quality ratings

### Specialization triggers

| Focus | Specialization | Trigger |
|---|---|---|
| 70%+ Boxing sessions | Pugilist | Replaces Striker |
| 70%+ Kickboxing/MMA sessions | Vanguard | Replaces Striker |
| 70%+ BJJ/Grappling sessions | Constrictor | Replaces Striker |
| 70%+ Karate/TKD sessions | Bladestorm | Replaces Striker |

### Streak integration

- MA sessions count as completed training days (additive, never removes gym credit)
- MA XP adds to total (additive, never modifies gym XP)

---

## 9. P0 — Round Timer System

Built into the session flow — not a separate app.

### Timer presets

| Preset | Round | Rest | Use case |
|--------|-------|------|----------|
| Boxing Standard | 3:00 | 1:00 | Pro boxing rounds |
| Boxing Amateur | 2:00 | 1:00 | Amateur/beginner |
| Muay Thai | 3:00 | 2:00 | Thai rounds |
| MMA Pro | 5:00 | 1:00 | UFC-length rounds |
| BJJ Match | 5:00 | — | Continuous grappling |
| BJJ Roll | 6:00 | 1:00 | Open mat rounds |
| Tabata | 0:20 | 0:10 | Conditioning HIIT |
| Custom | User | User | Anything |

### Timer UX

- **Big circular countdown** — center screen hero
- **10-second warning** — color flash + optional vibration
- **Round end** — bell sound + auto-start rest timer
- **Rest timer** — red progress ring, auto-starts between rounds
- **Round progress pills** — `R1 R2 R3 R4 R5` across top, active highlighted
- **Pause/Stop** — thumb-reachable at bottom
- **Audio bell sounds** — Web Audio API (free, no assets needed), with vibration fallback
- **Minimal UI** — during active timer, hide everything except the timer + round indicator

### Timer technical notes

- Use `requestAnimationFrame` for smooth countdown (not `setInterval`)
- `Screen Wake Lock API` to prevent screen sleep during rounds
- `Vibration API` for round start/end haptic feedback
- All free browser APIs — no external dependencies

---

## 10. P1 — Session Templates

Users save favorite session structures to reuse:

- Name, discipline, session type
- Number of rounds, round duration, rest duration
- Notes/instructions

Like gym workout templates but for MA sessions. Accessible from:
- Quick Start on MA Hub
- Schedule day picker (assign template to a day)
- Discipline detail page

---

## 11. P1 — Technique Mastery System (6-Level)

Each technique has a **mastery level** per user:

```
Level 0: Unknown    — never logged
Level 1: Exposed    — logged 1-5 times
Level 2: Practiced  — logged 6-20 times + avg quality ≥ 3
Level 3: Proficient — logged 21-50 times + avg quality ≥ 4
Level 4: Mastered   — logged 50+ times + avg quality ≥ 4.5 + form check passed
Level 5: Expert     — logged 100+ times + avg quality ≥ 4.5 + used in sparring
```

### Mastery UI

- Technique browser shows mastery dots (0-5 filled circles)
- Progress bar to next mastery level
- "Master all basics" quest integration

---

## 12. P1 — 10K-Hour Mastery Journey

Track hours toward mastery per discipline — inspired by MatTime but across all arts.

### Milestones

| Hours | Milestone | Reward |
|---|---|---|
| 10 | First Steps | 50 XP |
| 50 | Dedicated Student | 100 XP |
| 100 | Committed Practitioner | 200 XP |
| 250 | Seasoned Fighter | 300 XP |
| 500 | Half-Way Warrior | 500 XP |
| 1,000 | Thousand-Hour Club | 750 XP |
| 2,500 | Living Encyclopedia | 1,000 XP |
| 5,000 | Master's Path | 1,500 XP |
| 10,000 | Grand Master | 3,000 XP |

### UI — Discipline Progress Card

```
┌──────────────────────────────────┐
│  BOXING                    🥊    │
│     ╭─────────────────╮          │
│     │    127.5 hrs     │          │
│     │   ───────────    │          │
│     │   10,000 goal    │          │
│     ╰─────────────────╯          │
│  ████████░░░░░░░░░░  1.3%       │
│  Next: 250 hrs — Seasoned Fighter│
│  42 sessions · 18 techniques     │
│  Belt: Blue                      │
└──────────────────────────────────┘
```

---

## 13. P1 — Belt / Rank Progression

Self-reported — the user updates when their real instructor promotes them.

### Supported belt systems

| Discipline | System | Ranks |
|---|---|---|
| BJJ | Belt + stripes | White → Blue → Purple → Brown → Black |
| Karate | Kyu/Dan | 10th Kyu → 1st Kyu → 1st Dan → 10th Dan |
| Taekwondo | Geup/Dan | 10th Geup → 1st Geup → 1st Dan → 9th Dan |
| Judo | Kyu/Dan | 6th Kyu → 1st Kyu → 1st Dan → 10th Dan |
| Krav Maga | Practitioner/Graduate | P1-P5, G1-G5 |

### How it works

- User sets their current belt rank in discipline settings
- Belt displayed on discipline cards, profile, and character sheet
- Belt progression milestones trigger achievements
- Belt color used as accent on discipline UI elements
- No auto-promotion — real promotion only

---

## 14. P1 — Progressive Disclosure

Features unlock naturally through usage, not all-at-once.

### Immediately visible (first session)

- Discipline picker (choose 1-3 arts)
- Round-based session tracker
- Simple session types: Drill, Bag/Pad, Sparring, Conditioning
- Basic session history

### After 3+ sessions

- Technique proficiency ratings (self-assess techniques drilled 3+ times)
- Training balance indicator
- Style DNA label

### After 5+ sessions

- Combo builder
- Sparring log with partner tracking
- 10K-hour progress card

### After 10+ sessions

- Move tree visualization
- Technique frequency heatmap
- Body region load tracking
- Cross-training suggestions

### Only when relevant

- Belt/rank tracking — only if discipline uses ranks
- Fight camp mode — only if user flags upcoming competition
- Injury-aware routing — only when user marks an injury
- Kata/forms section — only for disciplines that have forms

### UI rule

> If the user hasn't earned a feature through usage, it doesn't exist in their UI.
> No empty states with "complete X to unlock" — the section simply isn't rendered.

---

## 15. P1 — Discipline Detail Pages & Origin Stories

> **Status: BUILT** — live in `DisciplineView` component

Each discipline has a **tabbed detail view** with three tabs: **Train**, **Learn**, and **History**.

### Tab 1: Train (default)

1. **Beginner quick-start card** — "Recommended for You" with guided technique drill (~15 min, 3 rounds, beginner level). Only shown when `stats.sessions === 0`.
2. **Session type list** — clean rows with emoji, name, description, and chevron. Types: Technique Drill, Conditioning, Mixed Session, Pad Work, Bag Work, Shadow Work, Sparring, Flow Roll (grappling only), Forms/Kata (traditional only).
3. **Training plans section** — pre-built plans from `martialArtsPlanLibrary.ts` with difficulty badges.
4. **Warm-up routine** — discipline-specific from `martialArtsEngine.ts` with collapsible exercise list.

### Tab 2: Learn

1. **"Start Here" section** — highlights beginner-level techniques with category badges (shown for users with < 5 sessions).
2. **Category filter pills** — horizontal scrollable pill bar to filter techniques by category (All, Punch, Kick, Submission, etc.).
3. **Technique cards** — each shows name, category badge, difficulty, key coaching points, and common mistakes.
4. **Belt progression** — visual display of rank system for disciplines that have one.

### Tab 3: History

1. **Origin story** — collapsible story text with "Read full story" expand toggle.
2. **Era timeline** — vertical timeline with dots and cards for each era (3 per discipline: origin, middle, present). Each era has a period label, title, description, and optional image from `public/ma/history/`.
3. **Philosophy quote** — styled card with accent left border.
4. **Key figures** — circular avatar images (48px) from `public/ma/figures/` with name and role. Falls back to initial letter avatar when no image.
5. **Fun fact** — amber-styled card with sparkle icon.

### Image assets (FREE — all from Unsplash)

| Directory | Count | Content |
|---|---|---|
| `public/ma/*.jpg` | 6 | Discipline hero images (full-bleed with gradient overlay) |
| `public/ma/history/*.jpg` | 12 | Era images — origin + modern per discipline |
| `public/ma/figures/*.jpg` | 19 | Key figure action shots — 3 per discipline + Muhammad Ali |

- **Source:** Unsplash (free commercial use, no attribution required)
- **Fallback:** Gradient background for disciplines, initial letter for key figures
- **Optimization:** Next.js `<Image>` component with `fill`, `object-cover`, and `sizes` prop

---

## 16. P1 — Hub Dashboard Card

When MA module is enabled, show on the main hub:

```
┌──────────────────────────────────┐
│ 🥊 Martial Arts                  │
│                                  │
│ Next: Boxing Pad Work (Tomorrow) │
│                                  │
│ ┌────┐ ┌────┐ ┌────┐            │
│ │ 12 │ │4.2h│ │ 🔥 │            │
│ │sess│ │week│ │ 5d │            │
│ └────┘ └────┘ └────┘            │
│                                  │
│ Last drilled: Jab-Cross-Hook    │
│ Style: Pressure Fighter          │
└──────────────────────────────────┘
```

---

## 17. P1 — Warm-Up & Cool-Down Routines

### Discipline-specific warm-ups

| Discipline | Warm-Up |
|---|---|
| Boxing | Shoulder circles, neck rolls, jump rope 3min, arm swings, shadow jab-cross |
| Muay Thai | Hip openers, knee raises, Thai skip, clinch entry drills, light teeps |
| BJJ | Hip escapes, guard recovery drills, neck bridges, granby rolls, shrimping |
| Wrestling | Sprawls, level changes, duck walks, penetration steps, neck circles |
| Karate | Joint rotations, dynamic stretches, basic blocks in sequence, stance transitions |
| Taekwondo | Leg swings, high knee marches, light front kicks, turning kick warm-up |
| MMA | Jump rope, hip openers, sprawl-to-shot, shadow combo, movement drills |

### Cool-down by session type

- **Post-striking:** Wrist/forearm stretch, shoulder stretch, hip flexors, neck release
- **Post-grappling:** Neck stretch, back decompression, hip openers, grip release, spine twist
- **Post-kicks:** Hamstring stretch, hip flexor stretch, quad stretch, calf release, ankle circles
- **Post-forms:** Full body flow — forward fold, cobra, child's pose, standing side stretch

---

## 18. P2 — Style DNA

Auto-generated fighting style label based on actual training patterns (trailing 30 days).

| Pattern | Style | Description |
|---|---|---|
| High volume striking, forward movement drills | **Pressure Fighter** | Push the pace |
| Defensive drills, counter combos dominant | **Counter Striker** | Wait and punish |
| Bottom game focused, guard heavy | **Guard Player** | The mat is your domain |
| Takedown + transition heavy | **Scrambler** | Chaos is your friend |
| High technique variety, controlled intensity | **Technician** | Precision over power |
| Even split across categories | **Well-Rounded** | Jack of all trades |
| Forms/kata heavy, traditional focus | **Traditionalist** | Respect the roots |

Displayed on profile and character sheet. Requires 10+ sessions to activate.

---

## 19. P2 — Sparring Journal & Partner Log

Track who you spar with — training diary, not fight record.

- Log partner name during sparring rounds (autocomplete from history)
- See partner frequency: "You've rolled with Alex 12 times this month"
- Notes per partner: "Good at sweeps, vulnerable to back takes"
- No ranking or win/loss tracking — this is a journal

---

## 20. P2 — Combo Builder

Create custom multi-technique sequences:

- Pick techniques from the library → arrange in order
- Name the combo, set difficulty
- Track drill count per combo
- Share combos (future — export as text/image)

---

## 21. P2 — Move Tree (Technique Skill Tree)

Visual tree of technique branches that unlock based on drill count + proficiency.

**Boxing example:**
```
Jab ─── Cross ─── Hook ─── Uppercut
  │        │         │
  └── Jab-Cross ── 1-2-3 ── Counter Jab
                                │
                         Pull Counter ── Shoulder Roll
```

**BJJ example:**
```
Closed Guard ─── Armbar ─── Triangle
     │              │
  Hip Escape ── Sweep ── Back Take
```

Nodes greyed out until prerequisite technique reaches proficiency level 2+.

---

## 22. P2 — Training Balance & Fatigue Crossover

### Muscle Fatigue Crossover (gym ↔ martial arts)

| Yesterday's gym work | Today's MA suggestion |
|---|---|
| Heavy legs (squats, RDL) | Upper-body striking, not kick-heavy Muay Thai |
| Pull day (rows, deadlift) | Striking over grappling (grip/forearms fatigued) |
| Shoulder-heavy push day | Avoid clinch, suggest ground game |
| Grip-intensive | Striking over gi grappling |
| Rest day | Fully recovered — any discipline |

### Training Balance Detector

Track % of time per category:
- Striking vs Grappling vs Conditioning vs Forms

Alert when one area neglected 2+ weeks:
> "85% striking this month — grappling is falling behind."

### Body Region Load Tracking

Track load across ALL training (gym + martial arts):

| Region | Gym sources | MA sources |
|---|---|---|
| Hands/wrists | Grip work | Bag/pad work, punching |
| Shins | — | Muay Thai kicks |
| Shoulders | Press, raises | Clinch, throwing, guard |
| Grip/forearms | Pull-ups, rows | Gi grappling |
| Knees | Squats, lunges | Takedowns, kicks |
| Hips | Deadlifts | Kicks, guard, sweeps |

Display as body silhouette (green = fresh, yellow = moderate, red = fatigued).

---

## 23. P2 — Data Insights & Heatmaps

### Technique Frequency Heatmap

Grid: techniques × weeks. Color intensity = drill count. Highlights gaps.

### Session Comparison

After completing a session, show deltas vs average:
- Rounds: +2 more than usual
- Duration: 10 min longer
- Intensity: higher than 4-week average
- Techniques: 3 new ones drilled

### Training Calendar Heatmap

GitHub-style contribution graph but for mat time:
- Columns = weeks, rows = days
- Color intensity = training volume that day
- Shows consistency patterns at a glance
- Separate colors for gym vs MA (or combined view)

---

## 24. P2 — MA-Specific Achievements

| Achievement | Trigger | Rarity |
|---|---|---|
| First Blood | Complete first MA session | Common |
| 100 Rounds | Total rounds logged reaches 100 | Common |
| Combo Creator | Create 5 custom combos | Uncommon |
| Sparring Veteran | Log 50 sparring sessions | Rare |
| Cross-Trainer | Log gym + MA in same week, 10 times | Rare |
| Style Unlocked | Get assigned a Style DNA | Uncommon |
| Black Belt Journey | Train consistently for 52 weeks | Epic |
| Technique Encyclopedia | Proficiency 3+ on 50 techniques | Epic |
| Grand Master | 10,000 hours in any discipline | Legendary |
| Renaissance Fighter | Train 5+ different disciplines | Rare |
| Iron Shins | Log 100 kick sessions (Muay Thai/TKD) | Rare |
| Submission Artist | Log 100 successful submissions (BJJ) | Rare |
| Road Warrior | Train at 5+ different dojos | Uncommon |
| Dawn Warrior | Complete 20 sessions before 7am | Rare |

---

## 25. P2 — Streak Variants

Beyond the main training streak:

- **Mat Time Streak** — consecutive days with any MA session
- **Sparring Streak** — consecutive weeks with at least one sparring session
- **New Technique Streak** — consecutive weeks drilling something new
- **Discipline Streak** — consecutive weeks training all active disciplines

Each streak has its own badge on the MA hub card.

---

## 26. P2 — Video Reference Slots

Users attach a YouTube link to any technique:

- We don't host or serve video content (free)
- User pastes URL → stored in `ma_technique_mastery.video_ref`
- Displayed as "Watch reference" button on technique detail
- Personal curation — each user builds their own video library

---

## 27. P2 — Form Check Camera

Extend the existing `FormCheckCamera` component for martial arts using MediaPipe Pose Landmarks (free, runs on-device).

### Supported checks

| Discipline | Form Checks |
|---|---|
| Boxing | Stance width, guard height, hip rotation, chin tuck |
| Muay Thai | Kick chamber height, elbow angle, knee drive |
| Karate | Kata stances (front stance depth), chamber hand position |
| BJJ | Posture in guard (back angle), base width |
| Taekwondo | Kick height, supporting foot pivot, chamber |

### Implementation

- Reuse `FormCheckCamera.tsx`, `formAnalysis.ts`, `formGuides.ts`
- Add MA technique entries to `EXERCISE_PATTERNS`
- New `maFormAnalysis.ts` (same landmark approach)
- Camera angle guidance per technique type
- New silhouette paths for MA stances

### Tools used (all FREE)

- **MediaPipe Pose** — Google's free, on-device pose estimation
- **TensorFlow.js** — free ML runtime for browser
- No cloud API calls, no subscription, runs entirely on user's device

---

## 28. P3 — Readiness Score & Recovery

Combine gym fatigue + martial arts load + optional wellness data:

```
readinessScore = 100
  - (gymFatigue24h * 0.3)
  - (maFatigue24h * 0.3)
  - (weeklyLoadRatio * 0.2)
  - (sleepDeficit * 0.2)         // if user self-reports sleep
```

Display as daily card:
- **80-100:** "Ready to train hard" (green)
- **50-79:** "Go light today" (yellow)
- **0-49:** "Rest day recommended" (red)

### Injury-Aware Routing

When user marks an injury:

| Injury | Auto-swaps |
|---|---|
| Hand/wrist | Skip bag work → suggest kicks, grappling, footwork |
| Knee | Skip kicks, takedowns → suggest boxing, upper clinch |
| Rib/torso | Skip sparring, clinch → suggest light technique, forms |
| Shoulder | Skip clinch, throwing → suggest kicks, guard work |
| Neck | Skip wrestling → suggest striking at distance |

Suggested alternatives appear inline when selecting session type.

---

## 29. P3 — Training Periodization & Fight Camp

For users preparing for competition — structured macro-cycles:

### Fight Camp Mode

User sets a fight date → system generates a tapering training plan:

| Weeks Out | Phase | Focus |
|---|---|---|
| 12-8 | Base Building | Volume, technique acquisition, general fitness |
| 8-4 | Intensification | Sparring frequency up, sport-specific conditioning |
| 4-2 | Peaking | Reduce volume, increase intensity, perfect game plan |
| 2-1 | Taper | Light technique, visualization, recovery focus |
| Fight week | Pre-fight | Walkthrough only, weight management, mental prep |

### Weight Cut Tracker (for weight-class sports)

- Current weight logging
- Target weight class
- Days to weigh-in countdown
- Daily weight chart
- Hydration reminders (free — just notifications)
- **No diet/nutrition advice** — just tracking tools

---

## 30. P3 — Audio Coaching Cues

Voice prompts during rounds using the **Web Speech Synthesis API** (free, built into every browser):

### Cue types

- **Round announcements:** "Round 1 — fight!", "Time!", "Rest"
- **Technique callouts:** Random technique name every N seconds (user-configurable)
- **Combo callouts:** "Jab-cross-hook!", "Double jab-cross!" — forces reaction time
- **Countdown:** "10 seconds!", "5... 4... 3... 2... 1... Time!"
- **Motivational:** "Push through!", "Last round, dig deep!"

### Implementation

```javascript
const synth = window.speechSynthesis;
const msg = new SpeechSynthesisUtterance("Round 1 — fight!");
synth.speak(msg);
```

- **Cost: $0** — Web Speech Synthesis is free, no API key, works offline
- User can toggle on/off
- Configurable voice speed and volume
- Language: English (expandable)

---

## 31. P3 — Punch/Kick Counter (Accelerometer)

Use the phone's built-in accelerometer to count strikes during bag work:

### How it works

- User places phone in armband or holds it
- `DeviceMotion API` (free, built-in browser API) detects sharp acceleration spikes
- Each spike above threshold = one strike counted
- Works for punches (phone on wrist/armband) and kicks (phone on shin guard pocket)

### Technical approach

```javascript
window.addEventListener('devicemotion', (e) => {
  const total = Math.sqrt(
    e.acceleration.x ** 2 +
    e.acceleration.y ** 2 +
    e.acceleration.z ** 2
  );
  if (total > STRIKE_THRESHOLD) strikeCount++;
});
```

### Accuracy notes

- Won't be FightCamp-accurate (they use dedicated sensors)
- But it's free and provides approximate strike count
- Useful for bag work volume tracking
- **Cost: $0** — built-in browser API

---

## 32. P3 — Reflex & Reaction Training

Mini-games for reaction speed improvement:

### 1. Tap Reflex Test
- Screen flashes a color → tap as fast as possible
- Measures reaction time in milliseconds
- Track improvement over time
- Can be discipline-specific: flash a technique name → user mimes the technique

### 2. Combo Memory Game
- System shows a combo sequence (e.g., Jab-Cross-Hook-Uppercut)
- Combo disappears
- User must tap techniques in correct order
- Progressively longer combos
- Tests technique recall under pressure

### 3. Random Technique Caller
- Audio callout of random technique every 3-10 seconds
- User performs the technique (shadowboxing mode)
- Trains reactive technique execution
- Configurable: discipline filter, difficulty, speed

### Implementation

- All pure HTML/CSS/JS — no external dependencies
- **Cost: $0**

---

## 33. P3 — Training Load Monitoring (ACWR)

Acute:Chronic Workload Ratio — used by professional sports teams to prevent overtraining and injury.

### Formula

```
Acute Load = sum of training load over last 7 days
Chronic Load = rolling average of weekly training load over last 28 days
ACWR = Acute / Chronic

Training Load (per session) = duration_minutes × intensity_factor
  intensity_factor: light=0.5, medium=0.8, hard=1.0, sparring=1.2
```

### Risk zones

| ACWR | Zone | Recommendation |
|------|------|----------------|
| < 0.8 | Undertraining | "You're detrained — ramp up gradually" |
| 0.8-1.3 | Sweet spot | "Training load is optimal" |
| 1.3-1.5 | Caution | "High load spike — watch for fatigue" |
| > 1.5 | Danger | "Injury risk elevated — reduce volume" |

### Display

- Simple gauge on MA hub (green/yellow/red zone)
- Trend line showing 4-week ACWR history
- **Cost: $0** — pure calculation from existing session data

---

## 34. P3 — Mental Training & Visualization

### Breathing Exercises

Pre-fight / pre-training calming exercises:

| Exercise | Pattern | Use case |
|----------|---------|----------|
| Box Breathing | 4-4-4-4 (in-hold-out-hold) | Pre-competition calm |
| Tactical Breathing | 4-4-4 (in-hold-out) | Mid-session recovery |
| Energizing Breath | Quick 2-1 (in-out) × 30 | Pre-round activation |

Animated breathing circle with haptic pacing. **Cost: $0** — pure CSS animation + vibration API.

### Visualization Timer

- Guided timer for mental rehearsal sessions
- User sets technique/scenario to visualize
- Logs as a "visualization" session type for consistency tracking
- Research-backed: mental rehearsal improves motor skill acquisition

### Focus Timer (Pomodoro variant)

- 25-min focus blocks for technique study (watching film, reading about techniques)
- Counts toward training engagement but not mat time

---

## 35. P3 — Gym / Dojo Profiles

Like existing gym equipment profiles but for martial arts schools:

- Name, location, disciplines offered
- Your rank at this gym
- Training partners at this gym
- Session count at this location
- Multiple dojos supported (morning boxing, evening BJJ)

---

## 36. P3 — Technique of the Week

Rotating spotlight — one technique highlighted with drill suggestions:

- Changes every Monday
- Matches user's active disciplines
- Shows key points, common mistakes, suggested drill structure
- Bonus XP if drilled during the week (+15 XP per session including it)
- **Cost: $0** — rotated from existing technique library

---

## 37. P3 — Competition Management

For users who compete:

- **Fight card:** Opponent info (optional), date, weight class, rules
- **Pre-fight checklist:** Gear, weigh-in time, warm-up plan
- **Post-fight log:** Result, rounds, what worked, what to improve
- **Fight record:** W-L-D (private — for personal tracking only)
- **Competition calendar:** Upcoming events in their discipline

---

## 38. P3 — Social & Sharing

- Share session summary as image card (reuse `shareCard.ts`)
- Share 10K-hour milestones
- Share belt promotions
- Share achievements
- All via native share API (free) or export as image

---

## 39. P3 — Phase 2 Disciplines (Expansion)

| Discipline | Techniques | Forms/Kata |
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

---

## 40. Non-Breaking Guarantees

Per the hard-line rule: **UI can change but functionality must not break.**

- `workout_sessions` table: **untouched**
- `exercise_set_logs` table: **untouched**
- `recurring_plans` table: new column with `DEFAULT 'gym'` — existing rows unaffected
- `scheduled_days` table: new column with `DEFAULT 'gym'` — existing rows unaffected
- Schedule page: gym view is default, MA days appear only when scheduled
- Streak engine: MA sessions additive — never removes gym credit
- XP engine: MA XP additive — never modifies gym XP calculation
- Hub page: MA card shows only when module enabled (existing module gate)

---

## 41. Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Separate `ma_sessions` vs extend `workout_sessions` | **Separate table** | Rounds ≠ sets. Avoids nullable MA columns polluting gym queries. |
| Discipline-specific vs generic techniques | **Generic table with discipline column** | One `ma_techniques` table. Avoids 16 tables. |
| Schedule integration | **Column on existing tables** | `session_type` with `DEFAULT 'gym'` is minimal and non-breaking. |
| Round timer vs set tracker | **Separate UI component** | New `useMaSession` hook — gym's hook is too gym-specific. |
| Image storage | **Static assets + Unsplash** | Free images, curated. User videos → Supabase Storage. |
| 10K-hour tracking | **Derived + cached** | `ma_discipline_progress` updated on session complete. |
| Belt tracking | **Self-reported** | No auto-promotion. Real promotions only. |
| Dark UI for sessions | **Yes** | All top MA apps use dark UI. Research-backed. |
| Form check approach | **Camera only, no sensors** | MediaPipe is free. FightCamp charges $149 for sensors. |
| Audio coaching | **Web Speech Synthesis API** | Free, built-in, no API key, works offline. |
| Strike counting | **DeviceMotion API** | Free accelerometer. Approximate but useful. |
| Video references | **YouTube links only** | We don't host video. User curates their own library. $0. |

---

## 42. Data Model Diagram

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
    │ ma_discipline_progress│ (user × discipline)
    └──────────────────────┘
    
    ┌──────────────────────┐
    │ ma_session_templates  │ (user-created)
    └──────────────────────┘
    
    ┌──────────────────────┐
    │ ma_custom_combos      │ (user-created)
    └──────────────────────┘
    
    ┌──────────────────────┐
    │ ma_user_stats         │ (aggregated)
    └──────────────────────┘
```

---

## 43. Design Language

### Built patterns (live)

- **Dark UI** — follows Sevel's existing dark theme with `var(--fg-XX)` opacity scale
- **Discipline accent colors** — each discipline has its own `colorRgb` for subtle tinting
- **CardPanel pattern** — `rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)]` consistent with app
- **Full-bleed hero images** — Unsplash photos with `bg-gradient-to-t from-black/80` overlay
- **Tabbed navigation** — pill-style tabs (Train / Learn / History) with `AnimatePresence` transitions
- **Progressive disclosure** — beginner quick-start card shown only when `sessions === 0`
- **Circular avatar images** — 48px `rounded-full overflow-hidden` for key figures with `object-cover`
- **Timeline layout** — vertical line with colored dots for history eras
- **Category filter pills** — horizontal scrollable badges for technique browsing
- **Collapsible sections** — "Read full story" expand with Framer Motion height animation

### Session UI (planned, not yet built)

- **Big circular round timer** as the central hero during active sessions
- **Round indicator pills** — `R1 R2 R3 R4 R5` across top, active highlighted
- **Minimal chrome during session** — timer dominates, controls thumb-reachable

---

## 44. Competitive Summary

| Feature | FightCamp | MatTime | MMA AI | Sevel |
|---|---|---|---|---|
| Disciplines | 1 (Boxing) | 1 (BJJ) | 1 (MMA) | **16** |
| Session logging | Punch count | Time only | Video review | **Rounds + techniques + quality** |
| Form analysis | $149 sensors | None | Upload video | **Real-time camera (free)** |
| Technique mastery | None | None | None | **6-level progression** |
| 10K-hour tracking | None | ✓ (BJJ only) | None | **All 16 disciplines** |
| Belt/rank | None | ✓ (BJJ only) | None | **5+ belt systems** |
| RPG/gamification | None | None | None | **Full character + XP + specs** |
| Unified schedule | None | None | None | **Gym + MA + future** |
| Training load (ACWR) | None | None | None | **Acute:Chronic ratio** |
| Audio coaching | None | None | None | **Free Web Speech API** |
| Strike counter | $149 sensors | None | None | **Free accelerometer** |
| Mental training | None | None | None | **Breathing + visualization** |
| Fight camp planner | None | None | Basic | **Periodized taper plan** |
| Price | $149+ hw + $40/mo | Free/$5/mo | Freemium | **Free** |

---

## 45. Free Tools & Resources

Everything we use is free or built-in. This is the complete list.

### APIs (all free, browser-built-in)

| API | Use | Cost |
|-----|-----|------|
| Web Audio API | Bell sounds, round alerts | Free (browser built-in) |
| Web Speech Synthesis | Audio coaching cues | Free (browser built-in) |
| DeviceMotion API | Punch/kick counter via accelerometer | Free (browser built-in) |
| Vibration API | Haptic feedback on round start/end | Free (browser built-in) |
| Screen Wake Lock API | Keep screen on during rounds | Free (browser built-in) |
| MediaPipe Pose | Form check camera (pose estimation) | Free (Google, on-device) |
| TensorFlow.js | ML runtime for pose estimation | Free (open-source) |
| Web Share API | Share session cards, milestones | Free (browser built-in) |
| Notification API | Round alerts, training reminders | Free (browser built-in) |
| Canvas API | Heatmaps, charts, body silhouette | Free (browser built-in) |

### Image sources (all free, no attribution required for commercial use)

| Source | Quality | License |
|--------|---------|---------|
| Unsplash | High | Free commercial use, no attribution required |
| Pixabay | High | Free commercial use, no attribution required |
| Rawpixel CC0 | Medium | Public domain |
| Wikimedia Commons CC0 | Varies | Public domain |

### Data sources

| Source | Content | License |
|--------|---------|---------|
| Fight Encyclopedia dataset | 2,057 techniques, 183 martial arts | Open-source |
| Wikipedia | Discipline history, belt systems | CC BY-SA (summary/facts are free) |

### Libraries (all free, open-source)

| Library | Use | License |
|---------|-----|---------|
| Framer Motion | Animations (already in stack) | MIT |
| React | UI (already in stack) | MIT |
| Next.js | Framework (already in stack) | MIT |
| Supabase | Database (already in stack, free tier) | Apache 2.0 |

### Total cost: $0

No external APIs with usage fees. No hardware required. No subscriptions. Everything runs on the user's device or our existing free-tier infrastructure.

If a future feature absolutely requires a paid service (e.g., a higher-quality pose estimation model), the hard cap is **$20 one-time** — but we haven't found anything that needs it yet.
