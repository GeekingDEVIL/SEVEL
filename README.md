# SEVEL — Adaptive Fitness Operating System

Gamified fitness tracking web app. Mobile-first, built for the gym.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.3 (App Router) + React 19 + TypeScript 5 |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) + Framer Motion 13 |
| Database | Supabase (Postgres + Auth + RLS) — client-side only, no API routes |
| Icons | Lucide React |
| Charts | Recharts 3 |
| DnD | @dnd-kit (core + sortable) — used on schedule page |
| Fonts | Google Fonts — Space Grotesk (display), Inter (body), JetBrains Mono (data/labels) |

```bash
npm run dev      # Dev server on :3000
npm run build    # Production build
npx tsc --noEmit # Type check
```

## Project Structure

```
app/
├── layout.tsx                 # Root layout — fonts, theme init script
├── globals.css                # Theme tokens, glass cards, --fg-XX alpha vars
├── login/page.tsx             # Supabase auth (email + Google + Apple)
├── onboarding/                # Multi-step onboarding
│
├── (main)/                    # Auth-gated shell (has MobileNav + Sidebar)
│   ├── layout.tsx             # Wraps children with nav
│   ├── page.tsx               # Hub — greeting, smart cards, bento grid
│   ├── workout/page.tsx       # Session + logging UI (uses useWorkoutSession hook)
│   ├── schedule/page.tsx      # Weekly schedule + recurring plans + DnD
│   ├── track/page.tsx         # Track hub
│   ├── progress/page.tsx      # Charts, PRs, volume trends (Recharts)
│   ├── body/page.tsx          # Measurements — tap-on-body SVG diagram
│   ├── habits/page.tsx        # Habit tracker — rings, calendar, constellation
│   ├── recovery/page.tsx      # Muscle recovery scores
│   ├── character/page.tsx     # RPG character sheet — radar, skill tree, titles
│   ├── achievements/page.tsx  # Achievement gallery + rarity tiers
│   ├── rankings/page.tsx      # Leaderboards + podium
│   ├── social/page.tsx        # Social hub
│   ├── profile/page.tsx       # User profile + settings
│   ├── setup/page.tsx         # Settings (theme, units, equipment, accent)
│   ├── discover/page.tsx      # Module store — enable/disable features
│   ├── cycle/page.tsx         # Menstrual cycle tracking (female)
│   └── ...                    # running, martial-arts, yoga, coach (stubs)
│
├── components/
│   ├── MobileNav.tsx          # Bottom 5 tabs: Hub/Train/Track/Social/You
│   ├── Sidebar.tsx            # Desktop sidebar
│   ├── ActiveSessionBar.tsx   # "WORKOUT IN PROGRESS" banner on other pages
│   ├── AddExerciseModal.tsx   # Exercise picker (search, filter, favorites)
│   ├── ExerciseDatabaseModal.tsx
│   ├── MusclePickerModal.tsx
│   ├── PlanBrowserModal.tsx   # Browse plan library
│   ├── MeasurementModal.tsx
│   ├── InsightsPanel.tsx
│   ├── ExerciseDetailSheet.tsx # Bottom sheet: PR, avg, 1RM sparkline, muscles, form cues
│   ├── EnergyReceipt.tsx      # Post-workout summary card
│   └── ui/                    # Reusable primitives
│       ├── glass-card.tsx     # Glass morphism card wrapper
│       ├── swipe-nav.tsx      # Swipeable section tabs (horizontal)
│       ├── sub-nav-pills.tsx
│       ├── skeleton-shimmer.tsx
│       ├── cube-loader.tsx
│       ├── timeline-row.tsx
│       ├── leaderboard-*.tsx
│       └── onboarding-tooltip.tsx
│
└── lib/                       # Pure logic + hooks (no React components except AuthProvider)
    ├── supabase.ts            # Client singleton
    ├── AuthProvider.tsx        # Auth context
    ├── theme.ts               # Theme modes, storage, accent presets
    ├── useTheme.ts            # useSyncExternalStore hook
    ├── modules.ts             # Module registry (feature flags)
    ├── useModules.ts
    ├── useWorkoutSession.ts   # All workout state, effects & actions (~800 lines)
    ├── offlineQueue.ts        # Offline write queue — enqueue/flush/online listener
    ├── navPills.ts            # Nav structure (swipe sections per tab)
    ├── planLibrary.ts         # 50+ workout templates (PPL, U/L, etc.)
    ├── xpEngine.ts            # XP + leveling
    ├── levelSystem.ts         # Level thresholds + rank names
    ├── achievements.ts        # Achievement defs + rarity
    ├── habitEngine.ts         # Habit logic + gamification
    ├── recoveryEngine.ts      # Muscle recovery estimation
    ├── substitutionEngine.ts  # Smart exercise swaps
    ├── warmupSets.ts          # Auto warmup generation
    ├── strengthBenchmark.ts
    ├── volumeAnalysis.ts
    ├── weightTrend.ts         # EMA smoothing for body weight
    ├── calorieEngine.ts       # TDEE + targets
    ├── energyEstimator.ts / energyLedger.ts / energyGuardrails.ts
    ├── menstrualEngine.ts / cycleTrainingEngine.ts
    ├── dateUtils.ts           # ALL dates use LOCAL time, never UTC
    ├── units.ts / useUnits.ts # Metric/imperial
    ├── useSex.ts              # Male/female mode switch
    ├── useEquipment.ts
    └── updateUserStats.ts / updateExerciseLeaderboard.ts

supabase/
└── migrations/                # 000_baseline.sql through 026_session_rating.sql
```

