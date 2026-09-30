import { supabase } from "./supabase";
import type { Sex } from "./calorieEngine";

export type MuscleTrend = "improving" | "maintaining" | "stalling" | "declining" | "insufficient";

// Male baseline volume guidelines (Schoenfeld, 2017; Israetel MEV/MRV ranges)
const VOLUME_GUIDELINES_MALE: Record<string, { min: number; max: number; note: string }> = {
  Chest: { min: 10, max: 20, note: "10–20 sets/week. Compounds (bench, dips) hit front delts and triceps too." },
  Back: { min: 10, max: 25, note: "10–25 sets/week. Back recovers well — can handle higher volume." },
  Shoulders: { min: 8, max: 20, note: "8–20 sets/week (direct). Front delts get volume from pressing." },
  Traps: { min: 6, max: 16, note: "6–16 sets/week. Rows and deadlifts provide indirect volume." },
  Biceps: { min: 8, max: 18, note: "8–18 sets/week (direct). Pulling movements add indirect volume." },
  Triceps: { min: 8, max: 18, note: "8–18 sets/week (direct). Pressing movements add indirect volume." },
  Forearms: { min: 4, max: 12, note: "4–12 sets/week. Most lifters get enough from gripping heavy loads." },
  Core: { min: 6, max: 16, note: "6–16 sets/week (direct). Compounds provide significant indirect work." },
  Legs: { min: 12, max: 22, note: "12–22 sets/week (combined quads + hamstrings). Large muscles need more volume." },
  Glutes: { min: 8, max: 20, note: "8–20 sets/week. Squats, lunges, and hip hinges all contribute." },
  "Full Body": { min: 0, max: 99, note: "Volume varies — these are compound/conditioning movements." },
};

// Female-adjusted guidelines: faster inter-set recovery (Judge & Burke, 2010),
// can tolerate ~10-20% higher relative volume, emphasis on glute/lower body
const VOLUME_GUIDELINES_FEMALE: Record<string, { min: number; max: number; note: string }> = {
  Chest: { min: 8, max: 16, note: "8–16 sets/week. Lower priority but supports pressing strength and posture." },
  Back: { min: 10, max: 25, note: "10–25 sets/week. Critical for posture and upper body balance." },
  Shoulders: { min: 10, max: 22, note: "10–22 sets/week. Shoulder development balances physique proportions." },
  Traps: { min: 6, max: 14, note: "6–14 sets/week. Rows and deadlifts provide indirect volume." },
  Biceps: { min: 6, max: 16, note: "6–16 sets/week. Pulling movements add indirect volume." },
  Triceps: { min: 6, max: 16, note: "6–16 sets/week. Pressing movements add indirect volume." },
  Forearms: { min: 4, max: 10, note: "4–10 sets/week. Most lifters get enough from gripping heavy loads." },
  Core: { min: 8, max: 18, note: "8–18 sets/week. Core stability is critical for compound lifts." },
  Legs: { min: 14, max: 26, note: "14–26 sets/week. Females recover faster from lower body work — can handle higher volume." },
  Glutes: { min: 12, max: 24, note: "12–24 sets/week. Glutes respond well to higher frequency and volume in females." },
  "Full Body": { min: 0, max: 99, note: "Volume varies — these are compound/conditioning movements." },
};

export const VOLUME_GUIDELINES = VOLUME_GUIDELINES_MALE;

export function getVolumeGuidelines(sex?: Sex | null): Record<string, { min: number; max: number; note: string }> {
  return sex === "female" ? VOLUME_GUIDELINES_FEMALE : VOLUME_GUIDELINES_MALE;
}

