"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Activity, Flame, Zap, HeartPulse, Trophy, Award, Bell, ChevronRight, TrendingUp, Target, Play, Calendar, Droplets, AlertCircle, BarChart3, Sparkles, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { computeLevel, getRank, getNextRank } from "../lib/levelSystem";
import { useAuth } from "../lib/AuthProvider";
import { getFullCalorieSummary, ageFromDOB, type CalorieSummary, type GoalType, type ActivityLevel, type DietPreference, type Sex } from "../lib/calorieEngine";
import { estimateObservedTdee, blendTdee } from "../lib/energyEstimator";
import { rematerializeDailyIntake } from "../lib/intakeLog";
import { Plus } from "lucide-react";
import { staggerContainer, staggerItem, fadeInUp } from "../lib/motion";
import { useSex } from "../lib/useSex";
import { useUnits } from "../lib/useUnits";
import { formatWeight, kgToUnit } from "../lib/units";
import { useModules } from "../lib/useModules";
import { MODULE_REGISTRY } from "../lib/modules";
import { detectFatigue, type FatigueAlert } from "../lib/intelligenceEngine";

type TodayPlan = { title: string; is_rest: boolean; count: number; sets: number; completed?: boolean };

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AnimatedPercent({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    setDisplay(0);
    let cancelled = false;
    let raf: number;
    const timeout = setTimeout(() => {
      const duration = 1500;
      const start = performance.now();
      function tick(now: number) {
        if (cancelled) return;
        const t = Math.min((now - start) / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        setDisplay(Math.round(value * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }, 500);
    return () => { cancelled = true; clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [value]);
  return <span className={className}>{display}%</span>;
}

export default function Dashboard() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [time, setTime] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);

  const [stats, setStats] = useState({
    streak: 0, totalWorkouts: 0, weeklyVolume: 0, prCount: 0, totalXp: 0,
    strength: 0, endurance: 0, consistency: 0, discipline: 0,
    bodyWeight: null as number | null, bodyWeightChange: null as number | null,
    recoveryPct: null as number | null,
    fatigue: 0,
    goal: null as string | null,
  });
  const [statsLoaded, setStatsLoaded] = useState(false);

  const levelInfo = computeLevel(stats.totalXp);
  const level = levelInfo.level;
  const rank = getRank(level);
  const nextRank = getNextRank(level);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoaded, setNotifLoaded] = useState(false);
  const [calorieSummary, setCalorieSummary] = useState<CalorieSummary | null>(null);
  const [todayIntake, setTodayIntake] = useState<{ kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null>(null);
  const { sex: userSex } = useSex();
  const weightUnit = useUnits();
  const { isEnabled } = useModules();
  const pillRef = useRef<HTMLDivElement>(null);
  const handlePillTouch = useCallback((e: React.TouchEvent) => {
    const track = pillRef.current?.querySelector(".pill-marquee-track") as HTMLElement | null;
    if (!track) return;
    track.style.animationPlayState = "paused";
    const resume = () => { track.style.animationPlayState = ""; };
    e.currentTarget.addEventListener("touchend", resume, { once: true });
    e.currentTarget.addEventListener("touchcancel", resume, { once: true });
  }, []);

  const [showQuickLog, setShowQuickLog] = useState(false);
  const [qlLabel, setQlLabel] = useState("");
  const [qlKcal, setQlKcal] = useState("");
  const [qlProtein, setQlProtein] = useState("");
  const [qlCarbs, setQlCarbs] = useState("");
  const [qlFat, setQlFat] = useState("");
  const [qlSaving, setQlSaving] = useState(false);

  // Dashboard intelligence cards
  const [insight, setInsight] = useState<string | null>(null);
  const [missedWorkout, setMissedWorkout] = useState<string | null>(null);
  const [weeklyRecap, setWeeklyRecap] = useState<{ workouts: number; volume: number; prs: number; streak: number } | null>(null);
  const [recentPR, setRecentPR] = useState<{ exercise: string; detail: string } | null>(null);
  const [cyclePhase, setCyclePhase] = useState<{ phase: string; day: number; tip: string } | null>(null);
  const [hydrationMl, setHydrationMl] = useState<number | null>(null);
  const [waterGoalMl, setWaterGoalMl] = useState(3000);
  const [habitStats, setHabitStats] = useState<{ completed: number; total: number; habits: { id: string; name: string; icon: string; done: boolean }[] } | null>(null);
  const [pendingHabits, setPendingHabits] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [fatigueAlerts, setFatigueAlerts] = useState<FatigueAlert[]>([]);

  useEffect(() => {
    const updateClock = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    updateClock();
    const id = setInterval(updateClock, 1000);
    setToday(new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" }));
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function checkOnboarding() {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("onboarding_completed_at").eq("id", user.id).maybeSingle();
      if (!data?.onboarding_completed_at) router.push("/onboarding");
    }
    checkOnboarding();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function loadToday() {
      if (!user) return;
      setTodayLoading(true);
      const dateStr = toDateString(new Date());
      const weekday = new Date().getDay();

      const { data: todaySession } = await supabase
        .from("workout_sessions")
        .select("id, total_sets, total_volume, xp_earned")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .eq("sex", userSex)
        .eq("status", "completed")
        .limit(1);

      if (cancelled) return;

      if (todaySession && todaySession.length > 0) {
        setTodayPlan({
          title: "Session Complete",
          is_rest: false,
          count: 0,
          sets: todaySession[0].total_sets || 0,
          completed: true,
        });
        setTodayLoading(false);
        return;
      }

      const { data: plans } = await supabase
        .from("recurring_plans")
        .select("template_id, is_rest, session_type, workout_templates(name)")
        .eq("user_id", user.id)
        .eq("weekday", weekday)
        .eq("sex", userSex);

      if (cancelled) return;

      if (!plans || plans.length === 0) {
        setTodayPlan(null);
        setTodayLoading(false);
        return;
      }

      const gymPlan = plans.find((p: any) => p.session_type === "gym" || (!p.session_type && p.template_id));
      const restOnly = plans.every((p: any) => p.is_rest);

      if (restOnly) {
        setTodayPlan({ title: "Rest / Recovery", is_rest: true, count: 0, sets: 0 });
        setTodayLoading(false);
        return;
      }

      if (gymPlan && gymPlan.template_id) {
        const { data: te } = await supabase
          .from("workout_template_exercises")
          .select("target_sets")
          .eq("template_id", gymPlan.template_id);
        if (cancelled) return;
        const count = te?.length ?? 0;
        const sets = (te ?? []).reduce((s, e: any) => s + (e.target_sets || 0), 0);
        setTodayPlan({ title: (gymPlan as any).workout_templates?.name || "Untitled Workout", is_rest: false, count, sets });
      } else {
        const maPlan = plans.find((p: any) => p.session_type === "ma" && !p.is_rest);
        if (maPlan) {
          setTodayPlan({ title: "Martial Arts Session", is_rest: false, count: 0, sets: 0 });
        } else {
          setTodayPlan(null);
        }
      }
      setTodayLoading(false);
    }
    loadToday();
    return () => { cancelled = true; };
  }, [user, userSex]);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      if (!user) return;
      const { data: c } = await supabase.from("user_stats").select("*").eq("user_id", user.id).eq("sex", userSex).maybeSingle();
      if (cancelled) return;
      if (c) {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        const mondayStr = toDateString(monday);

        const [{ data: wl }, { data: ls }, { data: pd }, { data: weekSess }] = await Promise.all([
          supabase.from("body_weight_logs").select("weight, logged_at").eq("user_id", user.id).eq("sex", userSex).order("logged_at", { ascending: false }).limit(2),
          supabase.from("workout_sessions").select("completed_at").eq("user_id", user.id).eq("status", "completed").eq("sex", userSex).order("completed_at", { ascending: false }).limit(1),
          supabase.from("profile_body_stats").select("goal").eq("user_id", user.id).eq("sex", userSex).maybeSingle(),
          supabase.from("workout_sessions").select("total_volume").eq("user_id", user.id).eq("status", "completed").eq("sex", userSex).gte("date", mondayStr),
        ]);
        let bw: number | null = null, bwc: number | null = null, rp: number | null = null;
        if (wl?.length) { bw = Number(wl[0].weight); if (wl.length > 1) bwc = Number((wl[0].weight - wl[1].weight).toFixed(1)); }
        if (ls?.[0]?.completed_at) rp = Math.min(100, Math.round(((Date.now() - new Date(ls[0].completed_at).getTime()) / 3600000) / 48 * 100));
        const sk = c.current_streak ?? 0;
        const weekVol = (weekSess ?? []).reduce((sum: number, s: any) => sum + (Number(s.total_volume) || 0), 0);
        if (!cancelled) {
          setStats({ streak: sk, totalWorkouts: c.total_workouts ?? 0, weeklyVolume: Math.round(weekVol), prCount: c.achievement_count ?? 0, totalXp: c.total_xp ?? 0, strength: 50, endurance: 0, consistency: Math.min(100, Math.round((sk / 30) * 100)), discipline: 70, bodyWeight: bw, bodyWeightChange: bwc, recoveryPct: rp, fatigue: rp !== null ? Math.max(0, 100 - rp) : 0, goal: pd?.goal ?? null });
          setStatsLoaded(true);
        }
        return;
      }
      const dateStr = toDateString(new Date());

      const { count: totalWorkouts } = await supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("sex", userSex);

      let streak = 0;
      if ((totalWorkouts ?? 0) > 0) {
        const { data: sessions } = await supabase
          .from("workout_sessions")
          .select("date")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .eq("sex", userSex)
          .order("date", { ascending: false })
          .limit(60);

        if (sessions && sessions.length > 0) {
          const completedDates = new Set(sessions.map((s: any) => s.date));
          const { data: plans } = await supabase
            .from("recurring_plans")
            .select("weekday, is_rest")
            .eq("user_id", user.id)
            .eq("sex", userSex);
          const restWeekdays = new Set((plans ?? []).filter((p: any) => p.is_rest).map((p: any) => p.weekday));

          const checkDate = new Date(dateStr + "T00:00:00");
          const todayWeekday = checkDate.getDay();
          if (!completedDates.has(dateStr) && !restWeekdays.has(todayWeekday)) {
            checkDate.setDate(checkDate.getDate() - 1);
          }

          for (let i = 0; i < 60; i++) {
            const d = toDateString(checkDate);
            const wd = checkDate.getDay();
            if (restWeekdays.has(wd)) {
              checkDate.setDate(checkDate.getDate() - 1);
              continue;
            }
            if (completedDates.has(d)) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
        }
      }

      const now = new Date(dateStr + "T00:00:00");
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const mondayStr = toDateString(monday);

      let weeklyVolume = 0;
      const { data: weekSessions } = await supabase
        .from("workout_sessions")
        .select("id, total_volume")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("sex", userSex)
        .gte("date", mondayStr);

      if (weekSessions && weekSessions.length > 0) {
        weeklyVolume = weekSessions.reduce((sum: number, s: any) => sum + (Number(s.total_volume) || 0), 0);
      }

      let prCount = 0;
      const { data: prData } = await supabase
        .from("exercise_leaderboard")
        .select("exercise_id")
        .eq("user_id", user.id)
        .eq("sex", userSex);
      if (prData && prData.length > 0) {
        prCount = prData.length;
      }

      let totalXp = 0;
      const { data: xpData } = await supabase
        .from("workout_sessions")
        .select("xp_earned")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("sex", userSex);
      totalXp = (xpData ?? []).reduce((sum, s: any) => sum + (s.xp_earned || 0), 0);

      let discipline = 0;
      const { data: recentSessions } = await supabase
        .from("workout_sessions")
        .select("total_sets")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("sex", userSex)
        .order("date", { ascending: false })
        .limit(10);
      if (recentSessions && recentSessions.length > 0) {
        const { data: planData } = await supabase
          .from("recurring_plans")
          .select("template_id, is_rest")
          .eq("user_id", user.id)
          .eq("sex", userSex);
        const templateIds = (planData ?? []).filter((p: any) => !p.is_rest && p.template_id).map((p: any) => p.template_id);
        let avgPlannedSets = 20;
        if (templateIds.length > 0) {
          const { data: templateSets } = await supabase
            .from("workout_template_exercises")
            .select("target_sets")
            .in("template_id", templateIds);
          const totalPlanned = (templateSets ?? []).reduce((s, t: any) => s + (t.target_sets || 0), 0);
          avgPlannedSets = Math.max(1, Math.round(totalPlanned / Math.max(1, templateIds.length)));
        }
        const avgCompleted = recentSessions.reduce((s, r: any) => s + (r.total_sets || 0), 0) / recentSessions.length;
        discipline = Math.min(100, Math.round((avgCompleted / avgPlannedSets) * 100));
      }

      const consistency = Math.min(100, Math.round((streak / 30) * 100));

      let strength = 0;
      const lastWeekMonday = new Date(monday);
      lastWeekMonday.setDate(lastWeekMonday.getDate() - 7);
      const lastWeekMondayStr = toDateString(lastWeekMonday);
      const { data: lastWeekSessions } = await supabase
        .from("workout_sessions")
        .select("id, total_volume")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("sex", userSex)
        .gte("date", lastWeekMondayStr)
        .lt("date", mondayStr);
      if (lastWeekSessions && lastWeekSessions.length > 0) {
        const lastWeekVol = lastWeekSessions.reduce((s: number, ses: any) => s + (Number(ses.total_volume) || 0), 0);
        if (lastWeekVol > 0) {
          const progression = ((weeklyVolume - lastWeekVol) / lastWeekVol) * 100;
          strength = Math.min(100, Math.max(0, Math.round(50 + progression * 2)));
        } else {
          strength = weeklyVolume > 0 ? 50 : 0;
        }
      } else {
        strength = weeklyVolume > 0 ? 50 : 0;
      }

      let endurance = 0;
      if (weekSessions && weekSessions.length > 0) {
        const wsIds = weekSessions.map((s: any) => s.id);
        const { data: cardioLogs } = await supabase
          .from("exercise_set_logs")
          .select("duration_seconds, exercises!inner(body_segment)")
          .in("workout_session_id", wsIds)
          .eq("exercises.body_segment", "Cardio");
        const totalCardioMins = (cardioLogs ?? []).reduce((s, l: any) => s + ((l.duration_seconds || 0) / 60), 0);
        endurance = Math.min(100, Math.round(totalCardioMins / 1.5));
      }

      let bodyWeight: number | null = null;
      let bodyWeightChange: number | null = null;
      const { data: weightLogs } = await supabase
        .from("body_weight_logs")
        .select("weight, logged_at")
        .eq("user_id", user.id)
        .eq("sex", userSex)
        .order("logged_at", { ascending: false })
        .limit(2);
      if (weightLogs && weightLogs.length > 0) {
        bodyWeight = weightLogs[0].weight;
        if (weightLogs.length > 1) {
          bodyWeightChange = Number((weightLogs[0].weight - weightLogs[1].weight).toFixed(1));
        }
      }

      let recoveryPct: number | null = null;
      const { data: lastSession } = await supabase
        .from("workout_sessions")
        .select("completed_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("sex", userSex)
        .order("completed_at", { ascending: false })
        .limit(1);
      if (lastSession && lastSession.length > 0 && lastSession[0].completed_at) {
        const hoursSince = (Date.now() - new Date(lastSession[0].completed_at).getTime()) / (1000 * 60 * 60);
        recoveryPct = Math.min(100, Math.round((hoursSince / 48) * 100));
      }

      const fatigue = recoveryPct !== null ? Math.max(0, 100 - recoveryPct) : 0;

      const { data: profileData } = await supabase
        .from("profile_body_stats")
        .select("goal")
        .eq("user_id", user.id)
        .eq("sex", userSex)
        .maybeSingle();

      if (!cancelled) {
        setStats({
          streak, totalWorkouts: totalWorkouts ?? 0, weeklyVolume: Math.round(weeklyVolume), prCount, totalXp,
          strength, endurance, consistency, discipline,
          bodyWeight, bodyWeightChange,
          recoveryPct,
          fatigue,
          goal: profileData?.goal ?? null,
        });
        setStatsLoaded(true);
      }
    }
    loadStats();
    return () => { cancelled = true; };
  }, [user, userSex]);

  useEffect(() => {
    let cancelled = false;
    async function loadCalories() {
      if (!user) return;
      const [{ data: prof }, { data: bodyStats }, { data: goalRows }, { data: trendRows }, { data: allIntake }, { data: bwLogs }] = await Promise.all([
        supabase.from("profiles").select("date_of_birth").eq("id", user.id).maybeSingle(),
        supabase.from("profile_body_stats").select("height_cm, activity_level").eq("user_id", user.id).eq("sex", userSex).maybeSingle(),
        supabase.from("user_goals").select("*").eq("user_id", user.id).eq("sex", userSex).eq("is_active", true).limit(1),
        supabase.from("weight_trend").select("date, ema_kg").eq("user_id", user.id).eq("sex", userSex).order("date", { ascending: true }),
        supabase.from("daily_intake").select("date, kcal").eq("user_id", user.id).eq("sex", userSex).order("date", { ascending: true }),
        supabase.from("body_weight_logs").select("weight").eq("user_id", user.id).eq("sex", userSex).order("logged_at", { ascending: false }).limit(1),
      ]);
      if (cancelled) return;
      if (!bodyStats?.height_cm || !prof?.date_of_birth) return;
      const activeSex = userSex;
      const g = goalRows?.[0] as any;
      const weightKg = (trendRows && trendRows.length > 0)
        ? Number(trendRows[trendRows.length - 1].ema_kg)
        : (bwLogs?.[0] ? Number(bwLogs[0].weight) : null);
      if (!weightKg) return;

      let blendedTdee: number | undefined;
      const baseSummary = getFullCalorieSummary({
        weightKg,
        heightCm: bodyStats.height_cm,
        ageYears: ageFromDOB(prof.date_of_birth),
        sex: activeSex,
        activity: (bodyStats.activity_level as ActivityLevel) ?? "moderate",
        goalType: (g?.goal_type as GoalType) ?? "general_fitness",
        ratePerWeekKg: g?.rate_per_week_kg ?? undefined,
        diet: (g?.diet_preference as DietPreference) ?? "balanced",
        calorieOverride: g?.calorie_target_override ?? undefined,
      });

      if (g?.adaptive_mode && allIntake && trendRows && trendRows.length >= 2) {
        const estimate = estimateObservedTdee({
          dailyIntakes: allIntake.map((r: any) => ({ date: r.date, kcal: Number(r.kcal) })),
          trendWeights: trendRows.map((r: any) => ({ date: r.date, ema_kg: Number(r.ema_kg) })),
          seedTdee: baseSummary.tdee,
          previousEstimate: null,
        });
        if (estimate && estimate.method === "observed") {
          blendedTdee = blendTdee(baseSummary.tdee, estimate);
        }
      }

      const summary = blendedTdee
        ? getFullCalorieSummary({
            weightKg,
            heightCm: bodyStats.height_cm,
            ageYears: ageFromDOB(prof.date_of_birth),
            sex: activeSex,
            activity: (bodyStats.activity_level as ActivityLevel) ?? "moderate",
            goalType: (g?.goal_type as GoalType) ?? "general_fitness",
            ratePerWeekKg: g?.rate_per_week_kg ?? undefined,
            diet: (g?.diet_preference as DietPreference) ?? "balanced",
            calorieOverride: g?.calorie_target_override ?? undefined,
            blendedTdee,
          })
        : baseSummary;
      setCalorieSummary(summary);

      const todayStr = toDateString(new Date());
      const { data: di } = await supabase
        .from("daily_intake")
        .select("kcal, protein_g, carbs_g, fat_g")
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .eq("sex", userSex)
        .limit(1);
      if (cancelled) return;
      if (di && di[0]) {
        setTodayIntake({ kcal: di[0].kcal, protein_g: Number(di[0].protein_g), carbs_g: Number(di[0].carbs_g), fat_g: Number(di[0].fat_g) });
      }
    }
    loadCalories();
    return () => { cancelled = true; };
  }, [user, userSex]);

  useEffect(() => {
    async function loadNotifications() {
      if (!user) return;
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("sex", userSex)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      setNotifications(data ?? []);
      setNotifLoaded(true);
    }
    loadNotifications();
  }, [user, userSex]);

  // Dashboard intelligence: insight, missed workout, weekly recap, PR celebration, cycle phase
  useEffect(() => {
    let cancelled = false;
    async function loadDashboardCards() {
      if (!user) return;
      const dateStr = toDateString(new Date());
      const now = new Date();
      const dayOfWeek = now.getDay();

      // ── Missed workout detection (check yesterday, local time) ──
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yy = yesterday.getFullYear();
      const ym = String(yesterday.getMonth() + 1).padStart(2, "0");
      const yd = String(yesterday.getDate()).padStart(2, "0");
      const yesterdayStr = `${yy}-${ym}-${yd}`;
      const yesterdayWeekday = yesterday.getDay();
      const { data: yesterdayPlan } = await supabase
        .from("recurring_plans")
        .select("is_rest, workout_templates(name)")
        .eq("user_id", user.id)
        .eq("weekday", yesterdayWeekday)
        .eq("sex", userSex)
        .maybeSingle();
      if (cancelled) return;
      if (yesterdayPlan && !yesterdayPlan.is_rest && (yesterdayPlan as any).workout_templates?.name) {
        // Check if session exists for yesterday OR today (covers working out a day late)
        const { count } = await supabase
          .from("workout_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("date", yesterdayStr)
          .eq("sex", userSex)
          .eq("status", "completed");
        if (cancelled) return;
        if ((count ?? 0) === 0) {
          setMissedWorkout((yesterdayPlan as any).workout_templates.name);
        }
      }

      // ── Weekly recap (show on Monday) ──
      if (dayOfWeek === 1) {
        const lastMonday = new Date(now);
        lastMonday.setDate(lastMonday.getDate() - 7);
        const lastMondayStr = toDateString(lastMonday);
        const lastSunday = new Date(now);
        lastSunday.setDate(lastSunday.getDate() - 1);
        const lastSundayStr = toDateString(lastSunday);

        const [{ count: wkWorkouts }, { data: wkSessions }, { data: wkPRs }] = await Promise.all([
          supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed").eq("sex", userSex).gte("date", lastMondayStr).lte("date", lastSundayStr),
          supabase.from("workout_sessions").select("id").eq("user_id", user.id).eq("status", "completed").eq("sex", userSex).gte("date", lastMondayStr).lte("date", lastSundayStr),
          supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "new_pr").eq("sex", userSex).gte("created_at", lastMondayStr + "T00:00:00").lte("created_at", lastSundayStr + "T23:59:59"),
        ]);
        if (cancelled) return;
        let wkVol = 0;
        if (wkSessions && wkSessions.length > 0) {
          const ids = wkSessions.map((s: any) => s.id);
          const { data: logs } = await supabase.from("exercise_set_logs").select("weight, reps").in("workout_session_id", ids);
          wkVol = (logs ?? []).reduce((s, l: any) => s + ((Number(l.weight) || 0) * (Number(l.reps) || 0)), 0);
        }
        if (cancelled) return;
        setWeeklyRecap({ workouts: wkWorkouts ?? 0, volume: Math.round(wkVol), prs: (wkPRs as any)?.length ?? (wkPRs as any) ?? 0, streak: stats.streak });
      }

      // ── PR celebration (last 24 hours) ──
      const yesterday24h = new Date(Date.now() - 86400000).toISOString();
      const { data: prNotifs } = await supabase
        .from("notifications")
        .select("message, created_at")
        .eq("user_id", user.id)
        .eq("type", "new_pr")
        .eq("sex", userSex)
        .gte("created_at", yesterday24h)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (prNotifs && prNotifs.length > 0) {
        const msg = prNotifs[0].message ?? "";
        const match = msg.match(/New PR.*?on (.+?)!/i) || msg.match(/(.+)/);
        setRecentPR({ exercise: match?.[1] ?? "Exercise", detail: msg });
      }

      // ── Cycle phase (female only) ──
      if (userSex === "female") {
        const { data: cycleLog } = await supabase
          .from("cycle_logs")
          .select("period_start")
          .eq("user_id", user.id)
          .order("period_start", { ascending: false })
          .limit(1);
        if (cancelled) return;
        if (cycleLog && cycleLog.length > 0) {
          const start = new Date(cycleLog[0].period_start);
          const daysSince = Math.floor((Date.now() - start.getTime()) / 86400000);
          const cycleDay = (daysSince % 28) + 1;
          let phase: string, tip: string;
          if (cycleDay <= 5) { phase = "Menstrual"; tip = "Lighter sessions, focus on mobility"; }
          else if (cycleDay <= 13) { phase = "Follicular"; tip = "Great window for intensity & PRs"; }
          else if (cycleDay <= 16) { phase = "Ovulatory"; tip = "Peak strength — push hard today"; }
          else { phase = "Luteal"; tip = "Steady effort, extra recovery needed"; }
          setCyclePhase({ phase, day: cycleDay, tip });
        }
      }

      // ── Contextual insight (pick the most interesting) ──
      if (cancelled) return;
      const insights: string[] = [];
      if (stats.streak >= 7) insights.push(`${stats.streak}-day streak — keep the momentum going`);
      else if (stats.streak >= 3) insights.push(`${stats.streak}-day streak — building consistency`);
      if (stats.totalWorkouts > 0 && stats.totalWorkouts % 50 === 0) insights.push(`${stats.totalWorkouts} workouts completed — milestone!`);
      if (stats.prCount > 0) insights.push(`${stats.prCount} personal records set so far`);
      if (stats.recoveryPct !== null && stats.recoveryPct >= 95) insights.push("Fully recovered — optimal training window");
      else if (stats.recoveryPct !== null && stats.recoveryPct < 40) insights.push("Recovery low — consider a lighter session");
      if (stats.weeklyVolume > 0) insights.push(`${Math.round(kgToUnit(stats.weeklyVolume, weightUnit)).toLocaleString()} ${weightUnit} volume this week`);
      if (insights.length > 0) {
        setInsight(insights[Math.floor(Math.random() * insights.length)]);
      }

      // Hydration card
      if (isEnabled("wellness")) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: waterData } = await supabase.from("water_logs").select("amount_ml")
          .eq("user_id", user.id).gte("logged_at", todayStart.toISOString());
        if (!cancelled) {
          const total = (waterData ?? []).reduce((s: number, r: any) => s + r.amount_ml, 0);
          setHydrationMl(total);
          try {
            const stored = localStorage.getItem("sevel_water_goal_ml");
            if (stored) setWaterGoalMl(Number(stored) || 3000);
          } catch { /* ignore */ }
        }
      }

      // ── Fatigue detection ──
      const fatigueResult = await detectFatigue(supabase, user.id, userSex);
      if (!cancelled) {
        setFatigueAlerts(fatigueResult);
      }

      // Habits card
      if (isEnabled("habits")) {
        const now = new Date();
        const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const [{ data: habitsData }, { data: compData }] = await Promise.all([
          supabase.from("habits").select("id, name, icon, auto_source").eq("user_id", user.id).eq("archived", false),
          supabase.from("habit_completions").select("habit_id").eq("user_id", user.id).eq("completed_date", todayDate),
        ]);
        if (!cancelled && habitsData && habitsData.length > 0) {
          const completedIds = new Set((compData ?? []).map((c: any) => c.habit_id));
          const pending = habitsData.filter((h: any) => !completedIds.has(h.id) && !h.auto_source);
          const allHabits = habitsData.map((h: any) => ({ id: h.id, name: h.name, icon: h.icon, done: completedIds.has(h.id) }));
          setHabitStats({ completed: allHabits.filter((h) => h.done).length, total: habitsData.length, habits: allHabits });
          setPendingHabits(pending.slice(0, 3));
        }
      }
    }
    if (statsLoaded) loadDashboardCards();
    return () => { cancelled = true; };
  }, [user, userSex, statsLoaded, stats.streak, stats.totalWorkouts, stats.prCount, stats.recoveryPct, stats.weeklyVolume, weightUnit]);

  function triggerHaptic(style: "light" | "medium" = "light") {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(style === "medium" ? [20] : [10]);
    }
  }

  async function quickCompleteHabit(habitId: string) {
    if (!user) return;
    triggerHaptic("medium");
    const now = new Date();
    const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    await supabase.from("habit_completions").insert({ habit_id: habitId, user_id: user.id, completed_date: todayDate });
    setPendingHabits((prev) => prev.filter((h) => h.id !== habitId));
    setHabitStats((prev) => prev ? {
      ...prev,
      completed: prev.completed + 1,
      habits: prev.habits.map((h) => h.id === habitId ? { ...h, done: true } : h),
    } : prev);
  }

  async function dismissNotification(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function handleQuickLog() {
    if (!user || !qlKcal) return;
    setQlSaving(true);
    const dateStr = toDateString(new Date());
    await supabase.from("food_entries").insert({
      user_id: user.id,
      date: dateStr,
      meal_slot: "snack",
      label: qlLabel.trim() || null,
      kcal: Number(qlKcal),
      protein_g: Number(qlProtein) || 0,
      carbs_g: Number(qlCarbs) || 0,
      fat_g: Number(qlFat) || 0,
      sex: userSex,
    });
    await rematerializeDailyIntake(user.id, dateStr, userSex);
    const { data: di } = await supabase.from("daily_intake").select("kcal, protein_g, carbs_g, fat_g").eq("user_id", user.id).eq("date", dateStr).eq("sex", userSex).limit(1);
    if (di?.[0]) setTodayIntake({ kcal: di[0].kcal, protein_g: Number(di[0].protein_g), carbs_g: Number(di[0].carbs_g), fat_g: Number(di[0].fat_g) });
    setQlLabel(""); setQlKcal(""); setQlProtein(""); setQlCarbs(""); setQlFat("");
    setShowQuickLog(false);
    setQlSaving(false);
  }

  function handleTodayAction() {
    if (todayPlan?.completed) {
      router.push("/track");
    } else if (!todayPlan || todayPlan.is_rest || todayPlan.count === 0) {
      router.push("/schedule");
    } else {
      router.push("/schedule");
    }
  }

  const estMinutes = todayPlan ? todayPlan.sets * 3 : 0;
  const xpProgress = levelInfo.isMaxLevel ? 100 : Math.round(levelInfo.progress * 100);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const nudge = todayPlan?.completed
    ? "Nice work today"
    : todayPlan && !todayPlan.is_rest && todayPlan.count > 0
      ? "Session planned for today"
      : todayPlan?.is_rest
        ? "Rest day — recover well"
        : "No plan set for today";

  // Smart card ordering — lower order = higher on page
  const cardOrder = useMemo(() => {
    let prOrder = 10, missedOrder = 11, cycleOrder = 12, recapOrder = 13, insightOrder = 14;
    let fatigueOrder = 15, volumeOrder = 16;
    let workoutOrder = 20, levelOrder = 30, statsOrder = 40, attrOrder = 50;
    let recoveryBodyOrder = 60, energyOrder = 70, hydrationOrder = 75, habitsOrder = 76;

    // PR celebration always floats to top when present
    if (recentPR) prOrder = 1;
    // Missed workout is urgent
    if (missedWorkout) missedOrder = 2;
    // If recovery is low and today is a training day, push recovery card up
    if (stats.recoveryPct !== null && stats.recoveryPct < 50 && todayPlan && !todayPlan.is_rest && !todayPlan.completed) {
      recoveryBodyOrder = 3;
    }
    // Cycle phase is useful context before workout
    if (cyclePhase) cycleOrder = 5;
    // If haven't worked out today and plan exists, workout card is top priority
    if (todayPlan && !todayPlan.completed && !todayPlan.is_rest && todayPlan.count > 0) {
      workoutOrder = 6;
    }
    // If past noon and nutrition enabled but no food logged, push energy up
    if (hour >= 12 && isEnabled("nutrition") && calorieSummary && !todayIntake) {
      energyOrder = 7;
    }
    // Fatigue alerts are high priority — above workout card
    if (fatigueAlerts.length > 0) {
      fatigueOrder = fatigueAlerts.some(a => a.severity === "critical") ? 1.5 : 4;
    }
    return { prOrder, missedOrder, cycleOrder, recapOrder, insightOrder, fatigueOrder, volumeOrder, workoutOrder, levelOrder, statsOrder, attrOrder, recoveryBodyOrder, energyOrder, hydrationOrder, habitsOrder };
  }, [recentPR, missedWorkout, stats.recoveryPct, todayPlan, cyclePhase, hour, isEnabled, calorieSummary, todayIntake, fatigueAlerts]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">
      <motion.div
        className="relative z-10 max-w-xl mx-auto px-4 pt-6 flex flex-col gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >

        {/* ─── Header ─── */}
        <motion.div variants={staggerItem} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-display text-[rgb(var(--accent-light-rgb))]">
              {profile?.username ? `${greeting}, ${profile.username}` : greeting}
            </h1>
            <p className="text-[11px] font-mono text-[var(--fg-30)] mt-0.5">{today ?? "..."} {time ? `· ${time}` : ""} · {nudge}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/notifications")}
              className="relative w-9 h-9 rounded-xl bg-[var(--fg-04)] border border-[var(--fg-06)] flex items-center justify-center text-[var(--fg-40)] hover:text-[var(--fg-70)] transition"
            >
              <Bell size={16} />
              {notifLoaded && notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[rgb(var(--accent-rgb))] text-black text-[8px] font-bold flex items-center justify-center">{notifications.length}</span>
              )}
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="w-9 h-9 rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] border border-[rgb(var(--accent-rgb)/0.2)] flex items-center justify-center text-[rgb(var(--accent-rgb))] font-bold text-sm overflow-hidden shrink-0"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (profile?.username?.[0] ?? "?").toUpperCase()
              )}
            </button>
          </div>
        </motion.div>

        {/* ─── At-a-Glance Strip (auto-scroll marquee) ─── */}
        {statsLoaded && (() => {
          const pills = [
            isEnabled("xp") && { label: `Lv.${level}`, sub: rank.name, color: "rgb(var(--accent-rgb))" },
            { label: `${stats.streak}`, sub: "streak", color: "rgb(251,146,60)" },
            isEnabled("recovery") && stats.recoveryPct !== null && { label: `${stats.recoveryPct}%`, sub: "recovery", color: stats.recoveryPct >= 80 ? "rgb(52,211,153)" : stats.recoveryPct >= 50 ? "rgb(251,146,60)" : "rgb(239,68,68)" },
            isEnabled("nutrition") && calorieSummary && { label: `${Math.max(0, calorieSummary.calorieTarget - (todayIntake?.kcal ?? 0))}`, sub: "kcal left", color: "rgb(245,158,11)" },
            isEnabled("progress") && stats.bodyWeight !== null && { label: `${formatWeight(stats.bodyWeight, weightUnit, 1)}`, sub: weightUnit, color: "rgb(139,92,246)" },
          ].filter(Boolean) as { label: string; sub: string; color: string }[];
          const renderPill = (pill: { label: string; sub: string; color: string }, i: number) => (
            <div key={`${pill.sub}-${i}`} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--fg-08)] bg-[var(--fg-03)]">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pill.color }} />
              <span className="text-xs font-bold font-mono text-[var(--fg-80)]">{pill.label}</span>
              <span className="text-[9px] font-mono text-[var(--fg-25)]">{pill.sub}</span>
            </div>
          );
          return (
            <motion.div variants={staggerItem} ref={pillRef} onTouchStart={handlePillTouch} className="pill-marquee-wrap overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
              <div className="pill-marquee-track flex gap-2 w-max">
                {pills.map((p, i) => renderPill(p, i))}
                {pills.map((p, i) => renderPill(p, i + pills.length))}
              </div>
            </motion.div>
          );
        })()}

        {/* ─── PR Celebration ─── */}
        {recentPR && (
          <motion.div variants={staggerItem} className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-4" style={{ order: cardOrder.prOrder, boxShadow: "0 0 25px -5px rgba(250,204,21,0.15)" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/15 border border-yellow-400/25 flex items-center justify-center">
                <Trophy size={18} className="text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-mono tracking-widest text-yellow-400/60 mb-0.5">NEW PERSONAL RECORD</p>
                <p className="text-sm font-semibold text-yellow-300/90 truncate">{recentPR.exercise}</p>
              </div>
              <button onClick={() => router.push("/track")} className="shrink-0 px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-[10px] font-mono text-yellow-400/80 hover:text-yellow-300 transition">
                View
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Missed Workout ─── */}
        {missedWorkout && (
          <motion.div variants={staggerItem} className="rounded-2xl border border-orange-400/15 bg-orange-400/[0.03] p-4" style={{ order: cardOrder.missedOrder }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center">
                <AlertCircle size={18} className="text-orange-400/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--fg-70)]">Yesterday was <span className="text-orange-300">{missedWorkout}</span></p>
                <p className="text-[10px] font-mono text-[var(--fg-25)] mt-0.5">Missed session — reschedule or skip?</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setMissedWorkout(null)} className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-[var(--fg-25)] hover:text-[var(--fg-50)] transition">
                  Skip
                </button>
                <button onClick={() => router.push("/schedule")} className="px-3 py-1.5 rounded-lg bg-orange-400/15 border border-orange-400/20 text-[10px] font-mono text-orange-300 hover:bg-orange-400/25 transition">
                  Schedule
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Fatigue Alert ─── */}
        {fatigueAlerts.length > 0 && (
          <motion.div variants={staggerItem} className={`rounded-2xl border p-4 ${
            fatigueAlerts.some(a => a.severity === "critical")
              ? "border-red-400/20 bg-red-400/[0.04]"
              : "border-amber-400/20 bg-amber-400/[0.04]"
          }`} style={{ order: cardOrder.fatigueOrder, boxShadow: fatigueAlerts.some(a => a.severity === "critical") ? "0 0 25px -5px rgba(248,113,113,0.15)" : undefined }}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                fatigueAlerts.some(a => a.severity === "critical")
                  ? "bg-red-400/15 border border-red-400/25"
                  : "bg-amber-400/15 border border-amber-400/25"
              }`}>
                <ShieldAlert size={18} className={fatigueAlerts.some(a => a.severity === "critical") ? "text-red-400" : "text-amber-400"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[9px] font-mono tracking-widest mb-0.5 ${
                  fatigueAlerts.some(a => a.severity === "critical") ? "text-red-400/60" : "text-amber-400/60"
                }`}>FATIGUE DETECTED</p>
                <p className={`text-sm font-semibold ${
                  fatigueAlerts.some(a => a.severity === "critical") ? "text-red-300/90" : "text-amber-300/90"
                }`}>{fatigueAlerts[0].message}</p>
                <p className="text-[10px] font-mono text-[var(--fg-30)] mt-0.5">{fatigueAlerts[0].detail}</p>
              </div>
            </div>
            {fatigueAlerts.length > 1 && (
              <div className="mt-2 pt-2 border-t border-[var(--fg-06)] space-y-1">
                {fatigueAlerts.slice(1).map((a, i) => (
                  <p key={i} className="text-[10px] font-mono text-[var(--fg-35)]">• {a.message}: {a.detail}</p>
                ))}
              </div>
            )}
          </motion.div>
        )}


        {/* ─── Cycle Phase (female) ─── */}
        {isEnabled("cycle") && cyclePhase && (
          <motion.div variants={staggerItem} className="rounded-2xl border border-pink-400/15 bg-pink-400/[0.03] p-4" style={{ order: cardOrder.cycleOrder }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-400/10 border border-pink-400/20 flex items-center justify-center">
                <Droplets size={18} className="text-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-pink-300/90">{cyclePhase.phase} Phase</p>
                  <span className="text-[9px] font-mono text-pink-400/40">Day {cyclePhase.day}</span>
                </div>
                <p className="text-[10px] font-mono text-[var(--fg-30)] mt-0.5">{cyclePhase.tip}</p>
              </div>
              <button onClick={() => router.push("/cycle")} className="shrink-0 px-3 py-1.5 rounded-lg bg-pink-400/10 border border-pink-400/20 text-[10px] font-mono text-pink-400/60 hover:text-pink-300 transition">
                Log
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── Weekly Recap (Monday) ─── */}
        {weeklyRecap && (
          <motion.div variants={staggerItem} className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.15)] bg-[var(--fg-03)] p-4" style={{ order: cardOrder.recapOrder, boxShadow: "0 0 20px -5px rgb(var(--accent-rgb) / 0.1)" }}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-[rgb(var(--accent-rgb))]" />
              <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.4)]">LAST WEEK</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-xl font-bold font-mono text-[var(--fg-90)]">{weeklyRecap.workouts}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">WORKOUTS</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold font-mono text-[var(--fg-90)]">{Math.round(kgToUnit(weeklyRecap.volume, weightUnit)).toLocaleString()}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">VOL ({weightUnit})</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold font-mono text-yellow-400/90">{weeklyRecap.prs}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">PRs</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold font-mono text-orange-400/90">{weeklyRecap.streak}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">STREAK</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Contextual Insight ─── */}
        {insight && (
          <motion.div variants={staggerItem} className="rounded-xl border border-[rgb(var(--accent-rgb)/0.1)] bg-[rgb(var(--accent-rgb)/0.03)] px-4 py-3 flex items-center gap-3" style={{ order: cardOrder.insightOrder }}>
            <Sparkles size={14} className="text-[rgb(var(--accent-rgb))] shrink-0" />
            <p className="text-[11px] font-mono text-[var(--fg-50)]">{insight}</p>
          </motion.div>
        )}

        {/* ─── Hydration Card ─── */}
        {hydrationMl !== null && isEnabled("wellness") && (
          <motion.div
            variants={staggerItem}
            className="rounded-xl border border-blue-400/10 bg-blue-400/[0.03] px-4 py-3 flex items-center gap-3 cursor-pointer"
            style={{ order: cardOrder.hydrationOrder }}
            onClick={() => router.push("/wellness")}
          >
            <Droplets size={16} className="text-blue-400/70 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-mono text-[var(--fg-50)]">
                  {(hydrationMl / 1000).toFixed(1)}L / {(waterGoalMl / 1000).toFixed(0)}L
                </p>
                <span className="text-[9px] font-mono text-[var(--fg-25)]">{Math.min(100, Math.round((hydrationMl / waterGoalMl) * 100))}%</span>
              </div>
              <div className="h-1 rounded-full bg-[var(--fg-04)] overflow-hidden mt-1">
                <div className="h-full rounded-full bg-blue-400/40" style={{ width: `${Math.min(100, (hydrationMl / waterGoalMl) * 100)}%` }} />
              </div>
            </div>
            <ChevronRight size={12} className="text-[var(--fg-15)] shrink-0" />
          </motion.div>
        )}

        {/* ─── Habits Card with Segment Ring ─── */}
        {habitStats && isEnabled("habits") && (() => {
          const HABIT_RING_COLORS = [
            { from: "#ef4444", to: "#f87171" },
            { from: "#10b981", to: "#34d399" },
            { from: "#3b82f6", to: "#60a5fa" },
            { from: "#f59e0b", to: "#fbbf24" },
            { from: "#a855f7", to: "#c084fc" },
            { from: "#ec4899", to: "#f472b6" },
            { from: "#06b6d4", to: "#22d3ee" },
            { from: "#f97316", to: "#fb923c" },
          ];
          const pct = habitStats.total > 0 ? Math.round((habitStats.completed / habitStats.total) * 100) : 0;
          const svgSize = 100;
          const ctr = svgSize / 2;
          const sw = 8;
          const r = (svgSize / 2) - (sw / 2) - 1;
          const n = habitStats.habits.length;
          const gapDeg = n <= 3 ? 8 : n <= 6 ? 6 : 4;
          const segDeg = (360 - gapDeg * n) / n;
          function hubArc(sDeg: number, eDeg: number) {
            const s2 = (sDeg - 90) * Math.PI / 180;
            const e2 = (eDeg - 90) * Math.PI / 180;
            const x1 = ctr + r * Math.cos(s2), y1 = ctr + r * Math.sin(s2);
            const x2 = ctr + r * Math.cos(e2), y2 = ctr + r * Math.sin(e2);
            return `M ${x1} ${y1} A ${r} ${r} 0 ${(eDeg - sDeg) > 180 ? 1 : 0} 1 ${x2} ${y2}`;
          }

          return (
            <motion.div
              variants={staggerItem}
              className="rounded-2xl border border-rose-400/10 overflow-hidden cursor-pointer"
              style={{ order: cardOrder.habitsOrder, background: "linear-gradient(135deg, rgb(244 63 94 / 0.04), rgb(168 85 247 / 0.02))" }}
              onClick={() => router.push("/habits")}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flame size={14} className="text-rose-400/60" />
                    <p className="text-[9px] font-mono tracking-widest text-rose-300/40">DAILY HABITS</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-[var(--fg-30)]">
                      {habitStats.completed === habitStats.total && habitStats.total > 0 ? "Perfect Day!" : `${pct}%`}
                    </span>
                    <ChevronRight size={12} className="text-[var(--fg-15)]" />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Mini segment ring */}
                  <div className="relative shrink-0" style={{ width: svgSize, height: svgSize }}>
                    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
                      <defs>
                        {habitStats.habits.map((_, i) => {
                          const c = HABIT_RING_COLORS[i % HABIT_RING_COLORS.length];
                          return (
                            <linearGradient key={`hsg-${i}`} id={`hsg-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={c.from} />
                              <stop offset="100%" stopColor={c.to} />
                            </linearGradient>
                          );
                        })}
                        <filter id="hub-glow">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                      </defs>
                      {habitStats.habits.map((h, i) => {
                        const startDeg = i * (segDeg + gapDeg);
                        const endDeg = startDeg + segDeg;
                        const d = hubArc(startDeg, endDeg);
                        const c = HABIT_RING_COLORS[i % HABIT_RING_COLORS.length];
                        return (
                          <g key={h.id}>
                            <path d={d} fill="none" stroke={`${c.from}20`} strokeWidth={sw} strokeLinecap="round" />
                            {h.done && (
                              <>
                                <motion.path d={d} fill="none" stroke={`${c.from}40`} strokeWidth={sw + 4} strokeLinecap="round"
                                  filter="url(#hub-glow)" pathLength={1}
                                  initial={{ pathLength: 0, opacity: 0 }}
                                  animate={{ pathLength: 1, opacity: 0.6 }}
                                  transition={{ duration: 0.6, delay: 0.15 + i * 0.08, ease: [0.34, 1.56, 0.64, 1] }} />
                                <motion.path d={d} fill="none" stroke={`url(#hsg-${i})`} strokeWidth={sw} strokeLinecap="round"
                                  pathLength={1}
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.34, 1.56, 0.64, 1] }} />
                              </>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                    {/* Center percentage */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}>
                        <AnimatedPercent value={pct} className="text-lg font-bold font-mono text-[var(--fg-70)]" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Habit list with colored dots */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {habitStats.habits.slice(0, 4).map((h, i) => {
                      const c = HABIT_RING_COLORS[i % HABIT_RING_COLORS.length];
                      return (
                        <div key={h.id} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                            background: h.done ? c.from : `${c.from}33`,
                            boxShadow: h.done ? `0 0 4px ${c.from}` : "none",
                          }} />
                          <span className={`text-[10px] font-mono truncate ${h.done ? "text-[var(--fg-50)] line-through" : "text-[var(--fg-35)]"}`}>
                            {h.icon} {h.name}
                          </span>
                          {h.done && <span className="text-[8px] text-emerald-400/50 ml-auto shrink-0">✓</span>}
                        </div>
                      );
                    })}
                    {habitStats.habits.length > 4 && (
                      <p className="text-[9px] font-mono text-[var(--fg-15)]">+{habitStats.habits.length - 4} more</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick complete strip */}
              {pendingHabits.length > 0 && (
                <div className="border-t border-[var(--fg-04)] px-4 py-2 flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {pendingHabits.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => quickCompleteHabit(h.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--fg-06)] bg-[var(--fg-02)] hover:bg-[var(--fg-06)] text-[10px] font-mono text-[var(--fg-40)] hover:text-[var(--fg-60)] transition active:scale-95"
                    >
                      <span>{h.icon}</span> {h.name}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* ─── Today's Workout Card ─── */}
        <motion.div variants={staggerItem} className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.15)] bg-[var(--fg-03)] overflow-hidden" style={{ order: cardOrder.workoutOrder, boxShadow: "0 0 20px -5px rgb(var(--accent-rgb) / 0.1), inset 0 1px 0 rgb(var(--accent-rgb) / 0.05)" }}>
          <div className="p-4">
            <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.4)] mb-2">TODAY&apos;S WORKOUT</p>

            {todayLoading ? (
              <div className="animate-pulse space-y-2 py-2">
                <div className="h-5 w-40 rounded bg-[var(--fg-06)]" />
                <div className="h-3 w-28 rounded bg-[var(--fg-04)]" />
              </div>
            ) : !todayPlan ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[var(--fg-80)]">No Workout Planned</p>
                  <p className="text-[11px] text-[var(--fg-30)] mt-0.5">Set up your schedule to get started</p>
                </div>
                <button onClick={() => router.push("/schedule")} className="shrink-0 px-4 py-2 rounded-xl bg-[var(--fg-06)] border border-[var(--fg-08)] text-xs font-medium text-[var(--fg-60)] hover:text-[var(--fg-90)] hover:bg-[var(--fg-10)] transition">
                  Schedule
                </button>
              </div>
            ) : todayPlan.completed ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Trophy size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-emerald-400">Session Complete</p>
                    <p className="text-[11px] font-mono text-[var(--fg-30)] mt-0.5">{todayPlan.sets} sets completed</p>
                  </div>
                </div>
                <button onClick={() => router.push("/track")} className="shrink-0 px-4 py-2 rounded-xl bg-[var(--fg-06)] border border-[var(--fg-08)] text-xs font-medium text-[var(--fg-60)] hover:text-[var(--fg-90)] hover:bg-[var(--fg-10)] transition flex items-center gap-1.5">
                  Progress <ChevronRight size={12} />
                </button>
              </div>
            ) : todayPlan.is_rest ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <HeartPulse size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[var(--fg-80)]">Rest Day</p>
                  <p className="text-[11px] text-[var(--fg-30)] mt-0.5">Recovery is part of the plan</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] border border-[rgb(var(--accent-rgb)/0.2)] flex items-center justify-center">
                    <Dumbbell size={18} className="text-[rgb(var(--accent-rgb))]" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[var(--fg-80)]">{todayPlan.title}</p>
                    <p className="text-[11px] font-mono text-[var(--fg-30)] mt-0.5">
                      {todayPlan.count} exercise{todayPlan.count !== 1 ? "s" : ""} · {todayPlan.sets} sets · ~{estMinutes} min
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/schedule")}
                  className="shrink-0 w-10 h-10 rounded-xl bg-[rgb(var(--accent-rgb))] flex items-center justify-center text-black hover:brightness-110 transition"
                >
                  <Play size={18} fill="black" />
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* ─── Level & Rank ─── */}
        <motion.div variants={staggerItem} className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.15)] bg-[var(--fg-03)] p-4" style={{ order: cardOrder.levelOrder, boxShadow: "0 0 20px -5px rgb(var(--accent-rgb) / 0.1), inset 0 1px 0 rgb(var(--accent-rgb) / 0.05)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] border border-[rgb(var(--accent-rgb)/0.2)] flex items-center justify-center">
                <span className="text-lg font-bold text-[rgb(var(--accent-rgb))]">{statsLoaded ? level : "—"}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--fg-80)]">Level {statsLoaded ? level : "—"}</p>
                <p className="text-[10px] font-mono text-[var(--fg-30)] mt-0.5">
                  <span className={rank.color}>{rank.name}</span>
                  {nextRank && <span className="text-[var(--fg-15)]"> · Next: {nextRank.name} at Lv.{nextRank.minLevel}</span>}
                </p>
              </div>
            </div>
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9px] font-mono tracking-wider ${rank.color}`}
              style={{ borderColor: `${rank.glow?.replace("0.6", "0.3") ?? "var(--fg-10)"}`, backgroundColor: `${rank.glow?.replace("0.6", "0.06") ?? "var(--fg-03)"}` }}
            >
              <Award size={10} />
              {rank.name}
            </span>
          </div>

          {/* XP Bar */}
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-[rgb(var(--accent-rgb))] shrink-0" />
            <div className="flex-1 h-2 bg-[var(--fg-06)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${xpProgress}%`, background: `linear-gradient(90deg, rgb(var(--accent-rgb) / 0.7), rgb(var(--accent-rgb)))` }} />
            </div>
            <span className="text-[9px] font-mono text-[var(--fg-25)] shrink-0 min-w-[48px] text-right">
              {levelInfo.isMaxLevel ? "MAX" : `${levelInfo.xpIntoCurrentLevel}/${levelInfo.xpNeededForNext}`}
            </span>
          </div>

          {stats.goal && (
            <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-[var(--fg-04)]">
              <Target size={12} className="text-[var(--fg-20)]" />
              <span className="text-[10px] font-mono text-[var(--fg-30)]">Goal: <span className="text-[var(--fg-50)]">{stats.goal}</span></span>
            </div>
          )}
        </motion.div>

        {/* ─── Quick Stats Grid ─── */}
        <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2.5" style={{ order: cardOrder.statsOrder }}>
          {[
            { icon: <Flame size={16} />, label: "STREAK", value: statsLoaded ? `${stats.streak}` : "—", sub: "days", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
            { icon: <Activity size={16} />, label: "WORKOUTS", value: statsLoaded ? `${stats.totalWorkouts}` : "—", sub: "completed", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
            { icon: <TrendingUp size={16} />, label: "WEEKLY VOL", value: statsLoaded ? `${Math.round(kgToUnit(stats.weeklyVolume, weightUnit)).toLocaleString()}` : "—", sub: weightUnit, color: "text-[rgb(var(--accent-rgb))]", bg: "bg-[rgb(var(--accent-rgb)/0.1)]", border: "border-[rgb(var(--accent-rgb)/0.2)]" },
            { icon: <Trophy size={16} />, label: "PRs", value: statsLoaded ? `${stats.prCount}` : "—", sub: "exercises", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[rgb(var(--accent-rgb)/0.12)] bg-[var(--fg-03)] p-3" style={{ boxShadow: "0 0 15px -5px rgb(var(--accent-rgb) / 0.08)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className={`w-7 h-7 rounded-lg ${stat.bg} ${stat.border} border flex items-center justify-center ${stat.color}`}>{stat.icon}</span>
                <p className="text-[8px] font-mono tracking-wider text-[var(--fg-20)]">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-[var(--fg-90)] font-mono">{stat.value}</p>
              <p className="text-[9px] font-mono text-[var(--fg-20)] mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* ─── Attribute Rings ─── */}
        <motion.div variants={staggerItem} className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.15)] bg-[var(--fg-03)] p-4" style={{ order: cardOrder.attrOrder, boxShadow: "0 0 20px -5px rgb(var(--accent-rgb) / 0.1), inset 0 1px 0 rgb(var(--accent-rgb) / 0.05)" }}>
          <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.4)] mb-3">ATTRIBUTES</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "STR", value: stats.strength, color: "rgb(var(--accent-rgb))" },
              { label: "END", value: stats.endurance, color: "rgb(52,211,153)" },
              { label: "CON", value: stats.consistency, color: "rgb(251,146,60)" },
              { label: "DIS", value: stats.discipline, color: "rgb(168,85,247)" },
            ].map((attr) => (
              <div key={attr.label} className="flex flex-col items-center">
                <div className="relative w-14 h-14 mb-1.5">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="var(--fg-04)" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke={attr.color} strokeWidth="2.5" strokeDasharray={`${attr.value * 0.94} 94`} strokeLinecap="round" opacity="0.7" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-mono font-bold text-[var(--fg-70)]">{attr.value}</span>
                </div>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">{attr.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── Recovery & Body ─── */}
        <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2.5" style={{ order: cardOrder.recoveryBodyOrder }}>
          {isEnabled("recovery") && (
            <div className="rounded-xl border bg-[var(--fg-03)] p-3" style={{ borderColor: `rgb(${MODULE_REGISTRY.recovery.colorRgb} / 0.15)`, boxShadow: `0 0 15px -5px rgb(${MODULE_REGISTRY.recovery.colorRgb} / 0.1)` }}>
              <div className="flex items-center gap-1.5 mb-2">
                <HeartPulse size={12} style={{ color: `rgb(${MODULE_REGISTRY.recovery.colorRgb})` }} />
                <p className="text-[8px] font-mono tracking-wider text-[var(--fg-25)]">RECOVERY</p>
              </div>
              <p className="text-2xl font-bold font-mono text-[var(--fg-90)]">{stats.recoveryPct ?? "—"}<span className="text-xs text-[var(--fg-25)]">%</span></p>
              <p className="text-[9px] font-mono text-[var(--fg-20)] mt-0.5">
                {stats.recoveryPct !== null
                  ? stats.recoveryPct >= 80 ? "Ready to train" : stats.recoveryPct >= 50 ? "Partially recovered" : "Rest suggested"
                  : "No data"}
              </p>
            </div>
          )}
          {isEnabled("progress") && (
            <div className="rounded-xl border bg-[var(--fg-03)] p-3" style={{ borderColor: `rgb(${MODULE_REGISTRY.progress.colorRgb} / 0.15)`, boxShadow: `0 0 15px -5px rgb(${MODULE_REGISTRY.progress.colorRgb} / 0.1)` }}>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={12} style={{ color: `rgb(${MODULE_REGISTRY.progress.colorRgb})` }} />
                <p className="text-[8px] font-mono tracking-wider text-[var(--fg-25)]">BODY WEIGHT</p>
              </div>
              <p className="text-2xl font-bold font-mono text-[var(--fg-90)]">
                {stats.bodyWeight !== null ? formatWeight(stats.bodyWeight, weightUnit, 1) : "—"}<span className="text-xs text-[var(--fg-25)]"> {weightUnit}</span>
              </p>
              {stats.bodyWeightChange !== null ? (
                <p className={`text-[9px] font-mono mt-0.5 ${stats.bodyWeightChange > 0 ? "text-orange-300/60" : stats.bodyWeightChange < 0 ? "text-emerald-300/60" : "text-[var(--fg-20)]"}`}>
                  {stats.bodyWeightChange === 0 ? "No change" : `${stats.bodyWeightChange > 0 ? "+" : "−"}${formatWeight(Math.abs(stats.bodyWeightChange), weightUnit, 1)} ${weightUnit} from previous`}
                </p>
              ) : (
                <p className="text-[9px] font-mono text-[var(--fg-20)] mt-0.5">No trend data</p>
              )}
            </div>
          )}
        </motion.div>

        {/* ─── Energy Dashboard ─── */}
        {isEnabled("nutrition") && calorieSummary && (() => {
          const eaten = todayIntake?.kcal ?? 0;
          const target = calorieSummary.calorieTarget;
          const remaining = target - eaten;
          const pct = Math.min((eaten / target) * 100, 100);
          const over = eaten > target;
          return (
            <motion.div variants={staggerItem} className="rounded-2xl border bg-[var(--fg-03)] p-4" style={{ order: cardOrder.energyOrder, borderColor: `rgb(${MODULE_REGISTRY.nutrition.colorRgb} / 0.15)`, boxShadow: `0 0 20px -5px rgb(${MODULE_REGISTRY.nutrition.colorRgb} / 0.1), inset 0 1px 0 rgb(${MODULE_REGISTRY.nutrition.colorRgb} / 0.05)` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame size={14} style={{ color: `rgb(${MODULE_REGISTRY.nutrition.colorRgb})` }} />
                  <p className="text-[9px] font-mono tracking-widest" style={{ color: `rgb(${MODULE_REGISTRY.nutrition.colorRgb} / 0.5)` }}>ENERGY</p>
                </div>
                <button onClick={() => setShowQuickLog(!showQuickLog)} className="flex items-center gap-1 text-[9px] font-mono text-[rgb(var(--accent-rgb)/0.6)] hover:text-[rgb(var(--accent-rgb))] transition">
                  <Plus size={10} /> Log Food
                </button>
              </div>

              {/* Target + remaining */}
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{remaining > 0 ? remaining : 0}</span>
                  <span className="text-xs font-mono text-[var(--fg-25)]">kcal left</span>
                </div>
                <span className="text-[9px] font-mono text-[var(--fg-20)]">{eaten} / {target}</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-[var(--fg-06)] mb-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${over ? "bg-red-400" : "bg-[rgb(var(--accent-rgb))]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Macros: eaten / target */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-[var(--fg-03)] border border-[var(--fg-06)] p-2 text-center">
                  <p className="text-[8px] font-mono text-[var(--fg-25)]">PROTEIN</p>
                  <p className="text-sm font-bold font-mono text-rose-300">{Math.round(todayIntake?.protein_g ?? 0)}<span className="text-[var(--fg-20)]">/{calorieSummary.macros.protein}g</span></p>
                </div>
                <div className="rounded-lg bg-[var(--fg-03)] border border-[var(--fg-06)] p-2 text-center">
                  <p className="text-[8px] font-mono text-[var(--fg-25)]">CARBS</p>
                  <p className="text-sm font-bold font-mono text-amber-300">{Math.round(todayIntake?.carbs_g ?? 0)}<span className="text-[var(--fg-20)]">/{calorieSummary.macros.carbs}g</span></p>
                </div>
                <div className="rounded-lg bg-[var(--fg-03)] border border-[var(--fg-06)] p-2 text-center">
                  <p className="text-[8px] font-mono text-[var(--fg-25)]">FAT</p>
                  <p className="text-sm font-bold font-mono text-blue-300">{Math.round(todayIntake?.fat_g ?? 0)}<span className="text-[var(--fg-20)]">/{calorieSummary.macros.fat}g</span></p>
                </div>
              </div>

              {showQuickLog && (
                <div className="mt-3 pt-3 border-t border-[var(--fg-06)] space-y-2">
                  <input type="text" value={qlLabel} onChange={(e) => setQlLabel(e.target.value)} placeholder="What did you eat?" className="w-full h-9 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] px-3 text-sm font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition placeholder:text-[var(--fg-15)]" />
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[8px] font-mono text-[var(--fg-30)] block mb-1">KCAL *</label>
                      <input type="number" min="0" inputMode="numeric" onWheel={(e) => (e.target as HTMLElement).blur()} value={qlKcal} onChange={(e) => setQlKcal(e.target.value)} placeholder="—" className="w-full h-9 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-sm font-bold font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition placeholder:text-[var(--fg-15)]" />
                    </div>
                    <div>
                      <label className="text-[8px] font-mono text-rose-300/50 block mb-1">PROT</label>
                      <input type="number" min="0" inputMode="decimal" onWheel={(e) => (e.target as HTMLElement).blur()} value={qlProtein} onChange={(e) => setQlProtein(e.target.value)} placeholder="—" className="w-full h-9 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-sm font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition placeholder:text-[var(--fg-15)]" />
                    </div>
                    <div>
                      <label className="text-[8px] font-mono text-amber-300/50 block mb-1">CARB</label>
                      <input type="number" min="0" inputMode="decimal" onWheel={(e) => (e.target as HTMLElement).blur()} value={qlCarbs} onChange={(e) => setQlCarbs(e.target.value)} placeholder="—" className="w-full h-9 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-sm font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition placeholder:text-[var(--fg-15)]" />
                    </div>
                    <div>
                      <label className="text-[8px] font-mono text-blue-300/50 block mb-1">FAT</label>
                      <input type="number" min="0" inputMode="decimal" onWheel={(e) => (e.target as HTMLElement).blur()} value={qlFat} onChange={(e) => setQlFat(e.target.value)} placeholder="—" className="w-full h-9 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-sm font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition placeholder:text-[var(--fg-15)]" />
                    </div>
                  </div>
                  <button onClick={handleQuickLog} disabled={!qlKcal || qlSaving} className="w-full py-2 rounded-lg bg-[rgb(var(--accent-rgb))] text-black text-xs font-semibold hover:brightness-110 disabled:opacity-40 transition">
                    {qlSaving ? "Saving..." : "Log Entry"}
                  </button>
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* ─── Quick Links ─── */}
        <motion.div variants={staggerItem} className="grid grid-cols-3 gap-2.5" style={{ order: 80 }}>
          {[
            { label: "Schedule", icon: <Calendar size={16} />, href: "/schedule", module: "gym" as const },
            { label: "Progress", icon: <TrendingUp size={16} />, href: "/track", module: "progress" as const },
            { label: "Recovery", icon: <HeartPulse size={16} />, href: "/recovery", module: "recovery" as const },
          ].filter((l) => isEnabled(l.module)).map((link) => (
            <button
              key={link.label}
              onClick={() => router.push(link.href)}
              className="rounded-xl border border-[rgb(var(--accent-rgb)/0.12)] bg-[var(--fg-03)] p-3 flex flex-col items-center gap-1.5 text-[var(--fg-30)] hover:text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.05)] hover:border-[rgb(var(--accent-rgb)/0.25)] transition"
            >
              {link.icon}
              <span className="text-[9px] font-mono tracking-wider">{link.label.toUpperCase()}</span>
            </button>
          ))}
        </motion.div>

        {/* ─── Recent Notifications ─── */}
        {notifLoaded && notifications.length > 0 && (
          <motion.div variants={staggerItem} className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.12)] bg-[var(--fg-03)] overflow-hidden" style={{ order: 90, boxShadow: "0 0 15px -5px rgb(var(--accent-rgb) / 0.08)" }}>
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.4)]">RECENT NOTIFICATIONS</p>
              <button onClick={() => router.push("/notifications")} className="text-[9px] font-mono text-[rgb(var(--accent-rgb)/0.5)] hover:text-[rgb(var(--accent-rgb))] transition">
                View All
              </button>
            </div>
            <div className="px-3 pb-3 space-y-1">
              {notifications.slice(0, 3).map((n) => (
                <button
                  key={n.id}
                  onClick={() => dismissNotification(n.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--fg-02)] transition text-left"
                >
                  <Bell size={12} className="text-[var(--fg-20)] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[var(--fg-60)] truncate">{n.message}</p>
                    <p className="text-[9px] font-mono text-[var(--fg-15)] mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

      </motion.div>
    </main>
  );
}
