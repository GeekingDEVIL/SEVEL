# Hub Redesign Spec — SEVEL Command Center

> Module-driven dynamic dashboard that adapts to each user's enabled features, time of day, and training state.

---

## 1. Current State Audit

### What exists today (`app/(main)/page.tsx` — 1514 lines)

| Section | Lines | What it does | Issues |
|---|---|---|---|
| Header | 833-861 | Greeting + date/time + nudge subtitle + bell + avatar | Greeting is generic ("Good morning, username"). Nudge is static text. No ambient personality. |
| At-a-Glance Strip | 864-887 | Auto-scrolling marquee of pills (level, streak, recovery, kcal, body weight) | Marquee is functional but visually plain. Requires scrolling to see all pills. Hard to scan at a glance. |
| Intelligence Cards | 889-1021 | PR celebration, missed workout, fatigue alert, cycle phase, weekly recap, contextual insight | All use inline styles with hardcoded border/bg colors (e.g., `border-yellow-400/20`). No `glass-card` treatment. Cards look flat compared to character/habits pages. |
| Habits Card | 1048-1192 | Segment ring SVG + habit list + quick-complete strip | Well-built. One of the best cards on the Hub. Uses animated SVG arcs. |
| Today's Workout | 1194-1261 | Hero card with workout name, exercise count, sets, time estimate, play button | Uses `var(--fg-03)` bg — looks same as every other card. No visual dominance. No breathing pulse. Play button is small and doesn't draw the eye. |
| Level & Rank | 1263-1303 | Level number, rank badge, XP bar, goal | Functional but same visual weight as every other card. |
| Quick Stats Grid | 1305-1322 | 2x2 grid: streak, workouts, weekly vol, PRs | Numbers are static. No counter animations. No trend arrows. No comparison to last week. |
| Attribute Rings | 1324-1346 | 4 circular SVG rings: STR/END/CON/DIS | Works but takes significant vertical space for 4 small numbers. |
| Recovery + Body Weight | 1349-1382 | Side-by-side compact cards | Module-gated correctly. Uses `MODULE_REGISTRY.colorRgb` for accents. Good pattern. |
| Energy Dashboard | 1384-1464 | Calories remaining, progress bar, macros grid, quick food log form | Well-built. Inline food entry is excellent. |
| Quick Links | 1467-1481 | 3-column grid: Schedule, Progress, Recovery | Only 3 hardcoded links. Should show all enabled modules. |
| Notifications | 1484-1509 | Recent unread notifications list | Plain rows with no visual differentiation by type. |

### Design gaps vs. other premium pages

| Page | Treatment | Hub equivalent |
|---|---|---|
| Character | `glass-card`, radial gradients, animated radar chart, skill tree, class coloring | Hub uses plain `bg-[var(--fg-03)]` divs with no glass treatment |
| Habits | Constellation sky, aura glow, segment rings, streak flame, loot drops | Hub habits card is good but the page itself has no ambient background |
| Schedule | Bento grid, gradient borders, muscle heat map | Hub stat grid exists but no gradient borders, no module colors |

### Data already available but not surfaced

- **Martial arts**: Last MA session, discipline practiced, total rounds — not on Hub
- **Habits**: Impact scores, routine completion, aura level — only basic ring shown
- **Water**: Only shows `X.XL / YL` bar — no streak, no trend
- **Character**: Class, power level, archetype — none shown on Hub
- **Achievements**: Recent unlocks, rarity, chains — not on Hub
- **Body measurements**: Latest entries, goals hit — not on Hub

---

## 2. Requirements

### Hard constraints (non-negotiable)

1. **Module-gated**: Every card/zone uses `isEnabled(moduleKey)`. Nothing renders for disabled modules. No empty placeholders.
2. **Theme-aware**: All colors via CSS tokens (`var(--bg-primary)`, `var(--fg-XX)`, `rgb(var(--accent-rgb))`). No hardcoded hex/rgb values. Must work on Dark, OLED, and Daylight themes.
3. **Sex-aware**: All DB queries include `.eq("sex", userSex)`. Plans, stats, leaderboards, recovery — everything filtered by active sex mode.
4. **Local time only**: All date computations use local time, never UTC. Reset at local midnight.
5. **No breaking existing functionality**: Hub must keep all current data-fetching logic working. Refactor the render layer, not the data layer.
6. **Glass-card design system**: All cards use `.glass-card` class from globals.css. No custom backdrop-blur per card.
7. **Weight unit awareness**: All weight values go through `formatWeight()` / `kgToUnit()` with `weightUnit` from `useUnits()`.
8. **Performance**: No new Supabase queries beyond what currently exists unless strictly necessary. Batch where possible. Use `user_stats` cache first.
9. **Mobile-first**: Designed for 375px+ viewports. `pb-24` to clear MobileNav. `max-w-xl mx-auto` container. No horizontal scroll.
10. **Accessibility**: `prefers-reduced-motion` disables all animations. Touch targets minimum 44x44px for action buttons.

