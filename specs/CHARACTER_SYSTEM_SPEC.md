# ASCEND — Unified Character & Identity System Spec

> Complete design spec for the merged character/identity/gamification system.
> Covers: domains, ranking, archetypes, challenges, engagement loops, history, hub dynamics.
> Replaces the separate character sheet, ranking, and achievement systems with ONE unified system.
> Designed for multi-module expansion (martial arts, yoga, calisthenics, running, etc.)

---

## Design Principles

### One System, Not Five
Character sheet, rankings, achievements, titles, and attributes are currently separate features
with separate UI and separate logic. This spec merges them into a single **Character page** that
is the definitive view of who you are in ASCEND.

### Data-Driven, Not Hardcoded
Every domain score, archetype assignment, rank progression, and challenge is computed from
actual training data. Nothing is manually assigned. The system watches what you do and reflects
it back as identity.

### Progressive Unlocking
New users see a simple version. Features reveal as you level up:
- **Level 1-5:** Basic rank + XP bar + simple stats
- **Level 6-15:** Domain radar chart appears, archetype assigned
- **Level 16-30:** Challenges unlock, rivalry system appears
- **Level 31+:** Full character page, specializations, all engagement features

### Whisper, Don't Shout
Micro-celebrations only. No full-screen modals. A rank-up is a toast + badge glow + subtle haptic.
A challenge completion is a checkmark animation + XP pop. Respect the user's time.

### Smart Defaults, Zero Configuration
Archetype auto-detected. Rival auto-matched. Quests auto-generated. Challenges class-based.
The user never configures their identity — they just train and the system figures it out.

---

## 1. Training Domains

Six core domains, each scored 0-100. Scores are computed from real training data,
not arbitrary points. Every exercise, workout, and activity maps to one or more domains.

| Domain | What It Measures | Data Sources |
|--------|-----------------|--------------|
| **Force** | Raw strength output | 1RM estimates, total tonnage, compound lift ratios, PR frequency |
| **Form** | Movement quality & control | Form check scores, mobility work frequency, tempo adherence, ROM consistency |
| **Flow** | Cardiovascular & endurance | Cardio session duration, heart rate data (if wearable), running/cycling/swimming metrics |
| **Fight** | Combat & martial arts skill | Martial arts session frequency, technique scores, sparring logs, combo completion |
| **Function** | Athletic versatility | Exercise variety score, bodyweight exercise ratio, circuit/CrossFit performance, movement pattern coverage |
| **Fortitude** | Consistency & mental toughness | Streak length, workout completion rate, scheduled adherence, training through plateaus |

### Domain Score Calculation

