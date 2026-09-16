# SEVEL Product Bible Reference

> Source: [SEVEL Product Bible artifact](https://claude.ai/code/artifact/c0c496f3-6133-4ee5-9b69-26cc04a7417a)
> This file saves tokens — read this instead of re-parsing the artifact.
> Last synced: 2026-09-02.

---

## Product Identity

**SEVEL / TOJI PROTOCOL** — Futuristic Fitness RPG / Adaptive Fitness Operating System.
Mobile-first website → PWA → native app (Capacitor in Phase 4-5).

## Product Loop

```
PROFILE → PLAN → EXECUTE → MEASURE → INTERPRET → REWARD → ADAPT
```

## Feature Universe — 102 features across 9 domains

| Domain | Features | Status |
|--------|----------|--------|
| Training & Movement | 18 | Core 6 built, GPS run/cycling/martial arts/yoga/calisthenics planned |
| Nutrition & Fuel | 10 | Calorie tracker built, barcode scanner/AI photo/NL log/meal planner planned |
| Health & Body | 14 | Core 3 built (weight/cycle/recovery), sleep/mood/readiness/progress photos planned |
| Gamification & RPG | 11 | Core 4 built (XP/levels/achievements/streaks), skill trees/quests/seasons/boss battles planned |
| Social & Community | 12 | Rankings built, friends/guilds/feed/challenges/messaging planned |
| AI & Intelligence | 9 | Stub only, LLM coach/auto-periodisation/plateau detection/form analysis planned |
| Wearables | 8 | None built, Apple Health/Google Fit/Garmin/Strava/smart scales planned |
| Education | 7 | Learn tab built, exercise videos/anatomy explorer planned |
| Lifestyle & Habits | 7 | None built, habit tracker/routines/step counter planned |
| Monetisation | 6 | None built, premium sub/season pass/coach marketplace planned |

## Navigation System — Hub-and-Spoke (Section 4)

5 permanent bottom tabs, depth via sub-nav pills. Module system controls visibility.

| Tab | Core Pills | Conditional Pills |
|-----|-----------|-------------------|
| Hub | (no pills — dashboard) | Cards adapt to enabled modules |
| Train | Workout, Schedule, Exercises, Learn | Running, Martial Arts, Yoga, Breathwork |
| Track | Progress, Body, Recovery | Nutrition, Cycle, Habits, Health, Insights |
| Social | Rankings, Achievements | Feed, Guilds, Challenges, Messages |
| You | Profile, Character, Settings, Discover | AI Coach, Goals |

**Module system**: Users pick modules during onboarding. Core modules (Gym, Progress, XP) always on. Everything else opt-in. "Discover" page lets users browse and enable new modules.

## Domain Colour System

| Domain | Colour | Hex |
|--------|--------|-----|
| Hub/Core | Cyan | #22d3ee |
| Strength/Gym | Violet | #8b5cf6 |
| Cardio/Running | Orange | #f97316 |
| Martial Arts | Red | #ef4444 |
| Tracking | Emerald | #10b981 |
| Nutrition | Amber | #f59e0b |
| Cycle | Pink | #ec4899 |
| Social | Blue | #3b82f6 |
| AI Coach | Teal | #14b8a6 |

## Drill-Down Pattern (Section 5)

Universal 3-level: **Browse → Categorise → Detail**. One reusable DrilldownShell, different data sources.

| Domain | Level 1 | Level 2 | Level 3 |
|--------|---------|---------|---------|
| Martial Arts | Discipline list | Technique categories | Technique breakdown |
| Exercises | Body part | Muscle group | Exercise detail + video |
| Yoga | Style | Flow sequences | Pose alignment cues |
| Calisthenics | Skill family | Progression level | Hold detail + prerequisites |
| Recipes | Meal type | Filtered list | Recipe + macros + steps |

**DB tables for drill-down**: `disciplines`, `technique_categories`, `techniques`, `user_technique_progress`

**5 martial arts disciplines**: Shaolin Kung Fu, Kalaripayattu, Muay Thai, BJJ, Boxing

## Phased Roadmap (Section 16)

| Phase | Name | Timeline | Key Features |
|-------|------|----------|-------------|
| 1 | Solidify core | Sep–Oct 2026 | 5-tab nav, module system, glass UI, DB achievements, water tracker, habits, measurements, legal docs |
| 2 | Social & gamification | Nov–Dec 2026 | Friends, activity feed, workout sharing, guilds, challenges, daily quests, character sheet, skill trees, cosmetics |
| 3 | Intelligence & content | Jan–Mar 2027 | AI Coach chat, NL food log, plateau detection, auto-periodisation, martial arts guides, calisthenics, premium launch, Season 1 |
| 4 | Expand domains | Apr–Jun 2027 | GPS running, cycling, yoga, sleep tracker, mood tracker, progress photos, barcode scanner, DMs, guild chat, boss battles |
| 5 | Go native & scale | Jul–Oct 2027 | Capacitor wrapper, Apple Health, Google Fit, form analysis, smart programs, coach marketplace, forums, app store launch |

**Priority rule**: Retention before acquisition. Social (Phase 2) keeps users. AI (Phase 3) justifies premium. Content (3-4) broadens audience. Native (5) unlocks app stores.

## Database Growth

| Phase | Cumulative Tables |
|-------|-------------------|
| Current | ~15 |
| + Phase 1 | 20 |
| + Phase 2 | 33 |
| + Phase 3 | 44 |
| + Phase 4 | 56 |
| + Phase 5 | 68 |

**Schema rules**: (1) Every table has user_id + RLS. (2) Weights in kg. (3) DATE for daily logs. (4) JSON for flexible data. (5) Soft deletes. (6) Indexes on (user_id, date). (7) No cross-user access without friendship/guild.

## Tech Stack Evolution (Section 8)

Stay PWA through Phase 1-3. Capacitor wrapper in Phase 4 (GPS needs background). Full Expo/RN only if Capacitor hits limits.

PWA blockers for native: Apple HealthKit (❌), Background GPS (⚠️), Push notifs iOS (⚠️), Step counting (❌), Bluetooth HR (⚠️), App Store (❌).

## Monetisation (Section 12)

**When to charge**: After 1,000+ active users, >30% weekly retention, social features live.

| Tier | India | Global |
|------|-------|--------|
| Premium | ₹199/mo or ₹1,499/yr | $4.99/mo or $39.99/yr |
| Season pass | ₹299/season (~8 weeks) | ~$3.50/season |
| Coach marketplace | 15% platform fee | Coaches set rates |

**Free tier keeps**: Workout logging, schedule, exercises, progress, PRs, XP, streaks, rankings, social, friends, challenges.
**Premium adds**: Unlimited AI Coach, barcode + AI photo food, smart programs, form analysis, advanced insights, premium season track, all wearables.

## Cost Analysis (Section 11)

| Users | Monthly Cost |
|-------|-------------|
| 100 | ~$2 |
| 1,000 | ~$60 |
| 10,000 | ~$400 |
| 100,000 | ~$3,000 |

AI (Claude API) is biggest variable. Mitigations: Haiku not Opus, cache responses, rate-limit free tier (10 AI msg/day), batch jobs, rule-based where possible.

## Legal & Compliance (Sections 9-10)

**Required disclaimers**: General fitness, AI Coach, Cycle tracker, Pregnancy mode.
**Health data = sensitive personal data** under DPDPA (India), GDPR (EU), CCPA (US).
**Required docs before launch**: Privacy policy, ToS, Cookie policy, DMCA policy.
**Age restriction**: Min 13 (COPPA/DPDPA). 13-17: parental consent for health data.

## Current Build Status

### Built & Live
- Auth (Google + email + username)
- Dashboard/Hub command center
- Exercise DB (200+), custom exercises, warm-up generator
- Schedule calendar, workout editing, plan library (55+ plans)
- Active workout, set/rep/load logging
- Progress charts, body weight/stats
- Calorie engine (TDEE + quick-log meals + daily rings)
- XP & leveling, achievements, rankings, streaks
- Unit system (kg ↔ lbs)
- Dual-sex profiles
- Cycle tracker
- Recovery monitor
- Notifications
- Learn tab (articles with journal references)
- Insight cards (monthly insights, strength benchmark, phase performance)
- Hub-and-Spoke 5-tab navigation with sub-nav pills
- Glass Forge UI upgrade

### Phase 1 TODO (Sep–Oct 2026)
- [x] Module system (progressive disclosure) — built 2026-09-02
- [x] Discover page (browse/enable modules) — built 2026-09-02
- [ ] DB-driven achievements
- [ ] Water tracker
- [ ] Habit tracker
- [ ] Body measurements (tape measurements)
- [ ] Adaptive calorie target
- [ ] Equipment-aware filtering
- [ ] Anti-cheat / anomaly detection
- [ ] Day-only vs template-update logic
- [ ] Legal docs (privacy policy, ToS)
- [ ] Character sheet (RPG stats from real data)