## Database Schema

27 migrations in `supabase/migrations/`. All tables have RLS (user_id = auth.uid()).

### Core Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User profile | PK=auth id, username, sex, equipment_access[], gym_type |
| `exercises` | Exercise library | name, primary_muscle, equipment, category, is_unilateral, tracking_method |
| `workout_sessions` | Sessions | status (active/completed), date, total_volume, xp_earned, sex |
| `exercise_set_logs` | Individual sets | exercise_id, set_index, weight, reps, duration, distance, is_warmup, rpe, set_type |
| `scheduled_days` | Schedule entries | date, title, is_rest |
| `scheduled_exercises` | Exercises in schedule | order_index, target_sets/reps/weight, rest_seconds, superset_group |
| `workout_templates` | Saved templates | name |
| `workout_template_exercises` | Template contents | same shape as scheduled_exercises |
| `recurring_plans` | Weekly recurrence | weekday (0-6) → template_id |

### Tracking Tables

| Table | Purpose |
|---|---|
| `body_weight_logs` / `weight_trend` | Weight + EMA smoothing |
| `body_measurements` | Tape measurements (type + value_cm) |
| `water_logs` | Daily water intake |
| `habits` / `habit_logs` / `habit_chains` | Habit tracking + streaks |
| `user_stats` | Cached leaderboard stats (publicly readable) |
| `exercise_leaderboard` | Per-exercise bests (publicly readable) |
| `achievements` | Earned achievements |
| `user_modules` | Feature flags per user |
| `target_lifts` / `exercise_goals` | Goal tracking |
| `favorite_exercises` | User favorites |
| `notifications` | In-app notifications |
| `profile_body_stats` | Per-sex body stats (PK = user_id + sex) |

### Exercise Equipment Values

The `exercises.equipment` field uses: `"Barbell"`, `"Dumbbell"`, `"Cable"`, `"Machine"`, `"Bodyweight"`, `"Kettlebell"`, `"Resistance Band"`, `"Other"`

Categories: `"Compound"`, `"Isolation"`, `"Isometric"`, `"Cardio"`

## Workout Session System

Split into two files:
- **`app/lib/useWorkoutSession.ts`** — custom hook with all ~40 useState hooks, effects, and action functions (~700 lines)
- **`app/(main)/workout/page.tsx`** — pure UI: sub-components (CardPanel, StatCell, SwipeSet) + JSX rendering