Each domain is a weighted composite of its data sources, normalized to 0-100.
Scores decay over time — a domain you haven't trained in 2 weeks starts dropping.
This prevents gaming (you can't just grind one domain once and coast).

```
domain_score = weighted_average(data_sources) * recency_multiplier
recency_multiplier:
  - Trained this week: 1.0
  - Trained last week: 0.95
  - 2 weeks ago: 0.85
  - 3 weeks ago: 0.70
  - 4+ weeks ago: 0.50 (floor — never drops below half)
```

### Visualization

Six-axis radar chart on the character page. Shows current scores with a "ghost" overlay
of your scores from 4 weeks ago — you can see growth (or neglect) at a glance.

---

## 2. Ranking System — The Crucible of Legends

### Rank Ladder

10 ranks, each spanning 10 levels. Level 1-100 total.

| Level | Rank | Concept | Color | Badge |
|-------|------|---------|-------|-------|
| 1-10 | **Raw** | Unrefined potential | Earth brown `#8B6F47` | Rough stone circle |
| 11-20 | **Tempered** | First trials survived | Warm iron `#A0866C` | Stone with heat cracks |
| 21-30 | **Forged** | Shaped through fire and will | Ember orange `#E8722A` | Molten-edged shield forming |
| 31-40 | **Proven** | Battle-tested, worthy | Steel blue `#4A7FA5` | Shield complete, scarred |
| 41-50 | **Adamant** | Unbreakable, immovable | Dark gunmetal `#3D4852` | Shield + fist emblem |
| 51-60 | **Champion** | Rises above all challengers | White-gold `#D4AF37` | Wings beginning to form |
| 61-70 | **Mythic** | Feats that become stories | Deep amethyst `#7B2D8E` | Winged emblem, faint glow |
| 71-80 | **Titan** | Shakes the earth | Obsidian + ember `#1A1A2E` / `#E85D04` | Emblem pulsing with fire |
| 81-90 | **Immortal** | Beyond death, beyond time | Cosmic midnight + gold `#0D1B2A` / `#FFD700` | Full halo, star particles |
| 91-100 | **Ascended** | Transcended mortal form | Prismatic shift (animated) | Animated prismatic emblem |

### XP System

XP is earned from real training activity. No busywork, no inflation.

**XP Sources:**
| Action | XP | Notes |
|--------|-----|-------|
| Complete a workout | 50-150 | Scaled by duration and intensity |
| Complete a set | 5-15 | Higher for compound lifts, heavy loads |
| Hit a PR | 100 | Any exercise, any rep range |
| Form check score 80+ | 50 | Encourages using form check |
| Form check score 90+ | 100 | Rewards excellent form |
| Complete a challenge | 200-500 | Weekly/monthly varies |
| Win a rivalry week | 150 | Head-to-head competition |
| Maintain 7-day streak | 75 | Weekly consistency bonus |
| First workout of the day | 25 | Daily login equivalent |

**XP per level curve:**
```
xp_for_level(n) = 100 * n * (1 + 0.05 * n)

Level 1→2:   105 XP
Level 10→11: 1,050 XP
Level 50→51: 6,275 XP
Level 99→100: 14,850 XP
```

Total XP to reach Level 100 (Ascended): ~500,000 XP
Estimated time at 3-4 workouts/week: 12-18 months (intentionally long — this is a journey)

### Prestige: The Reforging

When you reach Level 100 (Ascended), you can **Reforge**.

**What resets:**
- Your rank (back to Raw)
- Your XP counter (back to 0)

**What does NOT reset:**
- Domain scores, archetype, specialization
- Achievement history, challenge history, rivalry record
- All unlocked features (progressive unlock stays open)
- All cosmetics, titles, earned loot — kept forever
- Training stats, PRs, workout data — never touched

**Reforge scaling:**

| Cycle | XP Multiplier | Bonus | Exclusive Reward |
|-------|--------------|-------|-----------------|
| Reforge I (★) | 1.2x | +5% XP gain | Forge Mark I badge frame |
| Reforge II (★★) | 1.4x | +10% XP gain | Forge Mark II + unique title |
| Reforge III (★★★) | 1.6x | +15% XP gain | Forge Mark III + animated badge |
| Reforge IV (★★★★) | 1.8x | +20% XP gain | Forge Mark IV + profile aura |
| Reforge V (★★★★★) | 2.0x | +25% XP gain | **Eternal** — final form |

**After Reforge V — Eternal Ascended:**
- No more resets. Level uncaps: 101, 102, 103... infinite
- Each level past 100: logarithmic scaling (progressively harder)
- Leaderboard position among Eternals by total lifetime XP
- Unique **Eternal** profile treatment — subtle animated aura, unmistakable

**Display examples:**
- New user: **Raw** (brown badge)
- Solid user: **Adamant** (gunmetal badge)
- Dedicated: **Ascended** (prismatic badge)
- Veteran: **Titan ★★** (obsidian badge, 2 forge marks)
- Legend: **Ascended ★★★★★ — Eternal** (animated prismatic + eternal aura)

### Badge Evolution

The rank badge is ONE visual that represents you everywhere — hub, character page,
leaderboard, profile card. It evolves with each rank:

- **Raw:** Simple rough circle
- **Tempered:** Circle with heat-crack texture
- **Forged:** Molten edges, shield shape forming
- **Proven:** Shield complete with battle scars
- **Adamant:** Shield + central fist emblem
- **Champion:** Small wings sprouting from shield
- **Mythic:** Wings spread, faint purple glow
- **Titan:** Emblem pulses with ember particles
- **Immortal:** Full halo + star particle system
- **Ascended:** Full animated emblem, prismatic color shift

Reforge marks (★) appear below/beside the badge. Eternal gets a persistent aura ring.

---

## 3. Archetypes

### Layer 1: Primary Archetype (Auto-detected from domains)

Your archetype is determined by your top 1-2 domain scores. Updated weekly.

**Single-domain dominant** (one domain 15+ points above all others):

| Top Domain | Archetype | Identity |
|-----------|-----------|----------|
| Force | **Juggernaut** | Raw power incarnate |
| Form | **Sentinel** | Precision and control |
| Flow | **Strider** | Endurance machine |
| Fight | **Striker** | Combat specialist |
| Function | **Phantom** | Versatile athlete |
| Fortitude | **Warden** | Unbreakable consistency |

**Dual-domain combos** (two domains within 10 points of each other, both 15+ above the rest):

| Domains | Archetype | Identity |
|---------|-----------|----------|
| Force + Form | **Titan** | Power with perfect technique |
| Force + Flow | **Colossus** | Strength that never fades |
| Force + Fight | **Berserker** | Devastating striking power |
| Force + Function | **Golem** | Functional raw strength |
| Force + Fortitude | **Monolith** | Relentless powerhouse |
| Form + Flow | **Monk** | Graceful endurance |
| Form + Fight | **Bladedancer** | Technical combat artist |
| Form + Function | **Artisan** | Movement perfectionist |
| Form + Fortitude | **Stoic** | Disciplined precision |
| Flow + Fight | **Tempest** | Tireless fighter |
| Flow + Function | **Nomad** | Enduring versatility |
| Flow + Fortitude | **Pilgrim** | The long-distance grinder |
| Fight + Function | **Ronin** | Adaptable warrior |
| Fight + Fortitude | **Spartan** | Relentless combatant |
| Function + Fortitude | **Centurion** | Versatile and unyielding |

**No clear dominant** (all domains within 15 points):
- **Ascendant** — balanced across all domains

### Layer 2: Specialization (From specific module activity)

Activates when 70%+ of training within your dominant domain comes from one module.
Otherwise you keep the base archetype name.

**Force specializations:**

| Module Focus | Specialization | Replaces |
|-------------|---------------|----------|
| Powerlifting (SBD focus) | **Ironborn** | Juggernaut |
| Olympic lifting | **Olympian** | Juggernaut |
| Bodybuilding (hypertrophy) | **Sculptor** | Juggernaut |
| Strongman-style | **Atlas** | Juggernaut |

**Form specializations:**

| Module Focus | Specialization | Replaces |
|-------------|---------------|----------|
| Yoga | **Sage** | Sentinel |
| Pilates / Mobility | **Willow** | Sentinel |
| Gymnastics / Flexibility | **Acrobat** | Sentinel |

**Flow specializations:**

| Module Focus | Specialization | Replaces |
|-------------|---------------|----------|
| Running | **Marathoner** | Strider |
| Swimming | **Leviathan** | Strider |
| Cycling | **Roadrunner** | Strider |
| Rowing / Cardio machines | **Oarsman** | Strider |

**Fight specializations:**

| Module Focus | Specialization | Replaces |
|-------------|---------------|----------|
| Boxing | **Pugilist** | Striker |
| Kickboxing / MMA | **Vanguard** | Striker |
| Grappling / BJJ | **Constrictor** | Striker |
| Karate / TKD / Traditional | **Bladestorm** | Striker |

**Function specializations:**

| Module Focus | Specialization | Replaces |
|-------------|---------------|----------|
| Calisthenics | **Freerunner** | Phantom |
| CrossFit-style / HIIT | **Forgeborn** | Phantom |
| Sport-specific training | **Decathlete** | Phantom |

**Fortitude specializations:**

| Module Focus | Specialization | Replaces |
|-------------|---------------|----------|
| Ultra-consistency (365+ streak) | **Eternal Warden** | Warden |
| Plateau-breaking focus | **Siegebreaker** | Warden |

**Display format:**
- No specialization: "Juggernaut"
- With specialization: "Juggernaut — Ironborn" or just "Ironborn" in compact views
- Archetype changes are announced as a character event (toast + logged in history)

### Adding Future Modules

When a new training module is added (e.g., dance, rock climbing, rehabilitation):
1. Map it to 1-2 existing domains (dance → Form + Flow)
2. Add specialization entries for that module
3. No structural changes needed — the domain/archetype system scales automatically

---

## 4. Challenges

### Weekly Challenge (Resets every Monday)

One challenge per archetype class, given to ALL users of that archetype.
Everyone in the same class gets the same goal — creates community feeling.

**Properties:**
- Auto-generated based on archetype + user level range
- Difficulty scales with rank (Raw gets easy, Mythic gets hard)
- Reward: 200 XP + common/rare cosmetic drop (loot table roll)
- Tracked on hub card + character page

**Example weekly challenges by archetype:**

| Archetype | Example Challenge |
|-----------|------------------|
| Juggernaut | "Hit a compound lift PR this week" |
| Sentinel | "3 form checks scoring 75+ this week" |
| Strider | "Log 60 minutes of cardio this week" |
| Striker | "Complete 4 martial arts sessions" |
| Phantom | "Do 5 different exercise types this week" |
| Warden | "Train every scheduled day this week" |
| Titan | "200 total reps of compound movements" |
| Monk | "Complete 3 flexibility + 2 cardio sessions" |

### Monthly Super Challenge (1st to last day of month)

One big challenge per archetype. Harder, more rewarding. Completion earns a
unique collectible badge for that specific month.

**Properties:**
- Auto-generated, archetype-specific
- Significantly harder than weekly
- Reward: 500 XP + guaranteed rare cosmetic + unique monthly title
- Title format: "October Titan", "November Ironborn" — collectible, shows the month
- Failed challenges are logged but give no reward (attempt is still tracked)

**Example monthly challenges:**

| Archetype | Example |
|-----------|---------|
| Juggernaut | "Total 200,000kg volume this month" |
| Sentinel | "Average form check score 80+ across 10 checks" |
| Strider | "Log 20 hours of cardio this month" |
| Striker | "50 martial arts sessions this month" |
| Phantom | "50 bodyweight exercise sets this month" |
| Warden | "Zero missed scheduled workouts this month" |

### Challenge Generation Engine

Challenges are generated server-side (Supabase Edge Function or pg_cron).

```
Monday 00:00 UTC:
  1. For each archetype class:
     a. Select challenge template matching the archetype's domain
     b. Scale difficulty by median rank of users in that class
     c. Create challenge record
     d. Assign to all users with that archetype

1st of month 00:00 UTC:
  1. Same process but monthly templates + harder scaling
  2. Finalize previous month's results
  3. Award monthly titles to completers
```

---

## 5. Rivalries

### Auto-matched 1v1 Competition

Rivalries are weekly head-to-head matchups. You vs one other user of similar rank.

**Matching criteria:**
- Same archetype class (or adjacent)
- Within 10 levels of each other
- Similar weekly workout frequency (±1 session)
- Never the same rival two weeks in a row

**Scoring (weekly):**
- Total XP earned that week
- Bonus points for: PRs (+50), form checks (+25), streak maintenance (+25)
- Tiebreaker: whoever trained more days that week

**Outcome:**
- Win: 150 XP + rivalry win recorded
- Loss: 50 XP (participation) + rivalry loss recorded
- Draw (within 5%): 100 XP each + draw recorded

**Display:**
- Hub card shows current rival: their rank badge, archetype, this week's score comparison
- Minimal info about rival (rank, archetype, score) — not their full profile
- End-of-week result notification (toast on next app open)

### Rivalry History

Every rivalry outcome is logged with:
- Week dates
- Your score vs their score
- Outcome (W/L/D)
- Your rank at the time
- Rival's rank + archetype at the time

Accessible from the History tab on the character page. Shows win/loss record,
current streak, longest win streak, and a paginated list of past matchups.

---

## 6. Loot & Cosmetics

### Loot Drops

Earned through gameplay, never purchased. Cosmetics are visual customizations
for your profile/badge/character card.

**Drop sources:**
| Source | Drop chance | Rarity pool |
|--------|-----------|-------------|
| Complete a workout | 15% | Common (80%), Rare (18%), Epic (2%) |
| Win a rivalry | 30% | Common (60%), Rare (30%), Epic (10%) |
| Complete weekly challenge | 100% | Common (50%), Rare (40%), Epic (10%) |
| Complete monthly challenge | 100% | Rare (50%), Epic (40%), Legendary (10%) |
| Rank up | 100% | Guaranteed rare+ |
| Reforge | 100% | Guaranteed legendary |

**Cosmetic types:**
- **Badge frames** — decorative borders around your rank badge
- **Profile backgrounds** — subtle patterns/textures behind your character card
- **Title plates** — visual style for your title text (glow, outline, gradient)
- **Aura effects** — subtle particle/glow effects on your profile (rare+)
- **Badge trails** — animation effects when your badge appears (epic+)

**Rarity tiers:**
| Rarity | Color | Drop weight |
|--------|-------|-------------|
| Common | White/grey | Baseline |
| Rare | Blue `#3B82F6` | 3x less common |
| Epic | Purple `#8B5CF6` | 10x less common |
| Legendary | Gold `#F59E0B` | 50x less common |

### Duplicate Protection

If you get a cosmetic you already own, it converts to **Forge Shards**.
Forge Shards can be spent in a small shop to pick specific cosmetics.

---

## 7. History & Journal

### Location

Accessible from the character page as a tab or section. The definitive log of
your journey — everything earned, won, lost, and achieved.

### History Tabs

**Rewards** — Every drop, challenge reward, achievement unlock
- Date + icon + item name + rarity indicator
- Paginated, 20 per page
- Filter by: rarity, source (drop/challenge/achievement/rank-up)

**Rivalries** — Past rivals and outcomes
- Week range + your score vs their score + outcome badge (W/L/D)
- Win/loss/draw totals at top
- Current win streak + longest win streak
- Paginated, 20 per page

**Milestones** — Significant events auto-logged
- Rank-ups with date
- Archetype changes (with what changed)
- PRs (exercise + weight/reps)
- Streak milestones (7, 30, 100, 365 days)
- Reforge events
- Monthly title completions

**Challenges** — Weekly + monthly challenge history
- Challenge description + target + your progress + outcome
- Completed: green checkmark + rewards shown
- Failed: red X + how close you got (e.g., "82% complete")
- Paginated, 20 per page

### Design

Simple list view. Each entry is one line:
`[date] [icon] [description]`

Tap to expand if needed (e.g., rivalry shows score breakdown).
No cards, no fancy layouts — just a clean, scannable log.

---

## 8. Hub Integration

### Dynamic Hub — Contextual, Not Static

The hub adapts to what's relevant RIGHT NOW. Cards appear, disappear, and
reorder based on context. The hub is a smart feed, not a static dashboard.

### Module-Aware

If only martial arts is enabled → show Fight domain stats, not lifting stats.
If only lifting → show Force/Form domains, not Fight/Flow.
The hub surfaces what's relevant to YOUR enabled modules.

### Card Priority Rules (top to bottom):

1. **Active session** — Always top if a workout is in progress
2. **Scheduled workout today** — Prominent when it's training day
3. **Weekly challenge ending soon** (<24h left) — Urgency styling
4. **Rivalry update** — Score changed, or week ending
5. **Near-miss teaser** — "12 XP to Champion" or "1 workout from streak milestone"
6. **Recent PR** — Within 24 hours, celebration card
7. **Monthly challenge progress** — Progress bar, days remaining
8. **Recovery / rest day** — When no workout scheduled, recovery card prominent
9. **Weekly recap** — Monday mornings only
10. **Archetype card** — Your identity, domain scores, current rank

### One Focal Point Per Screen

The hub has ONE primary action at any time:
- Training day → "Start Workout" is the hero
- Rest day → "Recovery" or "Form Check" is the hero
- Monday → "Weekly Recap" is the hero
- Just finished → "Receipt Summary" is the hero

Everything else is secondary — smaller cards, lower position.

---

## 9. Unified Character Page

### Replaces

- Current character sheet page
- Current rankings page (rank shown on character page)
- Current achievements page (merged into character page)
- Current attributes panel on hub (removed from hub, lives on character page)

### Layout (top to bottom)

**Hero section:**
- Rank badge (animated for Mythic+) + rank name + level + XP bar
- Reforge stars if applicable
- Archetype name + specialization

**Domain radar chart:**
- Six-axis chart with current scores
- Ghost overlay of 4-weeks-ago scores
- Tap a domain to see breakdown

**Archetype card:**
- Current archetype name + description
- Domain breakdown that led to this assignment
- Specialization badge if active

**Stats strip:**
- Total workouts | Current streak | PRs this month | Rivalry W/L

**Active challenges:**
- Weekly challenge progress bar
- Monthly challenge progress bar

**Current rivalry:**
- Rival's rank + your score vs theirs this week

**Achievements showcase:**
- 3-6 pinned achievements (user-selected or auto-picked rarest)
- "View all" → full achievement grid

**History section:**
- Tabs: Rewards | Rivalries | Milestones | Challenges
- See Section 7 above

---

## 10. Database Schema

### New Tables

```sql
-- Ranking & XP
CREATE TABLE user_ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  current_xp INTEGER NOT NULL DEFAULT 0,
  total_lifetime_xp BIGINT NOT NULL DEFAULT 0,
  reforge_count INTEGER NOT NULL DEFAULT 0,
  rank_name TEXT NOT NULL DEFAULT 'Raw',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Domain scores (computed, cached)
CREATE TABLE user_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  force_score NUMERIC(5,2) DEFAULT 0,
  form_score NUMERIC(5,2) DEFAULT 0,
  flow_score NUMERIC(5,2) DEFAULT 0,
  fight_score NUMERIC(5,2) DEFAULT 0,
  function_score NUMERIC(5,2) DEFAULT 0,
  fortitude_score NUMERIC(5,2) DEFAULT 0,
  archetype TEXT,
  specialization TEXT,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Domain score history (for ghost overlay / trends)
CREATE TABLE domain_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  force_score NUMERIC(5,2) DEFAULT 0,
  form_score NUMERIC(5,2) DEFAULT 0,
  flow_score NUMERIC(5,2) DEFAULT 0,
  fight_score NUMERIC(5,2) DEFAULT 0,
  function_score NUMERIC(5,2) DEFAULT 0,
  fortitude_score NUMERIC(5,2) DEFAULT 0,
  snapshot_date DATE NOT NULL,
  UNIQUE(user_id, snapshot_date)
);

-- XP transaction log (audit trail)
CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,        -- 'workout', 'pr', 'challenge', 'rivalry', 'streak', etc.
  source_id UUID,              -- FK to the thing that generated the XP
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Challenges (weekly + monthly)
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype TEXT NOT NULL,
  challenge_type TEXT NOT NULL, -- 'weekly' or 'monthly'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  metric TEXT NOT NULL,         -- 'volume_kg', 'session_count', 'form_score_avg', etc.
  xp_reward INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User challenge progress
CREATE TABLE user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE NOT NULL,
  current_value NUMERIC DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Rivalries
CREATE TABLE rivalries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_b UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  score_a INTEGER DEFAULT 0,
  score_b INTEGER DEFAULT 0,
  outcome_a TEXT,              -- 'win', 'loss', 'draw' (null while active)
  outcome_b TEXT,
  finalized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cosmetics / loot
CREATE TABLE cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,           -- 'badge_frame', 'profile_bg', 'title_plate', 'aura', 'badge_trail'
  rarity TEXT NOT NULL,         -- 'common', 'rare', 'epic', 'legendary'
  asset_data JSONB,            -- CSS/config for rendering the cosmetic
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User's owned cosmetics
CREATE TABLE user_cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cosmetic_id UUID REFERENCES cosmetics(id) ON DELETE CASCADE NOT NULL,
  equipped BOOLEAN DEFAULT false,
  source TEXT NOT NULL,         -- 'drop', 'challenge', 'rank_up', 'reforge', 'shop'
  acquired_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, cosmetic_id)
);

-- Forge shards (from duplicate cosmetics)
-- Stored as a column on user_ranks: forge_shards INTEGER DEFAULT 0

-- History / journal events
CREATE TABLE user_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,    -- 'rank_up', 'archetype_change', 'pr', 'streak_milestone',
                               -- 'reforge', 'challenge_complete', 'challenge_fail',
                               -- 'rivalry_result', 'loot_drop', 'achievement_unlock',
                               -- 'monthly_title'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB,              -- Type-specific data (scores, items, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_xp_events_user ON xp_events(user_id, created_at DESC);
CREATE INDEX idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX idx_rivalries_users ON rivalries(user_a, week_start DESC);
CREATE INDEX idx_rivalries_users_b ON rivalries(user_b, week_start DESC);
CREATE INDEX idx_user_history_user ON user_history(user_id, created_at DESC);
CREATE INDEX idx_user_history_type ON user_history(user_id, event_type, created_at DESC);
CREATE INDEX idx_domain_snapshots_user ON domain_snapshots(user_id, snapshot_date DESC);

-- RLS policies (all tables: users can only read/write their own rows)
-- Challenges table: read-only for all authenticated users
-- Cosmetics table: read-only for all authenticated users
-- Rivalries: users can read rows where they are user_a OR user_b
```

### Modified Tables

```sql
-- Add to existing user_ranks (or profiles):
ALTER TABLE user_ranks ADD COLUMN forge_shards INTEGER DEFAULT 0;

-- Add per_side_weight to exercises (for /SIDE label fix):
ALTER TABLE exercises ADD COLUMN per_side_weight BOOLEAN DEFAULT false;
```

---

## 11. Server-Side Logic

### Required Edge Functions / pg_cron Jobs

**Weekly (Monday 00:00):**
1. Generate weekly challenges per archetype class
2. Match rivalries (pair users by rank + archetype + activity level)
3. Finalize previous week's rivalry results (compute outcome, award XP)
4. Take domain score snapshots

**Monthly (1st of month 00:00):**
1. Generate monthly super challenges per archetype class
2. Finalize previous month's results
3. Award monthly titles ("October Titan", etc.)

**On workout completion (trigger or Edge Function):**
1. Calculate and award XP
2. Update domain scores (Force, Fortitude, etc.)
3. Check challenge progress, update user_challenges
4. Update rivalry score
5. Roll for loot drop (15% chance)
6. Check for rank-up → if yes, award guaranteed loot + log history event
7. Check for near-miss teasers (for hub card)

**On form check completion:**
1. Award XP (50 for 80+, 100 for 90+)
2. Update Form domain score
3. Check challenge progress

### XP Validation

All XP is awarded server-side to prevent client-side manipulation.
The client sends workout/activity data → server validates → server awards XP.
Client never directly modifies user_ranks.xp.

---

## 12. Implementation Priority

### Phase 1: Foundation (Build First)
1. Database migration (all tables above)
2. XP system (award on workout, track in xp_events, level-up logic)
3. Rank display on hub + profile (badge, name, level, XP bar)
4. Fix /SIDE label (add per_side_weight column, classify exercises)
5. Fix streaks (rest days don't break streaks)

### Phase 2: Identity
6. Domain score computation + radar chart
7. Archetype assignment engine
8. Unified character page (replaces character sheet + rankings)
9. Remove attributes panel from hub

### Phase 3: Competition
10. Weekly challenges (generation + tracking + rewards)
11. Monthly super challenges
12. Rivalry matching + scoring + results
13. Loot drop system + cosmetics

### Phase 4: Polish
14. History/journal tabs (rewards, rivalries, milestones, challenges)
15. Progressive unlocking (feature gating by level)
16. Hub card priority system (dynamic ordering)
17. Badge evolution animations
18. Specialization detection
19. Reforge system (prestige)

### Phase 5: Future Modules
20. Fight domain data sources (when martial arts module ships)
21. Flow domain data sources (when cardio module ships)
22. New specializations per new module
23. Module-specific challenge templates

---

## 13. Bug Fixes (Immediate, Pre-Phase 1)

These bugs were identified and should be fixed before or alongside Phase 1:

### 13.1 /SIDE Label Classification
**Problem:** `isDualWeight()` uses `is_unilateral` which doesn't correctly identify
exercises that use two simultaneous weights (e.g., DB Bench Press is not unilateral
but needs /SIDE because each hand holds a separate dumbbell).

**Fix:**
1. Add `per_side_weight BOOLEAN DEFAULT false` to exercises table
2. Classify all ~800 exercises: set `per_side_weight = true` for any exercise where
   each hand/side holds a separate weight simultaneously
3. Update `isDualWeight()` in `app/lib/useWorkoutSession.ts` to use `per_side_weight`

### 13.2 Rest Days Breaking Streaks
**Problem:** Rest days count as missed days and break streaks.

**Fix:** Streak calculation should check against SCHEDULED workout days only.
A rest day (no workout scheduled) should not break the streak. The streak breaks
only when a scheduled workout is missed.

### 13.3 Fatigue Detection Wrong Timeframe
**Problem:** Fatigue detection shows previous week's data instead of current day/session.

**Fix:** Compare current session performance against recent baseline (last 2-4 sessions
of the same exercise), not a stale weekly aggregate.

### 13.4 Weekly Volume Wrong + No History
**Problem:** Weekly volume calculation is incorrect. No way to view previous weeks.

**Fix:**
1. Audit and fix the volume calculation (ensure it accounts for sets × reps × weight correctly)
2. Add a historical view: weekly comparison chart showing last 4-8 weeks
3. Monthly volume summary accessible from history/stats

### 13.5 Attributes Panel → Moved to Phase 2 (Character Page Rework)
This bug is part of the unified character page build, not a standalone fix.
See Phase 2, item 9: "Remove attributes panel from hub" — it gets replaced by
domain scores on the new character page.

---

## 14. UX Rules

### Micro-celebrations Only
- Rank up: Toast notification + badge glow animation + haptic pulse. 2 seconds max.
- Challenge complete: Checkmark animation + XP pop number. 1 second.
- Loot drop: Item slides in from bottom, rarity color flash. 2 seconds.
- Rivalry win: "Victory" text + rival comparison. 2 seconds.
- PR: Confetti burst (small, contained). 1.5 seconds.
- NEVER: Full-screen modals, blocking animations, forced interactions.

### Near-Miss Teasers
When a user is close to something, show it subtly:
- "12 XP to Champion" on the XP bar
- "1 more workout for streak milestone" as a hub card subtitle
- "87% — almost there" on challenge progress bar
These drive return visits without being pushy.

### Display Rank Everywhere
The rank badge is a user's identity. Show it:
- Hub (next to greeting)
- Character page (hero)
- Leaderboard entries
- Rivalry cards
- Post-workout receipt
- Any shared/exported card

Small and consistent. The badge becomes recognizable like an app icon.
