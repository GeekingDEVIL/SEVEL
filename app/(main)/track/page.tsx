"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Scale,
  Droplet,
  Flame,
  Calendar,
  Trophy,
  Brain,
  HeartPulse,
  Dumbbell,
  Zap,
  Activity,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import MuscleHeatMap from "../../components/MuscleHeatMap";
import { analyzeRecovery } from "../../lib/muscleRecovery";
import {
  estimateCyclePhase,
  computeAdaptiveCycleLength,
  getCyclePhaseInfo,
  getTrainingRec,
  type CyclePhase,
} from "../../lib/cycleAwareTrend";
import { useAuth } from "../../lib/AuthProvider";
import { useSex } from "../../lib/useSex";
import { useModules } from "../../lib/useModules";
import { useUnits } from "../../lib/useUnits";
import { formatWeight } from "../../lib/units";
import { supabase } from "../../lib/supabase";
import { staggerContainer, staggerItem } from "../../lib/motion";

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// --- Types ---

type TimelineItem = {
  icon: React.ReactNode;
  title: string;
  detail: string;
  time: string;
  route: string;
};

type HubData = {
  weeklyVolume: number;
  lastWeekVolume: number;
  weeklyVolumes: number[];
  prCount: number;
  latestPr: { exercise: string; weight: number; prevWeight: number; date: string } | null;
  bodyWeight: number | null;
  bodyWeightDelta: number | null;
  recoveryPct: number | null;
  recoveryMuscles: { muscle: string; intensity: number }[];
  monthSessions: number;
  todayCalories: number;
  todayCalorieTarget: number;
  todayProtein: number;
  todayCarbs: number;
  todayFat: number;
  todayWater: number;
  waterGoal: number;
  todayHabitsCompleted: number;
  todayHabitsTotal: number;
  cyclePhase: CyclePhase | null;
  cycleDay: number | null;
  muscleHeatData: { muscle: string; intensity: number }[];
  muscleSetCounts: { muscle: string; sets: number }[];
  undertrainedMuscle: string | null;
  timelineItems: TimelineItem[];
  todaySchedule: { exerciseCount: number; muscles: string[] } | null;
  isMonday: boolean;
  weeklyPrs: number;
  sixWeekSessions: number[];
  recoveryReady: number;
  recoveryModerate: number;
  recoveryFatigued: number;
  recoveryDescription: string;
  todaySessionSets: number;
  todaySessionVolume: number;
  bodyWeightGoal: number | null;
  weightSparkline: number[];
  strengthSparkline: number[];
  latestPrDaysAgo: number | null;
};

const SEGMENT_MAP: Record<string, string> = {
  chest: "Chest", pectorals: "Chest",
  back: "Back", lats: "Back", "upper back": "Back", "lower back": "Back", traps: "Back",
  shoulders: "Shoulders", delts: "Shoulders", "front delts": "Shoulders", "rear delts": "Shoulders", "side delts": "Shoulders",
  biceps: "Biceps", triceps: "Triceps", forearms: "Forearms",
  abs: "Core", core: "Core", obliques: "Core",
  quads: "Quads", hamstrings: "Hamstrings", glutes: "Glutes", calves: "Calves",
  legs: "Quads",
  "hip flexors": "Glutes", adductors: "Glutes", abductors: "Glutes",
};

// --- Small components ---

function MiniSparkline({ data, color, goalValue }: { data: number[]; color: string; goalValue?: number }) {
  if (data.length < 2) return null;
  const allVals = goalValue != null ? [...data, goalValue] : data;
  let max = Math.max(...allVals);
  let min = Math.min(...allVals);
  if (max === min) {
    const spread = Math.max(Math.abs(max) * 0.02, 1);
    max = max + spread;
    min = min - spread;
  }
  const range = max - min;
  const h = 36;
  const pad = 6;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 100 + "%",
    xNum: (i / (data.length - 1)) * 100,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));
  const w = 100;
  const ptsAbs = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));
  let d = `M ${ptsAbs[0].x},${ptsAbs[0].y}`;
  for (let i = 1; i < ptsAbs.length; i++) {
    const prev = ptsAbs[i - 1];
    const curr = ptsAbs[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  const last = ptsAbs[ptsAbs.length - 1];
  const goalY = goalValue != null ? h - pad - ((goalValue - min) / range) * (h - pad * 2) : null;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
      {goalY != null && (
        <line x1={0} y1={goalY} x2={w} y2={goalY} stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={last.x} cy={last.y} r="4" fill={color} />
      <circle cx={last.x} cy={last.y} r="6" fill={color} opacity="0.2" />
    </svg>
  );
}

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const allZero = data.every((v) => v === 0);
  return (
    <div className="flex items-end gap-[5px] h-10">
      {data.map((val, i) => {
        const h = allZero ? 30 : Math.max(20, (val / max) * 100);
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            className="flex-1 rounded-[4px]"
            style={{
              height: `${h}%`,
              backgroundColor: isLast ? color : `rgb(var(--fg-rgb) / 0.12)`,
              opacity: isLast ? 1 : allZero ? 0.35 : 0.5 + (i / data.length) * 0.5,
            }}
          />
        );
      })}
    </div>
  );
}


// --- Intelligence Card ---

