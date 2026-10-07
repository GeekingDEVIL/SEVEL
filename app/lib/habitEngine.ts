import { supabase } from "./supabase";
import { localDateStr } from "./dateUtils";

// ─── Types ──────────────────────────────────────────────────────────────────

export type HabitFrequency = "daily" | "weekdays" | "weekends" | "custom" | "x_per_week";
export type SkipReason = "sick" | "travel" | "rest_day" | "injury" | "other";
export type LootType = "streak_freeze" | "double_xp" | "momentum_boost" | "bonus_xp";

export type Habit = {
  id: string;
  name: string;
  icon: string;
  color_rgb: string;
  xp_reward: number;
  sort_order: number;
  routine: "morning" | "evening" | "anytime";
  auto_source: string | null;
  frequency: HabitFrequency;
  custom_days: number[] | null;
  frequency_per_week: number | null;
  is_negative: boolean;
  prestige_level: number;
  best_streak: number;
  total_completions: number;
};

export type HabitContract = {
  id: string;
  habit_id: string;
  duration_days: number;
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "failed";
  xp_reward: number;
};

export type LootItem = {
  id: string;
  loot_type: LootType;
  quantity: number;
  used_at: string | null;
  expires_at: string | null;
};

export type DailyQuest = {
  id: string;
  type: string;
  description: string;
  xp_reward: number;
  check: (habits: Habit[], completionSet: Set<string>, today: string) => boolean;
};

export type HabitInsight = {
  type: "pattern" | "correlation" | "tip" | "warning";
  icon: string;
  title: string;
  body: string;
  color: string;
};

// ─── Milestone config ───────────────────────────────────────────────────────

export const MILESTONES = [
  { days: 7, xp: 50, label: "1 Week", emoji: "🔥" },
  { days: 14, xp: 100, label: "2 Weeks", emoji: "⚡" },
  { days: 30, xp: 250, label: "1 Month", emoji: "💎" },
  { days: 60, xp: 500, label: "2 Months", emoji: "👑" },
  { days: 100, xp: 1000, label: "100 Days", emoji: "🏆" },
  { days: 365, xp: 5000, label: "1 Year", emoji: "🌟" },
];

// ─── Evolution tiers ────────────────────────────────────────────────────────

export type EvolutionTier = "base" | "bronze" | "silver" | "gold" | "legendary";

export function getEvolutionTier(streak: number): EvolutionTier {
  if (streak >= 100) return "legendary";
  if (streak >= 60) return "gold";
  if (streak >= 30) return "silver";
  if (streak >= 7) return "bronze";
  return "base";
}

export const EVOLUTION_STYLES: Record<EvolutionTier, { border: string; glow: string; bg: string; particle: boolean }> = {
  base: { border: "border-white/[0.06]", glow: "", bg: "bg-white/[0.02]", particle: false },
  bronze: { border: "border-amber-700/30", glow: "", bg: "bg-amber-900/[0.06]", particle: false },
  silver: { border: "border-slate-400/30", glow: "shadow-[0_0_12px_rgb(148_163_184/0.1)]", bg: "bg-slate-400/[0.04]", particle: false },
  gold: { border: "border-amber-400/40", glow: "shadow-[0_0_20px_rgb(251_191_36/0.15)]", bg: "bg-amber-400/[0.06]", particle: true },
  legendary: { border: "border-purple-400/50", glow: "shadow-[0_0_30px_rgb(192_132_252/0.2)]", bg: "bg-purple-400/[0.06]", particle: true },
};

// ─── Flexible scheduling ────────────────────────────────────────────────────

export function isHabitScheduledForDay(habit: Habit, date: Date): boolean {
  const dow = date.getDay(); // 0=Sun, 6=Sat
  switch (habit.frequency) {
    case "daily":
      return true;
    case "weekdays":
      return dow >= 1 && dow <= 5;
    case "weekends":
      return dow === 0 || dow === 6;
    case "custom":
      return (habit.custom_days ?? []).includes(dow);
    case "x_per_week":
      return true; // always "available", tracked differently
    default:
      return true;
  }
}

export function getScheduledDaysThisWeek(habit: Habit): number {
  switch (habit.frequency) {
    case "daily": return 7;
    case "weekdays": return 5;
    case "weekends": return 2;
    case "custom": return (habit.custom_days ?? []).length;
    case "x_per_week": return habit.frequency_per_week ?? 3;
    default: return 7;
  }
}