Key types (exported from useWorkoutSession):

```
WorkoutExercise: { id, exercise_id, order_index, target_sets, target_reps, target_weight,
                   rest_seconds, name, category, equipment, body_segment, isCardio, isBodyweight }

SetEntry: { index, weight, reps, duration, distance, note, completed, logId, is_warmup, rpe, set_type }
```

### Session Flow
1. Page loads → queries Supabase for active session today (resumes if found)
2. User clicks "Begin Session" → creates `workout_sessions` row (status=active)
3. Per exercise: user enters weight/reps → taps checkmark or swipes right → `exercise_set_logs` upsert
4. Rest timer auto-starts (default 90s, configurable per exercise)
5. "Finish Workout" → marks session completed, calculates XP, updates stats/leaderboards

### Session State
- All state lives in `useWorkoutSession()` hook — page component just destructures and renders
- **DB is source of truth** — on reload, active session + completed sets restored from Supabase
- **Draft persistence**: unsaved weight/reps inputs are saved to localStorage keyed by sessionId, restored on page reload or screen wake
- `localStorage` stores `sevel_active_session` flag + `sevel_session_draft_{id}` per-session drafts + `sevel_offline_queue` for failed writes
- **Wake Lock API**: screen stays on during active workout session, re-acquired on tab visibility change
- **Offline queue**: failed DB writes (set completions) are queued in localStorage and flushed when connectivity returns
- **PWA**: installable via manifest.json, service worker caches shell + static assets, network-first for navigation
- Pause state (pausedElapsed) is NOT persisted

### Logging UI
- **Strength**: weight input + reps input + checkmark per set, swipe-to-complete
- **Bodyweight**: reps only (no weight input)
- **Cardio**: duration + distance + speed + incline, single "LOG CARDIO" button
- Warmup sets auto-generated (bar/50%/70%/85% for barbell)

### Features in Session
- **Smart defaults**: per-set placeholders from last session's working sets (weight + reps); auto-fills on tap when inputs empty
- **Quick-log buttons**: full-width "Log Xkg × Y reps" one-tap button, progressive overload chips (+2.5kg/+5lbs, +1 rep), "Copy Set 1"
- **Dual-weight logging**: dumbbell/cable exercises store `is_per_side`, show "/ SIDE" header + "×2" badge, volume calc doubled
- **Edit saved sets**: completed sets show as tappable rows with pencil icon — tap to re-edit
- **Undo last action**: 5-second toast with exercise name + values — undo deletes DB row + resets state
- Overload suggestions (weight/rep increases based on last session)
- Exercise swap mid-session (optionally propagates to template)
- Exercise skip (grays out)
- Cycle-aware training (female mode: intensity/rest adjustments)
- Smart substitutions (equipment mismatch → alternatives)
- Max 3 sessions/day
- Share summary as canvas-rendered image
- **Session counter panel** (split-flap / Solari board style):
  - Three counters: SETS (compact), VOLUME (accent-colored, 2× width), ELAPSED timer
  - Embossed digit tracks with inner shadow, center hairline, CSS 3D flip animation
  - Staggered carry cascade: rightmost digit animates first, leftward digits delayed 60ms each
  - Delta toast: "+N" flies up on volume change after completing a set
  - Comparison ghost: "↑/↓ Xkg vs last session" when previous session data exists
  - Mini rune circle progress (Canvas 2D, 60fps): 16 unique rune glyphs (Algiz→Ansuz) arranged in a circle
    - Dormant sets = faint rune outlines (not dots), completed = accent-colored glyph with white pop flash on reveal
    - Center percentage display (e.g. "93%") in JetBrains Mono bold
    - No progress arc — clean circle of glyphs only
    - Subtle continuous rotation (~1 deg/sec) — living sigil feel
    - Shimmer sweep across glyphs for ambient motion
    - Collapsed (64px): compact circle + "tap for details" hint text
    - Expanded (120px): larger circle + merged calorie estimate + per-exercise volume bars
    - Replaces chevron — tap circle area to toggle expand/collapse