### Soft constraints (strongly preferred)

- Stagger card entrance animations (framer-motion `staggerContainer` / `staggerItem` — already in use)
- Keep the Hub file under 2000 lines. Extract reusable sub-components if needed.
- Use `MODULE_REGISTRY[key].colorRgb` for per-module accent colors on borders/icons.

---

## 3. Architecture — Zone-Based Layout

The Hub is divided into 9 zones. Zones populate dynamically based on enabled modules. A user with only `gym` enabled sees Zones 1, 2, 4 (gym tile only), and 8. A user with everything sees the full command center.

### Zone 1: Identity Bar (always present)

**Purpose**: Who you are, right now, at a glance.

```
┌─────────────────────────────────────────────┐
│  Good evening, Akash          🔔 [A]        │
│  Tue, 7 Oct · 8:42pm                        │
│  "14 days strong. Relentless."              │
│                                              │
│  [Lv.12 ⚡] [🔥 14] [💚 87%] [🍽 1420 left] │
└─────────────────────────────────────────────┘
```

**Components**:
- **Top row**: Large greeting (font-display, 20px) + notification bell (badge count) + avatar button (tap → profile)
- **Second row**: Date/time in mono. Context-aware nudge line (see Greeting Personality below)
- **Power strip**: Horizontal row of mini glass-card badge pills. Only shows badges for enabled modules:

| Module | Badge content |
|---|---|
| `xp` | Level + rank name, accent color |
| `gym` | Streak flame emoji + day count, orange |
| `recovery` | Recovery % + color indicator (green/amber/red) |
| `nutrition` | Remaining kcal, amber |
| `progress` | Current body weight + unit, purple |
| `habits` | Tiny completion ring (12px) + fraction, rose |
| `wellness` | Water fraction (e.g., "1.2/3L"), blue |
| `martial_arts` | Days since last session, red |

**Greeting personality** — The nudge line rotates based on context (not random — pick the highest-priority match):

| Condition | Line |
|---|---|
| PR in last 24h | "Still riding that PR high?" |
| Streak ≥ 14 days | "{N} days strong. Relentless." |
| Streak ≥ 7 days | "Consistency is your superpower." |
| Rest day after heavy session | "Recovery day. You earned it." |
| Comeback (2+ day gap then workout) | "Welcome back. Let's go." |
| Completed workout today | "Nice work today. Rest up." |
| Default morning | "Let's make today count." |
| Default afternoon | "Afternoon grind. Let's go." |
| Default evening | "Wind down strong." |

### Zone 2: Hero Action Card (always present)

**Purpose**: The single most important thing to do right now. Visually dominant — largest card on the page.

**Visual treatment**:
- Full-width, taller than other cards (min-height ~140px when action is pending)
- `glass-card` base + accent gradient border (animated breathing pulse, 3-4s cycle, stops after action taken)
- Radial gradient glow behind the card (`page-ambient` style but scoped to this card)

**States** (mutually exclusive, in priority order):

| State | Condition | Content |
|---|---|---|
| **Resume Session** | Active workout exists (not completed, started today) | "Resume Session" + elapsed time + sets done + resume button |
| **Today's Workout** | `recurring_plans` has non-rest plan for today, not yet completed | Workout name, exercise count, total sets, ~time estimate, **large Play button** (48x48, accent bg, centered) |
| **Martial Arts Day** | `recurring_plans` has `session_type: "ma"` for today | Discipline icon + name, suggested rounds, start button |
| **Dual Session Day** | Both gym + MA scheduled | Split card with both, individual start buttons |
| **Completed** | `workout_sessions` has completed entry for today | Celebration card — sets/volume/XP summary, green check glow, "View Progress" button |
| **Rest Day** | `recurring_plans` has `is_rest: true` for today | Calm blue treatment, recovery %, hours since last session. If `wellness` enabled, show water progress inline. |
| **No Plan** | No recurring plan for today | "Set up your schedule" prompt with direct link to `/schedule`. Not dead space — still styled as a card. |

### Zone 3: Intelligence Feed (contextual — only appears when there's something to say)

**Purpose**: Smart notification cards that surface timely, relevant information. Auto-dismiss when no longer relevant.

**Visual treatment**: Each card gets a 2px colored left accent strip + `glass-card` background. Appear/disappear based on context.

**Cards** (ordered by urgency — `cardOrder` system already exists):

