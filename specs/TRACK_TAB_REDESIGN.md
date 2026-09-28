# Track Tab Complete UI Overhaul

> Created: 2026-09-27
> Status: APPROVED DESIGN — ready to build
> Reference mockup: `sevel_track_hub_v3_complete` widget from design session

---

## Design Philosophy

**Oura's temporal focus + WHOOP's progressive disclosure + Samsung's customization + SEVEL's cross-domain intelligence.**

The Track page tells you what matters NOW (not everything equally), lets you drill deeper with one tap, and surfaces connections between workout + nutrition + water + habits + recovery + cycle data that no other app can.

**Core principles:**
- No feature hidden from users — everything reachable in 1 tap from hub
- Premium = super good, not flashy
- Progressive disclosure: headline number → trend → raw data (3 layers)
- Only show enabled modules — no grayed-out "coming soon" pills
- Every card has a visible "tap for more" chevron indicator
- Female mode shows Cycle card in Trends grid
- Theme-aware colors — NEVER hardcoded, always `var(--fg-XX)`, `rgb(var(--accent-rgb))`

---

## 15 Research-Backed Features

All derived from competitor research (WHOOP, Oura, Samsung Health, Strong, Hevy, MyFitnessPal, Apple Health, Fitbod, Strava, Nike Training Club).

### Hub features (15)

| # | Feature | Source | Status |
|---|---------|--------|--------|
| 1 | One Big Thing — contextual top card | Oura | Build |
| 2 | Progressive disclosure — headline → trend → detail | WHOOP | Build |
| 3 | Temporal organization — Today timeline | Oura | Build |
| 4 | Quick-log always accessible | MyFitnessPal | Build |
| 5 | Cross-domain intelligence cards | SEVEL unique | Build |
| 6 | No paywall on data | Anti-Strong/Hevy | Already done |
| 7 | Visible tap indicators on all cards | Anti-Apple Health | Build |
| 8 | Hierarchy — not everything shown equally | Anti-Apple Health | Build |
| 9 | Simple nav — no SwipeNav pills on Track | Anti-WHOOP 7 tabs | Build |
| 10 | Never increase tap count for daily actions | Anti-MFP redesign | Build |
| 11 | Male/female mode — Cycle card for female | SEVEL unique | Build |
| 12 | Muscle heat map on recovery card | Fitbod | Build |
| 13 | Exercise detail on tap (from History) | Strong | Wire existing |
| 14 | 7-day muscle map — body diagram Trends card | Hevy/Fitbod | Build |
| 15 | Contextual priority rotation — One Big Thing | Oura + WHOOP | Build |

### Sub-page improvements (16)

| # | Feature | Page | Details |
|---|---------|------|---------|
| 16 | Session cards with mini muscle-hit heatmap | History | Each session row shows workout name, volume, duration + small MuscleHeatMap of muscles hit |
| 17 | Group sessions by week with collapsible headers | History | "This Week", "Last Week", "Sept 15–21" etc. — tap to collapse |
| 18 | Compare any two sessions | History | "Compare" button → pick two sessions from dropdown → side-by-side volume/sets/exercise deltas |
| 19 | PR Wall — trophy-case of all-time bests | Strength | Grid of exercise cards, each showing best weight, date achieved, progression sparkline |
| 20 | Estimated 1RM projections | Strength | "At this rate, 100kg bench by March" — linear projection from recent PR trend |
| 21 | Goal timeline with projected date | Weight | "Target 75kg — projected to reach by Dec 14 at current rate" |
| 22 | Before/after delta card | Weight | "Started at 82kg → now 78.2kg (−3.8 kg in 3 months)" at top of page |
| 23 | Daily summary card at top | Intake | Today's calories as one big number + surplus/deficit label before the detailed breakdown |
| 24 | "Ready in ~X hours" time estimates | Recovery | Per-muscle time-to-recovery prediction based on hours since session + volume |
| 25 | "What can I train today?" recommendation | Recovery | Smart card at top: "Back + Biceps are good to go. Chest needs 8 more hours." |
| 26 | Group muscles by status | Recovery | Ready (green) → Recovering (amber) → Fatigued (red) — not flat list |
| 27 | Recovery ↔ Schedule tie-in | Recovery | If tomorrow's plan hits a fatigued muscle, flag with warning banner |
| 28 | Configurable daily water goal | Wellness | User sets their own goal instead of hardcoded 3000ml — stored in profile/localStorage |
| 29 | Hydration-performance correlation | Wellness | Card: "You perform 12% better on days you hit your water goal" — join water_logs + workout volume |
| 30 | Weekly/monthly review card | Habits | Habit completion summary — streaks, hit rate, best/worst habits — collapsed by default, expand to see details |
| 31 | Training recommendations per cycle phase | Cycle | Surface cycleTrainingEngine recs: "Follicular → push heavy compounds" — already exists in lib, just display it |

---

## Architecture Overview

### Current state

```
/track (hub) → SwipeNav pills → [/progress, /body, /recovery, /cycle, /wellness, /habits, ...]
                                        ↓
                               /progress (2,230 lines)
                               AnimatedTabs → [intake | history | strength | body]
                               3 layers of nav eating screen space
```

### New state

