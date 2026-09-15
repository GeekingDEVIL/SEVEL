# ASCEND — Workout Logging Upgrade Plan

> Master feature list for the session logging overhaul.
> Every feature maps to exact files, describes integration points with existing systems,
> and flags what could break if done wrong.

---

## Architecture Principle: Don't Break What Works

The workout page (`app/(main)/workout/page.tsx`) is ~2000 lines with ~40 state variables.
Before touching it, we follow these rules:

1. **Extract before extending** — Pull reusable logic into `app/lib/` files, not inline in the page
2. **New state goes through a reducer** — The 40+ useState calls need consolidation into a `useReducer` or a custom `useWorkoutSession` hook. Every new feature adds state — without this, we'll have spaghetti within 2 features.
3. **Test each feature against these existing systems before shipping:**
   - Rest timer (auto-start after set completion)
   - Warmup set generation (depends on set indexing)
   - XP calculation (depends on completed sets count + volume)
   - PR detection (depends on weight/reps values)
   - Leaderboard updates (depends on best weight/reps)
   - Overload suggestions (depends on lastPerformance data)
   - Cycle-aware training (female mode: intensity multipliers)
   - Energy receipt / post-workout summary (depends on session totals)
   - Active session bar on other pages (depends on localStorage flag)
   - Swipe-to-complete (depends on set completion flow)

**Step 0 (do first, before any feature):** Refactor workout state into `app/lib/useWorkoutSession.ts` — a single hook that owns all session state, exposes actions (completeSet, addSet, undoSet, etc.), and handles persistence. This is the foundation everything else plugs into.

---

## TIER 1 — Core Logging Overhaul (Build First)

These are the friction killers. They change how every single set feels.

---

### 1.1 Smart Defaults + Previous Performance Overlay

**What:** When you expand an exercise, every set row pre-fills with last session's weight/reps as ghost text. Set 2+ also copies Set 1's values once Set 1 is completed.

**Where:**
- `app/(main)/workout/page.tsx` lines 163-164 — `lastPerformance` state already exists but only stores ONE weight/reps pair per exercise. Change to store ALL sets from last session.
- `app/(main)/workout/page.tsx` line 77 — `emptySet()` function currently returns blank fields. Make it accept optional defaults.
- `app/(main)/workout/page.tsx` lines 327-351 — Session restore logic. Also restore last-session data per set.
- Query: `exercise_set_logs` WHERE exercise_id = X, from most recent completed session, ordered by set_index.

**Integration risks:**
- Overload suggestions (`computeOverload` line 81) currently use single last weight/reps. Update to use per-set data for smarter suggestions.
- Warmup sets have their own weight values — don't override warmup defaults with last-session working weights.
- PR detection: ghost/default values must NOT count as logged until user confirms. Only committed values go to `checkPR`.

**From user:** Nothing needed.

---

### 1.2 Quick-Log Buttons (Reduce Phone-Glue)

