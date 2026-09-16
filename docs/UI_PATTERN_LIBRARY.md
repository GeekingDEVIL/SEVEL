# UI Pattern Library

> SEVEL's reusable component system — Glass Forge design direction with spring-physics animations.

---

## Design Tokens (`app/globals.css`)

### Fonts (loaded via Google Fonts in `app/layout.tsx`)
- **`--font-display`**: Space Grotesk — headings, display numbers
- **`--font-body`**: Inter — body text
- **`--font-mono`**: JetBrains Mono — data values (weights, times, counts)

CSS utility classes: `.font-display`, `.font-body`, `.font-data`

### Domain Colors (RGB triplets for alpha compositing)
| Domain | CSS Variable | RGB |
|--------|-------------|-----|
| Hub | `--domain-hub-rgb` | 34 211 238 |
| Gym | `--domain-gym-rgb` | 139 92 246 |
| Running | `--domain-running-rgb` | 249 115 22 |
| Martial Arts | `--domain-martial-rgb` | 239 68 68 |
| Tracking | `--domain-tracking-rgb` | 16 185 129 |
| Nutrition | `--domain-nutrition-rgb` | 245 158 11 |
| Cycle | `--domain-cycle-rgb` | 236 72 153 |
| Social | `--domain-social-rgb` | 59 130 246 |
| AI | `--domain-ai-rgb` | 20 184 166 |

### Glass Forge Surfaces
| Token | Value | Usage |
|-------|-------|-------|
| `--glass-bg` | `rgba(255 255 255 / 0.04)` | Card backgrounds |
| `--glass-bg-hover` | `rgba(255 255 255 / 0.07)` | Hover state |
| `--glass-bg-active` | `rgba(255 255 255 / 0.10)` | Active/pressed state |
| `--glass-border` | `rgba(255 255 255 / 0.06)` | Default borders |
| `--glass-border-hover` | `rgba(255 255 255 / 0.12)` | Hover borders |
| `--glass-glow-spread` | `0 0 40px -8px` | Ambient glow shadow spread |

### Border Radius Scale
`--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`, `--radius-xl: 20px`, `--radius-2xl: 24px`

---

## Components

### AnimatedTabs (`app/components/ui/animated-tabs.tsx`)

Reusable tab switcher with Framer Motion spring physics. Replaces all inline tab patterns.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `TabItem[]` | required | `{ key, label, icon? }` |
| `activeTab` | `string` | required | Currently active tab key |
| `onTabChange` | `(key: string) => void` | required | Tab change handler |
| `columns` | `number` | tab count | Grid columns |
| `accentRgb` | `string` | accent CSS var | Domain color override (RGB triplet) |

**Animation details:**
- `layoutId="tab-active-bg"` — sliding glow background between tabs
- Hover: `scale: 1.04, y: -2` with spring (stiffness: 500, damping: 30)
- Tap: `scale: 0.96`
- Active icon: `scale: 1.15` with wiggle rotation `[-8°, 8°, 0°]`

**Also exports:** `TabContent` — animated content wrapper with directional enter/exit.

**Used in:** Progress (4 tabs), Rankings (2 tabs), Cycle (4 tabs, pink accent)

---

### GlassCard (`app/components/ui/glass-card.tsx`)

Primary container with frosted glass morphism.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `glowRgb` | `string` | accent | Hover glow color (RGB triplet) |
| `static` | `boolean` | false | Disable hover animation |
| `className` | `string` | — | Extra classes |

**Animation:** hover lifts with `scale: 1.015` + border brightens + ambient glow shadow.

---

### StatChip (`app/components/ui/glass-card.tsx`)

Small pill displaying a value + label, domain-colored.

**Props:** `label`, `value`, `colorRgb?`, `className?`

---

### ProgressRing (`app/components/ui/glass-card.tsx`)

SVG circular progress with spring-animated fill.

**Props:** `value`, `max`, `size?` (default 64), `strokeWidth?` (4), `colorRgb?`, `label?`

---

### TimelineRow (`app/components/ui/timeline-row.tsx`)

Left-bordered card with timestamp for activity feeds and notifications.

**Props:** `timestamp`, `children`, `accentRgb?`

---

### QuickActionFab (`app/components/ui/quick-action-fab.tsx`)

Floating action button that expands to reveal action items.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `actions` | `FabAction[]` | `{ key, label, icon, onClick, colorRgb? }` |
| `accentRgb` | `string?` | Main button color |

**Animation:** Actions stagger in from bottom with spring physics. Main button rotates 45° to become X on open.

---

## Motion System (`app/lib/motion.ts`)

Pre-built Framer Motion variants:

| Variant | Usage |
|---------|-------|
| `fadeIn` | Simple opacity |
| `fadeInUp` | Cards entering viewport |
| `slideUp` | Bottom sheets, modals |
| `staggerContainer` + `staggerItem` | Lists |
| `tabContent` | Tab content enter/exit |
| `modalOverlay` + `modalContent` | Modal dialogs |
| `cardHover` / `cardTap` | Interactive cards |

---

## Usage Pattern

```tsx
import AnimatedTabs from "@/app/components/ui/animated-tabs";
import GlassCard, { StatChip, ProgressRing } from "@/app/components/ui/glass-card";

// Tabs with domain color
<AnimatedTabs
  tabs={[
    { key: "today", label: "TODAY", icon: Zap },
    { key: "log", label: "LOG", icon: Plus },
  ]}
  activeTab={tab}
  onTabChange={setTab}
  accentRgb="236 72 153" // cycle pink
/>

// Glass card with glow
<GlassCard glowRgb="139 92 246" className="p-4">
  <StatChip label="volume" value="12,450 kg" colorRgb="139 92 246" />
  <ProgressRing value={1800} max={2200} colorRgb="245 158 11" label="kcal" />
</GlassCard>
```

