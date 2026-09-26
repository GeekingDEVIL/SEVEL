import {
  Dumbbell, Calendar, TrendingUp, HeartPulse, Droplets,
  Trophy, Award, Sparkles, Bell,
  UtensilsCrossed, GlassWater,
  Activity, Swords, Wind,
  Flame, Shield, Scroll, Crown, Palette, CalendarClock,
  Camera, Moon, Brain, Watch, PersonStanding, Ruler, User,
} from "lucide-react";
import type { NavPill } from "../components/ui/sub-nav-pills";
import type { SwipeSection } from "../components/ui/swipe-nav";
import type { ModuleKey } from "./modules";

type ConditionalPill = NavPill & {
  module?: ModuleKey;
  colorRgb?: string;
  description?: string;
  comingSoon?: boolean;
};

const trainPillsDef: ConditionalPill[] = [
  { key: "/schedule", label: "SCHEDULE", icon: CalendarClock, colorRgb: "139 92 246", description: "Your unified training command center" },
  { key: "/workout", label: "WORKOUT", icon: Dumbbell, colorRgb: "139 92 246", description: "Exercise library, plan browser, and training templates" },
  { key: "/running", label: "RUNNING", icon: Activity, module: "running", colorRgb: "249 115 22", description: "GPS run tracking, pace, splits, route history", comingSoon: true },
  { key: "/martial-arts", label: "MARTIAL ARTS", icon: Swords, module: "martial_arts", colorRgb: "239 68 68", description: "Technique library — train from Schedule" },
  { key: "/yoga", label: "YOGA", icon: Wind, module: "yoga", colorRgb: "236 72 153", description: "Pose library, flow sequences, flexibility", comingSoon: true },
  { key: "/calisthenics", label: "CALISTHENICS", icon: PersonStanding, module: "calisthenics", colorRgb: "139 92 246", description: "Bodyweight skill progressions, holds, planche training", comingSoon: true },
];

const trackPillsDef: ConditionalPill[] = [
  { key: "/progress", label: "PROGRESS", icon: TrendingUp, colorRgb: "16 185 129", description: "Body weight trends, strength charts, PRs" },
  { key: "/body", label: "BODY", icon: Ruler, colorRgb: "16 185 129", description: "Tap-on-body measurement tracking with trends" },
  { key: "/recovery", label: "RECOVERY", icon: HeartPulse, module: "recovery", colorRgb: "16 185 129", description: "Per-muscle readiness and volume analysis" },
  { key: "/nutrition", label: "NUTRITION", icon: UtensilsCrossed, module: "nutrition", colorRgb: "245 158 11", description: "Calorie tracking, macros, adaptive TDEE", comingSoon: true },
  { key: "/cycle", label: "CYCLE", icon: Droplets, module: "cycle", colorRgb: "236 72 153", description: "Period tracking, phase insights, training sync" },
  { key: "/wellness", label: "WELLNESS", icon: GlassWater, module: "wellness", colorRgb: "16 185 129", description: "Sleep, mood, habits, hydration scoring" },
  { key: "/habits", label: "HABITS", icon: Flame, module: "habits", colorRgb: "244 63 94", description: "Daily habit streaks and custom goals" },
  { key: "/sleep", label: "SLEEP", icon: Moon, module: "sleep", colorRgb: "139 92 246", description: "Sleep duration, quality scoring, recovery integration", comingSoon: true },
  { key: "/progress-photos", label: "PHOTOS", icon: Camera, module: "progress_photos", colorRgb: "16 185 129", description: "Body transformation timeline with comparisons", comingSoon: true },
];

