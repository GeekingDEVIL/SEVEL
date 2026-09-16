# SEVEL Product Bible — Reference Summary

> Source: [Interactive Bible artifact](https://claude.ai/code/artifact/c0c496f3-6133-4ee5-9b69-26cc04a7417a) (v2.0, Aug 2026)
> This file captures all strategic, design, and architecture decisions. Read this instead of the 1500-line HTML.

---

## 1. What Is SEVEL

All-in-one fitness super-app: gym logging + nutrition + female health + running/cardio + martial arts + yoga + calisthenics + habits + health vitals + social/guilds + AI coaching + RPG gamification.

**Vision:** "Everything you need for your body, in one place."

**102 features across 9 domains:**
| Domain | Count | Color |
|--------|-------|-------|
| Training & Movement | 18 | `#8b5cf6` violet |
| Health & Body | 14 | `#10b981` emerald |
| Social & Community | 12 | `#3b82f6` blue |
| Gamification & RPG | 11 | `#f97316` orange |
| Nutrition & Fuel | 10 | `#f59e0b` amber |
| AI & Intelligence | 9 | `#14b8a6` teal |
| Wearables | 8 | `#22d3ee` cyan |
| Education | 7 | `#ec4899` pink |
| Lifestyle & Habits | 7 | `#f43f5e` rose |
| Monetisation | 6 | `#10b981` emerald |

### Core Differentiators
1. **Module system** — users enable only what they use. Zero overwhelm. Smart suggestions after milestones.
2. **RPG gamification** — XP, levels, ranks (E→S, Solo Leveling inspired), skill trees, daily quests, seasons, boss battles, loot drops. Cosmetics earned, never purchased.
3. **Guild & class system** — discipline classes, guilds (50 max), guild XP/rankings/chat/co-op boss battles.
4. **AI Coach** — Claude Haiku with full user context. 10 msg/day free, unlimited premium. Always disclaimered.
5. **Sex-aware training** — dual-sex profiles, cycle integration, phase-adapted training, pregnancy/postpartum mode.
6. **One data ecosystem** — gym affects calorie budget, sleep adjusts training, nutrition correlates with PRs. Readiness score from sleep+recovery+mood+load.

---

## 2. Current State (28 Features Live)

**Stack:** Next.js 16.3 App Router, TypeScript, React 19, Tailwind CSS v4, Framer Motion, Supabase (Auth, PostgreSQL, Realtime, Edge Functions, Storage), Recharts, Vercel hosting, ap-northeast-1 region.

**Built:** 14 migrations, ~79 source files, 41 lib modules.

### What's Live
- **Auth:** Magic link (Supabase), multi-step onboarding
- **Training (10):** Live workout logger, weekly schedule planner, exercise DB (200+), custom exercises, plan library (55+ plans incl 20 female-specific), warm-up generator
- **Tracking (6):** Progress charts, calorie/macro tracker (dual TDEE engine), cycle tracker (phase detection, contraception mode), recovery monitor, body weight/stats, interactive calendar
- **Gamification (4):** XP & leveling, achievements (hardcoded), global rankings, streak tracking
- **Other (6):** Unit system (kg↔lbs), dual-sex profiles, AI Coach (stub), notifications, learn tab, insights panel

---

## 3. Navigation System — Hub-and-Spoke

**Problem:** Flat sidebar with 10+ items doesn't scale to 20+ pages.

**Solution:** 5 permanent bottom tabs, depth inside each via sub-nav pills.

| Tab | Icon | Core Pills | Conditional Pills |
|-----|------|-----------|-------------------|
| **Hub** | 🏠 | Today's Workout, XP Bar, Streak | Calories, Cycle, Readiness, Quests, Friends |
| **Train** | 💪 | Workout, Schedule, Exercises, Learn | Running, Martial Arts, Yoga, Breathwork |
| **Track** | 📊 | Progress, Body, Recovery | Nutrition, Cycle, Habits, Health, Insights |
| **Social** | 👥 | Rankings, Achievements | Feed, Guilds, Challenges, Messages |
| **You** | 🧬 | Profile, Character, Settings, Discover | AI Coach, Goals |

### Module System (Progressive Disclosure)
- Users pick modules during onboarding
- Core modules (Gym, Progress, XP) always on
- "Discover" page to browse/enable modules anytime
- Smart suggestions after usage milestones

### Domain Color System
| Domain | Hex | CSS var |
|--------|-----|---------|
| Hub / Core | `#22d3ee` | `--cyan` |
| Strength / Gym | `#8b5cf6` | `--violet` |
| Cardio / Running | `#f97316` | `--orange` |
| Martial Arts | `#ef4444` | `--red` |
| Tracking | `#10b981` | `--emerald` |
| Nutrition | `#f59e0b` | `--amber` |
| Cycle | `#ec4899` | `--pink` |
| Social | `#3b82f6` | `--blue` |
| AI Coach | `#14b8a6` | `--teal` |

---

## 4. Drill-Down Pattern

Universal **browse → categorise → detail** (3-level) pattern. One reusable `DrilldownShell` component, different data sources.

| Domain | L1 (Browse) | L2 (Category) | L3 (Detail) |
|--------|-------------|---------------|-------------|
| Martial Arts | Discipline list | Technique categories | Technique breakdown |
| Exercises | Body part | Muscle group | Exercise detail + video |
| Yoga | Style | Flow sequences | Pose alignment cues |
| Calisthenics | Skill family | Progression level | Hold detail + prerequisites |
| Recipes | Meal type | Filtered list | Recipe + macros + steps |

**DB tables:** `disciplines`, `technique_categories`, `techniques`, `user_technique_progress`

### Martial Arts Disciplines (5)
1. **Shaolin Kung Fu** — 🐉 China, 1500 yrs. Animal forms, conditioning, weapons. 6 categories, ~45 techniques.
2. **Kalaripayattu** — ⚡ India, 3000+ yrs. Body control, wooden/metal weapons, vital points. 5 categories, ~33 techniques.
3. **Muay Thai** — 🥊 Thailand, 500+ yrs. Art of 8 limbs. Punches, kicks, elbows, knees, clinch. 6 categories, ~40 techniques.
4. **Brazilian Jiu-Jitsu** — 🤼 Brazil, ~100 yrs. Guard, sweeps, passes, submissions, escapes. 6 categories, ~48 techniques.
5. **Boxing** — 🥊 Global, ancient. Punches, footwork, defence, combos, conditioning. 6 categories, ~41 techniques.

---

## 5. UI Pattern Library

### Visual Direction: Glass Forge
Extend login page's glass morphism into the whole app. Frosted glass cards (`backdrop-blur-xl`), gradient borders, ambient glow on active elements. Domain colour system provides section identity.

### Component System
| Component | Description | When |
|-----------|-------------|------|
| **Glass card** | `backdrop-blur-xl`, `bg-white/[0.04]`, gradient border, subtle glow on hover | Primary container |
| **Stat chip** | Small pill: value + label, domain-coloured | Key numbers on Hub |
| **Progress ring** | SVG circular fill (calorie ring, XP bar, hydration) | Daily targets |
| **Drill-down list** | Rows: status badge + arrow + progress bar | Martial arts, exercises, yoga |
| **Timeline row** | Left-bordered card with timestamp | Activity feed, notifications |
| **Sub-nav pills** | Horizontal scrollable strip, domain-coloured active | Inside each tab |
| **Quick-action FAB** | Floating button → expandable menu | Start workout, log food |

### Typography
- **Space Grotesk** — headings and display numbers (tech/gaming feel)
- **Inter** — body text (clean readability)
- **JetBrains Mono** — data values only (weights, times, counts). Accent, not dominate.
- **Scale:** 10px captions → 12px body small → 14px body → 16px section → 18px chapter → 24px page → 32px hero

### Animation Principles (Framer Motion)
- Page transitions: slide right for drill-down, slide left for back
- Card entrance: stagger on scroll
- Micro-interactions: button press scale(0.97), toggle bounce
- Celebration: PR confetti, boss defeated animation, level up glow burst
- Rule: every animation communicates state change — no gratuitous motion

---

## 6. Database Architecture

**Current:** 14 migrations, ~15 tables.

### Growth by Phase
| Phase | Cumulative Tables | New Tables |
|-------|-------------------|------------|
| Current | 15 | — |
| Phase 1 | 20 | user_modules, water_logs, body_measurements, user_habits, habit_logs |
| Phase 2 | 33 | friendships, guilds, guild_members, activity_feed, activity_likes, activity_comments, challenges, challenge_participants, daily_quests, skill_tree_nodes, user_skill_progress, cosmetics, user_cosmetics |
| Phase 3 | 44 | coach_conversations, disciplines, technique_categories, techniques, user_technique_progress, periodisation_suggestions, recipes, recipe_ratings, seasons, season_rewards, user_season_progress |
| Phase 4 | 56 | run_sessions, swim_sessions, sleep_logs, mood_logs, meditation_logs, progress_photos, meal_plan_entries, fasting_logs, messages, conversations, boss_battles, boss_battle_attempts |
| Phase 5 | 68 | wearable_connections, blood_work, blood_work_results, vitals_logs, coach_profiles, coaching_sessions, forum_posts, forum_replies, forum_votes, events, event_rsvps, gym_reviews |

### Schema Rules
1. Every table has `user_id` + RLS policy
2. Weights always stored in kg
3. Dates as DATE for daily logs
4. JSON columns for flexible structured data
5. Soft deletes (`deleted_at`) for user content
6. Indexes on `(user_id, date)` for all log tables
7. No cross-user data access without explicit friendship/guild checks

---

## 7. Tech Stack Evolution

Stay PWA through Phase 1-3. Capacitor wrapper in Phase 4 (GPS running needs background). Full Expo/RN only if Capacitor hits limits. Web app always remains as fallback.

| Feature | PWA | Native needed? |
|---------|-----|---------------|
| Apple HealthKit | ❌ | Yes — #1 driver |
| Background GPS | ⚠️ Stops on lock | Yes for running |
| Push notifications (iOS) | ⚠️ Limited | Native reliable |
| Step counting | ❌ No background | Yes |
| Camera (barcode, photos) | ✅ Works | No |
| App Store distribution | ❌ | Yes for discovery |

---

## 8. Monetisation

### Free vs Premium
| Feature | Free | Premium |
|---------|------|---------|
| Workout + schedule + exercises | ✅ Unlimited | ✅ |
| Progress + PRs + XP + streaks | ✅ Full | ✅ |
| Calorie tracking | Manual | + Barcode + AI photo |
| Social + friends + challenges | ✅ | ✅ |
| Guilds | Join 1 | Create + join multiple |
| AI Coach | 10 msg/day | Unlimited |
| Smart programs + form analysis | ❌ | ✅ |
| Advanced insights + weekly AI report | ❌ | ✅ |
| Season battle pass | Free track | Both tracks |
| Wearable sync | 1 device | All devices |

### Pricing
- **India:** ₹199/mo or ₹1,499/yr
- **Global:** $4.99/mo or $39.99/yr
- **Season pass:** ₹299/season ($3.50), 8-week seasons
- **Coach marketplace:** 15% platform fee
- **When:** Not until 1,000+ active users, >30% weekly retention, social live, AI Coach working

---

## 9. Cost Analysis (Monthly)

| Service | 100 users | 1K users | 10K users | 100K users |
|---------|-----------|----------|-----------|------------|
| Supabase | Free | $25 | $25-75 | $75-300 |
| Vercel | Free | Free | $20 | $20-150 |
| Claude API | ~$2 | ~$20 | ~$200 | ~$2,000 |
| Storage (R2) | ~$0 | ~$5 | ~$50 | ~$500 |
| **Total** | **~$2** | **~$60** | **~$400** | **~$3K** |

**AI cost control:** Haiku only (not Sonnet/Opus), cache common responses, rate-limit free tier, pre-compute weekly reports, rule-based logic where possible.

---

## 10. Phased Roadmap

| Phase | Timeline | Focus | Key Features |
|-------|----------|-------|-------------|
| **1 — Solidify** | Sep–Oct 2026 | Polish core | 5-tab nav, module system, glass UI, DB achievements, water, habits, measurements, legal |
| **2 — Social** | Nov–Dec 2026 | Retention engine | Friends, activity feed, sharing, guilds, challenges, daily quests, character sheet, skill trees, cosmetics |
| **3 — Intelligence** | Jan–Mar 2027 | Premium differentiator | AI Coach chat, NL food log, plateau detection, auto-periodisation, martial arts, calisthenics, anatomy, premium launch, Season 1 |
| **4 — Expand** | Apr–Jun 2027 | New domains | GPS running, cycling, yoga, sleep, mood, progress photos, barcode, DMs, guild chat, boss battles |
| **5 — Native** | Jul–Oct 2027 | App stores | Capacitor, Apple Health, Google Fit, form analysis, smart programs, coach marketplace, forums |

**Priority rule:** Retention before acquisition. Social keeps users → AI justifies premium → Content broadens audience → Native unlocks distribution.

---

## 11. Legal & Compliance

### Required Disclaimers
- **General fitness:** "Not a medical device. Consult your physician."
- **AI Coach:** "AI guidance, not medical advice" on every response
- **Cycle tracker:** "Estimates only. Not reliable for contraception."
- **Pregnancy:** "Must be approved by OB-GYN."

### Required Documents (before launch)
Privacy policy, Terms of Service, Cookie policy, DMCA policy

### Key Laws
- **DPDPA 2023 (India):** Consent, right to erasure, 72h breach notification
- **GDPR (EU):** Explicit consent, DPO for health data, Privacy Impact Assessment
- **CCPA (California):** "Do Not Sell", applies at $25M revenue or 50K+ users

**Age:** Minimum 13 (COPPA/DPDPA). 13-17 parental consent for health data.

---

## 12. Security & Moderation

- Supabase RLS on all tables, TLS, encrypted at-rest, JWT auth
- Rate limiting on Edge Functions, parameterised queries
- **Custom exercises:** auto-approve (low risk)
- **Photos:** AI moderation (Claude Vision) before publishing
- **Forum posts:** post-publish moderation, report button, auto-flag keywords
- **Chat messages:** report button only, DO NOT scan private messages
- **Recipes:** moderation queue before public visibility

---

## 13. Content Strategy

| Content | Volume | Source | Phase |
|---------|--------|--------|-------|
| Exercise descriptions | 200+ ✅ | Self-written | Done |
| Martial arts techniques | ~200 | AI-drafted → expert review | 3 |
| Yoga poses + flows | ~80 + 20 | AI-drafted → practitioner review | 4 |
| Calisthenics progressions | ~60 | AI-drafted → expert review | 3 |
| Exercise videos | 50-100 | Self-produced (phone+tripod) | 3-4 |
| Recipes | 100 starter + community | AI-generated → tested | 4 |
| Learn articles | 30+ (some done) | Self-written, citing PubMed | Ongoing |

---

## 14. Team Scaling

| Role | When | Why |
|------|------|-----|
| UI/UX designer (contract) | Phase 1 | Glass morphism design system |
| Content moderator (part-time) | Phase 2 | UGC moderation |
| Content creator (contract) | Phase 3 | Martial arts, exercise videos |
| Mobile developer (part-time) | Phase 5 | If Capacitor isn't enough |
| Community manager | 5,000+ users | Forums, disputes, social media |

**Rule:** Stay solo + AI as long as possible. Viable through 10K+ users.

---

## 15. Competitive Landscape

SEVEL vs competitors — no single app combines gym + nutrition + cardio + martial arts + social + RPG + AI.

| App | Focus | Price | SEVEL Advantage |
|-----|-------|-------|-----------------|
| Strong | Gym only | $4.99/mo | SEVEL does gym + everything else |
| MyFitnessPal | Nutrition | $9.99/mo | SEVEL adds AI NL logging, cheaper |
| Strava | Cardio + Social | $7.99/mo | SEVEL adds gym, RPG, AI |

**Learn from:** Strong's fast logging UX, Strava's addictive social feed, MFP's food DB size (counter with AI + OpenFoodFacts).
