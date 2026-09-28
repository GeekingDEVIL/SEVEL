# SEVEL Unified Training System — Consolidated Status

> Last verified: 2026-09-26 (codebase audit + chat history cross-reference)

---

## Chat Decisions Applied

- **Core restructure DONE**: gym session UI moved /workout → /schedule, MA session inline to /schedule, /workout → gym library, /martial-arts → discipline library hub
- **Auto-Periodization (5.2)**: user said "remove this completely" → removed
- **Superset grouping in schedule**: user said "don't need this in schedule" → removed
- **Session rating emoji**: user said "remove" → replaced with session rating on energy receipt
- **MA pages**: user said "don't want the different pages to go to waste" → keep /martial-arts as discipline library
- **Character + Rankings + Achievements**: user wants merged as ONE unified system
- **Challenges**: weekly + monthly super challenge, class-based

---

## DONE (37 items)

| # | Item | Source |
|---|------|--------|
| 0.1 | Cancel session (pause menu + confirm modal) | Tier 0 |
| 0.2 | Remove session rating emoji | Tier 0 |
| 0.3 | Multi-session debrief with summary/individual pills | Tier 0 |
| 1.1 | DB: `tracking_mode` on exercises | Tier 1 |
| 1.2 | DB: `discipline` on exercises + seed MA/calisthenics/mobility exercises | Tier 1 |
| 1.3 | Adaptive input row — mode-switched fields per tracking_mode | Tier 1 |
| — | Drum weight picker (DrumPicker component) | Phase 1 |
| — | Plate math diagram for barbell exercises (PlateMath component) | Phase 1 |
| — | e1RM trend sparkline in exercise detail sheet | Phase 1 |
| — | Rest timer auto-start + per-exercise rest | Workout UX |
| — | Swap/skip/remove button visibility | Workout UX |
| — | Pause session button | Workout UX |
| — | Warmup button clarity | Workout UX |
| — | Allow finish with 0 completed sets | Workout UX |
| — | RPE/RIR rating chips after set completion | Phase 2 |
| — | Superset/circuit grouping | Phase 2 |
| — | Drop set / rest-pause support | Phase 2 |
| — | Auto-promote exercise ordering | Phase 2 |
| — | Form state persistence (screen-off fix) | Phase 3 |
| — | Wake Lock API during active session | Phase 3 |
| — | Session comparison deltas on debrief | Phase 4 |
| — | Exercise detail sheet (tap exercise name) | Phase 4 |
| — | Session rating on energy receipt | Phase 4 |
| — | First session tooltips (onboarding v2) | Phase 3 |
| — | MuscleHeatMap component (built + wired in schedule + energy receipt) | Phase 4 |
| — | Smart defaults / previous performance overlay | Tier 1 |
| — | StepperInput inline logging (one-hand thumb zone) | Tier 1 |
| — | Dual-weight / per-side logging for dumbbells | Tier 1 |
| — | Edit saved sets (tap to reopen) | Tier 1 |
| — | Undo last action | Tier 1 |
| — | SessionCounterPanel (running stats bar) | Tier 2 |
| — | Fatigue detection + alerts | Tier 5 |
| — | Exercise rotation via RotationCard | Tier 4 |
| — | Idle nudges (45s → "Later", 2min → "Pause?") | Tier 4 |
| — | Flow state detection (UI strips down when logging fast) | Tier 6 |
| — | Ghost pace line (dotted line showing last session pace) | Tier 6 |
| — | Smart next suggestion + recovery banner | Tier 4 |

---

## REMAINING (19 items)

### Tier 1 — Unified Session Engine

| # | Item | Notes |
|---|------|-------|
| 1.4 | Remove MA session tables dependency — `workout_sessions` becomes only session table | MA still uses separate `ma_sessions` table |
| 1.5 | Unified debrief scroll — all exercise types in one scroll with category indicators | |
| 1.6 | Unified `MAX_SESSIONS_PER_DAY` enforcement across all types | |

### Tier 2 — Schedule + Discovery UX

| # | Item | Notes |
|---|------|-------|
| 2.1 | Category picker in exercise browser — color-coded cards as entry point | |
| 2.2 | Mixed plan templates — 10-15 cross-type templates | |
| 2.3 | Category dots on exercise rows — colored indicator in schedule editor + session UI | |
| 2.4 | Time estimate per plan | |
| 2.6 | Stacked day cards — combined card with category labels | |

### Tier 3 — Module Quick-Launch + Hub Pages

| # | Item | Notes |
|---|------|-------|
| 3.3 | MA page → discipline hub dashboard (replace session runner with stats) | |
| 3.4 | Module-filtered stats — discipline-scoped stats from unified exercise_set_logs | |

### Tier 4 — Exercise Flexibility

| # | Item | Notes |
|---|------|-------|
| 4.1 | Exercise tray (grid icon) — all exercises fan out as mini cards | |
| 4.2 | "Later" button — push exercise to end of queue | |
| 4.3 | "Drop" button — context-aware warning on remove | |
| 4.6 | First session tooltips for new exercise flexibility UI | |

### Tier 5 — Universal Activity Cards

| # | Item | Notes |
|---|------|-------|
| 5.1 | Type-aware card system — carousel supports gym/MA/cardio/mobility/calisthenics | |
| 5.2 | Quick-add presets by category | |
| 5.4 | Unified energy receipt with category breakdown timeline | |

### Tier 6 — Intelligence + Adaptive UI

| # | Item | Notes |
|---|------|-------|
| 6.4 | Momentum meter — builds with sets, decays during rest | |
| 6.7 | Workout page muscle browser — tap muscle → filter exercises | |

---

## REMOVED (superseded by completed work or user decision)

| Old Item | Replaced By |
|----------|-------------|
| Hold-to-edit weight (long-press drag) | DrumPicker component |
| Pull-down stats overlay | Exercise detail sheet |
| Double-tap exercise name sparkline | Exercise detail sheet with 1RM sparkline |
| Live 1RM estimate updating per set | e1RM pill (done) |
| Session quality score (0-100) live | Session rating on debrief (done) |
| PR burst particle explosion | Achievement celebrations (done) |
| Session launch fullscreen (1s) | Deferred — low value |
| Focused session mode (darker treatment) | Deferred — visual polish |
| 2.5 "Repeat last session" shortcut | Built |
| 2.7 "Queued exercises" prompt on debrief | Built in WorkoutCompleteCard |
| 3.1 "Add to Schedule" from module pages | Built |
| 3.2 "Start Now" from module pages | Built |
| 4.4 Smart next suggestion + recovery banner | Built |
| 4.5 Idle nudges | Built |
| 5.2 Auto-Periodization | **Removed by user** — "remove this completely" |
| 5.3 Cross-type intelligence — transition banners | Built (fatigue crossover tips) |
| 6.1 Auto-progression prompts | Built |
| 6.2 Fatigue-aware form cues | Built (fatigue alerts) |
| 6.3 Ghost pace line | Built |
| 6.5 Flow state detection | Built |
| 6.6 Living context pill | Deferred — low priority |
| Superset grouping in schedule | **Removed by user** — "don't need this in schedule" |

---

**Summary: 37 done, 19 remaining across 6 tiers. Backlogged: voice logging, shake to log, sharing, exercise images, and 11 more (see memory/project_backlog_remaining.md).**