**What:** Below each set row, show tappable chips:
- "Same as last" (repeats last session's exact set)
- "+2.5 kg" / "+1 rep" (progressive overload in one tap)
- "Copy Set 1" (for sets 2+)

One tap = fills AND completes the set. Two taps max for any set.

**Where:**
- `app/(main)/workout/page.tsx` lines 1714-1787 — The set row rendering area. Add chip row below each incomplete set.
- `app/(main)/workout/page.tsx` line 580 — `completeSet()`. Quick-log chips call this directly with pre-filled values.
- New component: `app/components/ui/quick-log-chips.tsx` — Reusable chip row.

**Integration risks:**
- Swipe-to-complete (`SwipeSet` line 111): Quick-log is an alternative completion path. Both must call the same `completeSet` function. Don't create a second save path.
- Rest timer: Must trigger after quick-log just like normal completion (line 604).
- Haptic feedback: Must fire on quick-log too (line 596 `navigator.vibrate`).

**From user:** Nothing needed.

---

### 1.3 Dumbbell/Cable Dual-Weight Logging

**What:** For exercises where `equipment === "Dumbbell"` or `equipment === "Cable"` (or any bilateral cable/machine), show:
- Single weight input labeled "Per side"
- Display: "25 kg × 2" next to the input
- Store the PER-SIDE value in `exercise_set_logs.weight`
- Volume calculation: `weight × 2 × reps`

**Where:**
- `app/(main)/workout/page.tsx` lines 1714-1740 — Weight input rendering. Add conditional per-side label.
- `exercises` table — Has `equipment` column (values: "Dumbbell", "Cable", "Machine", etc.) and `is_unilateral` boolean. Use: `equipment === "Dumbbell" || (equipment === "Cable" && !is_unilateral)` to determine dual-weight mode.
- `app/(main)/workout/page.tsx` line 580 — `completeSet()`: Volume calc currently doesn't multiply by 2. Add multiplier for dual-weight exercises.
- `app/lib/xpEngine.ts` — XP is partly volume-based. Must use same volume calc.
- `app/lib/updateUserStats.ts` — Total volume stat. Must match.

**Integration risks:**
- **Leaderboard / PR detection**: Currently stores raw weight from `exercise_set_logs.weight`. If we change to per-side, historical data for dumbbells would be at TOTAL weight but new data at PER-SIDE. Need a migration strategy:
  - Option A: Add `is_per_side` boolean to `exercise_set_logs`. Display adapts. No historical data change.
  - Option B: Migrate historical dumbbell logs to per-side values (risky).
  - **Recommend Option A** — safer, no data loss.
- **Overload suggestions**: Must compare per-side to per-side. If last session stored total (old format), divide by 2 for comparison.
- **Warmup set generation** (`app/lib/warmupSets.ts`): Generates warmup weights based on working weight. Must know if input is per-side to calculate plate loading correctly.

**DB change needed:** Add `is_per_side BOOLEAN DEFAULT false` to `exercise_set_logs` table.

**From user:** Nothing needed.

---

### 1.4 Edit Saved Sets

**What:** Tap a completed set row → inputs reopen with current values → edit → re-save.

**Where:**
- `app/(main)/workout/page.tsx` lines 1714-1787 — Set row rendering. Currently completed sets show static text. Add tap handler to revert to editable state.
- `app/(main)/workout/page.tsx` line 580 — `completeSet()` already handles upsert (insert or update if `logId` exists). Edit just sets `completed = false` on the entry, user edits, then re-completes which updates via logId.

**Integration risks:**
- **PR detection**: If user edits a set DOWN from a PR value, the PR notification already fired. Don't re-check on edit, or if we do, don't show a "new PR" toast for a lower value.
- **XP/volume**: If user edits weight after session summary was shown... this is only possible during active session (can't edit completed sessions), so volume recalculates naturally at finish time.
- **Rest timer**: Don't restart rest timer on edit-save. Add a flag: `isEdit: true` to skip rest timer trigger.

**From user:** Nothing needed.

---

### 1.5 Undo Last Action

**What:** After completing a set, show a 5-second toast at the bottom: "Set logged ✓ — Undo". Tapping undo reverts the set to incomplete, deletes the `exercise_set_logs` row, and cancels the rest timer.

**Where:**
- `app/(main)/workout/page.tsx` line 580 — After `completeSet()` succeeds, push to an undo stack.
- New state: `lastAction: { type: "complete_set", exId, setIdx, logId, timestamp } | null`
- Undo handler: Set `completed = false`, delete from DB via logId, clear rest timer.
- Toast component: `app/components/ui/undo-toast.tsx`

**Integration risks:**
- **PR detection**: If a PR was detected on the set being undone, decrement `prCount`. The PR toast may have already shown — that's fine, the undo corrects the data.
- **Rest timer**: Must cancel on undo (currently at line 604).

**From user:** Nothing needed.

---

## TIER 2 — Session Intelligence (Build Second)

These make the app smarter during a session.

---

### 2.1 Running Session Stats Bar

**What:** Sticky mini-bar at the top (or below the timer) showing: Sets done / total | Volume moved | Elapsed time. Animated number counters like the hub dashboard cards.

**Where:**
- `app/(main)/workout/page.tsx` — Add above the exercise list, below the rest timer area (around line 1600).
- Volume: Sum all completed set weights × reps (accounting for dual-weight × 2).
- Sets: Count completed non-warmup sets vs total target sets.
- Time: Already tracked via `elapsed` state (line 167).
- Reuse animation pattern from hub page stat counters.

**Integration risks:** None — read-only display. No state changes.

**From user:** Nothing needed.

---

### 2.2 RPE / RIR Rating

**What:** After completing a set, optional toggle appears: RPE 6-10 scale (or RIR 0-4). Stores with the set log. Used for fatigue detection and auto-periodization later.

**Where:**
- `exercise_set_logs` table — Add column: `rpe SMALLINT CHECK (rpe >= 1 AND rpe <= 10)`
- `app/(main)/workout/page.tsx` — After set completion, show a small row of RPE chips (6,7,8,9,10) that auto-dismiss after 3 seconds if ignored. NOT blocking — user can skip.
- `SetEntry` type (line 47) — Add `rpe?: number`

**Integration risks:**
- **Quick-log chips**: Quick-log should NOT prompt for RPE (defeats the purpose). RPE only shows for manually completed sets.
- **This is strictly additive** — nothing existing reads RPE. Future features (fatigue detection, auto-periodization) will consume it.

**DB change needed:** `ALTER TABLE exercise_set_logs ADD COLUMN rpe SMALLINT;`

**From user:** Nothing needed.

---

### 2.3 Superset / Circuit Grouping

**What:** Long-press two exercises → "Group as Superset". They render as a connected pair. Rest timer starts only after the LAST exercise in the group. Sets alternate between exercises.

**Where:**
- `scheduled_exercises` table — Add column: `superset_group INTEGER` (null = standalone, same number = grouped)
- `app/(main)/workout/page.tsx` — Exercise rendering loop. Group exercises with same `superset_group` into a single card with tabs or stacked layout.
- Rest timer logic (line 604) — Check if current exercise is part of a group. If yes, don't start timer until all exercises in the group have their current set done.
- Also add to template editing (`schedule/page.tsx`) so supersets persist across sessions.

**Integration risks:**
- **Exercise reordering (auto-promote)**: If exercises are grouped, they must move together. Auto-promote moves the whole group.
- **Skip exercise**: Skipping one exercise in a superset should skip the whole group, or allow individual skip with timer adjustment.
- **XP calculation**: No change — XP is per-set regardless of grouping.
- **Warmup sets**: Only generate warmups for the FIRST exercise in a superset group (the main lift).

**DB change needed:** `ALTER TABLE scheduled_exercises ADD COLUMN superset_group INTEGER;` + same on `workout_template_exercises`.

**From user:** Nothing needed.

---

### 2.4 Drop Set / Rest-Pause Support

**What:** After completing a set, a "Drop Set" button appears. Tapping it immediately adds a new set row with LOWER weight pre-filled (auto-reduce by 20%) and NO rest timer. Also a "Rest-Pause" button that adds a set with SAME weight after a 15-second micro-rest.

**Where:**
- `app/(main)/workout/page.tsx` lines 1770-1786 — Area after set rows. Add "Drop Set" and "Rest-Pause" buttons next to "Add set".
- `exercise_set_logs` — Add column: `set_type TEXT DEFAULT 'working'` (values: 'working', 'warmup', 'drop', 'rest_pause')
- Rename existing `is_warmup` boolean to use `set_type` (migration: `UPDATE exercise_set_logs SET set_type = 'warmup' WHERE is_warmup = true`).
- Rest timer: Skip for drop sets. Start 15s micro-timer for rest-pause.

**Integration risks:**
- **Volume calculation**: Drop sets and rest-pause sets count toward total volume. No special handling needed.
- **PR detection**: Drop sets are at LOWER weight — don't check PR on them. Rest-pause at same weight — DO check PR.
- **XP engine**: Currently counts all completed sets. Drop/rest-pause sets should give slightly less XP (50%?) to prevent gaming.
- **Warmup integration**: `is_warmup` field is used in many places (lines 56, 344-348, 591, 692-720, 724). Migrating to `set_type` requires updating ALL these references.

**DB change needed:** `ALTER TABLE exercise_set_logs ADD COLUMN set_type TEXT DEFAULT 'working';` + migration of is_warmup data.

**From user:** Nothing needed.

---

### 2.5 Auto-Promote Exercise Ordering

**What:** When user taps on an exercise to expand it (or completes their first set), that exercise card animates to the top of the list. Completed/skipped exercises sink to the bottom. Natural gym flow — no manual dragging needed.

**Where:**
- `app/(main)/workout/page.tsx` line 161 — `exercisesList` state. Add a sort layer: `displayOrder` array separate from DB `order_index`.
- On expand or first-set-complete: move exercise to index 0 of displayOrder.
- On all-sets-complete: move to end.
- Use Framer Motion `layoutId` + `AnimatePresence` for smooth reorder animation.
- Do NOT update DB order — this is view-only during session. Template order stays unchanged.

**Integration risks:**
- **Superset groups**: Must move together (see 2.3).
- **"Confirm & Next Exercise" button** (line 1774): Currently moves to next by index. With reordering, "next" means the first non-completed exercise, not index+1.
- **Session restore on reload**: displayOrder is ephemeral. On reload, fall back to DB order with completed exercises at bottom.

**From user:** Nothing needed.

---

## TIER 3 — Persistence & Reliability (Build Third)

These fix the "data loss on screen-off" problem and add offline support.

---

### 3.1 Form State Persistence (Screen-Off Fix)

**What:** Every keystroke in weight/reps/duration inputs saves to localStorage. On page reload, restore unsaved input alongside DB-saved completed sets.

**Where:**
- `app/(main)/workout/page.tsx` line 566 — `updateSet()` function. After updating React state, also write to localStorage key `ascend_session_draft`.
- `app/(main)/workout/page.tsx` lines 327-351 — Session restore. After loading completed sets from DB, overlay any draft values from localStorage.
- On session finish: clear `ascend_session_draft`.
- Shape: `{ [exId: string]: { [setIndex: number]: { weight, reps, duration, distance } } }`

**Integration risks:**
- **Multiple sessions per day** (max 3): Key the localStorage by `sessionId` to avoid cross-session contamination.
- **Stale drafts**: If user finishes session but localStorage clear fails, next session could show stale data. Add sessionId check.

**From user:** Nothing needed.

---

### 3.2 Wake Lock API

**What:** During active session, request a screen wake lock so the phone doesn't dim/sleep while resting between sets.

**Where:**
- `app/(main)/workout/page.tsx` — In `startWorkout()` (line 474): `navigator.wakeLock?.request("screen")`. Release on `finishWorkout()` (line 720) and on page unmount.
- Fallback: If wake lock denied, show a one-time tip: "Tip: Keep screen on in your phone settings for uninterrupted logging."

**Integration risks:**
- Battery drain — only active during session, released on finish. Acceptable.
- Browser support: Chrome Android yes, Safari iOS 16.4+. Feature-detect with `if ("wakeLock" in navigator)`.

**From user:** Nothing needed.

---

### 3.3 Offline Queue

**What:** If network is down during a session, queue DB writes (set completions, session updates) in localStorage. Sync when connection returns.

**Where:**
- New file: `app/lib/offlineQueue.ts` — Queue manager. Stores pending writes as `{ table, operation, payload, timestamp }[]` in localStorage.
- `app/(main)/workout/page.tsx` line 580 — `completeSet()`: Try Supabase write. On failure, push to offline queue. Mark set as "pending sync" in UI (subtle cloud icon).
- On `navigator.onLine` event: flush queue to Supabase in order.
- On next session load: check for pending queue items and flush.

**Integration risks:**
- **PR detection**: Can't check PRs offline (needs DB query for historical bests). Queue PR check for when online.
- **Leaderboard updates**: Queue these too. They run on session finish (`updateExerciseLeaderboard.ts`).
- **Conflict resolution**: If somehow the same set is written twice (offline + retry), use `logId` as idempotency key. The existing upsert-by-logId handles this.
- **Session ID generation**: Currently server-generated UUID. For offline session start, generate UUID client-side (`crypto.randomUUID()`).

**From user:** Nothing needed.

---

### 3.4 Service Worker + PWA Shell

**What:** Install a service worker to cache the app shell (HTML, CSS, JS, fonts) so the app loads instantly even offline. NOT full offline DB — just the UI shell.

**Where:**
- `public/manifest.json` — PWA manifest (name, icons, theme_color, display: standalone)
- `public/sw.js` — Service worker with cache-first strategy for static assets
- `next.config.ts` — Add headers for service worker scope
- `app/layout.tsx` — Register service worker

**Open-source options:**
- **Serwist** (https://serwist.pages.dev) — Next.js-native service worker library, MIT license, successor to next-pwa. Safe to use.
- **@ducanh2912/next-pwa** — Also MIT, well-maintained fork of next-pwa. Either works.
- Do NOT use the original `next-pwa` — unmaintained, security issues.

**Integration risks:**
- **HMR in development**: Service worker caching can break hot reload. Must disable in dev mode.
- **Theme**: Manifest `theme_color` should match current theme. Can't be dynamic — use dark default.
- **Updates**: Need a "New version available, reload?" prompt when SW updates. Without this, users get stale JS forever.

**From user:** App icons needed for PWA manifest (192x192 and 512x512 PNG). Can generate from existing logo if you have one.

---

## TIER 4 — Exercise Intelligence (Build Fourth)

---

### 4.1 Exercise Details/Image in Session

**What:** Info icon on each exercise card in session. Tapping opens a bottom sheet with: image/animation, target muscles, form cues, instructions.

**Where:**
- `exercises` table already has `instructions TEXT` and `image_url TEXT` columns.
- New component: `app/components/ExerciseDetailSheet.tsx` — Bottom sheet with exercise info.
- `app/(main)/workout/page.tsx` — Add info icon button next to exercise name in the card header.

**Open-source exercise images:**
- **Wger (wger.de)** — Open-source fitness platform, CC BY-SA license. Has ~400 exercise images/diagrams. API available. License requires attribution ("Images from wger.de, CC BY-SA").
- **MuscleWiki** — Has GIF demonstrations but NOT open-source. Cannot use without permission.
- **ExerciseDB (via RapidAPI)** — Free tier has 1300+ exercise GIFs. BUT: it's API-only (not self-hosted), free tier has rate limits, and terms may restrict caching. **Not recommended for production.**
- **Custom SVG muscle diagrams** — We already have the tap-on-body SVG in `body/page.tsx`. Can reuse the muscle highlight SVGs for the detail sheet.
- **RECOMMENDATION:** Use wger images (CC BY-SA, attribution in app footer) for common exercises. For exercises without images, show the muscle highlight SVG from our existing body diagram. Long-term: commission custom illustrations or use AI-generated ones (verify licensing).

**Integration risks:**
- **Bundle size**: Don't inline 400 images. Lazy-load from Supabase Storage or a CDN.
- **Offline**: Images won't load offline unless cached by service worker. Show muscle SVG fallback.

**From user:** Decision on image source. Wger CC BY-SA images require visible attribution. Custom illustrations require budget/time.

---

### 4.2 1RM Trend Line

**What:** On each exercise card in session, show a small sparkline of estimated 1RM over the last 8 weeks.

**Where:**
- Query: `exercise_set_logs` joined with `workout_sessions`, grouped by week, take max(weight × (1 + reps/30)) per week (Epley formula).
- Render: Tiny SVG sparkline (no Recharts needed — just a polyline). 60×20px inline.
- `app/(main)/workout/page.tsx` — Add sparkline next to exercise name or below overload suggestion.

**Integration risks:** None — read-only display. But the query could be slow if not indexed.

**DB optimization needed:** Index on `exercise_set_logs(exercise_id, completed_at)` if not already present.

**From user:** Nothing needed.

---

### 4.3 Session Comparison

**What:** At the top of the session, a toggle: "Compare to last session". When on, each set row shows last session's values side-by-side with green/red arrows (up = improvement, down = regression).

**Where:**
- Uses the same last-session data from feature 1.1 (smart defaults).
- `app/(main)/workout/page.tsx` set row rendering — Add a small comparison column.
- Arrow logic: Green if weight↑ or reps↑ (at same weight). Red if both down. Gray if mixed.

**Integration risks:** None — read-only overlay on existing data.

**From user:** Nothing needed.

---

### 4.4 Session Rating

**What:** After finishing workout, before the energy receipt, show: "How was this session?" with 5 emoji buttons (😵 😐 😊 💪 🔥). Stores with the session.

**Where:**
- `workout_sessions` table — Add column: `rating SMALLINT CHECK (rating >= 1 AND rating <= 5)`
- `app/(main)/workout/page.tsx` line 720 — `finishWorkout()`. Show rating prompt before summary.
- Rating data feeds into fatigue detection (Tier 5).

**DB change needed:** `ALTER TABLE workout_sessions ADD COLUMN rating SMALLINT;`

**From user:** Nothing needed.

---

### 4.5 Muscle Hit Map

**What:** In the post-workout energy receipt, show a body SVG with worked muscles highlighted. Intensity of highlight = relative volume per muscle.

**Where:**
- `app/components/EnergyReceipt.tsx` — Add muscle map section.
- Reuse the SVG body diagram from `app/(main)/body/page.tsx`.
- Data: For each exercise in session, look up `primary_muscle` and `secondary_muscles` from exercises table. Sum volume per muscle.
- Color intensity: Map volume to opacity (more volume = more opaque highlight).

**Integration risks:**
- **Muscle names must match** between `exercises.primary_muscle` values and SVG region IDs. Verify mapping.

**From user:** Nothing needed — reuses existing SVG.

---

### 4.6 Exercise Rotation Tracking

**What:** On the workout page (not in session), show a section: "Exercises you haven't done in 3+ weeks" with suggestions to rotate them back in.

**Where:**
- Query: All distinct exercise_ids from user's `exercise_set_logs` in last 90 days, find those not appearing in the last 21 days, grouped by muscle.
- `app/(main)/workout/page.tsx` — Show as a collapsible card in the "not_started" state (before session begins), below the plan card.
- Tapping a suggested exercise could add it to today's session as a swap or addition.

**Integration risks:**
- **Add exercise flow**: Must use existing `handleAddExercise` (line 629) so all session state stays consistent.

**From user:** Nothing needed.

---

## TIER 5 — Long-Term Intelligence (Build Last)

These depend on data from Tiers 1-4 (especially RPE, session ratings, and per-set history).

---

### 5.1 Fatigue Detection

**What:** If your weight drops 10%+ on a lift compared to your recent average (last 3 sessions), or your session rating trends downward for 3+ sessions, surface a card: "Possible fatigue — consider a deload week."

**Where:**
- New file: `app/lib/fatigueDetector.ts` — Analyze recent session data.
- `app/(main)/page.tsx` (Hub) — Show as a smart card (same system as missed workout, PR celebration, etc. — lines 32-40 in the hub's smart card ordering).
- Also show a banner in the workout page before session start.
- Depends on: RPE data (2.2), session ratings (4.4), per-set history (1.1).

**Integration risks:**
- **Smart card system** on Hub: Must integrate with the existing card priority ordering (`app/(main)/page.tsx` around the smart card section). Add as a new card type with HIGH priority (fatigue warning is more important than a PR celebration).

**From user:** Nothing needed.

---

### 5.2 Auto-Periodization

**What:** Track weekly volume per muscle group. Show a dashboard card: "This week: Chest 22 sets (high), Back 8 sets (low)". Warn about imbalances. Over time, suggest deload weeks based on accumulated fatigue (volume × RPE).

**Where:**
- New file: `app/lib/periodizationEngine.ts`
- `app/(main)/progress/page.tsx` — New section: "Volume by Muscle Group" with a horizontal bar chart.
- Hub smart card for warnings.
- Depends on: All historical set logs + RPE data.

**Integration risks:**
- **Character sheet radar chart** (`app/(main)/character/page.tsx`): The radar chart already shows muscle group balance. Periodization data should feed INTO the radar chart to make it more accurate (currently it's based on exercise variety, not volume).

**From user:** Nothing needed.

---

### 5.3 Rep Tempo Logging

**What:** Optional field per exercise in template editing: "Tempo: 3-1-2" (eccentric-pause-concentric in seconds). During session, show the tempo notation as a reminder. Does NOT affect logging flow — purely informational.

**Where:**
- `scheduled_exercises` / `workout_template_exercises` tables — Add column: `tempo TEXT` (nullable)
- `app/(main)/schedule/page.tsx` — Add tempo field to exercise editing.
- `app/(main)/workout/page.tsx` — Display tempo below exercise name as small text.

**Integration risks:**
- **None if kept optional and display-only.** The moment we try to enforce tempo or auto-calculate TUT, complexity explodes. Keep it as a note.

**DB change needed:** `ALTER TABLE scheduled_exercises ADD COLUMN tempo TEXT; ALTER TABLE workout_template_exercises ADD COLUMN tempo TEXT;`

**From user:** Nothing needed.

---

### 5.4 Camera Form Check

**What:** During an exercise, user can tap "Form Check" to open the camera. Uses MediaPipe Pose to track body keypoints. After the set, shows a basic analysis: bar path visualization, depth check (squats), symmetry check.

**Where:**
- New component: `app/components/FormCheckCamera.tsx`
- New file: `app/lib/formAnalysis.ts` — Pose landmark processing.

**Open-source options:**
- **MediaPipe Pose** (Google) — Apache 2.0 license. Runs in-browser via WASM/WebGL. Tracks 33 body landmarks. Well-documented. **This is the one to use.**
- **TensorFlow.js PoseNet / MoveNet** — Apache 2.0. Also in-browser. Lighter than MediaPipe but less accurate.
- **RECOMMENDATION:** MediaPipe Pose via `@mediapipe/tasks-vision` npm package. Apache 2.0, no licensing risk.

**Integration risks:**
- **Bundle size**: MediaPipe WASM is ~5MB. Must be lazy-loaded, NOT in the main bundle. Dynamic import only when user taps "Form Check".
- **Performance**: Real-time pose estimation is GPU-intensive. May lag on older phones. Must be purely optional.
- **Privacy**: Camera feed stays 100% on-device. No server uploads. Must be explicit about this in UI.
- **Battery**: Will drain battery fast. Auto-stop after 60 seconds or when user stops recording.

**From user:** Nothing needed technically, but this is a COMPLEX feature. Recommend building a proof-of-concept first before committing.

---

## DB Migration Summary

All schema changes needed, in one migration:

```sql
-- 024_workout_logging_upgrade.sql

-- Dual-weight tracking
ALTER TABLE exercise_set_logs ADD COLUMN IF NOT EXISTS is_per_side BOOLEAN DEFAULT false;

-- RPE tracking
ALTER TABLE exercise_set_logs ADD COLUMN IF NOT EXISTS rpe SMALLINT;

-- Set type (replaces is_warmup)
ALTER TABLE exercise_set_logs ADD COLUMN IF NOT EXISTS set_type TEXT DEFAULT 'working';
UPDATE exercise_set_logs SET set_type = 'warmup' WHERE is_warmup = true;

-- Session rating
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS rating SMALLINT;

-- Superset grouping
ALTER TABLE scheduled_exercises ADD COLUMN IF NOT EXISTS superset_group INTEGER;
ALTER TABLE workout_template_exercises ADD COLUMN IF NOT EXISTS superset_group INTEGER;

-- Tempo notation
ALTER TABLE scheduled_exercises ADD COLUMN IF NOT EXISTS tempo TEXT;
ALTER TABLE workout_template_exercises ADD COLUMN IF NOT EXISTS tempo TEXT;

-- Performance index
CREATE INDEX IF NOT EXISTS idx_set_logs_exercise_completed
  ON exercise_set_logs(exercise_id, completed_at DESC);
```

---

## Build Order

| Phase | Features | Why This Order |
|---|---|---|
| **0** | Refactor: extract `useWorkoutSession` hook | Foundation — everything plugs into this |
| **1** | 1.1 Smart defaults + 1.2 Quick-log + 1.4 Edit sets + 1.5 Undo | Core logging friction — biggest daily impact |
| **2** | 1.3 Dumbbell dual-weight + DB migration | Needs the migration, do it with the others |
| **3** | 3.1 Form persistence + 3.2 Wake lock | Fixes the screen-off problem |
| **4** | 2.1 Running stats + 4.4 Session rating + 4.5 Muscle hit map | Session feel improvements |
| **5** | 2.2 RPE + 2.5 Auto-promote reorder | Intelligence inputs + UX polish |
| **6** | 2.3 Supersets + 2.4 Drop sets | Advanced training techniques |
| **7** | 4.1 Exercise details + 4.2 1RM trend + 4.3 Session comparison | Information layer |
| **8** | 3.3 Offline queue + 3.4 PWA | Reliability |
| **9** | 4.6 Exercise rotation + 5.1 Fatigue detection + 5.2 Auto-periodization | Long-term intelligence |
| **10** | 5.3 Tempo + 5.4 Camera form check | Advanced / experimental |

---

## What I Need From You

| Item | For Feature | Urgency |
|---|---|---|
| App icon (192px + 512px PNG) | PWA manifest (3.4) | Phase 8 |
| Exercise image decision (wger CC BY-SA vs custom) | Exercise details (4.1) | Phase 7 |
| Camera form check: go/no-go | Form check (5.4) | Phase 10 |

Everything else can be built with zero external dependencies or decisions.