export function getScheduleLabel(habit: Habit): string {
  switch (habit.frequency) {
    case "daily": return "Every day";
    case "weekdays": return "Weekdays";
    case "weekends": return "Weekends";
    case "x_per_week": return `${habit.frequency_per_week ?? 3}x / week`;
    case "custom": {
      const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return (habit.custom_days ?? []).map((d) => names[d]).join(", ");
    }
    default: return "Every day";
  }
}

// ─── Momentum score ─────────────────────────────────────────────────────────

export function calculateMomentum(
  habit: Habit,
  completionSet: Set<string>,
  skipSet: Set<string>,
  days: number = 28,
): number {
  let weightedSum = 0;
  let weightTotal = 0;
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = localDateStr(d);
    const key = `${habit.id}:${dateStr}`;

    if (!isHabitScheduledForDay(habit, d) || skipSet.has(key)) continue;

    // Recent days weigh more: exponential decay
    const weight = Math.pow(0.95, i);
    weightTotal += weight;

    if (completionSet.has(key)) {
      weightedSum += weight;
    }
  }

  if (weightTotal === 0) return 0;
  return Math.round((weightedSum / weightTotal) * 100);
}

// ─── Streak calculation (with skip awareness) ───────────────────────────────

export function calculateStreak(
  habit: Habit,
  completionSet: Set<string>,
  skipSet: Set<string>,
  freezeCount: number = 0,
): number {
  let streak = 0;
  let freezesUsed = 0;
  const now = new Date();

  for (let i = 0; i <= 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = localDateStr(d);
    const key = `${habit.id}:${dateStr}`;

    if (!isHabitScheduledForDay(habit, d)) continue;
    if (skipSet.has(key)) continue;

    if (completionSet.has(key)) {
      streak++;
    } else if (freezesUsed < freezeCount) {
      freezesUsed++;
      // freeze preserves streak but doesn't increment
    } else {
      if (i === 0) return 0; // today not done yet is ok
      break;
    }
  }
  return streak;
}

// ─── XP combo chain ─────────────────────────────────────────────────────────

export function getComboMultiplier(consecutiveCompletions: number): number {
  if (consecutiveCompletions >= 5) return 2.5;
  if (consecutiveCompletions >= 3) return 2.0;
  if (consecutiveCompletions >= 2) return 1.5;
  return 1.0;
}

// ─── Perfect week multiplier ────────────────────────────────────────────────

export function getPerfectWeekMultiplier(consecutivePerfectWeeks: number): number {
  if (consecutivePerfectWeeks >= 3) return 2.0;
  if (consecutivePerfectWeeks >= 2) return 1.75;
  if (consecutivePerfectWeeks >= 1) return 1.5;
  return 1.0;
}

export function countPerfectWeeks(
  habits: Habit[],
  completionSet: Set<string>,
  skipSet: Set<string>,
  maxWeeks: number = 8,
): number {
  let consecutive = 0;
  const now = new Date();
  // Start from last completed week (Monday-based)
  const dayOfWeek = now.getDay();
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  for (let w = 0; w < maxWeeks; w++) {
    let weekPerfect = true;
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - daysToLastMonday - (w + 1) * 7);

    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      const dateStr = localDateStr(day);

      for (const habit of habits) {
        if (!isHabitScheduledForDay(habit, day)) continue;
        const key = `${habit.id}:${dateStr}`;
        if (skipSet.has(key)) continue;
        if (!completionSet.has(key)) {
          weekPerfect = false;
          break;
        }
      }
      if (!weekPerfect) break;
    }

    if (weekPerfect && habits.length > 0) consecutive++;
    else break;
  }
  return consecutive;
}

// ─── Daily quests (deterministic from date seed) ────────────────────────────

const QUEST_TEMPLATES = [
  { type: "early_bird", desc: "Complete all morning habits before 9am", xp: 30 },
  { type: "perfect_day", desc: "Complete every scheduled habit today", xp: 50 },
  { type: "streak_builder", desc: "Extend your longest active streak", xp: 25 },
  { type: "combo_master", desc: "Hit a 3x XP combo chain", xp: 40 },
  { type: "no_skip", desc: "Complete all habits without skipping any", xp: 20 },
  { type: "negative_resist", desc: "Resist all negative habits today", xp: 35 },
  { type: "double_down", desc: "Complete a habit you missed yesterday", xp: 30 },
  { type: "full_routine", desc: "Complete both morning and evening routines", xp: 45 },
];