export function getVolumeStatus(
  segment: string,
  sets: number,
  adaptive?: AdaptiveVolumeData,
  sex?: Sex | null
): { label: string; color: string; tip: string | null; source: "personal" | "general"; trend?: MuscleTrend } {
  const guidelines = getVolumeGuidelines(sex);
  const guide = guidelines[segment] ?? { min: 8, max: 20, note: "" };
  const usePersonal = adaptive?.hasEnoughData && adaptive.personalMin !== null && adaptive.personalMax !== null;

  const min = usePersonal ? adaptive!.personalMin! : guide.min;
  const max = usePersonal ? adaptive!.personalMax! : guide.max;
  const source: "personal" | "general" = usePersonal ? "personal" : "general";
  const trend = adaptive?.trend;

  if (sets === 0) return { label: "NONE", color: "var(--fg-30)", tip: `No direct ${segment.toLowerCase()} work planned.`, source, trend };
  if (sets < min) return { label: "LOW", color: "rgb(var(--status-recovering-rgb))", tip: `Below ${source === "personal" ? "your observed" : "recommended"} minimum (${min} sets). Consider adding ${min - sets}+ sets.`, source, trend };
  if (sets <= max) return { label: "OPTIMAL", color: "rgb(var(--status-ready-rgb))", tip: null, source, trend };
  if (sets <= max + 4) return { label: "HIGH", color: "rgb(var(--status-fatigued-rgb))", tip: `Above ${source === "personal" ? "your observed" : "recommended"} max (${max} sets). ${adaptive?.suggestion || "Monitor recovery."}`, source, trend };
  return { label: "EXCESSIVE", color: "rgb(var(--status-danger-rgb))", tip: `Well above ${source === "personal" ? "your" : ""} maximum recoverable volume (${max} sets). ${adaptive?.suggestion || "Strongly consider reducing."}`, source, trend };
}

export type AdaptiveVolumeData = {
  hasEnoughData: boolean;
  weeksOfData: number;
  trend: MuscleTrend;
  personalMin: number | null;
  personalMax: number | null;
  avgWeeklySets: number;
  performanceChangePct: number | null;
  suggestion: string | null;
  weeklyHistory: { weekLabel: string; sets: number; avgE1RM: number | null }[];
  lastTrainedAt: string | null;
};

type WeekBucket = {
  weekStart: string;
  sets: number;
  e1rms: number[];
};

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d);
  monday.setDate(diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function estimateE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30); // Epley formula
}

function computeTrend(values: number[]): MuscleTrend {
  if (values.length < 3) return "insufficient";

  const recent = values.slice(-2);
  const earlier = values.slice(-4, -2);

  if (earlier.length === 0) return "insufficient";

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

  if (earlierAvg === 0) return "insufficient";

  const changePct = ((recentAvg - earlierAvg) / earlierAvg) * 100;

  if (changePct > 2) return "improving";
  if (changePct > -2) return "maintaining";
  if (changePct > -5) return "stalling";
  return "declining";
}

function computePerformanceChange(values: number[]): number | null {
  if (values.length < 2) return null;
  const recent = values[values.length - 1];
  const earliest = values[0];
  if (earliest === 0) return null;
  return ((recent - earliest) / earliest) * 100;
}

function findProductiveVolumeRange(
  weeklyData: { sets: number; avgE1RM: number | null }[]
): { min: number | null; max: number | null } {
  // Find weeks where performance improved vs declined
  // Compare each week's volume with the performance change that followed
  const validWeeks = weeklyData.filter((w) => w.avgE1RM !== null && w.avgE1RM > 0);
  if (validWeeks.length < 4) return { min: null, max: null };

  const improvingVolumes: number[] = [];
  const decliningVolumes: number[] = [];

  for (let i = 1; i < validWeeks.length; i++) {
    const prev = validWeeks[i - 1];
    const curr = validWeeks[i];
    if (!prev.avgE1RM || !curr.avgE1RM) continue;

    const change = ((curr.avgE1RM - prev.avgE1RM) / prev.avgE1RM) * 100;

    if (change > 1) {
      improvingVolumes.push(prev.sets);
    } else if (change < -2) {
      decliningVolumes.push(prev.sets);
    }
  }

  let personalMin: number | null = null;
  let personalMax: number | null = null;

  if (improvingVolumes.length >= 2) {
    // MEV estimate: minimum volume where improvement was observed
    personalMin = Math.min(...improvingVolumes);
  }

  if (decliningVolumes.length >= 2) {
    // MRV estimate: volume level where decline started
    personalMax = Math.min(...decliningVolumes);
  } else if (improvingVolumes.length >= 2) {
    // No decline observed yet — MRV is at least the highest productive volume + buffer
    personalMax = Math.max(...improvingVolumes) + 4;
  }

  return { min: personalMin, max: personalMax };
}