```
/track (hub) — complete rewrite as the new dashboard
  ├── One Big Thing (contextual, rotates)
  ├── Today timeline (chronological feed)
  ├── Quick log buttons (Weight, Water, Meal)
  ├── Trends grid (Sessions, Strength, Weight, Intake, 7-day muscle map, Cycle)
  ├── Intelligence card (cross-domain insights)
  └── More modules row (enabled only)

Sub-pages (each standalone, reached by 1 tap from hub):
  /progress/history → History page (extracted from progress tab "history")
  /progress/strength → Strength page (extracted from progress tab "strength")
  /progress/weight → Weight page (extracted from progress tab "body")
  /progress/intake → Intake page (extracted from progress tab "intake")
  /progress → redirects to /track (hub replaces it)
  /recovery → Recovery page (existing, improved UI)
  /wellness → Wellness page (existing, unchanged)
  /habits → Habits page (existing, unchanged)
  /cycle → Cycle page (existing, unchanged)
```

### Key routing changes

| Old route | New behavior |
|-----------|--------------|
| `/track` | **Rewritten** — new hub dashboard |
| `/progress` | **Redirect to `/track`** — hub replaces the old progress landing |
| `/progress/history` | **New** — standalone History page |
| `/progress/strength` | **New** — standalone Strength page |
| `/progress/weight` | **New** — standalone Weight/Body page |
| `/progress/intake` | **New** — standalone Intake page |
| `/recovery` | **Improved UI** — keep existing, add MuscleHeatMap |
| `/wellness` | **Unchanged** |
| `/habits` | **Unchanged** |
| `/cycle` | **Unchanged** |

---

## Build Roadmap

### Phase 1: Split Progress page into standalone sub-pages

**Why first:** The Track hub links to these pages. They must exist before the hub can route to them.

#### Step 1.1: Create `/progress/history` page

**File:** `app/(main)/progress/history/page.tsx`

Extract the `tab === "history"` section (lines ~1014–1293 of current `progress/page.tsx`).

**What it shows:**
- Session log with date, duration, sets, volume, XP
- Calendar view of workout days
- Achievement badges earned
- Each session row is tappable → shows session detail

**Key imports to carry over:**
- `supabase`, `useAuth`, `useSex`, `useUnits`
- `ACHIEVEMENT_DEFS`, `RARITY_COLORS`
- `kgToUnit` from `../../lib/units`

**Navigation:**
- Back button → `router.push("/track")`
- Header: "History" with back chevron
- NO SwipeNav, NO AnimatedTabs

**Exercise detail on tap:** When displaying exercises within a session detail view, tapping an exercise name opens `ExerciseDetailSheet`. Import from `../../components/ExerciseDetailSheet`. This connects research finding #13.

**Sub-page improvement #16 — Session cards with mini muscle-hit heatmap:**
Each session row in the list shows a mini `MuscleHeatMap` (compact, ~60px height) on the right side of the card. Build muscle data by querying `exercise_set_logs` for that session → map exercises to muscle groups via `SEGMENT_TO_MUSCLES` from `MuscleHeatMap.tsx`. This lets users see at a glance which muscles a past session hit.

```tsx
import MuscleHeatMap from "../../../components/MuscleHeatMap";

// Per session card:
<MuscleHeatMap
  muscles={sessionMuscles}
  compact={true}
  showToggle={false}
  showLegend={false}
  showLabels={false}
  height={60}
/>
```

**Sub-page improvement #17 — Group sessions by week with collapsible headers:**
Group sessions into week buckets: "This Week", "Last Week", then date ranges like "Sept 15–21". Each group header is tappable to collapse/expand (local state, default expanded for current week, collapsed for older). Use local date calculation for week boundaries (Monday start).

```tsx
const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
// Group sessions by getWeekKey(session.date)
// Render: <button onClick={() => toggle(weekKey)}>{weekLabel} ({count})</button>
//         {!collapsed[weekKey] && sessions.map(s => <SessionCard />)}
```

**Sub-page improvement #18 — Compare any two sessions:**
Add a "Compare" toggle button in the header. When active, each session card gets a checkbox. Once exactly 2 are selected, show a comparison sheet (bottom sheet or inline expandable) with side-by-side:
- Total volume delta
- Sets completed delta
- Per-exercise deltas (exercises in both sessions get a row with +/- values)
- Duration delta

Query: load `exercise_set_logs` for both session IDs, compute per-exercise volume, show diffs.

#### Step 1.2: Create `/progress/strength` page

**File:** `app/(main)/progress/strength/page.tsx`

Extract the `tab === "strength"` section (lines ~1294–1444 of current `progress/page.tsx`).

**What it shows:**
- PR charts per exercise (recharts LineChart)
- Exercise picker dropdown
- PR goals and targets
- Leaderboard position

**Key imports to carry over:**
- `recharts` (LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer)
- `supabase`, `useAuth`, `useSex`
- `buildStrengthBenchmark` from `../../lib/strengthBenchmark`

**Navigation:**
- Back button → `router.push("/track")`
- Header: "Strength" with back chevron

**Sub-page improvement #19 — PR Wall trophy-case:**
Add a "PR Wall" section at the top of the Strength page. Grid layout (2 columns) of exercise cards, each showing:
- Exercise name
- Best weight + reps (e.g. "100kg × 3")
- Date achieved
- Progression sparkline (last 10 PRs over time using recharts tiny LineChart, no axes)

Data: query `exercise_leaderboard` or compute from `exercise_set_logs` grouped by exercise, ordered by max weight. Filter by `userSex`.