export function getDailyQuests(userId: string, dateStr: string, habits: Habit[]): DailyQuest[] {
  // Seed from date + user for deterministic but unique quests
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) seed += dateStr.charCodeAt(i) * (i + 1);
  for (let i = 0; i < Math.min(userId.length, 8); i++) seed += userId.charCodeAt(i) * (i + 17);

  const available = QUEST_TEMPLATES.filter((q) => {
    if (q.type === "negative_resist" && !habits.some((h) => h.is_negative)) return false;
    if (q.type === "full_routine" && (!habits.some((h) => h.routine === "morning") || !habits.some((h) => h.routine === "evening"))) return false;
    return true;
  });

  // Pick 2 distinct quests deterministically
  const quests: DailyQuest[] = [];
  const usedIndices = new Set<number>();
  for (let i = 0; i < 2 && usedIndices.size < available.length; i++) {
    let idx = (seed + i * 7) % available.length;
    while (usedIndices.has(idx)) idx = (idx + 1) % available.length;
    usedIndices.add(idx);
    const template = available[idx];
    quests.push({
      id: `quest-${dateStr}-${i}`,
      type: template.type,
      description: template.desc,
      xp_reward: template.xp,
      check: (h, cs, today) => checkQuest(template.type, h, cs, today),
    });
  }
  return quests;
}

function checkQuest(type: string, habits: Habit[], completionSet: Set<string>, today: string): boolean {
  switch (type) {
    case "perfect_day":
    case "no_skip":
      return habits.every((h) => completionSet.has(`${h.id}:${today}`));
    case "negative_resist":
      return habits.filter((h) => h.is_negative).every((h) => !completionSet.has(`${h.id}:${today}`));
    default:
      return false; // Other quests checked contextually
  }
}

// ─── Loot drop system ───────────────────────────────────────────────────────

export type LootDrop = { type: LootType; label: string; icon: string; rarity: string; color: string };

const LOOT_TABLE: LootDrop[] = [
  { type: "streak_freeze", label: "Streak Freeze", icon: "🧊", rarity: "rare", color: "59 130 246" },
  { type: "double_xp", label: "Double XP (24h)", icon: "⚡", rarity: "epic", color: "251 191 36" },
  { type: "momentum_boost", label: "Momentum Boost", icon: "🚀", rarity: "uncommon", color: "16 185 129" },
  { type: "bonus_xp", label: "+50 Bonus XP", icon: "✨", rarity: "common", color: "168 85 247" },
];

export function rollLootDrop(): LootDrop | null {
  const roll = Math.random();
  if (roll < 0.05) return LOOT_TABLE[1]; // 5% epic
  if (roll < 0.15) return LOOT_TABLE[0]; // 10% rare
  if (roll < 0.30) return LOOT_TABLE[2]; // 15% uncommon
  if (roll < 0.45) return LOOT_TABLE[3]; // 15% common
  return null; // 55% nothing
}

// ─── Sacrifice / revive streak ──────────────────────────────────────────────

export function getReviveCost(brokenStreak: number): number {
  if (brokenStreak >= 100) return 500;
  if (brokenStreak >= 60) return 300;
  if (brokenStreak >= 30) return 150;
  if (brokenStreak >= 14) return 75;
  if (brokenStreak >= 7) return 40;
  return 20;
}

// ─── Prestige ───────────────────────────────────────────────────────────────

export function getPrestigeMultiplier(level: number): number {
  return 1 + level * 0.25; // 1x, 1.25x, 1.5x, 1.75x, 2x...
}

export function canPrestige(streak: number): boolean {
  return streak >= 100;
}

// ─── Constellation sky ──────────────────────────────────────────────────────

export type Star = {
  x: number;
  y: number;
  brightness: number;
  habitId: string;
  habitName: string;
  color: string;
  connections: number[];
};