---

### SwipeNav (`app/components/ui/swipe-nav.tsx`)

Swipe-between-sections navigation replacing the old SubNavPills. Uses Framer Motion `drag="x"` with spring physics for gesture-driven section switching.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `sections` | `SwipeSection[]` | `{ key, label, colorRgb }` — route path, display label, domain color |

**Features:**
- Indicator dots (active dot wider at 24px, inactive 6px, colored by domain)
- Current section label with domain color, chevron arrows, counter (e.g., "1/3")
- Edge gradient hints when more sections exist left/right
- Swipe triggers `router.push()` — URLs stay bookmarkable
- SWIPE_THRESHOLD = 50px, also triggers on velocity > 500
- Hidden when only 1 section available

**Section definitions** in `app/lib/navPills.ts`:
- `getTrainSections(enabledKeys)` — Workout + Schedule + optional Running/Martial Arts/Yoga
- `getTrackSections(enabledKeys)` — Progress + optional Recovery/Nutrition/Cycle/Wellness
- `getSocialSections(enabledKeys)` — Rankings + Achievements
- `getYouSections(enabledKeys)` — Profile + optional AI Coach + Alerts + Discover

**Used on:** All 11 interior pages under the 5-tab Hub-and-Spoke nav.

---

### DrilldownList (`app/components/ui/drilldown-list.tsx`)

Stagger-animated list of glass cards for drill-down navigation.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `DrilldownItem[]` | required | `{ icon, label, subtitle?, badge?, progress?, onClick }` |
| `accentRgb` | `string?` | accent CSS var | Domain color for badges/progress |

Each item supports: icon, label, subtitle, badge (color + label), progress bar, onClick, chevron arrow.

**Animation:** `staggerContainer` + `staggerItem` from `motion.ts`.

---

## Page Transitions & Celebrations (`app/lib/motion.ts`)

Additional Framer Motion variants added for navigation and gamification:

| Variant | Usage |
|---------|-------|
| `pageDrillDown` | Slide right (x: 24→0) for drill-down navigation |
| `pageBack` | Slide left (x: -24→0) for back navigation |
| `celebrationBurst` | Scale + opacity burst for PR confetti |
| `levelUpGlow` | Expanding glow shadow for rank-up animation |

---

## Insight Cards (Progress Page)

Three data-driven insight engines wired into the Progress page:

### Monthly Insights (`app/lib/monthlyInsights.ts`)
Computes month-over-month training comparison from session data.
- **Inputs:** workout sessions (date, volume, sets, duration, XP)
- **Outputs:** `MonthlyComparison` — current/previous month buckets, % changes, streak, best month
- **Displayed in:** History tab — 3-stat grid (workouts, volume, PRs) with trend arrows + streak counter

### Strength Benchmark (`app/lib/strengthBenchmark.ts`)
Compares estimated 1RM per exercise across two time periods.
- **Inputs:** exercise set logs with name/body segment
- **Outputs:** `StrengthBenchmarkResult` — per-exercise trend (up/down/stable), strongest gain, biggest drop
- **Displayed in:** Strength tab — color-coded exercise list with % change bars
- **Lazy loaded:** only fetches data when user switches to History or Strength tab

### Phase Performance (`app/lib/phasePerformance.ts`) — Female only
Correlates training volume with menstrual cycle phases.
- **Inputs:** sessions + cycle log (last period start, cycle length)
- **Outputs:** `PhasePerformanceResult` — per-phase stats, best/worst phase, recommendation
- **Displayed in:** History tab (female mode only) — 4-phase bar chart with AI recommendation

---

## Module System (`app/lib/modules.ts`)

Progressive disclosure — users enable the features they need.

### Architecture
- **Module registry** (`app/lib/modules.ts`): 12 modules with key, name, description, icon, domain color, core flag, phase number
- **DB table** (`supabase/migrations/015_user_modules.sql`): `user_modules(user_id, module_key, enabled_at)` with RLS
- **Hook** (`app/lib/useModules.ts`): `useModules()` → `{ enabledKeys, isEnabled, toggleModule, loaded }`
- **Nav integration** (`app/lib/navPills.ts`): `getTrainPills(enabledKeys)`, `getTrackPills(enabledKeys)`, `getSocialPills(enabledKeys)`, `getYouPills(enabledKeys)`, `getAllRoutes(enabledKeys)`
- **Discover page** (`app/(main)/discover/page.tsx`): Browse all modules, toggle on/off, see phase locks

### Module Keys
| Key | Name | Domain | Core | Phase |
|-----|------|--------|------|-------|
| gym | Training | train | yes | 0 |
| progress | Progress | track | yes | 0 |
| xp | XP & Leveling | social | yes | 0 |
| nutrition | Nutrition | track | no | 0 |
| cycle | Cycle Tracker | track | no | 0 |
| recovery | Recovery | track | no | 0 |
| wellness | Wellness | track | no | 1 |
| social | Social | social | no | 2 |
| ai_coach | AI Coach | you | no | 3 |
| martial_arts | Martial Arts | train | no | 3 |
| running | Running | train | no | 4 |
| yoga | Yoga & Mobility | train | no | 4 |

### Default Enabled
`gym`, `progress`, `xp`, `nutrition`, `recovery`

### How Nav Pills Work
Each pill definition has an optional `module` field. `filterPills()` strips pills whose module isn't in `enabledKeys`. Core modules are always in `enabledKeys`. `MobileNav.tsx` and `Sidebar.tsx` use `getAllRoutes(enabledKeys)` and the getter functions respectively to build dynamic nav.