```tsx
// Each PR card
<div className="glass-card p-3">
  <span className="text-[9px] font-mono text-[var(--fg-40)]">{exercise.name}</span>
  <span className="text-xl font-bold font-mono text-[var(--fg-85)]">{bestWeight}{unit}</span>
  <span className="text-[9px] text-[var(--fg-25)]">{formatDate(prDate)}</span>
  <ResponsiveContainer width="100%" height={24}>
    <LineChart data={prHistory}>
      <Line type="monotone" dataKey="weight" stroke="rgb(var(--accent-rgb))" dot={false} strokeWidth={1.5} />
    </LineChart>
  </ResponsiveContainer>
</div>
```

**Sub-page improvement #20 — Estimated 1RM projections:**
Below the PR Wall, add a "Projections" section. For each exercise with 3+ recent PRs, calculate a linear regression slope and project when the user will hit the next round milestone (e.g. 100kg, 140kg).

Display: "At this rate, 100kg bench press by March 2027" — show a dotted projection line on the chart extending from the last data point to the target.

Use existing `buildStrengthBenchmark` data if available. The projection is a simple linear extrapolation — slope from last 6 months of e1RM values.

#### Step 1.3: Create `/progress/weight` page

**File:** `app/(main)/progress/weight/page.tsx`

Extract the `tab === "body"` section (lines ~1445–1611 of current `progress/page.tsx`).

**What it shows:**
- Body weight trend chart with EMA smoothing
- Weight logging form (reuse existing inline weight logger)
- Goal tracking (current vs target)
- Measurement sidebar (links to `/body` for detailed measurements)

**Key imports to carry over:**
- `recharts` (LineChart, Line, etc.)
- `rematerializeWeightTrend`, `type WeightEntry` from `../../lib/weightTrend`
- `MeasurementModal` from `../../components/MeasurementModal`

**Navigation:**
- Back button → `router.push("/track")`
- Header: "Weight" with back chevron

**Sub-page improvement #21 — Goal timeline with projected date:**
If the user has a weight goal set (from profile or body measurements), show a projection card:
- "Target 75kg — projected to reach by Dec 14 at current rate"
- Calculate from average weekly weight change over last 4 weeks → extrapolate to goal
- Show a simple timeline: start weight → current weight → projected goal with dates
- If rate is near zero or going wrong direction: "At current rate, goal may need adjustment"

Data: query `body_weight_logs` last 30 days, compute weekly averages, derive rate. Goal from user profile or `body_measurements` goal fields.

**Sub-page improvement #22 — Before/after delta card:**
Top of page, prominent card showing journey summary:
```
┌─────────────────────────────────────────┐
│ Started at 82.0 kg → Now 78.2 kg       │
│ −3.8 kg in 3 months                    │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░ 63% to goal           │
└─────────────────────────────────────────┘
```
- "Started at" = first weight log ever (or first log in current goal period)
- "Now" = latest weight log
- Duration = time between first and latest log
- Progress bar = distance from start toward goal (only if goal exists)

#### Step 1.4: Create `/progress/intake` page

**File:** `app/(main)/progress/intake/page.tsx`

Extract the `tab === "intake"` section (lines ~1612–2230 of current `progress/page.tsx`).

**What it shows:**
- Calorie summary (TDEE, target, consumed, remaining)
- Macro breakdown (protein, carbs, fat)
- Energy receipt panel
- All 15+ insight cards (prediction vs reality, anomaly, adaptation, lean mass, weekly budget, recovery, recomp, patterns, scenario, diet break, cycle, exercise expenditure)
- Monthly insights and phase performance

**Key imports to carry over (all of these — do NOT miss any):**
- `buildLedger`, `avgDailyNet`, `projectWeightChange`, `projectWeightAtDate`, `daysUntil` from `../../lib/energyLedger`
- `getFullCalorieSummary`, `ageFromDOB` from `../../lib/calorieEngine`
- `checkFeasibility` from `../../lib/energyGuardrails`
- `estimateObservedTdee`, `blendTdee` from `../../lib/energyEstimator`
- `buildEnergyReceipt` from `../../lib/systemValue`
- `EnergyReceiptPanel` from `../../components/EnergyReceipt`
- All insight card components from `../../components/InsightsPanel`
- `buildPredictionVsReality` from `../../lib/predictionReality`
- `explainWeightAnomaly` from `../../lib/anomalyExplainer`
- `detectAdaptation` from `../../lib/metabolicAdaptation`
- `assessLeanMassSignal` from `../../lib/leanMassSignal`
- `calcWeeklyBudget` from `../../lib/weeklyBudget`
- `getRecoveryAdjustment` from `../../lib/recoveryEngine`
- `assessRecomp` from `../../lib/recompMode`
- `detectPatterns` from `../../lib/energyGuardrails`
- `modelScenario` from `../../lib/scenarioModeling`
- `shouldSuggestDietBreak`, `planDietBreak` from `../../lib/dietBreaks`
- `comparePhaseToPhase`, `estimateCyclePhase`, `getCyclePhaseInfo`, `computeAdaptiveCycleLength`, `fetchCycleLogs` from `../../lib/cycleAwareTrend`
- `estimateSessionExpenditure` from `../../lib/exerciseExpenditure`
- `buildMonthlyInsights` from `../../lib/monthlyInsights`
- `buildStrengthBenchmark` from `../../lib/strengthBenchmark`
- `buildPhasePerformance` from `../../lib/phasePerformance`