const socialPillsDef: ConditionalPill[] = [
  { key: "/rankings", label: "RANKINGS", icon: Trophy, colorRgb: "59 130 246", description: "Global and friend leaderboards by XP" },
  { key: "/achievements", label: "ACHIEVEMENTS", icon: Award, colorRgb: "59 130 246", description: "Unlock badges and track milestones" },
  { key: "/guilds", label: "GUILDS", icon: Shield, module: "guilds", colorRgb: "59 130 246", description: "Create or join guilds, co-op challenges", comingSoon: true },
  { key: "/challenges", label: "CHALLENGES", icon: Swords, module: "challenges", colorRgb: "59 130 246", description: "Weekly and monthly fitness challenges", comingSoon: true },
  { key: "/daily-quests", label: "QUESTS", icon: Scroll, module: "daily_quests", colorRgb: "249 115 22", description: "Rotating daily objectives for bonus XP", comingSoon: true },
  { key: "/character", label: "CHARACTER", icon: Crown, module: "character_sheet", colorRgb: "249 115 22", description: "RPG-style profile with class, rank, skill trees" },
  { key: "/cosmetics", label: "COSMETICS", icon: Palette, module: "cosmetics", colorRgb: "249 115 22", description: "Earned avatars, frames, and profile flair", comingSoon: true },
  { key: "/seasons", label: "SEASONS", icon: CalendarClock, module: "seasons", colorRgb: "249 115 22", description: "8-week seasons with reward tracks", comingSoon: true },
];

const youPillsDef: ConditionalPill[] = [
  { key: "/profile", label: "PROFILE", icon: User, colorRgb: "34 211 238", description: "Your identity, stats, and settings" },
  { key: "/coach", label: "AI COACH", icon: Sparkles, module: "ai_coach", colorRgb: "20 184 166", description: "Personal training advisor powered by AI", comingSoon: true },
  { key: "/smart-programs", label: "PROGRAMS", icon: Brain, module: "smart_programs", colorRgb: "20 184 166", description: "AI-generated periodised training programs", comingSoon: true },
  { key: "/notifications", label: "ALERTS", icon: Bell, colorRgb: "34 211 238", description: "Achievement unlocks, streak reminders" },
];

function filterPills(
  pills: ConditionalPill[],
  enabledKeys: ModuleKey[],
): NavPill[] {
  return pills
    .filter((p) => !p.module || enabledKeys.includes(p.module))
    .map(({ module: _, ...pill }) => pill);
}

export function getTrainPills(enabledKeys: ModuleKey[]): NavPill[] {
  return filterPills(trainPillsDef, enabledKeys);
}

export function getTrackPills(enabledKeys: ModuleKey[]): NavPill[] {
  return filterPills(trackPillsDef, enabledKeys);
}

export function getSocialPills(enabledKeys: ModuleKey[]): NavPill[] {
  return filterPills(socialPillsDef, enabledKeys);
}

export function getYouPills(enabledKeys: ModuleKey[]): NavPill[] {
  return filterPills(youPillsDef, enabledKeys);
}

export function getAllRoutes(enabledKeys: ModuleKey[]): Record<string, string[]> {
  return {
    train: getTrainPills(enabledKeys).map((p) => p.key),
    track: getTrackPills(enabledKeys).map((p) => p.key),
    social: getSocialPills(enabledKeys).map((p) => p.key),
    you: getYouPills(enabledKeys).map((p) => p.key),
  };
}

function toSwipeSections(
  pills: ConditionalPill[],
  enabledKeys: ModuleKey[],
  fallbackColor: string,
): SwipeSection[] {
  return pills
    .filter((p) => !p.module || enabledKeys.includes(p.module))
    .map((p) => ({
      key: p.key,
      label: p.label,
      colorRgb: p.colorRgb ?? fallbackColor,
    }));
}

export function getTrainSections(enabledKeys: ModuleKey[]): SwipeSection[] {
  return toSwipeSections(trainPillsDef, enabledKeys, "139 92 246");
}

export function getTrackSections(enabledKeys: ModuleKey[]): SwipeSection[] {
  return toSwipeSections(trackPillsDef, enabledKeys, "16 185 129");
}

export function getSocialSections(enabledKeys: ModuleKey[]): SwipeSection[] {
  return toSwipeSections(socialPillsDef, enabledKeys, "59 130 246");
}

export function getYouSections(enabledKeys: ModuleKey[]): SwipeSection[] {
  return toSwipeSections(youPillsDef, enabledKeys, "34 211 238");
}