- **RPE rating**: after manual set completion, row of 5 chips (6–10) appears for 3s auto-dismiss; color-coded green/amber/red; stored per set; badge shown on completed sets; suppressed for quick-log
- **Drop sets**: "Drop set" button (orange) adds set at 80% weight, labeled "D", orange-themed row; skips rest timer and PR detection
- **Rest-pause sets**: "Rest-pause" button (violet) adds set at same weight, labeled "RP", violet-themed row; starts 15s micro-rest timer
- **Set type system**: `set_type` column (working/warmup/drop/rest_pause) replaces boolean `is_warmup`
- **Superset grouping**: exercises can be grouped; fuchsia "SS" badge + connector line between grouped exercises; rest timer only starts after all exercises in group complete current round
- **Auto-promote ordering**: active exercises float to top, completed/skipped sink to bottom (view-only reorder via useMemo, preserves DB order and superset adjacency)
- **Exercise detail sheet**: tap exercise name (dotted underline hint) → bottom sheet with PR, average weight, session count, 1RM trend sparkline (Epley formula, 8-week window), target muscles as chips, form cues from exercise DB
- **Session rating**: 5 emoji chips (😵😐😊💪🔥) on energy receipt; stored in `workout_sessions.rating` column; selected chip highlights with accent, others dim
- **Session comparison deltas**: inline "+Xkg" green / "-Yrep" red badges on completed working sets, comparing to previous session's matching set
- **Muscle hit map**: compact body SVG on energy receipt showing which muscle groups were targeted, with accent-highlighted regions and chip labels
- **Exercise rotation badge**: "NEW" badge (green) on exercises with no prior session data, indicating fresh/untrained exercises

## Theme System

4 modes: **Dark** (default), **OLED Black**, **Daylight**, **Auto** (system pref)

- CSS custom properties on `:root`, switched via `data-theme` attribute on `<html>`
- Flash-free init: inline `<script>` reads localStorage before hydration
- `--fg-XX` alpha-step variables (01–95): same alpha value auto-boosts in Daylight for contrast parity
- Accent colors: `--accent-rgb` / `--accent-light-rgb`, 8 presets in theme.ts
- Glass card system: `.glass-card` / `.glass-card-interactive` with per-theme overrides

**HARD RULE**: Never hardcode colors. Use `var(--fg-XX)`, `var(--text-*)`, `var(--bg-*)`, `var(--border*)`, `rgb(var(--accent-rgb) / X)`.

## Navigation

| Level | Mechanism |
|---|---|
| Bottom tabs (mobile) | `MobileNav.tsx` — 5 tabs: Hub, Train, Track, Social, You |
| Desktop | `Sidebar.tsx` |
| Within each tab | `swipe-nav.tsx` — horizontal swipeable sections |
| Section definitions | `navPills.ts` — conditional on enabled modules |
| Module system | `modules.ts` + `useModules.ts` — feature flags, toggled in Discover page |

## Key Patterns

- **Client-side Supabase only** — no API routes, no server-side validation
- **Sex-aware data isolation** — most tables have `sex` column, users switch via useSex hook
- **Local time always** — `dateUtils.ts` enforces local time, never UTC, resets at local midnight
- **XP gamification** — workouts → XP → levels → ranks (INITIATE through SOVEREIGN)
- **Smart Hub cards** — context-dependent: missed workout, PR celebration, weekly recap, cycle phase
- **Never `.upsert()`** on tables with PK + separate unique constraint (causes silent conflicts)

## Backlog

See `memory/project_backlog_remaining.md`. Remaining:
- Sharing features (story cards, milestone cards, year review)
- Daylight theme premium polish
- Per-module tints, reduced motion toggle
- Adaptive calorie targets
- Equipment-aware filtering
- AI Coach (stub only)
- Anti-cheat / anomaly detection
- Legal docs (privacy policy, ToS)