export function generateConstellation(habits: Habit[], completionSet: Set<string>): Star[] {
  if (habits.length === 0) return [];

  const stars: Star[] = habits.map((h, i) => {
    // Deterministic position from habit ID
    let hash = 0;
    for (let j = 0; j < h.id.length; j++) hash = ((hash << 5) - hash + h.id.charCodeAt(j)) | 0;
    const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
    const radius = 0.2 + (Math.abs(hash >> 8) % 60) / 100;
    const x = 0.5 + Math.cos(angle) * radius * 0.4;
    const y = 0.5 + Math.sin(angle) * radius * 0.4;

    // Brightness from total completions
    const totalDone = Array.from(completionSet).filter((k) => k.startsWith(h.id)).length;
    const brightness = Math.min(0.3 + totalDone * 0.05, 1.0);

    return {
      x: Math.max(0.05, Math.min(0.95, x)),
      y: Math.max(0.05, Math.min(0.95, y)),
      brightness,
      habitId: h.id,
      habitName: h.name,
      color: h.color_rgb,
      connections: [],
    };
  });

  // Connect stars for habits with 7+ day streaks
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const dist = Math.sqrt(Math.pow(stars[i].x - stars[j].x, 2) + Math.pow(stars[i].y - stars[j].y, 2));
      if (dist < 0.35 && stars[i].brightness > 0.5 && stars[j].brightness > 0.5) {
        stars[i].connections.push(j);
      }
    }
  }

  return stars;
}

// ─── Aura system ────────────────────────────────────────────────────────────

export type AuraLevel = "none" | "faint" | "glow" | "blaze" | "inferno";

export function getAuraLevel(avgMomentum: number): AuraLevel {
  if (avgMomentum >= 95) return "inferno";
  if (avgMomentum >= 80) return "blaze";
  if (avgMomentum >= 60) return "glow";
  if (avgMomentum >= 30) return "faint";
  return "none";
}

export const AURA_STYLES: Record<AuraLevel, { color: string; size: number; opacity: number; pulse: boolean }> = {
  none: { color: "255 255 255", size: 0, opacity: 0, pulse: false },
  faint: { color: "59 130 246", size: 60, opacity: 0.08, pulse: false },
  glow: { color: "16 185 129", size: 80, opacity: 0.12, pulse: false },
  blaze: { color: "251 191 36", size: 100, opacity: 0.18, pulse: true },
  inferno: { color: "239 68 68", size: 120, opacity: 0.25, pulse: true },
};

// ─── Smart insights ─────────────────────────────────────────────────────────

export function generateInsights(
  habits: Habit[],
  completionSet: Set<string>,
  skipSet: Set<string>,
): HabitInsight[] {
  const insights: HabitInsight[] = [];
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Day-of-week analysis
  const dayCompletionRates: number[] = Array(7).fill(0);
  const dayCounts: number[] = Array(7).fill(0);

  for (let i = 0; i < 28; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = localDateStr(d);
    const dow = d.getDay();
    dayCounts[dow]++;

    for (const habit of habits) {
      if (!isHabitScheduledForDay(habit, d)) continue;
      if (completionSet.has(`${habit.id}:${dateStr}`)) dayCompletionRates[dow]++;
    }
  }

  // Find weakest day
  let weakestDay = -1;
  let weakestRate = 1;
  for (let i = 0; i < 7; i++) {
    if (dayCounts[i] === 0) continue;
    const rate = dayCompletionRates[i] / (dayCounts[i] * habits.length || 1);
    if (rate < weakestRate) {
      weakestRate = rate;
      weakestDay = i;
    }
  }

  if (weakestDay >= 0 && weakestRate < 0.5 && habits.length > 0) {
    insights.push({
      type: "pattern",
      icon: "📊",
      title: `${dayNames[weakestDay]}s are tough`,
      body: `You complete only ${Math.round(weakestRate * 100)}% of habits on ${dayNames[weakestDay]}s. Consider lighter scheduling.`,
      color: "239 68 68",
    });
  }

  // Find best day
  let bestDay = -1;
  let bestRate = 0;
  for (let i = 0; i < 7; i++) {
    if (dayCounts[i] === 0) continue;
    const rate = dayCompletionRates[i] / (dayCounts[i] * habits.length || 1);
    if (rate > bestRate) {
      bestRate = rate;
      bestDay = i;
    }
  }

  if (bestDay >= 0 && bestRate > 0.8 && habits.length > 0) {
    insights.push({
      type: "pattern",
      icon: "🏆",
      title: `${dayNames[bestDay]}s are your power day`,
      body: `${Math.round(bestRate * 100)}% completion rate — your most consistent day.`,
      color: "16 185 129",
    });
  }

  // Trending up/down
  const recentWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    return localDateStr(d);
  });
  const prevWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - 7 - i);
    return localDateStr(d);
  });

  let recentCount = 0;
  let prevCount = 0;
  for (const habit of habits) {
    for (const d of recentWeek) if (completionSet.has(`${habit.id}:${d}`)) recentCount++;
    for (const d of prevWeek) if (completionSet.has(`${habit.id}:${d}`)) prevCount++;
  }

  if (prevCount > 0 && habits.length > 0) {
    const change = ((recentCount - prevCount) / prevCount) * 100;
    if (change >= 20) {
      insights.push({
        type: "tip",
        icon: "📈",
        title: "Momentum building",
        body: `You're completing ${Math.round(change)}% more habits than last week. Keep it up!`,
        color: "16 185 129",
      });
    } else if (change <= -20) {
      insights.push({
        type: "warning",
        icon: "📉",
        title: "Consistency slipping",
        body: `${Math.round(Math.abs(change))}% fewer completions than last week. A small win today can turn it around.`,
        color: "251 191 36",
      });
    }
  }

  // Most neglected habit
  if (habits.length > 1) {
    let worstHabit: Habit | null = null;
    let worstMomentum = 100;
    for (const habit of habits) {
      const m = calculateMomentum(habit, completionSet, skipSet, 14);
      if (m < worstMomentum) {
        worstMomentum = m;
        worstHabit = habit;
      }
    }
    if (worstHabit && worstMomentum < 30) {
      insights.push({
        type: "warning",
        icon: "⚠️",
        title: `"${worstHabit.name}" needs attention`,
        body: `Only ${worstMomentum}% momentum. Consider making it easier or changing the schedule.`,
        color: "239 68 68",
      });
    }
  }

  return insights.slice(0, 3);
}