**Navigation:**
- Back button → `router.push("/track")`
- Header: "Intake" with back chevron

**Sub-page improvement #23 — Daily summary card at top:**
Before the detailed breakdown and insight cards, show one hero card with today's calories as a single big number:
```
┌─────────────────────────────────────────┐
│ TODAY                                   │
│ 1,847 kcal                              │
│ ▓▓▓▓▓▓▓▓▓▓░░░░░ 78% of 2,350 target   │
│                                         │
│ 153 remaining  •  SURPLUS +47           │
│ P: 142g  C: 198g  F: 67g               │
└─────────────────────────────────────────┘
```
- Big number: today's consumed calories (from `food_logs` WHERE `logged_at >= today start`)
- Progress bar: consumed / target (from calorie engine)
- Remaining or surplus label: target − consumed (green if under, amber if over)
- Macro row: protein, carbs, fat totals for today
- This is a glanceable summary — the detailed insight cards still appear below

#### Step 1.5: Update `/progress` page

**File:** `app/(main)/progress/page.tsx`

Replace the entire 2,230-line page with a redirect:

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProgressRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/track"); }, [router]);
  return null;
}
```

This ensures any existing links to `/progress` (from Hub, Schedule, etc.) still work — they land on the Track hub.

### Phase 2: Rewrite `/track` hub page

**File:** `app/(main)/track/page.tsx` — complete rewrite

#### Section-by-section build order:

##### 2.1: Page shell + data loading

```
Imports needed:
- useAuth, useSex, useModules, useUnits from existing hooks
- supabase from ../../lib/supabase
- motion from framer-motion
- ChevronRight, Scale, Droplet, Flame, Calendar, Trophy, Brain, HeartPulse from lucide-react
- MuscleHeatMap from ../../components/MuscleHeatMap (for body heat map)
- analyzeRecovery from ../../lib/muscleRecovery
- estimateCyclePhase, getCyclePhaseInfo from ../../lib/cycleAwareTrend
- router from next/navigation
```

**Data to fetch on mount (single useEffect):**
1. This week's workout sessions + set logs → volume, session count, muscle distribution
2. Last 6 weeks of volumes → for trends sparklines
3. Body weight logs (latest 2) → current weight + delta
4. PR count from `exercise_leaderboard`
5. Today's water logs → sum and streak
6. Today's habit completions → count and total
7. Recovery data → via `analyzeRecovery()`
8. Latest PR info → for the PR celebration variant
9. Cycle data (female only) → via `estimateCyclePhase()`
10. Today's food logs → calories consumed + remaining
11. Month session count → for session frequency

All queries MUST filter by `.eq("sex", userSex)` where the table has a `sex` column.

##### 2.2: One Big Thing — contextual rotation

**Component:** `OneBigThing` (inline in track/page.tsx or separate component)

**Context detection logic (in priority order):**
1. **PR celebration** — if user hit a PR in the last 24 hours → show PR card with exercise name, weight, delta from previous best
2. **Cycle phase change** (female only) — if cycle phase changed today or yesterday → show phase transition card with training recommendation
3. **Recovery status** — if last workout was within 48 hours → show recovery % + MuscleHeatMap mini silhouette
4. **Weekly review** — if today is Monday → show last week's summary (sessions, volume, PRs, volume change %)
5. **Today's plan** — if there's a scheduled workout for today → show exercise count, time estimate, target muscles with MuscleHeatMap

**MuscleHeatMap integration (research finding #12):**
- Import `MuscleHeatMap` from `../../components/MuscleHeatMap`
- Use `compact={true}` and `showToggle={false}` for the mini view
- Pass muscle data from recovery analysis or scheduled workout
- This is the SAME component used in Schedule page and WorkoutCompleteCard — reuse it exactly, do not create a new SVG body silhouette

**Each variant structure:**
```
┌─────────────────────────────────────┐
│ [icon] LABEL                    [>] │
│                                     │
│ Title line          [score/visual]  │
│ Description text    [MuscleHeatMap] │
│                                     │
│ ── sub-stats ──────────────────── │
│ [icon] stat  [icon] stat  [icon] st │
└─────────────────────────────────────┘
```

**Tap behavior:** Routes to the relevant detail page:
- Recovery → `/recovery`
- PR → `/progress/strength`
- Weekly review → `/progress/history`
- Today's plan → `/schedule`
- Cycle change → `/cycle`

##### 2.3: Today timeline

**Component:** `TodayTimeline`

**Data sources (all today, local date):**
- Workout sessions → from `workout_sessions` WHERE `date = today AND status = 'completed'`
- Weight log → from `body_weight_logs` WHERE `logged_at >= today start`
- Habit completions → from `habit_completions` WHERE `date = today`
- Water logs → from `water_logs` WHERE `logged_at >= today start`
- Food logs → from `food_logs` WHERE `logged_at >= today start` (if nutrition module enabled)

**Each timeline item:**
```
┌─────────────────────────────────────┐
│ [icon] Title                   time │
│        Subtitle detail          [>] │
└─────────────────────────────────────┘
```

**Tap behavior:**
- Workout → shows session detail (could be a sheet or route to `/progress/history`)
- Weight → `/progress/weight`
- Habits → `/habits`
- Water → `/wellness`
- Meal → `/progress/intake`

**"Full history" link** in section header → `/progress/history`

##### 2.4: Quick log buttons

Three buttons in a row: **Weight**, **Water**, **Meal**

**Weight button:** Opens a bottom sheet with weight input (reuse existing weight logging pattern from progress page body tab — number input + "Log" button → inserts into `body_weight_logs`).

**Water button:** Quick-adds the default amount (250ml) to `water_logs`, shows a toast confirmation. One tap = logged.

**Meal button:** Routes to `/progress/intake` for now. When nutrition module is built, this would open a quick meal logger.

##### 2.5: Trends grid

2-column grid of trend cards. Each shows: label, headline number, delta/change, mini chart, and "Details >" tap indicator.

**Cards (always shown):**
1. **Sessions** — count this month / target, delta vs last month, 6-week mini bar chart. Tap → `/progress/history`
2. **Strength** — total PR count, latest PR name + days ago, sparkline trend. Tap → `/progress/strength`
3. **Weight** — current weight, weekly delta, goal line sparkline. Tap → `/progress/weight`
4. **Intake** — today's calories, remaining, macro summary (P/C/F), progress bar. Tap → `/progress/intake`

**Cards (conditional):**
5. **7-day muscle map** (full width, always shown) — uses `MuscleHeatMap` component with `compact={true}`, `dualView={false}`, `showToggle={false}`. Shows color-coded body diagram + legend with set counts per muscle group. If a muscle group is undertrained (<3 sets/week while others are >8), show a warning. Tap → `/recovery`
6. **Cycle** (full width, female only — `sex === "female" && enabledKeys.includes("cycle")`) — cycle day ring, current phase, fertility level, training tip. Tap → `/cycle`

**IMPORTANT — MuscleHeatMap for the 7-day muscle map card:**
```tsx
import MuscleHeatMap from "../../components/MuscleHeatMap";