function IntelligenceCard({ hub, router }: { hub: HubData; router: ReturnType<typeof useRouter> }) {
  let insightText: string | null = null;
  let subtext = "Updates weekly";

  if (hub.bodyWeight !== null && hub.bodyWeightDelta !== null && hub.weeklyVolume > 0) {
    const volChange = hub.lastWeekVolume > 0
      ? Math.round(((hub.weeklyVolume - hub.lastWeekVolume) / hub.lastWeekVolume) * 100)
      : 0;
    if (hub.bodyWeightDelta > 0 && volChange > 10) {
      insightText = `You've gained ${formatWeight(hub.bodyWeightDelta, "kg", 1)} but volume is up ${volChange}% — likely muscle growth. Keep pushing compounds this week.`;
    } else if (hub.bodyWeightDelta < 0 && volChange >= 0) {
      insightText = `Weight down ${formatWeight(Math.abs(hub.bodyWeightDelta), "kg", 1)} while maintaining volume — solid cut progress. Recovery is holding up well.`;
    }
  }

  if (!insightText && hub.todayWater >= hub.waterGoal && hub.weeklyVolume > 0) {
    insightText = "You hit your water goal today — hydrated training sessions tend to yield better performance. Volume is up this week.";
  }

  if (!insightText && hub.todayHabitsCompleted > 0 && hub.todayHabitsTotal > 0) {
    const pct = Math.round((hub.todayHabitsCompleted / hub.todayHabitsTotal) * 100);
    if (pct >= 50) {
      insightText = `${pct}% habits completed today — consistency is the strongest predictor of progress. Keep the streak alive.`;
    }
  }

  if (!insightText && hub.monthSessions > 0) {
    insightText = `You've logged ${hub.monthSessions} sessions this month. Volume is ${hub.weeklyVolume > 0 ? "tracking well" : "ready to build"} — keep showing up and the gains follow.`;
  }

  if (!insightText) return null;

  return (
    <motion.div variants={staggerItem}>
      <span className="text-[11px] font-mono tracking-[0.2em] text-[var(--fg-30)] mb-3 block">INTELLIGENCE</span>
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={14} style={{ color: "rgb(var(--accent-rgb))" }} />
          <span className="text-[10px] font-mono tracking-widest" style={{ color: "rgb(var(--accent-rgb))" }}>CROSS-DOMAIN INSIGHT</span>
        </div>
        <p className="text-[15px] text-[var(--fg-60)] leading-relaxed">{insightText}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-[10px] font-mono" style={{ color: "rgb(var(--accent-rgb))" }}>↻ {subtext}</span>
          <button
            onClick={() => router.push("/progress")}
            className="text-[11px] font-mono flex items-center gap-0.5 transition hover:opacity-80"
            style={{ color: "rgb(var(--accent-rgb))" }}
          >
            View all <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- More Modules Row ---

function MoreModulesRow({
  enabledKeys,
  router,
}: {
  enabledKeys: string[];
  router: ReturnType<typeof useRouter>;
}) {
  const modules = [
    { key: "recovery", label: "Recovery", icon: <Activity size={16} />, route: "/recovery" },
    { key: "habits", label: "Habits", icon: <Target size={16} />, route: "/habits" },
    { key: "wellness", label: "Hydration", icon: <Droplet size={16} />, route: "/wellness" },
  ].filter((m) => enabledKeys.includes(m.key));

  if (modules.length === 0) return null;

  return (
    <motion.div variants={staggerItem}>
      <span className="text-[11px] font-mono tracking-[0.2em] text-[var(--fg-30)] mb-3 block">MORE</span>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {modules.map((m) => (
          <button
            key={m.key}
            className="glass-card px-5 py-3 flex items-center gap-2.5 shrink-0 hover:bg-[var(--fg-04)] transition active:scale-95"
            onClick={() => router.push(m.route)}
          >
            <span className="text-[var(--fg-35)]">{m.icon}</span>
            <span className="text-sm font-medium text-[var(--fg-50)]">{m.label}</span>
            <ChevronRight size={14} className="text-[var(--fg-15)]" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// --- Main Page ---

export default function TrackHub() {
  const router = useRouter();
  const { user } = useAuth();
  const { enabledKeys } = useModules();
  const { sex: userSex } = useSex();
  const weightUnit = useUnits();

  const [hub, setHub] = useState<HubData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [waterToast, setWaterToast] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;

      const now = new Date();
      const todayStr = toDateString(now);
      const todayStart = todayStr + "T00:00:00";
      const dayOfWeek = now.getDay();
      const isMonday = dayOfWeek === 1;
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const mondayStr = toDateString(monday);
      const lastMonday = new Date(monday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastMondayStr = toDateString(lastMonday);

      const weeksBack = 6;
      const sixWeeksAgo = new Date(monday);
      sixWeeksAgo.setDate(sixWeeksAgo.getDate() - (weeksBack - 1) * 7);
      const sixWeeksAgoStr = toDateString(sixWeeksAgo);

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartStr = toDateString(monthStart);

      const [
        { data: allSessions },
        { data: prData },
        { data: weightLogs },
        { data: monthData },
        { data: todayWaterLogs },
        { data: todayHabits },
        { data: todayHabitCompletions },
        { data: todayFoodLogs },
        { data: todayCompletedSessions },
        { data: latestPrData },
        { data: cycleData },
      ] = await Promise.all([
        supabase.from("workout_sessions").select("id, date, title, completed_at, duration_seconds").eq("user_id", user.id).eq("status", "completed").eq("sex", userSex).gte("date", sixWeeksAgoStr),
        supabase.from("exercise_leaderboard").select("exercise_id").eq("user_id", user.id).eq("sex", userSex),
        supabase.from("body_weight_logs").select("weight, logged_at").eq("user_id", user.id).eq("sex", userSex).order("logged_at", { ascending: false }).limit(8),
        supabase.from("workout_sessions").select("id").eq("user_id", user.id).eq("status", "completed").eq("sex", userSex).gte("date", monthStartStr),
        supabase.from("water_logs").select("amount_ml, logged_at").eq("user_id", user.id).gte("logged_at", todayStart),
        supabase.from("habits").select("id").eq("user_id", user.id).eq("is_active", true),
        supabase.from("habit_completions").select("habit_id").eq("user_id", user.id).eq("date", todayStr),
        supabase.from("food_entries").select("kcal, protein_g, carbs_g, fat_g, logged_at, label").eq("user_id", user.id).gte("logged_at", todayStart),
        supabase.from("workout_sessions").select("id, title, completed_at, duration_seconds").eq("user_id", user.id).eq("status", "completed").eq("sex", userSex).eq("date", todayStr),
        supabase.from("exercise_leaderboard").select("exercise_name, best_weight, updated_at").eq("user_id", user.id).eq("sex", userSex).order("updated_at", { ascending: false }).limit(1),
        userSex === "female"
          ? supabase.from("cycle_logs").select("period_start").eq("user_id", user.id).order("period_start", { ascending: false }).limit(6)
          : Promise.resolve({ data: null }),
      ]);

      if (cancelled) return;

      const sessionIds = (allSessions ?? []).map((s: any) => s.id);
      let allLogs: any[] = [];
      if (sessionIds.length > 0) {
        const { data: logs } = await supabase.from("exercise_set_logs").select("weight, reps, workout_session_id, exercises(body_segment)").in("workout_session_id", sessionIds);
        allLogs = logs ?? [];
      }

      if (cancelled) return;

      // Recovery
      let recoveryPct: number | null = null;
      let recoveryMuscles: { muscle: string; intensity: number }[] = [];
      let recoveryReady = 0;
      let recoveryModerate = 0;
      let recoveryFatigued = 0;
      let recoveryDescription = "";
      try {
        const { data: recData } = await analyzeRecovery(user.id, userSex);
        if (recData) {
          const entries = Object.entries(recData);
          const totalPct = entries.reduce((sum, [, m]) => sum + (m.recoveryPct ?? 0), 0);
          recoveryPct = entries.length > 0 ? Math.round(totalPct / entries.length) : null;
          recoveryMuscles = entries.map(([name, m]) => ({
            muscle: name,
            intensity: Math.round(((m.recoveryPct ?? 100) / 100) * 10),
          }));
          for (const [, m] of entries) {
            const pct = m.recoveryPct ?? 100;
            if (pct >= 80) recoveryReady++;
            else if (pct >= 50) recoveryModerate++;
            else recoveryFatigued++;
          }
          const fatiguedNames = entries.filter(([, m]) => (m.recoveryPct ?? 100) < 50).map(([n]) => n);
          const readyNames = entries.filter(([, m]) => (m.recoveryPct ?? 100) >= 80).map(([n]) => n);
          if (fatiguedNames.length > 0 && readyNames.length > 0) {
            recoveryDescription = `${fatiguedNames.slice(0, 2).join(" & ")} still fatigued. ${readyNames.length > 2 ? "Upper body" : readyNames.slice(0, 2).join(" & ")} good to go.`;
          } else if (fatiguedNames.length > 0) {
            recoveryDescription = `${fatiguedNames.slice(0, 2).join(" & ")} need more rest.`;
          } else {
            recoveryDescription = "All muscle groups are well recovered.";
          }
        }
      } catch { /* recovery analysis optional */ }

      if (cancelled) return;

      // Weekly volumes
      const weekVolumes: number[] = [];
      let thisWeekVol = 0;
      let lastWeekVol = 0;
      for (let w = 0; w < weeksBack; w++) {
        const wStart = new Date(monday);
        wStart.setDate(monday.getDate() - (weeksBack - 1 - w) * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 7);
        const wStartStr = toDateString(wStart);
        const wEndStr = toDateString(wEnd);

        const weekSessionIds = (allSessions ?? [])
          .filter((s: any) => s.date >= wStartStr && s.date < wEndStr)
          .map((s: any) => s.id);
        const vol = allLogs
          .filter((l: any) => weekSessionIds.includes(l.workout_session_id))
          .reduce((sum: number, l: any) => sum + ((Number(l.weight) || 0) * (Number(l.reps) || 0)), 0);
        weekVolumes.push(Math.round(vol));
        if (w === weeksBack - 1) thisWeekVol = vol;
        if (w === weeksBack - 2) lastWeekVol = vol;
      }

      // Six-week session counts
      const sixWeekSessions: number[] = [];
      for (let w = 0; w < weeksBack; w++) {
        const wStart = new Date(monday);
        wStart.setDate(monday.getDate() - (weeksBack - 1 - w) * 7);
        const wEnd = new Date(wStart);
        wEnd.setDate(wStart.getDate() + 7);
        const wStartStr = toDateString(wStart);
        const wEndStr = toDateString(wEnd);
        const count = (allSessions ?? []).filter((s: any) => s.date >= wStartStr && s.date < wEndStr).length;
        sixWeekSessions.push(count);
      }

      // Body weight
      let bw: number | null = null;
      let bwDelta: number | null = null;
      const weightSparkline: number[] = [];
      if (weightLogs?.length) {
        bw = Number(weightLogs[0].weight);
        if (weightLogs.length > 1) bwDelta = Number((weightLogs[0].weight - weightLogs[1].weight).toFixed(1));
        for (let i = Math.min(weightLogs.length - 1, 6); i >= 0; i--) {
          weightSparkline.push(Number(weightLogs[i].weight));
        }
      }
      let bodyWeightGoal: number | null = null;
      try {
        const stored = localStorage.getItem("sevel_weight_goal");
        if (stored) bodyWeightGoal = Number(stored) || null;
      } catch { /* ignore */ }

      // Calories
      const todayCalories = (todayFoodLogs ?? []).reduce((s: number, l: any) => s + (Number(l.kcal) || 0), 0);
      const todayProtein = (todayFoodLogs ?? []).reduce((s: number, l: any) => s + (Number(l.protein_g) || 0), 0);
      const todayCarbs = (todayFoodLogs ?? []).reduce((s: number, l: any) => s + (Number(l.carbs_g) || 0), 0);
      const todayFat = (todayFoodLogs ?? []).reduce((s: number, l: any) => s + (Number(l.fat_g) || 0), 0);

      // Water
      const todayWater = (todayWaterLogs ?? []).reduce((s: number, l: any) => s + (Number(l.amount_ml) || 0), 0);
      let waterGoal = 3000;
      try {
        const stored = localStorage.getItem("sevel_water_goal_ml");
        if (stored) waterGoal = Number(stored) || 3000;
      } catch { /* ignore */ }

      // Habits
      const todayHabitsTotal = todayHabits?.length ?? 0;
      const todayHabitsCompleted = todayHabitCompletions?.length ?? 0;

      // Muscle heat map data (7-day)
      const thisWeekSessionIds = (allSessions ?? [])
        .filter((s: any) => s.date >= mondayStr)
        .map((s: any) => s.id);
      const weekLogs = allLogs.filter((l: any) => thisWeekSessionIds.includes(l.workout_session_id));
      const muscleSets: Record<string, number> = {};
      for (const log of weekLogs) {
        const bp = ((log.exercises as any)?.body_segment ?? "").toLowerCase().trim();
        const group = SEGMENT_MAP[bp];
        if (group) muscleSets[group] = (muscleSets[group] || 0) + 1;
      }
      const maxSets = Math.max(...Object.values(muscleSets), 1);
      const muscleHeatData = Object.entries(muscleSets).map(([muscle, count]) => ({
        muscle,
        intensity: Math.min(10, Math.round((count / maxSets) * 10)),
      }));
      const muscleSetCounts = Object.entries(muscleSets)
        .map(([muscle, sets]) => ({ muscle, sets }))
        .sort((a, b) => b.sets - a.sets);
      const avgSets = muscleSetCounts.length > 0 ? muscleSetCounts.reduce((s, m) => s + m.sets, 0) / muscleSetCounts.length : 0;
      const undertrained = muscleSetCounts.find((m) => m.sets < avgSets * 0.4 && avgSets > 3);
      const undertrainedMuscle = undertrained?.muscle ?? null;

      // Cycle
      let cyclePhase: CyclePhase | null = null;
      let cycleDay: number | null = null;
      if (cycleData?.[0]) {
        const periodStarts = cycleData.map((c: any) => c.period_start);
        const cycleLen = computeAdaptiveCycleLength(periodStarts);
        const est = estimateCyclePhase(cycleData[0].period_start, cycleLen, todayStr);
        cyclePhase = est.phase;
        cycleDay = est.cycleDay;
      }

      // Today session stats
      const todaySessionIds = (todayCompletedSessions ?? []).map((s: any) => s.id);
      const todayLogs = allLogs.filter((l: any) => todaySessionIds.includes(l.workout_session_id));
      const todaySessionSets = todayLogs.length;
      const todaySessionVolume = todayLogs.reduce((sum: number, l: any) => sum + ((Number(l.weight) || 0) * (Number(l.reps) || 0)), 0);

      // Latest PR
      let latestPr: HubData["latestPr"] = null;
      let latestPrDaysAgo: number | null = null;
      if (latestPrData?.[0]) {
        const pr = latestPrData[0];
        const prDate = new Date(pr.updated_at);
        const hoursSincePr = (Date.now() - prDate.getTime()) / 3600000;
        latestPrDaysAgo = Math.round(hoursSincePr / 24);
        if (hoursSincePr < 24) {
          latestPr = {
            exercise: pr.exercise_name,
            weight: Number(pr.best_weight),
            prevWeight: 0,
            date: pr.updated_at,
          };
        }
      }

      // Weekly PRs (last 7 days)
      let weeklyPrs = 0;
      if (latestPrData?.[0]) {
        const prDate = new Date(latestPrData[0].updated_at);
        const daysSincePr = (Date.now() - prDate.getTime()) / 86400000;
        if (daysSincePr < 7) weeklyPrs = 1;
      }

      // Calorie target
      let todayCalorieTarget = 2500;
      try {
        const stored = localStorage.getItem("sevel_calorie_target");
        if (stored) todayCalorieTarget = Number(stored) || 2500;
      } catch { /* ignore */ }

      // Timeline items
      const timelineItems: TimelineItem[] = [];

      for (const session of (todayCompletedSessions ?? [])) {
        const completedAt = session.completed_at ? new Date(session.completed_at) : now;
        const durationMin = session.duration_seconds ? Math.round(Number(session.duration_seconds) / 60) : null;
        const sessLogs = allLogs.filter((l: any) => l.workout_session_id === session.id);
        const sessVol = sessLogs.reduce((sum: number, l: any) => sum + ((Number(l.weight) || 0) * (Number(l.reps) || 0)), 0);
        const parts = [];
        if (sessLogs.length > 0) parts.push(`${sessLogs.length} sets`);
        if (sessVol > 0) parts.push(`${sessVol >= 1000 ? `${(sessVol / 1000).toFixed(1).replace(/\.0$/, "")}k` : sessVol} ${weightUnit}`);
        if (durationMin) parts.push(`${durationMin} min`);
        timelineItems.push({
          icon: <Dumbbell size={14} />,
          title: session.title || "Workout",
          detail: parts.join(" · ") || "Completed",
          time: toTimeStr(completedAt),
          route: "/progress/history",
        });
      }

      if (bw !== null && weightLogs?.[0]?.logged_at) {
        const loggedToday = weightLogs[0].logged_at >= todayStart;
        if (loggedToday) {
          timelineItems.push({
            icon: <Scale size={14} />,
            title: `${formatWeight(bw, weightUnit, 1)}`,
            detail: bwDelta !== null ? `${bwDelta > 0 ? "↑" : "↓"} ${formatWeight(Math.abs(bwDelta), weightUnit, 1)} weekly trend` : "Body weight",
            time: toTimeStr(new Date(weightLogs[0].logged_at)),
            route: "/progress/weight",
          });
        }
      }

      if (todayHabitsTotal > 0) {
        const habitPct = todayHabitsTotal > 0 ? Math.round((todayHabitsCompleted / todayHabitsTotal) * 100) : 0;
        timelineItems.push({
          icon: <Target size={14} />,
          title: `Habits · ${todayHabitsCompleted} / ${todayHabitsTotal}`,
          detail: todayHabitsCompleted >= todayHabitsTotal ? "All done" : `${todayHabitsTotal - todayHabitsCompleted} remaining`,
          time: `${habitPct}%`,
          route: "/habits",
        });
      }

      if (todayWater > 0) {
        const waterPct = waterGoal > 0 ? Math.round((todayWater / waterGoal) * 100) : 0;
        const waterL = (todayWater / 1000).toFixed(2).replace(/0$/, "");
        const goalL = (waterGoal / 1000).toFixed(0);
        timelineItems.push({
          icon: <Droplet size={14} />,
          title: `Water · ${waterL} / ${goalL}L`,
          detail: todayWater >= waterGoal ? "Goal reached" : `${Math.round((waterGoal - todayWater) / 1000 * 10) / 10}L remaining`,
          time: `${waterPct}%`,
          route: "/wellness",
        });
      }

      if (todayCalories > 0) {
        timelineItems.push({
          icon: <Flame size={14} />,
          title: `${Math.round(todayCalories)} kcal`,
          detail: `P:${Math.round(todayProtein)}g · C:${Math.round(todayCarbs)}g · F:${Math.round(todayFat)}g`,
          time: "Today",
          route: "/progress/intake",
        });
      }

      setHub({
        weeklyVolume: Math.round(thisWeekVol),
        lastWeekVolume: Math.round(lastWeekVol),
        weeklyVolumes: weekVolumes,
        prCount: prData?.length ?? 0,
        latestPr,
        bodyWeight: bw,
        bodyWeightDelta: bwDelta,
        recoveryPct,
        recoveryMuscles,
        monthSessions: monthData?.length ?? 0,
        todayCalories: Math.round(todayCalories),
        todayCalorieTarget,
        todayProtein: Math.round(todayProtein),
        todayCarbs: Math.round(todayCarbs),
        todayFat: Math.round(todayFat),
        todayWater,
        waterGoal,
        todayHabitsCompleted,
        todayHabitsTotal,
        cyclePhase,
        cycleDay,
        muscleHeatData,
        muscleSetCounts,
        undertrainedMuscle,
        timelineItems,
        todaySchedule: null,
        isMonday,
        weeklyPrs,
        sixWeekSessions,
        recoveryReady,
        recoveryModerate,
        recoveryFatigued,
        recoveryDescription,
        todaySessionSets,
        todaySessionVolume: Math.round(todaySessionVolume),
        bodyWeightGoal,
        weightSparkline,
        strengthSparkline: weekVolumes.slice(-6),
        latestPrDaysAgo,
      });
      setLoaded(true);
    }

    load();
    return () => { cancelled = true; };
  }, [user, userSex, weightUnit]);

  // Quick water log
  async function handleQuickWater() {
    if (!user) return;
    const amount = 250;
    await supabase.from("water_logs").insert({
      user_id: user.id,
      amount_ml: amount,
      logged_at: new Date().toISOString(),
    });
    setWaterToast(true);
    setTimeout(() => setWaterToast(false), 2000);
    // Update local state
    if (hub) {
      setHub({ ...hub, todayWater: hub.todayWater + amount });
    }
  }

  const volChange = useMemo(() => {
    if (!hub || hub.lastWeekVolume <= 0) return null;
    return Math.round(((hub.weeklyVolume - hub.lastWeekVolume) / hub.lastWeekVolume) * 100);
  }, [hub]);

  const MUSCLE_COLORS: Record<string, string> = {
    Chest: "rgb(168 85 247)", Back: "rgb(59 130 246)", Shoulders: "rgb(249 115 22)",
    Biceps: "rgb(236 72 153)", Triceps: "rgb(236 72 153)", Forearms: "rgb(236 72 153)",
    Core: "rgb(234 179 8)", Quads: "rgb(34 197 94)", Hamstrings: "rgb(34 197 94)",
    Glutes: "rgb(34 197 94)", Calves: "rgb(34 197 94)",
  };

  const ICON_COLORS: Record<string, string> = {
    workout: "rgb(20 184 166)", weight: "rgb(168 85 247)", habits: "rgb(234 179 8)", water: "rgb(59 130 246)", food: "rgb(249 115 22)",
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <main className="relative min-h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 overflow-x-hidden">
      <motion.div
        className="relative z-10 w-full max-w-xl mx-auto px-4 pt-4 space-y-5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={staggerItem} className="flex items-baseline justify-between">
          <h1 className="text-[28px] font-bold font-display text-[var(--fg-90)]">Track</h1>
          <span className="text-xs font-mono text-[var(--fg-30)]">{dateStr}</span>
        </motion.div>

        {!loaded ? (
          <motion.div variants={staggerItem} className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-7 animate-pulse">
                <div className="h-4 bg-[var(--fg-04)] rounded w-1/3 mb-4" />
                <div className="h-8 bg-[var(--fg-04)] rounded w-1/2" />
              </div>
            ))}
          </motion.div>
        ) : hub ? (
          <>
            {/* Recovery Status Hero */}
            {hub.recoveryPct !== null && (
              <motion.div
                variants={staggerItem}
                className="glass-card p-6 cursor-pointer group"
                style={{
                  borderColor: hub.recoveryPct >= 80 ? "rgba(52,211,153,0.15)" : hub.recoveryPct >= 50 ? "rgba(234,179,8,0.15)" : "rgba(239,68,68,0.15)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                }}
                onClick={() => router.push("/recovery")}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={14} style={{ color: "rgb(52 211 153)" }} />
                  <span className="text-[10px] font-mono tracking-[0.2em]" style={{ color: "rgb(52 211 153)" }}>RECOVERY STATUS</span>
                  <ChevronRight size={14} className="ml-auto text-[var(--fg-10)] group-hover:text-[var(--fg-30)] transition" />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold font-display text-[var(--fg-90)] mb-1.5">
                      {hub.recoveryPct >= 80 ? "Mostly recovered" : hub.recoveryPct >= 50 ? "Partially recovered" : "Still recovering"}
                    </h2>
                    <p className="text-[13px] text-[var(--fg-35)] leading-relaxed">{hub.recoveryDescription}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-5xl font-bold font-display" style={{ color: hub.recoveryPct >= 80 ? "rgb(52 211 153)" : hub.recoveryPct >= 50 ? "rgb(234 179 8)" : "rgb(239 68 68)" }}>
                      {hub.recoveryPct}<span className="text-xl">%</span>
                    </span>
                    {hub.recoveryMuscles.length > 0 && (
                      <div className="w-[72px]">
                        <MuscleHeatMap muscles={hub.recoveryMuscles} compact showToggle={false} showLegend={false} height={90} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-5 mt-4 pt-4 border-t border-[var(--fg-04)]">
                  {hub.recoveryReady > 0 && (
                    <span className="flex items-center gap-2 text-[11px] font-mono" style={{ color: "rgb(52 211 153)" }}>
                      <span className="w-[14px] h-[14px] rounded-full border-[1.5px] flex items-center justify-center" style={{ borderColor: "rgb(52 211 153)" }}>
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "rgb(52 211 153)" }} />
                      </span>
                      {hub.recoveryReady} ready
                    </span>
                  )}
                  {hub.recoveryModerate > 0 && (
                    <span className="flex items-center gap-2 text-[11px] font-mono" style={{ color: "rgb(234 179 8)" }}>
                      <span className="w-[14px] h-[14px] rounded-full border-[1.5px] flex items-center justify-center" style={{ borderColor: "rgb(234 179 8)" }}>
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "rgb(234 179 8)" }} />
                      </span>
                      {hub.recoveryModerate} moderate
                    </span>
                  )}
                  {hub.recoveryFatigued > 0 && (
                    <span className="flex items-center gap-2 text-[11px] font-mono" style={{ color: "rgb(239 68 68)" }}>
                      <span className="w-[14px] h-[14px] rounded-full border-[1.5px] flex items-center justify-center" style={{ borderColor: "rgb(239 68 68)" }}>
                        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "rgb(239 68 68)" }} />
                      </span>
                      {hub.recoveryFatigued} fatigued
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Today Timeline */}
            <motion.div variants={staggerItem}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono tracking-[0.2em] text-[var(--fg-30)]">TODAY</span>
                <button
                  onClick={() => router.push("/progress/history")}
                  className="text-[12px] font-mono flex items-center gap-0.5 transition hover:opacity-80"
                  style={{ color: "rgb(var(--accent-rgb))" }}
                >
                  Full history <ChevronRight size={13} />
                </button>
              </div>
              {hub.timelineItems.length === 0 ? (
                <div className="glass-card p-5">
                  <p className="text-sm text-[var(--fg-25)] text-center py-3">Nothing logged yet today</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {hub.timelineItems.map((item, i) => {
                    const colorKey = item.route.includes("history") ? "workout"
                      : item.route.includes("weight") ? "weight"
                      : item.route.includes("habits") ? "habits"
                      : item.route.includes("wellness") ? "water"
                      : item.route.includes("intake") ? "food" : "workout";
                    const iconColor = ICON_COLORS[colorKey] ?? "var(--fg-30)";
                    return (
                      <div
                        key={i}
                        className="glass-card flex items-center gap-4 p-4 cursor-pointer group hover:bg-[var(--fg-02)] transition"
                        onClick={() => router.push(item.route)}
                      >
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: iconColor + "30", color: iconColor }}
                        >
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-[var(--fg-80)] truncate">{item.title}</p>
                          <p className="text-[11px] text-[var(--fg-30)] truncate mt-0.5">{item.detail}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-mono text-[var(--fg-30)]">{item.time}</span>
                          <ChevronRight size={14} className="text-[var(--fg-10)] group-hover:text-[var(--fg-30)] transition" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Quick Log */}
            <motion.div variants={staggerItem}>
              <span className="text-[11px] font-mono tracking-[0.2em] text-[var(--fg-30)] mb-3 block">QUICK LOG</span>
              <div className="grid grid-cols-3 gap-3">
                <button
                  className="glass-card py-5 flex items-center justify-center gap-3 hover:bg-[var(--fg-04)] transition active:scale-95"
                  onClick={() => router.push("/progress/weight")}
                >
                  <Scale size={20} className="text-[var(--fg-45)]" />
                  <span className="text-[16px] font-semibold text-[var(--fg-60)]">Weight</span>
                </button>
                <button
                  className="glass-card py-5 flex items-center justify-center gap-3 hover:bg-[var(--fg-04)] transition active:scale-95"
                  onClick={handleQuickWater}
                >
                  <Droplet size={20} className="text-[var(--fg-45)]" />
                  <span className="text-[16px] font-semibold text-[var(--fg-60)]">Water</span>
                </button>
                <button
                  className="glass-card py-5 flex items-center justify-center gap-3 hover:bg-[var(--fg-04)] transition active:scale-95"
                  onClick={() => router.push("/progress/intake")}
                >
                  <Flame size={20} className="text-[var(--fg-45)]" />
                  <span className="text-[16px] font-semibold text-[var(--fg-60)]">Meal</span>
                </button>
              </div>
            </motion.div>

            {/* Trends Grid */}
            <motion.div variants={staggerItem}>
              <span className="text-[11px] font-mono tracking-[0.2em] text-[var(--fg-30)] mb-3 block">TRENDS</span>
              <div className="grid grid-cols-2 gap-3">
                {/* Sessions */}
                <div className="glass-card px-5 py-4 cursor-pointer group hover:bg-[var(--fg-02)] transition" onClick={() => router.push("/progress/history")}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Calendar size={13} className="text-[var(--fg-25)]" />
                    <span className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">SESSIONS</span>
                  </div>
                  <p className="text-[36px] font-bold font-mono text-[var(--fg-90)] leading-none">
                    {hub.monthSessions} <span className="text-[15px] font-normal text-[var(--fg-25)]">/ {Math.max(hub.monthSessions, 16)}</span>
                  </p>
                  {volChange !== null && (
                    <span className={`text-[11px] font-mono mt-1.5 block ${volChange >= 0 ? "text-emerald-400/80" : "text-orange-400/80"}`}>
                      {volChange >= 0 ? "↑" : "↓"} {Math.abs(volChange)} vs last month
                    </span>
                  )}
                  {hub.sixWeekSessions.length > 1 && (
                    <div className="mt-3">
                      <MiniBarChart data={hub.sixWeekSessions} color="rgb(var(--accent-rgb))" />
                    </div>
                  )}
                  <button className="text-[11px] font-mono text-[var(--fg-20)] hover:text-[var(--fg-40)] transition mt-2.5 flex items-center gap-0.5 ml-auto">
                    Details <ChevronRight size={12} />
                  </button>
                </div>

                {/* Strength */}
                <div className="glass-card px-5 py-4 cursor-pointer group hover:bg-[var(--fg-02)] transition" onClick={() => router.push("/progress/strength")}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Trophy size={13} className="text-[var(--fg-25)]" />
                    <span className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">STRENGTH</span>
                  </div>
                  <p className="text-[36px] font-bold font-mono text-[var(--fg-90)] leading-none">
                    {hub.prCount} <span className="text-[15px] font-normal text-[var(--fg-25)]">PRs</span>
                  </p>
                  {hub.latestPr ? (
                    <span className="text-[11px] font-mono mt-1.5 block" style={{ color: "rgb(var(--accent-rgb))" }}>
                      {hub.latestPr.exercise} {formatWeight(hub.latestPr.weight, weightUnit, 0)} · {hub.latestPrDaysAgo !== null ? `${hub.latestPrDaysAgo}d ago` : "today"}
                    </span>
                  ) : hub.latestPrDaysAgo !== null && hub.latestPrDaysAgo <= 7 ? (
                    <span className="text-[11px] font-mono text-[var(--fg-25)] mt-1.5 block">Latest {hub.latestPrDaysAgo}d ago</span>
                  ) : null}
                  {hub.strengthSparkline.length > 1 && (
                    <div className="mt-3">
                      <MiniSparkline data={hub.strengthSparkline} color="rgb(234 179 8)" />
                    </div>
                  )}
                  <button className="text-[11px] font-mono text-[var(--fg-20)] hover:text-[var(--fg-40)] transition mt-2.5 flex items-center gap-0.5 ml-auto">
                    Details <ChevronRight size={12} />
                  </button>
                </div>

                {/* Weight */}
                <div className="glass-card px-5 py-4 cursor-pointer group hover:bg-[var(--fg-02)] transition" onClick={() => router.push("/progress/weight")}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Scale size={13} className="text-[var(--fg-25)]" />
                    <span className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">WEIGHT</span>
                  </div>
                  <p className="text-[36px] font-bold font-mono text-[var(--fg-90)] leading-none">
                    {hub.bodyWeight !== null ? formatWeight(hub.bodyWeight, weightUnit, 1) : "—"} <span className="text-[15px] font-normal text-[var(--fg-25)]">{weightUnit}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {hub.bodyWeightDelta !== null && (
                      <span className={`text-[11px] font-mono ${hub.bodyWeightDelta <= 0 ? "text-emerald-400/80" : "text-orange-400/80"}`}>
                        {hub.bodyWeightDelta > 0 ? "↑" : "↓"} {formatWeight(Math.abs(hub.bodyWeightDelta), weightUnit, 1)} /wk
                      </span>
                    )}
                    {hub.bodyWeightGoal && (
                      <span className="text-[11px] font-mono text-[var(--fg-20)]">· goal {formatWeight(hub.bodyWeightGoal, weightUnit, 0)}</span>
                    )}
                  </div>
                  {hub.weightSparkline.length > 1 && (
                    <div className="mt-3">
                      <MiniSparkline data={hub.weightSparkline} color="rgb(168 85 247)" goalValue={hub.bodyWeightGoal ?? undefined} />
                    </div>
                  )}
                  <button className="text-[11px] font-mono text-[var(--fg-20)] hover:text-[var(--fg-40)] transition mt-2.5 flex items-center gap-0.5 ml-auto">
                    Details <ChevronRight size={12} />
                  </button>
                </div>

                {/* Intake */}
                <div className="glass-card px-5 py-4 cursor-pointer group hover:bg-[var(--fg-02)] transition" onClick={() => router.push("/progress/intake")}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flame size={13} className="text-[var(--fg-25)]" />
                    <span className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">INTAKE</span>
                  </div>
                  <p className="text-[36px] font-bold font-mono text-[var(--fg-90)] leading-none">
                    {hub.todayCalories.toLocaleString()} <span className="text-[15px] font-normal text-[var(--fg-25)]">kcal</span>
                  </p>
                  <span className="text-[11px] font-mono text-[var(--fg-25)] mt-1.5 block">
                    {hub.todayCalorieTarget - hub.todayCalories > 0
                      ? `${(hub.todayCalorieTarget - hub.todayCalories).toLocaleString()} remaining`
                      : "Target reached"}
                  </span>
                  {/* Macro bar */}
                  <div className="flex gap-0.5 mt-3 h-2.5 rounded-full overflow-hidden bg-[var(--fg-06)]">
                    {hub.todayCalorieTarget > 0 && (
                      <>
                        <div style={{ width: `${(hub.todayProtein * 4 / hub.todayCalorieTarget) * 100}%`, backgroundColor: "rgb(239 68 68)" }} className="rounded-full" />
                        <div style={{ width: `${(hub.todayCarbs * 4 / hub.todayCalorieTarget) * 100}%`, backgroundColor: "rgb(249 115 22)" }} className="rounded-full" />
                        <div style={{ width: `${(hub.todayFat * 9 / hub.todayCalorieTarget) * 100}%`, backgroundColor: "rgb(59 130 246)" }} className="rounded-full" />
                      </>
                    )}
                  </div>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[10px] font-mono text-[var(--fg-30)]">P {hub.todayProtein}g</span>
                    <span className="text-[10px] font-mono text-[var(--fg-30)]">C {hub.todayCarbs}g</span>
                    <span className="text-[10px] font-mono text-[var(--fg-30)]">F {hub.todayFat}g</span>
                  </div>
                  <button className="text-[11px] font-mono text-[var(--fg-20)] hover:text-[var(--fg-40)] transition mt-2.5 flex items-center gap-0.5 ml-auto">
                    Details <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* 7-day Muscle Map */}
            <motion.div variants={staggerItem}>
              <div
                className="glass-card p-5 cursor-pointer group hover:bg-[var(--fg-02)] transition"
                onClick={() => router.push("/recovery")}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={14} className="text-[var(--fg-30)]" />
                  <span className="text-sm font-medium text-[var(--fg-40)]">7-day muscle map</span>
                </div>
                {hub.muscleHeatData.length > 0 ? (
                  <div className="flex items-start gap-5">
                    <div className="w-28 shrink-0">
                      <MuscleHeatMap muscles={hub.muscleHeatData} compact showToggle={false} showLegend={false} height={150} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {hub.muscleSetCounts.slice(0, 6).map((m) => (
                          <div key={m.muscle} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MUSCLE_COLORS[m.muscle] ?? "rgb(var(--accent-rgb))" }} />
                            <span className="text-[12px] text-[var(--fg-45)]">{m.muscle}</span>
                            <span className="text-[12px] font-mono text-[var(--fg-30)]">· {m.sets} sets</span>
                          </div>
                        ))}
                      </div>
                      {hub.undertrainedMuscle && (
                        <div className="flex items-center gap-2 mt-4 text-[11px] text-amber-400/80">
                          <span>⚠</span> {hub.undertrainedMuscle} undertrained this week
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-mono text-[var(--fg-15)] text-center py-8">Train this week to see your muscle map</p>
                )}
                <button className="text-[11px] font-mono text-[var(--fg-20)] hover:text-[var(--fg-40)] transition mt-4 flex items-center gap-0.5 ml-auto">
                  Details <ChevronRight size={12} />
                </button>
              </div>
            </motion.div>

            {/* Cycle card — female only */}
            {userSex === "female" && enabledKeys.includes("cycle") && hub.cyclePhase && hub.cycleDay !== null && (
              <motion.div variants={staggerItem}>
                <div
                  className="glass-card p-5 cursor-pointer group hover:bg-[var(--fg-02)] transition"
                  onClick={() => router.push("/cycle")}
                >
                  <div className="flex items-center gap-5">
                    <div className="relative w-16 h-16 shrink-0">
                      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--fg-04)" strokeWidth="4" />
                        <circle
                          cx="32" cy="32" r="26" fill="none"
                          stroke="rgb(236 72 153)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 26}
                          strokeDashoffset={2 * Math.PI * 26 * (1 - hub.cycleDay / 28)}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-base font-mono font-bold text-[var(--fg-70)]">
                        {hub.cycleDay}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <HeartPulse size={13} style={{ color: "rgb(236 72 153)" }} />
                        <span className="text-[11px] font-mono" style={{ color: "rgb(236 72 153)" }}>Cycle · day {hub.cycleDay}</span>
                      </div>
                      <p className="text-base font-bold font-display text-[var(--fg-80)]">
                        {hub.cyclePhase.charAt(0).toUpperCase() + hub.cyclePhase.slice(1)} phase
                      </p>
                      <p className="text-[11px] text-[var(--fg-35)] mt-1">
                        {getCyclePhaseInfo(hub.cyclePhase)}
                      </p>
                      <p className="text-[11px] text-[var(--fg-30)] mt-1.5 flex items-center gap-1">
                        <Zap size={11} /> {getTrainingRec(hub.cyclePhase)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-[var(--fg-10)] group-hover:text-[var(--fg-30)] transition shrink-0" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Intelligence */}
            <IntelligenceCard hub={hub} router={router} />

            {/* More */}
            <MoreModulesRow enabledKeys={enabledKeys} router={router} />
          </>
        ) : null}
      </motion.div>

      {/* Water toast */}
      {waterToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[var(--fg-80)] text-[var(--bg-primary)] px-4 py-2 rounded-full text-sm font-mono shadow-lg animate-in fade-in slide-in-from-bottom-2">
          +250ml logged
        </div>
      )}
    </main>
  );
}