// ─── Habit-performance correlation ─────────────────────────────────────────

export async function generateCorrelationInsights(
  userId: string,
  habits: Habit[],
  completionSet: Set<string>,
  supabaseClient: any,
): Promise<HabitInsight[]> {
  if (habits.length === 0) return [];
  const insights: HabitInsight[] = [];
  const now = new Date();

  // Fetch recent workouts (last 28 days)
  const since = new Date(now);
  since.setDate(since.getDate() - 28);
  const { data: workouts } = await supabaseClient
    .from("workout_sessions")
    .select("completed_at, total_volume, duration_seconds")
    .eq("user_id", userId)
    .gte("completed_at", since.toISOString())
    .order("completed_at");

  if (!workouts || workouts.length < 4) return [];

  // Compare workout performance on days with high habit completion vs low
  const workoutsByDate = new Map<string, { volume: number; duration: number }[]>();
  for (const w of workouts) {
    const d = localDateStr(new Date(w.completed_at));
    if (!workoutsByDate.has(d)) workoutsByDate.set(d, []);
    workoutsByDate.get(d)!.push({ volume: w.total_volume ?? 0, duration: w.duration_seconds ?? 0 });
  }

  let highHabitVolume = 0, highHabitCount = 0;
  let lowHabitVolume = 0, lowHabitCount = 0;

  for (const [dateStr, ws] of workoutsByDate) {
    const scheduled = habits.filter((h) => {
      const d = new Date(dateStr + "T12:00:00");
      return isHabitScheduledForDay(h, d);
    });
    if (scheduled.length === 0) continue;
    const done = scheduled.filter((h) => completionSet.has(`${h.id}:${dateStr}`)).length;
    const ratio = done / scheduled.length;
    const avgVol = ws.reduce((s, w) => s + w.volume, 0) / ws.length;

    if (ratio >= 0.75) {
      highHabitVolume += avgVol;
      highHabitCount++;
    } else if (ratio <= 0.25) {
      lowHabitVolume += avgVol;
      lowHabitCount++;
    }
  }

  if (highHabitCount >= 2 && lowHabitCount >= 2) {
    const highAvg = highHabitVolume / highHabitCount;
    const lowAvg = lowHabitVolume / lowHabitCount;
    if (highAvg > 0 && lowAvg > 0) {
      const pctDiff = Math.round(((highAvg - lowAvg) / lowAvg) * 100);
      if (pctDiff > 10) {
        insights.push({
          type: "correlation",
          icon: "🔗",
          title: "Habits boost workouts",
          body: `On days you complete most habits, your workout volume is ${pctDiff}% higher. Consistency compounds.`,
          color: "16 185 129",
        });
      } else if (pctDiff < -10) {
        insights.push({
          type: "correlation",
          icon: "🔗",
          title: "High habit days = lighter workouts",
          body: `You tend to do ${Math.abs(pctDiff)}% less volume on busy habit days. Consider adjusting your routine balance.`,
          color: "251 191 36",
        });
      }
    }
  }

  // Check specific habit correlations (stretching → recovery, sleep → performance)
  const stretchHabit = habits.find((h) => /stretch|yoga|mobility/i.test(h.name));
  if (stretchHabit && workoutsByDate.size >= 7) {
    let stretchDayVol = 0, stretchDayCount = 0;
    let noStretchDayVol = 0, noStretchDayCount = 0;
    for (const [dateStr, ws] of workoutsByDate) {
      const avgVol = ws.reduce((s, w) => s + w.volume, 0) / ws.length;
      if (completionSet.has(`${stretchHabit.id}:${dateStr}`)) {
        stretchDayVol += avgVol; stretchDayCount++;
      } else {
        noStretchDayVol += avgVol; noStretchDayCount++;
      }
    }
    if (stretchDayCount >= 2 && noStretchDayCount >= 2) {
      const diff = Math.round(((stretchDayVol / stretchDayCount) - (noStretchDayVol / noStretchDayCount)) / (noStretchDayVol / noStretchDayCount) * 100);
      if (Math.abs(diff) > 10) {
        insights.push({
          type: "correlation",
          icon: "🧘",
          title: diff > 0 ? `${stretchHabit.name} = better workouts` : `${stretchHabit.name} → rest days?`,
          body: diff > 0
            ? `Workout volume is ${diff}% higher when you ${stretchHabit.name.toLowerCase()}. Keep it up!`
            : `You lift ${Math.abs(diff)}% less on ${stretchHabit.name.toLowerCase()} days — could be active recovery.`,
          color: diff > 0 ? "16 185 129" : "59 130 246",
        });
      }
    }
  }

  return insights.slice(0, 2);
}