// Build muscle data from this week's exercise_set_logs
const muscles = muscleGroups.map(g => ({
  muscle: g.key,  // "Chest", "Back", "Legs", etc. — matches SEGMENT_TO_MUSCLES keys
  intensity: Math.min(10, Math.round((g.setCount / maxSets) * 10))
}));

<MuscleHeatMap
  muscles={muscles}
  compact={true}
  showToggle={false}
  showLegend={false}
  height={120}
/>
```

##### 2.6: Intelligence card

**Component:** `IntelligenceCard`

Cross-domain insight that connects data from multiple modules. This is SEVEL's unique differentiator.

**Insight generation logic (pick the most relevant):**
1. Cycle + Strength: "Your squat peaks during follicular phase — you're in it now"
2. Sleep + Performance: "Volume drops 15% on days after <6h sleep" (when sleep module exists)
3. Habits + Training: "You train more consistently on days you complete your morning routine"
4. Weight + Volume: "You've gained 0.5kg but volume is up 18% — likely muscle"
5. Water + Recovery: "Recovery is faster on days you hit your water goal"

For now, build 2-3 hardcoded insight templates that pull real data. The intelligence engine can be expanded later.

**Structure:**
```
┌─────────────────────────────────────┐
│ [brain icon] CROSS-DOMAIN INSIGHT   │
│                                     │
│ Insight text connecting two domains │
│                                     │
│ Updates weekly          View all [>]│
└─────────────────────────────────────┘
```

Tap → could open an insights detail page in the future. For now, no route — just the card.

##### 2.7: More modules row

Horizontal scroll of enabled module pills. Only modules the user has enabled via `useModules()` hook.

**Which modules to show here:**
- Recovery (`/recovery`) — if `enabledKeys.includes("recovery")`
- Habits (`/habits`) — if `enabledKeys.includes("habits")`
- Wellness/Hydration (`/wellness`) — if `enabledKeys.includes("wellness")`

**DO NOT show:**
- Modules already represented as Trends cards (Sessions, Strength, Weight, Intake, Cycle)
- Modules not yet enabled by the user
- "Coming soon" grayed-out pills — absolutely none

Each pill has: icon + label + chevron. Tap → routes to that module's page.

### Phase 3: Update routing and navigation

#### Step 3.1: Update `navPills.ts`

The Track section no longer uses SwipeNav, but `navPills.ts` still defines `trackPillsDef` which `getAllRoutes()` uses for `MobileNav` matching. The Track tab in MobileNav needs to match all Track-related routes.

**Changes to `app/lib/navPills.ts`:**
- Keep `trackPillsDef` array (used by `getAllRoutes` for MobileNav route matching)
- Add the new sub-routes to the array:
  ```ts
  { key: "/progress/history", label: "HISTORY", icon: Calendar, colorRgb: "16 185 129" },
  { key: "/progress/strength", label: "STRENGTH", icon: Dumbbell, colorRgb: "16 185 129" },
  { key: "/progress/weight", label: "WEIGHT", icon: Weight, colorRgb: "16 185 129" },
  { key: "/progress/intake", label: "INTAKE", icon: Flame, colorRgb: "16 185 129" },
  ```
- Remove the old `/progress` pill (or keep it — the redirect handles it)
- Remove `getTrackSections()` export if nothing else uses it (Track hub no longer calls it)

#### Step 3.2: Update MobileNav route matching

**File:** `app/components/MobileNav.tsx`

The `routes.track` array from `getAllRoutes()` already dynamically includes whatever's in `trackPillsDef`. After adding the new sub-routes in Step 3.1, MobileNav will automatically highlight the Track tab for `/progress/history`, `/progress/strength`, etc.

**Verify:** The Track tab match array includes:
```
["/track", "/progress", "/progress/history", "/progress/strength", "/progress/weight", "/progress/intake", "/body", "/recovery", "/cycle", "/wellness", "/habits"]
```

#### Step 3.3: Fix all existing links pointing to `/progress`

These links currently point to `/progress` and need updating:

| File | Line | Current | New |
|------|------|---------|-----|
| `app/(main)/track/page.tsx` | 269 | `router.push("/progress")` | Removed (page is rewritten) |
| `app/(main)/page.tsx` (Hub) | 758 | `router.push("/progress")` | `router.push("/track")` |
| `app/(main)/page.tsx` (Hub) | 888 | `router.push("/progress")` | `router.push("/track")` |
| `app/(main)/page.tsx` (Hub) | 1208 | `router.push("/progress")` | `router.push("/track")` |
| `app/(main)/schedule/page.tsx` | 1815 | `router.push("/progress")` | `router.push("/track")` |
| `app/(main)/schedule/page.tsx` | 1853 | `onProgress={() => router.push("/progress")}` | `onProgress={() => router.push("/track")}` |

**CRITICAL:** The `/progress` redirect (Step 1.5) is a safety net. But we should still update direct links so users don't hit a redirect on every navigation.

#### Step 3.4: Remove SwipeNav from Track sub-pages

These pages currently import and render `SwipeNav` + `getTrackSections`. Remove those imports and the `<SwipeNav>` JSX from:

- `app/(main)/recovery/page.tsx` (line ~16-17 imports, rendered in JSX)
- `app/(main)/wellness/page.tsx` (check for SwipeNav import)
- `app/(main)/habits/page.tsx` (check for SwipeNav import)
- `app/(main)/cycle/page.tsx` (check for SwipeNav import)
- `app/(main)/body/page.tsx` (check for SwipeNav import)

Replace with a simple back button header:
```tsx
<button onClick={() => router.push("/track")} className="flex items-center gap-1 text-[var(--fg-40)] hover:text-[var(--fg-60)] transition">
  <ChevronLeft size={18} />
  <span className="text-xs font-mono">Track</span>