export async function analyzeAdaptiveVolume(
  userId: string,
  sex: string = "male",
): Promise<Record<string, AdaptiveVolumeData>> {
  const result: Record<string, AdaptiveVolumeData> = {};

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const cutoff = `${eightWeeksAgo.getFullYear()}-${String(eightWeeksAgo.getMonth() + 1).padStart(2, "0")}-${String(eightWeeksAgo.getDate()).padStart(2, "0")}`;

  // Fetch all completed set logs from the last 8 weeks
  const { data: logs } = await supabase
    .from("exercise_set_logs")
    .select("exercise_id, weight, reps, completed_at, workout_sessions!inner(date, status, user_id, sex), exercises!inner(body_segment)")
    .eq("workout_sessions.user_id", userId)
    .eq("workout_sessions.status", "completed")
    .eq("workout_sessions.sex", sex)
    .gte("workout_sessions.date", cutoff);

  if (!logs || logs.length === 0) return result;

  // Group by muscle → week
  const muscleWeeks: Record<string, Record<string, WeekBucket>> = {};
  const lastTrainedAt: Record<string, string> = {};

  logs.forEach((log: any) => {
    const segment = log.exercises?.body_segment;
    if (!segment || segment === "Cardio") return;

    const dateStr = log.workout_sessions?.date;
    if (!dateStr) return;

    const weekStart = getWeekStart(dateStr);

    if (!muscleWeeks[segment]) muscleWeeks[segment] = {};
    if (!muscleWeeks[segment][weekStart]) {
      muscleWeeks[segment][weekStart] = { weekStart, sets: 0, e1rms: [] };
    }

    const weight = Number(log.weight);
    const reps = Number(log.reps);
    if (!reps && !weight) return;

    muscleWeeks[segment][weekStart].sets += 1;

    if (weight > 0 && reps > 0) {
      muscleWeeks[segment][weekStart].e1rms.push(estimateE1RM(weight, reps));
    }

    const trainedAt = log.completed_at || dateStr;
    if (!lastTrainedAt[segment] || trainedAt > lastTrainedAt[segment]) {
      lastTrainedAt[segment] = trainedAt;
    }
  });

  // Process each muscle group
  for (const [segment, weeks] of Object.entries(muscleWeeks)) {
    const sortedWeeks = Object.values(weeks).sort(
      (a, b) => a.weekStart.localeCompare(b.weekStart)
    );

    const weeklyHistory = sortedWeeks.map((w) => ({
      weekLabel: w.weekStart,
      sets: w.sets,
      avgE1RM: w.e1rms.length > 0
        ? w.e1rms.reduce((a, b) => a + b, 0) / w.e1rms.length
        : null,
    }));

    const e1rmValues = weeklyHistory
      .map((w) => w.avgE1RM)
      .filter((v): v is number => v !== null && v > 0);

    const weeksOfData = sortedWeeks.length;
    const hasEnoughData = weeksOfData >= 4;
    const trend = hasEnoughData ? computeTrend(e1rmValues) : "insufficient";
    const performanceChangePct = computePerformanceChange(e1rmValues);
    const avgWeeklySets = weeksOfData > 0
      ? Math.round(sortedWeeks.reduce((s, w) => s + w.sets, 0) / weeksOfData)
      : 0;

    const { min: personalMin, max: personalMax } = hasEnoughData
      ? findProductiveVolumeRange(weeklyHistory)
      : { min: null, max: null };

    let suggestion: string | null = null;
    if (hasEnoughData) {
      switch (trend) {
        case "improving":
          suggestion = "Performance is trending up — current volume is productive. Maintain or add 1–2 sets if recovery allows.";
          break;
        case "maintaining":
          suggestion = "Performance is stable. If the goal is growth, consider adding 1–2 sets/week and monitoring for 2–3 weeks.";
          break;
        case "stalling":
          suggestion = "Performance has plateaued. Consider a deload week, then resume at slightly lower volume before building back up.";
          break;
        case "declining":
          suggestion = "Performance is declining — likely exceeding recoverable volume. Reduce by 20–30% for 2 weeks, then rebuild gradually.";
          break;
      }
    }

    result[segment] = {
      hasEnoughData,
      weeksOfData,
      trend,
      personalMin,
      personalMax,
      avgWeeklySets,
      performanceChangePct,
      suggestion,
      weeklyHistory,
      lastTrainedAt: lastTrainedAt[segment] ?? null,
    };
  }

  return result;
}