| Card | Module gate | Trigger | Accent color | Content |
|---|---|---|---|---|
| **Fatigue alert** | `recovery` | `detectFatigue()` returns alerts | Red (critical) / Amber (warning) | Severity message + detail + recommendation |
| **PR celebration** | `progress` | `notifications` table has `new_pr` in last 24h | Gold (#fbbf24) | Exercise name + PR detail + "View" button |
| **Missed workout** | `gym` | Yesterday had non-rest plan, no completed session yesterday or today | Orange (#fb923c) | Plan name + "Skip" / "Schedule" buttons |
| **Cycle phase** | `cycle` (female only) | Cycle log exists | Pink (#f472b6) | Phase name + cycle day + training tip + "Log" button |
| **Habit streak milestone** | `habits` | Any habit hits 7/14/30/60/100 day streak | Rose (#f43f5e) | Habit name + streak count + "Keep going" |
| **Body weight trend** | `progress` | Weight changed ±2kg in 7 days | Purple (#a855f7) | Direction + delta + "Log weight" button |
| **Weekly recap** | always | Monday only (dayOfWeek === 1) | Accent (#22d3ee) | 4-stat grid: workouts, volume, PRs, streak from last week |
| **Contextual insight** | always | Stats-based (streak milestones, workout count milestones, recovery window, volume this week) | Accent (#22d3ee) | Single-line insight with Sparkles icon |
| **"Right now" nudges** | varies | Time + behavior based (see below) | Accent (#22d3ee) | Dismissible chip-style card |

**"Right now" nudges** (new):

| Condition | Module | Nudge text |
|---|---|---|
| After 2pm, no food logged today | `nutrition` | "Don't forget lunch — tap to log" |
| Evening (after 6pm), pending habits > 0 | `habits` | "{N} habits left tonight" |
| 48+ hours since last workout, non-rest day | `gym` | "Ready to train? It's been 2 days." |
| Before noon, no water logged | `wellness` | "Start your hydration — 0L so far" |

All nudges are dismissible (tap X → hide for today, stored in `localStorage`).

### Zone 4: Module Dashboard Grid (dynamic based on enabled modules)

**Purpose**: At-a-glance overview of every enabled module's current state.

**Layout**:
- 2-column grid on mobile (375px+)
- Each tile is a `glass-card` with the module's accent color on the border (`rgb(MODULE_REGISTRY[key].colorRgb / 0.15)`)
- Tap any tile → navigates to that module's page
- Grid only renders tiles for enabled modules that have data or a meaningful empty state
- If 1-3 modules enabled, tiles expand to fill width. If 6+, stay compact 2-col.

**Tile definitions**:

| Module | Tile content | Empty state |
|---|---|---|
| `gym` | Workout count this week + weekly volume with trend arrow (↑↓→ vs last week) | "Start your first session" + dumbbell outline |
| `recovery` | Recovery % as circular arc (40px) + "Ready" / "Resting" / "Fatigued" label | "Complete a workout to track recovery" |
| `nutrition` | Calories remaining as progress ring + macro dots (P/C/F colored bars) | "Log your first meal" + fork/knife outline |
| `progress` | Body weight + trend arrow + last weigh-in date | "Record your weight" + scale outline |
| `wellness` | Water glass fill animation + fraction text (1.2L / 3L) | "Start hydrating" + water drop outline |
| `habits` | Compact segment ring + pending count badge | "Create your first habit" |
| `martial_arts` | Last session discipline emoji + days since last session | "Start your martial arts journey" |
| `xp` | XP bar with level number + progress % to next level | Shows current level even with 0 XP |
| `character_sheet` | Class name + power level number | "Discover your class" |

**Comparison deltas** (new — shown on stat tiles where applicable):
- Weekly volume: `↑ +1,200 kg` or `↓ -800 kg` vs last week (green for up, orange for down)
- Streak: `+3 from last week`
- Body weight: `+0.5 kg` or `-1.2 kg` from previous weigh-in
- Color: green for improvement, orange for regression, grey for neutral (what counts as "improvement" depends on the user's goal — losing weight when goal is cut = green)

### Zone 5: Habits Quick-Complete Strip (habits module only)

**Purpose**: Complete pending habits without leaving the Hub.

**Layout**: Horizontal scrollable row of pill buttons. Each shows habit icon + name. Tap → instant completion (existing `quickCompleteHabit` function). Already exists in current Hub inside the habits card — extract as a standalone zone so it's always visible when habits are pending, even if the habits card scrolls off.

**Behavior**:
- Only shows if `pendingHabits.length > 0`
- Completing a habit plays a brief check animation and the pill fades out
- If all habits complete, the strip shows "All done! Perfect day." for 3 seconds then hides

### Zone 6: Energy Dashboard (nutrition module only)

**Purpose**: Calorie + macro tracking at a glance with inline quick-log.

**Content** (already exists, keep as-is):
- Remaining kcal (big number)
- Progress bar (eaten / target)
- Macro breakdown grid (protein/carbs/fat) with eaten/target
- "Log Food" toggle → inline form (label, kcal, protein, carbs, fat)

**Enhancements**:
- Add comparison text: "X kcal more/less than yesterday" if daily_intake data exists for yesterday

### Zone 7: Attributes (xp module only)

**Purpose**: RPG stat overview.

**Redesign**: Replace 4 circular rings (current — take ~160px vertical) with a compact horizontal bar layout:

```
STR  ████████░░░░  62
END  ███░░░░░░░░░  28
CON  ██████████░░  85
DIS  ███████░░░░░  70
```

Each bar uses the stat's color. Entire block taps → character page. Saves ~80px vertical space vs current rings.

### Zone 8: Quick Actions Row (always present, bottom)

**Purpose**: Secondary navigation for power users.

**Layout**: Horizontal row of compact icon pills. Only shows modules that have a dedicated page.

**Dynamic population**:

| Module | Label | Icon | Route |
|---|---|---|---|
| `gym` | Schedule | Calendar | /schedule |
| `progress` | Progress | TrendingUp | /track |
| `recovery` | Recovery | HeartPulse | /recovery |
| `nutrition` | Nutrition | UtensilsCrossed | /nutrition |
| `habits` | Habits | Flame | /habits |
| `wellness` | Water | GlassWater | /wellness |
| `martial_arts` | MA | Swords | /martial-arts |
| `character_sheet` | Character | Crown | /character |

Replaces current hardcoded 3-link grid. Each pill is `glass-card` styled, icon + label underneath, compact.

### Zone 9: Notifications (always present if unread notifications exist)

**Purpose**: Surface recent notifications without navigating away.

**Enhancement over current**: Add colored left accent strip by notification type:
- `new_pr` → gold
- `level_up` → accent cyan
- `achievement` → purple
- `streak` → orange
- Default → grey

---

## 4. Visual Design System

### Page Background: Ambient Glow

The Hub gets a recovery-aware ambient background that no other page has:

```css
/* Applied via inline style based on recovery state */
background: radial-gradient(
  ellipse at 50% 0%,
  rgb(var(--ambient-color) / 0.06) 0%,
  transparent 60%
),
var(--bg-primary);
```

**Ambient color logic**:
| Recovery % | Color | Feel |
|---|---|---|
| ≥ 80% | `var(--status-recovered-rgb)` (green) | Ready to train |
| 50-79% | `var(--status-recovering-rgb)` (amber) | Partially recovered |
| < 50% | `var(--status-fatigued-rgb)` (orange-red) | Rest suggested |
| No data | `var(--accent-rgb)` (cyan) | Default neutral |

### Time-of-Day Gradient Shift

The ambient glow also incorporates a subtle time-of-day tint:
| Hour | Tint | Effect |
|---|---|---|
| 5am-11am | Cool blue-grey | Morning freshness |
| 12pm-4pm | Neutral | Midday clarity |
| 5pm-8pm | Warm amber shift | Evening warmth |
| 9pm-4am | Deep indigo | Night calm |

This is layered under the recovery color at low opacity (~0.03-0.04). Not a theme switch — a subtle CSS gradient interpolation based on `new Date().getHours()`.

### Card Treatment

**All cards**: `glass-card` class (backdrop-blur, layered shadows, inset highlight from globals.css).

**Hero card (Zone 2)**: Additional treatment:
- Breathing border pulse: `@keyframes breathe { 0%,100% { box-shadow: 0 0 20px -5px rgb(var(--accent-rgb) / 0.1); } 50% { box-shadow: 0 0 30px -5px rgb(var(--accent-rgb) / 0.25); } }` — 3.5s cycle, stops when action is taken (`animation-play-state: paused`)
- Slightly larger border-radius (`--radius-xl` instead of `--radius-md`)

**Module tiles (Zone 4)**: Border color from `MODULE_REGISTRY[key].colorRgb`:
| Module | Border color |
|---|---|
| gym | `rgb(139 92 246 / 0.15)` — purple |
| recovery | `rgb(16 185 129 / 0.15)` — green |
| nutrition | `rgb(245 158 11 / 0.15)` — amber |
| habits | `rgb(244 63 94 / 0.15)` — rose |
| martial_arts | `rgb(239 68 68 / 0.15)` — red |
| progress | `rgb(16 185 129 / 0.15)` — green |
| wellness | `rgb(16 185 129 / 0.15)` — green |
| xp | `rgb(34 211 238 / 0.15)` — cyan |

### Section Dividers

Frosted glass divider strips between zones:
```
────────── YOUR STATS ──────────
```
Thin glass-card strip (`glass-bg`, 1px top/bottom border, centered label in `text-[var(--fg-20)]`, `text-[8px]` mono uppercase tracking-widest).

### Typography Hierarchy

| Tier | Size | Font | Weight | Use |
|---|---|---|---|---|
| Hero numbers | 28-36px | `--font-mono` | 700 | Main stat on each tile (kcal, %, weight) |
| Card titles | 14-16px | `--font-display` | 600 | Workout name, section headers |
| Labels | 8-9px | `--font-mono` | 400 | "WEEKLY VOLUME", "STREAK", "ATTRIBUTES" — uppercase, tracking-widest |
| Body | 11-13px | `--font-body` | 400 | Descriptions, insights, nudge text |
| Data values | 10-11px | `--font-mono` | 600 | tabular-nums for stats, comparisons |

---

## 5. Micro-Interactions & Polish

### 5.1 Card Entrance Stagger

Cards fade-in + slide-up with staggered delays (already using framer-motion `staggerContainer` / `staggerItem`). Enhance with per-zone stagger:
- Zone 1 (identity): instant
- Zone 2 (hero): 50ms delay
- Zone 3 (intelligence): 100ms each card
- Zone 4 (grid): 150ms base + 50ms per tile
- Remaining zones: 200ms base + 50ms increments

### 5.2 Number Counter Animations

When stats first load (`statsLoaded` transitions to `true`), numeric values count up from 0:
- Duration: 800ms per number
- Easing: ease-out
- Stagger: 100ms between each stat
- Only on initial load, not on re-renders
- Use existing `AnimatedPercent` component pattern — extend to `AnimatedNumber`

### 5.3 Card Press Feedback

All interactive cards scale to 0.97 on touch/click with 100ms spring ease. Already exists globally in globals.css:
```css
button:active:not(:disabled) { transform: scale(0.97); }
```
Extend to `.glass-card-interactive` class for non-button cards.

### 5.4 Hero Card Breathing Pulse

New keyframe animation for the hero action card border:
```css
@keyframes hero-breathe {
  0%, 100% { box-shadow: 0 0 20px -5px rgb(var(--accent-rgb) / 0.1); }
  50% { box-shadow: 0 0 35px -5px rgb(var(--accent-rgb) / 0.3); }
}
```
- Duration: 3.5s, `ease-in-out`, infinite
- Applied when action is pending (workout not started, habits incomplete)
- Paused when action is taken
- Respects `prefers-reduced-motion: reduce` → disabled

### 5.5 Parallax Depth

The ambient background glow scrolls at 0.3x speed while cards scroll normally. Achieved with:
```css
.hub-ambient-bg {
  position: fixed;
  /* ... gradient ... */
  transform: translateZ(0); /* GPU layer */
}
```
Cards scroll naturally over the fixed ambient layer. Creates subtle depth that character/habits pages don't have.

### 5.6 Skeleton Loading

While data loads, show glass-card shaped skeletons with shimmer:
- Use existing `.shimmer` keyframe from globals.css
- Skeleton shapes match final card dimensions
- Semi-transparent glass treatment, not grey boxes
- Show for Zone 2 (hero), Zone 4 (grid tiles), Zone 6 (energy)

---

## 6. Smart Ordering & Layout Engine

### Priority-Based Card Ordering

The current `cardOrder` useMemo (lines 792-821) already implements this. Enhance with these rules:

| Condition | Effect |
|---|---|
| PR in last 24h | PR celebration card → order 1 (top) |
| Fatigue critical | Fatigue alert → order 1.5 (above hero) |
| Missed workout | Missed card → order 2 |
| Low recovery + training day | Recovery tile jumps up in grid |
| Cycle phase present | Cycle card → order 5 (context before workout) |
| Pending workout (not started) | Hero card → order 6 |
| Past noon + no food logged | Energy dashboard → order 7 |
| Evening + pending habits | Habits quick-complete → order 8 |

### Adaptive Grid Layout

Module dashboard grid adapts to the number of enabled modules:

| Enabled modules | Grid layout |
|---|---|
| 1 | Full-width single tile |
| 2 | 2-column, equal width |
| 3 | 2-column: first tile full-width, next two side-by-side |
| 4+ | 2-column grid, all tiles equal |
| 7+ | 2-column grid, compact padding |

---

## 7. Empty & First-Use States

### Module Empty States

When a module is enabled but has no data, its tile shows:

| Module | Empty illustration | CTA text | Tap → |
|---|---|---|---|
| gym | Dumbbell outline (Lucide icon, 32px, `var(--fg-10)`) | "Start your first session" | /schedule |
| nutrition | Fork/knife outline | "Log your first meal" | /nutrition |
| progress | Scale outline | "Record your weight" | /progress |
| wellness | Water drop outline | "Start hydrating" | /wellness |
| habits | Flame outline | "Create your first habit" | /habits |
| martial_arts | Swords outline | "Begin your journey" | /martial-arts |

**Visual treatment**: Dotted border (`border-dashed`) instead of solid. Slightly lower opacity (`opacity-70`). On tap, navigates to the module's page.

### Progressive Disclosure

First-time users (≤ 3 total workouts) see a simplified Hub:
- Zone 1 (identity bar) — full
- Zone 2 (hero card) — full, with onboarding hint text
- Zone 4 (grid) — only `gym` + `xp` tiles visible, others gated behind first activity
- Zone 8 (quick actions) — full

As the user engages with more modules, more tiles appear naturally (they're already module-gated — this just means new users aren't overwhelmed by 8+ tiles on day 1 when most are empty).

---

## 8. Celebration & Reward

### 8.1 Daily Score Ring (new)

A circular progress ring (24px) in the identity bar that represents how "complete" today is across all enabled modules.

**Score calculation**:
```
score = (weightedCompletions / weightedTotal) * 100
```

| Module | Condition for "complete" | Weight |
|---|---|---|
| gym | Completed today's planned workout | 3 |
| nutrition | Logged ≥ 80% of calorie target | 2 |
| wellness | Hit water goal | 1 |
| habits | All habits completed | 2 |
| martial_arts | Completed MA session (if scheduled) | 2 |

Only enabled modules contribute. The ring fills as you complete activities. 100% = "Perfect Day" — can integrate with habit system's perfect day mechanic.

### 8.2 Milestone Toasts

When the user hits a milestone, a toast slides in from top:
- Shimmer effect on the border
- Achievement/milestone icon
- Auto-dismiss after 4 seconds
- Triggered for: 100/200/500 workouts, 7/14/30/60/100 day streak, new rank, new level milestone (every 10 levels)

### 8.3 Confetti Burst (optional, depends on complexity)

On completing today's workout or hitting a PR, a 1-2 second confetti particle animation over the hero card. Accent-colored particles. Only for meaningful moments, not every interaction. Respects `prefers-reduced-motion`.

---

## 9. Offline & Edge Cases

### 9.1 Offline Badge

When `navigator.onLine === false`, show a small "Offline" chip in the identity bar. Module tiles show cached data with "Last updated Xh ago" footnote.

### 9.2 Error Recovery

If a module's data fetch fails, that tile shows a retry button with the error icon instead of crashing the entire page. Use `try/catch` around each module's data load.

### 9.3 Scroll Position Memory

When navigating away and returning to the Hub, restore scroll position. Use `sessionStorage` with the key `hub_scroll_y`:
```ts
useEffect(() => {
  const saved = sessionStorage.getItem("hub_scroll_y");
  if (saved) window.scrollTo(0, Number(saved));
  const save = () => sessionStorage.setItem("hub_scroll_y", String(window.scrollY));
  window.addEventListener("scroll", save, { passive: true });
  return () => window.removeEventListener("scroll", save);
}, []);
```

### 9.4 Pull-to-Refresh

Custom pull-to-refresh that reloads all Hub data. Show a loading ring in accent color at the top. Triggers re-fetch of all stats, plan, intelligence cards.

---

## 10. DB Requirements

### New columns/tables needed

**None for core redesign** — all data is already available via existing queries. The redesign is purely a render-layer refactor.

**Optional new table for card reorder memory** (deferred — only if user wants card drag-to-reorder):
```sql
create table hub_card_order (
  user_id uuid references auth.users(id) on delete cascade,
  card_key text not null,
  position int not null,
  primary key (user_id, card_key)
);
alter table hub_card_order enable row level security;
create policy "Users manage own card order" on hub_card_order for all using (auth.uid() = user_id);
```

**Optional new column for daily score tracking** (deferred):
```sql
alter table user_stats add column if not exists daily_score int default 0;
```

---

## 11. Implementation Plan

### Phase 1: Foundation (visual overhaul, no new logic)
1. Add `page-ambient` background with recovery-aware + time-of-day gradient
2. Wrap all existing cards in `glass-card` class
3. Add frosted section dividers between zones
4. Add hero card breathing pulse animation
5. Enhance typography (hero numbers larger, labels smaller/tracked)
6. Update globals.css with new keyframes (`hero-breathe`)

### Phase 2: Zone Restructure (layout changes)
7. Restructure render into zones (Zone 1-9 as labeled sections)
8. Build dynamic power strip for identity bar (replace marquee)
9. Enhance hero card with all states (resume, dual session, rest day details)
10. Implement greeting personality (context-aware nudge lines)
11. Add skeleton loading states for each zone

### Phase 3: Module Grid (dynamic tiles)
12. Build module dashboard grid (Zone 4) with per-module tiles
13. Add comparison deltas (↑↓→ arrows + vs last week)
14. Add number counter animations (`AnimatedNumber` component)
15. Add empty states for modules with no data
16. Redesign attribute rings → compact horizontal bars

### Phase 4: Intelligence (new smart cards)
17. Add habit streak milestone cards
18. Add body weight trend alert cards
19. Add "right now" nudge chips (dismissible, localStorage)
20. Enhance quick actions row (Zone 8) — dynamic module population
21. Add notification type coloring (gold/orange/purple accent strips)

### Phase 5: Polish (micro-interactions + edge cases)
22. Add daily score ring to identity bar
23. Add parallax depth on ambient background
24. Add skeleton shimmer loading states
25. Add offline badge
26. Add scroll position memory
27. Add error recovery per tile
28. Milestone toast system
29. `prefers-reduced-motion` audit

---

## 12. Files Affected

| File | Change type |
|---|---|
| `app/(main)/page.tsx` | Major refactor — restructure render into zones, add glass-card, add new cards |
| `app/globals.css` | Add `hero-breathe` keyframe, hub-specific ambient styles, frosted divider class |
| `app/lib/modules.ts` | No changes needed (already has all module definitions) |
| `app/lib/useModules.ts` | No changes needed |
| `app/components/AnimatedNumber.tsx` | New — extracted counter animation component |
| `app/components/HubModuleTile.tsx` | New (optional) — extracted module tile component to keep page.tsx under 2000 lines |

---

## 14. Priority Stream Redesign (v2)

> Replaces the flat card stack with a **priority stream** — a single-column feed where each item is sized by importance. The most urgent thing gets dramatic treatment; low-priority items compress into compact inline rows.

### Design philosophy

The Hub answers one question: **"What should I do right now?"** A priority stream answers that instantly — the most important thing is always the biggest thing on screen. Everything else falls below it in decreasing visual weight.

### Stream tiers

Items are assigned to tiers by urgency/importance. Each tier gets distinct visual treatment:

#### Tier 1: Identity Hero (always present, always first)
- **Full-width gradient card** with mesh-gradient background that shifts by time of day
- Contains: avatar (40px circle), greeting + username, level badge + rank, daily score ring (40px), notification bell
- **Gradient background**: warm morning → cool neutral → amber evening → deep night
- Below greeting: nudge line in italic mono
- This replaces the plain text greeting + separate power strip
- The power strip pills are integrated as inline stat chips INSIDE the hero card, below the greeting row

#### Tier 2: Primary Action (highest-priority actionable item)
- **Large card** (~160px height), glass-card with animated breathing border glow
- Full accent gradient border (not just 15% opacity — use 30-40%)
- Content depends on state: workout CTA, session complete celebration, rest day, or "set up schedule"
- Play button is **56x56** with accent bg — the dominant tap target on the entire page
- When completed: green glow celebration treatment with XP/volume summary

#### Tier 3: Alert Cards (conditional — only when triggered)
- **Medium cards** with colored left accent strip (4px)
- PR celebration (gold), fatigue alert (red/amber), missed workout (orange), cycle phase (pink)
- Habit milestone (rose), body weight trend (purple)
- Each has a bold accent strip on the left edge, NOT just a subtle border
- These appear/disappear based on context — the stream naturally shortens when nothing is happening

#### Tier 4: Status Row (compact inline items)
- **Slim horizontal cards** (48-56px height) — NOT full-size tile cards
- Recovery %, body weight, water progress, habits summary, weekly volume
- Each is a single row: icon + label + value + optional trend arrow + chevron
- Grouped in a tight stack with 6px gaps (not 16px like the card gaps)
- Module-colored icon backgrounds (20% opacity circles, 28px)
- These replace the current bloated 2x2 stats grid and separate recovery/body weight tiles

#### Tier 5: Energy Dashboard (nutrition — collapsible)
- Compact by default: single row showing "X kcal left" with progress bar
- Tap to expand into full macro breakdown + quick log form
- This saves vertical space — most of the time you just want the number

#### Tier 6: Contextual Stream (nudges + insights)
- Dismissible chip-style items (36px height)
- Nudges with emoji + text + action + dismiss button
- Contextual insight with sparkles icon
- These are the lightest-weight items in the stream

#### Tier 7: Collapsed Section ("More")
- **Expandable accordion** at the bottom
- Contains: attributes bars, quick actions grid, notifications
- Label: "MORE" with chevron that rotates on expand
- Collapsed by default — power users expand it, casual users never scroll this far
- Uses localStorage to remember expand state

### Visual hierarchy rules

| Tier | Height | Gap below | Border treatment | Background |
|---|---|---|---|---|
| 1 (Hero) | ~140px | 20px | Gradient border 30% | Mesh gradient fill |
| 2 (Action) | ~120px | 16px | Breathing glow, 30-40% | Glass + radial glow |
| 3 (Alerts) | ~72px | 8px | 4px left accent strip | Glass card |
| 4 (Status) | ~52px | 6px | Module-color border 20% | Glass card, compact |
| 5 (Energy) | ~52px collapsed / ~280px expanded | 8px | Amber border 20% | Glass card |
| 6 (Chips) | ~36px | 4px | Subtle border 10% | Glass card, minimal |
| 7 (More) | Variable | 0 | None when collapsed | Transparent |

### Identity Hero design

```
┌──────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────┐ │
│  │  🌅 gradient bg (time-of-day mesh)           │ │
│  │                                              │ │
│  │  [Avatar]  Good evening, Akash    [🔔5] [⊙75]│ │
│  │            Wed, 7 Oct · 8:42pm               │ │
│  │            "14 days strong. Relentless."      │ │
│  │                                              │ │
│  │  [⚡Lv.11 BRONZE] [🔥14] [💚87%] [🍽 1420]  │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

The daily score ring (⊙75) is 40px with the percentage inside. The notification bell has a badge count.

### Status Row design

```
┌──────────────────────────────────────────────────┐
│  💚  Recovery     12%  ·  Rest suggested     〉   │
├──────────────────────────────────────────────────┤
│  ⚖️  Body Weight  117 kg  ·  No change       〉   │
├──────────────────────────────────────────────────┤
│  💧  Water        0.8L / 3L  ████░░░░  25%   〉   │
├──────────────────────────────────────────────────┤
│  🔥  Streak       1 day                       〉   │
├──────────────────────────────────────────────────┤
│  📊  This Week    9,515 kg  ·  15 workouts    〉   │
└──────────────────────────────────────────────────┘
```

Each row is tappable → navigates to that module's page. 6px gap between rows. Module-colored icon background circles.

### Collapsed "More" section

```
┌──────────────────────────────────────────────────┐
│  ▸ MORE                                          │
└──────────────────────────────────────────────────┘

Expanded:
┌──────────────────────────────────────────────────┐
│  ▾ MORE                                          │
│  ┌────────────────────────────────────────────┐   │
│  │ ATTRIBUTES                                 │   │
│  │ STR ████████░░  50   END ███░░░░░░  0      │   │
│  │ CON ██░░░░░░░░   3   DIS ███████░░ 70      │   │
│  └────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────┐   │
│  │ QUICK ACTIONS                              │   │
│  │ [📅 Schedule] [📈 Progress] [💚 Recovery]  │   │
│  │ [🍽 Nutrition] [🔥 Habits]  [💧 Wellness]  │   │
│  └────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────┐   │
│  │ NOTIFICATIONS (3)                          │   │
│  │ 🏆 Barbell Squat: 87.5kg × 9 — ...  12h   │   │
│  │ ⚡ You've reached Level 11!           5h   │   │
│  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### Implementation notes

- **Data layer**: ZERO changes. All data fetching stays exactly as-is.
- **Render layer**: Complete rewrite of the return() JSX.
- **CSS**: Add `.hub-hero-gradient`, `.hub-status-row`, `.hub-accent-strip` classes.
- **Animation**: Keep framer-motion stagger. Tier 1-2 animate first, then 3-4, then rest.
- **Habits card**: Stays as-is (segment ring + quick complete strip) — it's already well-built. Positioned in Tier 3-4 area based on pending count.
- **Energy dashboard**: Becomes collapsible — tap row to expand/collapse.

---

## 15. What This Spec Does NOT Cover (explicit deferrals)

- **Card drag-to-reorder**: Requires new DB table + touch gesture library. Deferred.
- **Long-press to expand tiles**: Complex gesture handling. Deferred.
- **Swipe-to-dismiss intelligence cards**: Requires gesture library (react-swipeable or similar). Deferred unless we add it to the project.
- **Confetti particle system**: Nice-to-have but adds bundle size. Deferred unless user wants it.
- **Custom pull-to-refresh animation**: Browser default is fine for now. Deferred.
- **Sharing features**: Story cards, milestone cards — tracked in backlog (#75).
- **Social feed on Hub**: Friend activity, guild updates — future social module work.