// ─── Share card data ────────────────────────────────────────────────────────

export type ShareCardData = {
  type: "monthly" | "milestone" | "year";
  title: string;
  stats: { label: string; value: string }[];
  color: string;
  emoji: string;
};

export function generateMonthlyCard(
  habits: Habit[],
  completionSet: Set<string>,
  month: number,
  year: number,
): ShareCardData {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let totalCompleted = 0;
  let totalScheduled = 0;
  let perfectDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = localDateStr(date);
    let dayComplete = true;
    let dayHasHabits = false;

    for (const habit of habits) {
      if (!isHabitScheduledForDay(habit, date)) continue;
      dayHasHabits = true;
      totalScheduled++;
      if (completionSet.has(`${habit.id}:${dateStr}`)) totalCompleted++;
      else dayComplete = false;
    }
    if (dayComplete && dayHasHabits) perfectDays++;
  }

  const rate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return {
    type: "monthly",
    title: `${monthNames[month]} ${year}`,
    stats: [
      { label: "Completion", value: `${rate}%` },
      { label: "Perfect days", value: `${perfectDays}` },
      { label: "Total habits done", value: `${totalCompleted}` },
    ],
    color: rate >= 80 ? "16 185 129" : rate >= 50 ? "251 191 36" : "239 68 68",
    emoji: rate >= 90 ? "🏆" : rate >= 70 ? "💪" : rate >= 50 ? "📈" : "🔄",
  };
}

export function generateMilestoneCard(habit: Habit, milestoneDays: number): ShareCardData {
  const milestone = MILESTONES.find((m) => m.days === milestoneDays);
  return {
    type: "milestone",
    title: `${milestone?.label ?? milestoneDays + " Days"} Streak`,
    stats: [
      { label: "Habit", value: habit.name },
      { label: "Streak", value: `${milestoneDays} days` },
      { label: "XP earned", value: `+${milestone?.xp ?? 0}` },
    ],
    color: "251 191 36",
    emoji: milestone?.emoji ?? "🔥",
  };
}
