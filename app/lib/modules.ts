import {
  Dumbbell, TrendingUp, Zap, UtensilsCrossed, Droplets,
  HeartPulse, Sparkles, Users, Swords, Wind, Activity,
  GlassWater, type LucideIcon,
  Flame, Shield, Scroll, Crown, Palette, CalendarClock,
  Camera, Barcode, Moon, Brain, Tv,
  Watch, PersonStanding,
} from "lucide-react";

export type ModuleKey =
  | "gym" | "progress" | "xp"
  | "nutrition" | "cycle" | "recovery"
  | "ai_coach" | "social"
  | "running" | "martial_arts" | "yoga"
  | "wellness"
  | "habits" | "guilds" | "challenges"
  | "daily_quests" | "character_sheet" | "cosmetics" | "seasons"
  | "calisthenics" | "recipes" | "wearables"
  | "sleep" | "progress_photos" | "smart_programs";

export type ModuleDef = {
  key: ModuleKey;
  name: string;
  description: string;
  icon: LucideIcon;
  colorRgb: string;
  domain: string;
  core: boolean;
  phase: number;
  sexGate?: "male" | "female";
};

export const MODULE_REGISTRY: Record<ModuleKey, ModuleDef> = {
  gym: {
    key: "gym",
    name: "Training",
    description: "Workout logging, schedule, exercise database, templates",
    icon: Dumbbell,
    colorRgb: "139 92 246",
    domain: "train",
    core: true,
    phase: 0,
  },
  progress: {
    key: "progress",
    name: "Progress",
    description: "Body weight trends, strength charts, measurements, PRs",
    icon: TrendingUp,
    colorRgb: "16 185 129",
    domain: "track",
    core: false,
    phase: 0,
  },
  xp: {
    key: "xp",
    name: "XP & Leveling",
    description: "Experience points, levels, ranks, achievements, streaks",
    icon: Zap,
    colorRgb: "34 211 238",
    domain: "social",
    core: false,
    phase: 0,
  },
  nutrition: {
    key: "nutrition",
    name: "Nutrition",
    description: "Calorie tracking, macros, TDEE, meal logging",
    icon: UtensilsCrossed,
    colorRgb: "245 158 11",
    domain: "track",
    core: false,
    phase: 4,
  },
  cycle: {
    key: "cycle",
    name: "Cycle Tracker",
    description: "Menstrual cycle logging, phase predictions, symptoms",
    icon: Droplets,
    colorRgb: "236 72 153",
    domain: "track",
    core: false,
    phase: 0,
    sexGate: "female",
  },
  recovery: {
    key: "recovery",
    name: "Recovery",
    description: "Muscle recovery tracking, training load, fatigue monitoring",
    icon: HeartPulse,
    colorRgb: "16 185 129",
    domain: "track",
    core: false,
    phase: 0,
  },
  ai_coach: {
    key: "ai_coach",
    name: "AI Coach",
    description: "AI-powered training guidance and recommendations",
    icon: Sparkles,
    colorRgb: "20 184 166",
    domain: "you",
    core: false,
    phase: 3,
  },
  social: {
    key: "social",
    name: "Social",
    description: "Leaderboard, rankings, friend activity feed",
    icon: Users,
    colorRgb: "59 130 246",
    domain: "social",
    core: false,
    phase: 0,
  },
  running: {
    key: "running",
    name: "Running",
    description: "GPS run tracking, pace, splits, route history",
    icon: Activity,
    colorRgb: "249 115 22",
    domain: "train",
    core: false,
    phase: 4,
  },
  martial_arts: {
    key: "martial_arts",
    name: "Martial Arts",
    description: "Technique guides for Muay Thai, BJJ, Boxing, Shaolin, Kalaripayattu",
    icon: Swords,
    colorRgb: "239 68 68",
    domain: "train",
    core: false,
    phase: 3,
  },
  yoga: {
    key: "yoga",
    name: "Yoga & Mobility",
    description: "Pose library, flow sequences, flexibility tracking",
    icon: Wind,
    colorRgb: "236 72 153",
    domain: "train",
    core: false,
    phase: 4,
  },
  wellness: {
    key: "wellness",
    name: "Wellness",
    description: "Water tracking, hydration goals, readiness score",
    icon: GlassWater,
    colorRgb: "16 185 129",
    domain: "track",
    core: false,
    phase: 0,
  },
  habits: {
    key: "habits",
    name: "Habits",
    description: "Daily habit streaks, XP rewards, loot drops, auto-complete",
    icon: Flame,
    colorRgb: "244 63 94",
    domain: "lifestyle",
    core: false,
    phase: 0,
  },
  guilds: {
    key: "guilds",
    name: "Guilds",
    description: "Create or join guilds, co-op challenges, guild chat",
    icon: Shield,
    colorRgb: "59 130 246",
    domain: "social",
    core: false,
    phase: 2,
  },
  challenges: {
    key: "challenges",
    name: "Challenges",
    description: "Weekly and monthly fitness challenges with friends",
    icon: Swords,
    colorRgb: "59 130 246",
    domain: "social",
    core: false,
    phase: 2,
  },
  daily_quests: {
    key: "daily_quests",
    name: "Daily Quests",
    description: "Rotating daily objectives for bonus XP rewards",
    icon: Scroll,
    colorRgb: "249 115 22",
    domain: "gamification",
    core: false,
    phase: 2,
  },
  character_sheet: {
    key: "character_sheet",
    name: "Character Sheet",
    description: "RPG-style profile with class, rank, stats, skill trees",
    icon: Crown,
    colorRgb: "249 115 22",
    domain: "gamification",
    core: false,
    phase: 0,
  },
  cosmetics: {
    key: "cosmetics",
    name: "Cosmetics",
    description: "Earned avatars, frames, and profile flair from achievements",
    icon: Palette,
    colorRgb: "249 115 22",
    domain: "gamification",
    core: false,
    phase: 2,
  },
  seasons: {
    key: "seasons",
    name: "Seasons",
    description: "8-week seasons with reward tracks and boss battles",
    icon: CalendarClock,
    colorRgb: "249 115 22",
    domain: "gamification",
    core: false,
    phase: 3,
  },
  calisthenics: {
    key: "calisthenics",
    name: "Calisthenics",
    description: "Bodyweight skill progressions, holds, and planche training",
    icon: PersonStanding,
    colorRgb: "139 92 246",
    domain: "train",
    core: false,
    phase: 3,
  },
  recipes: {
    key: "recipes",
    name: "Recipes",
    description: "Macro-friendly recipes, meal plans, community submissions",
    icon: UtensilsCrossed,
    colorRgb: "245 158 11",
    domain: "nutrition",
    core: false,
    phase: 4,
  },
  wearables: {
    key: "wearables",
    name: "Wearables",
    description: "Apple Health, Google Fit, Garmin sync for heart rate and steps",
    icon: Watch,
    colorRgb: "34 211 238",
    domain: "wearables",
    core: false,
    phase: 5,
  },
  sleep: {
    key: "sleep",
    name: "Sleep Tracking",
    description: "Sleep duration, quality scoring, recovery integration",
    icon: Moon,
    colorRgb: "139 92 246",
    domain: "track",
    core: false,
    phase: 4,
  },
  progress_photos: {
    key: "progress_photos",
    name: "Progress Photos",
    description: "Body transformation timeline with side-by-side comparisons",
    icon: Camera,
    colorRgb: "16 185 129",
    domain: "track",
    core: false,
    phase: 4,
  },
  smart_programs: {
    key: "smart_programs",
    name: "Smart Programs",
    description: "AI-generated periodised training programs with auto-progression",
    icon: Brain,
    colorRgb: "20 184 166",
    domain: "you",
    core: false,
    phase: 5,
  },
};

export const ALL_MODULES = Object.values(MODULE_REGISTRY);
export const CORE_MODULES = ALL_MODULES.filter((m) => m.core);
export const OPTIONAL_MODULES = ALL_MODULES.filter((m) => !m.core);

export const DEFAULT_ENABLED: ModuleKey[] = [
  "gym", "progress", "xp", "recovery", "wellness", "habits", "social",
];