</button>
```

### Phase 4: Improve Recovery page UI

**File:** `app/(main)/recovery/page.tsx`

Current issues:
- Readiness bars + individual muscle cards show same data redundantly
- No body diagram visualization

**Changes:**
1. Add `MuscleHeatMap` component at the top showing full recovery visualization
   ```tsx
   import MuscleHeatMap from "../../components/MuscleHeatMap";
   // Map recovery data to MuscleHeatMap format
   // intensity 1-3 = fatigued (red), 4-6 = moderate (yellow), 7-10 = recovered (green)
   ```
2. Replace redundant readiness bars with a cleaner summary
3. Keep per-muscle detail cards below the heat map for drill-down
4. Remove SwipeNav (Phase 3.4)
5. Add back button to Track hub

**Sub-page improvement #24 — "Ready in ~X hours" time estimates:**
For each muscle in the recovery list, calculate estimated time-to-recovery:
- `hoursElapsed = (now - lastSessionEnd) / 3600000`
- `totalRecoveryHours` = based on volume + intensity (light session ~24h, moderate ~48h, heavy ~72h)
- `remainingHours = Math.max(0, totalRecoveryHours - hoursElapsed)`
- Display: "Ready in ~8 hours" or "Ready" (if remainingHours <= 0)

Show this as a subtitle on each muscle card. Use the existing `analyzeRecovery` output — it already tracks `hoursSinceLastTrained` per muscle group.

**Sub-page improvement #25 — "What can I train today?" recommendation:**
Smart card pinned at the top of the Recovery page (above the MuscleHeatMap):
```
┌─────────────────────────────────────────┐
│ [lightning icon] READY TO TRAIN         │
│                                         │
│ Back + Biceps are good to go            │
│ Chest needs ~8 more hours               │
│ Legs are fatigued — rest recommended    │
│                                         │
│ View schedule                       [>] │
└─────────────────────────────────────────┘
```
- List muscles grouped by status: ready ones first (green), then recovering with time estimate (amber), then fatigued (red)
- "View schedule" tap → `/schedule`
- Data: from `analyzeRecovery()` result, partition muscles into ready/recovering/fatigued

**Sub-page improvement #26 — Group muscles by status:**
Instead of a flat list of muscle cards, group them into 3 collapsible sections:
1. **Ready** (green accent) — muscles with recovery >= 90%
2. **Recovering** (amber accent) — muscles with recovery 40-89%
3. **Fatigued** (red accent) — muscles with recovery < 40%

Each section header shows count: "Ready (5)" / "Recovering (3)" / "Fatigued (1)". Section color uses CSS variables — `rgb(var(--accent-rgb))` for ready, `var(--fg-40)` with amber tint for recovering, similar for fatigued. Keep it theme-safe.

**Sub-page improvement #27 — Recovery ↔ Schedule tie-in:**
If the user has a scheduled workout for tomorrow (query `scheduled_plans` for tomorrow's date), check which muscles it targets. If any of those muscles are currently in "Fatigued" status, show a warning banner at the top:
```
┌─────────────────────────────────────────┐
│ ⚠ Tomorrow's plan hits CHEST which is  │
│ still fatigued. Consider swapping to    │
│ a different muscle group.               │
│                                         │
│ View tomorrow's plan              [>]   │
└─────────────────────────────────────────┘
```
- Tap → `/schedule` (or scroll to tomorrow on schedule page)
- Only show if there's an actual conflict — don't show the banner if everything is recovered

### Phase 4B: Improve Wellness page

**File:** `app/(main)/wellness/page.tsx`

**Sub-page improvement #28 — Configurable daily water goal:**
Currently hardcoded to 3000ml. Replace with a user-configurable goal.

- **Storage:** Use localStorage key `sevel_water_goal_ml` (number, default 3000). Optionally save to Supabase `profiles` table if a column exists — check first.
- **UI:** Add a small gear icon next to the daily goal display. Tap → opens a mini modal or inline editor with a `StepperInput` (from `../../components/StepperInput`) with step=250, min=500, max=6000, suffix="ml".
- **Effect:** All progress bars, percentage calculations, and "goal reached" celebrations use the custom goal instead of hardcoded 3000.

**Sub-page improvement #29 — Hydration-performance correlation:**
Add a card below the daily water tracker:
```
┌─────────────────────────────────────────┐
│ [droplet icon] HYDRATION INSIGHT        │
│                                         │
│ You perform 12% better on days          │
│ you hit your water goal                 │
│                                         │
│ Based on last 30 days                   │
└─────────────────────────────────────────┘
```
- **Calculation:** Query `water_logs` and `workout_sessions` + `exercise_set_logs` for last 30 days
- Group days into "goal hit" vs "goal missed"
- Compare average total volume (sum of weight × reps) between the two groups
- `delta = ((goalHitAvgVol - goalMissedAvgVol) / goalMissedAvgVol * 100).toFixed(0)`
- If not enough data (< 5 days in either bucket): show "Log more to unlock this insight" instead
- If delta is negative or negligible: don't show the card (hide quietly)

### Phase 4C: Improve Habits page

**File:** `app/(main)/habits/page.tsx`

**Sub-page improvement #30 — Weekly/monthly review card:**
Add a collapsible "Review" card at the top of the habits page:
```
┌─────────────────────────────────────────┐
│ [chart icon] THIS WEEK'S REVIEW    [v] │
│                                         │
│ Hit rate: 78% (14/18 completions)       │
│ Best streak: Morning Routine (12 days)  │
│ Most missed: Reading (2/7 days)         │
│                                         │
│ vs last week: +8%                       │
└─────────────────────────────────────────┘
```
- **Data:** Query `habit_completions` for this week (Monday–today) + last week
- Calculate: total completions / total possible, per-habit hit rates
- Best streak: query `habit_streaks` or compute from consecutive completions
- Most missed: habit with lowest hit rate this week
- Weekly delta: this week's hit rate vs last week's
- Default collapsed if it's early in the week (Mon/Tue), expanded Wed+

### Phase 4D: Improve Cycle page

**File:** `app/(main)/cycle/page.tsx`

**Sub-page improvement #31 — Training recommendations per cycle phase:**
The `cycleTrainingEngine` library already exists and generates training recommendations per cycle phase. Verify it's surfaced on the Cycle page.

- **Check:** Does the current Cycle page display `getPhaseTrainingRec()` output? If not, add a card:
```
┌─────────────────────────────────────────┐
│ [dumbbell icon] TRAINING FOR THIS PHASE │
│                                         │
│ Follicular Phase (Day 6)                │
│ → Push heavy compounds                  │
│ → Higher volume tolerated               │
│ → Great time for PR attempts            │
└─────────────────────────────────────────┘
```
- Import from `../../lib/cycleTrainingEngine` — use `getCycleTrainingRecommendation(phase)` or equivalent
- Show: phase name, day in phase, 2-3 bullet training recommendations
- This is a display-only task — the engine logic already exists

### Phase 5: Verify and fix

#### Step 5.1: Route verification checklist

Test every route and verify no broken links:

- [ ] `/track` → new hub dashboard loads
- [ ] `/progress` → redirects to `/track`
- [ ] `/progress/history` → History page loads with session data
- [ ] `/progress/strength` → Strength page loads with PR charts
- [ ] `/progress/weight` → Weight page loads with trend chart
- [ ] `/progress/intake` → Intake page loads with calorie data + all insight cards
- [ ] `/recovery` → Recovery page loads with MuscleHeatMap + no SwipeNav
- [ ] `/wellness` → Wellness page loads unchanged + no SwipeNav
- [ ] `/habits` → Habits page loads unchanged + no SwipeNav
- [ ] `/cycle` → Cycle page loads unchanged (female mode) + no SwipeNav
- [ ] `/body` → Body page loads + no SwipeNav
- [ ] Hub page → all cards that linked to `/progress` now go to `/track`
- [ ] Schedule page → progress links go to `/track`
- [ ] MobileNav → Track tab highlights for all sub-routes
- [ ] Back buttons on all sub-pages → return to `/track`

#### Step 5.2: Data verification

- [ ] All Supabase queries filter by `.eq("sex", userSex)`
- [ ] MuscleHeatMap renders with real data (not dummy)
- [ ] One Big Thing shows correct variant based on context
- [ ] Cycle card only appears for female users
- [ ] More row only shows enabled modules
- [ ] Today timeline shows today's data (local timezone, never UTC)
- [ ] Quick log buttons actually log data (weight, water)
- [ ] Trend cards show real calculated numbers

#### Step 5.3: Sub-page improvements verification

- [ ] History: session cards show mini MuscleHeatMap per session
- [ ] History: sessions grouped by week with collapsible headers
- [ ] History: compare mode selects 2 sessions and shows diff
- [ ] Strength: PR Wall grid renders with sparklines
- [ ] Strength: 1RM projections show realistic dates
- [ ] Weight: before/after delta card at top with correct math
- [ ] Weight: goal timeline shows projected date (or "adjust" message)
- [ ] Intake: daily summary hero card shows today's calories + macros
- [ ] Recovery: "What can I train today?" card with correct status
- [ ] Recovery: muscles grouped by Ready/Recovering/Fatigued
- [ ] Recovery: time estimates ("Ready in ~X hours") per muscle
- [ ] Recovery: schedule tie-in warning when tomorrow hits fatigued muscle
- [ ] Wellness: water goal is configurable (not hardcoded 3000ml)
- [ ] Wellness: hydration-performance correlation card shows real data (or hides gracefully)
- [ ] Habits: weekly review card shows hit rate, best streak, most missed
- [ ] Cycle: training recommendations per phase displayed from cycleTrainingEngine

#### Step 5.4: No-regression check

- [ ] Hub page still works (cards, links, greeting)
- [ ] Schedule page still works (progress links updated)
- [ ] WorkoutCompleteCard still works (MuscleHeatMap import unchanged)
- [ ] ExerciseDetailSheet still works (opened from schedule + workout pages)
- [ ] All existing Track sub-pages still functional (/wellness, /habits, /cycle, /body)

---

## Files Changed Summary

### New files
| File | Purpose |
|------|---------|
| `app/(main)/progress/history/page.tsx` | Standalone History page |
| `app/(main)/progress/strength/page.tsx` | Standalone Strength page |
| `app/(main)/progress/weight/page.tsx` | Standalone Weight/Body page |
| `app/(main)/progress/intake/page.tsx` | Standalone Intake page |

### Rewritten files
| File | Change |
|------|--------|
| `app/(main)/track/page.tsx` | Complete rewrite — new hub dashboard |
| `app/(main)/progress/page.tsx` | 2,230 lines → redirect to `/track` |

### Modified files
| File | Change |
|------|--------|
| `app/lib/navPills.ts` | Add progress sub-routes to trackPillsDef |
| `app/(main)/page.tsx` (Hub) | Update 3 `/progress` links → `/track` |
| `app/(main)/schedule/page.tsx` | Update 2 `/progress` links → `/track` |
| `app/(main)/recovery/page.tsx` | Add MuscleHeatMap, remove SwipeNav, add back button |
| `app/(main)/wellness/page.tsx` | Remove SwipeNav, add back button, configurable water goal, hydration insight card |
| `app/(main)/habits/page.tsx` | Remove SwipeNav, add back button, weekly/monthly review card |
| `app/(main)/cycle/page.tsx` | Remove SwipeNav, add back button, surface training recommendations per phase |
| `app/(main)/body/page.tsx` | Remove SwipeNav if present, add back button |

### Unchanged files (verify no regression)
| File | Why unchanged |
|------|---------------|
| `app/components/MuscleHeatMap.tsx` | Reused as-is in Track hub + Recovery |
| `app/components/ExerciseDetailSheet.tsx` | Reused as-is in History page |
| `app/components/MobileNav.tsx` | Auto-updates via `getAllRoutes()` |
| `app/components/WorkoutCompleteCard.tsx` | No changes needed |

---

## Styling Rules (from project conventions)

- All colors via CSS variables: `var(--fg-XX)`, `var(--bg-primary)`, `rgb(var(--accent-rgb))`
- NEVER hardcode colors like `#34d399` or `text-emerald-400` — use theme tokens
- Glass card pattern: `className="glass-card"` or inline with `bg-[var(--fg-04)]`, `border border-[var(--fg-06)]`, `rounded-xl`
- Font: `font-mono` for numbers/stats, `font-display` for headings
- Animations: use `staggerContainer` / `staggerItem` from `../../lib/motion`
- Text sizes: labels `text-[9px]`, body `text-xs`, numbers `text-2xl font-bold`
- Spacing: cards `p-4`, gaps `gap-2` or `gap-2.5`, section padding `px-4`

---

## Critical Gotchas

1. **Supabase upsert bug** — NEVER use `.upsert()` on tables with PK + separate unique constraint. Use explicit insert/update pattern.

2. **Timezone** — ALL dates must use local time, never UTC. Reset at local midnight. Use the `toDateString()` helper already in the codebase.

3. **Sex filtering** — Every Supabase query on tables with a `sex` column MUST include `.eq("sex", userSex)`.

4. **MuscleHeatMap import** — Use the existing `app/components/MuscleHeatMap.tsx` component. It uses the `body-muscles` library (Apache-2.0). Do NOT create a new SVG body silhouette.

5. **Module gating** — Use `useModules()` hook → `enabledKeys` array. Only show cards/pills for modules in `enabledKeys`. Cycle card: `enabledKeys.includes("cycle") && sex === "female"`.

6. **Progress page imports** — When splitting the 2,230-line progress page, carry over ALL imports for each tab. The intake tab alone has 15+ lib imports. Missing one breaks the page silently.

7. **Service worker cache** — After deploying, if phantom errors appear, unregister the service worker and clear caches. The PWA service worker caches stale JS.

8. **Apply-one-at-a-time rule** — Build and verify each phase before moving to the next. Don't batch all changes.
