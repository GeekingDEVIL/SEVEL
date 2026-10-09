"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Activity, Flame, Zap, HeartPulse, Trophy, Award, Bell, ChevronRight, TrendingUp, Target, Play, Calendar, Droplets, AlertCircle, BarChart3, Sparkles, ShieldAlert, Check } from "lucide-react";
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

function AnimatedNumber({ value, className, format, suffix }: { value: number; className?: string; format?: (n: number) => string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const hasRun = useRef(false);
  useEffect(() => {
    if (hasRun.current || value === 0) { setDisplay(value); return; }
    hasRun.current = true;
    let cancelled = false;
    let raf: number;
    const duration = 800;
    const start = performance.now();
    function tick(now: number) {
      if (cancelled) return;
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [value]);
  const text = format ? format(display) : display.toLocaleString();
  return <span className={className}>{text}{suffix}</span>;
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
  const [weightTrend, setWeightTrend] = useState<{ delta: number; direction: "up" | "down" } | null>(null);
  const [habitMilestone, setHabitMilestone] = useState<{ name: string; streak: number } | null>(null);
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set());
  const [isOnline, setIsOnline] = useState(true);
  const [streakDots, setStreakDots] = useState<boolean[]>([]);
  const [thisWeekStats, setThisWeekStats] = useState<{ workouts: number; volume: number; prs: number } | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [lastVisit, setLastVisit] = useState<number | null>(null);
  const [perfectDay, setPerfectDay] = useState(false);
  const [habitCompleted, setHabitCompleted] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hub_dismissed_nudges");
      if (stored) {
        const parsed = JSON.parse(stored) as { keys: string[]; date: string };
        if (parsed.date === toDateString(new Date())) {
          setDismissedNudges(new Set(parsed.keys));
        }
      }
    } catch {}
    try {
      const lv = localStorage.getItem("hub_last_visit");
      if (lv) setLastVisit(Number(lv));
      localStorage.setItem("hub_last_visit", String(Date.now()));
    } catch {}
  }, []);

  useEffect(() => {
    const updateClock = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    updateClock();
    const id = setInterval(updateClock, 1000);
    setToday(new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" }));
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("hub_scroll_y");
      if (saved) window.scrollTo(0, Number(saved));
    } catch {}
    const save = () => { try { sessionStorage.setItem("hub_scroll_y", String(window.scrollY)); } catch {} };
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
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
          .select("target_sets, exercises(body_segment)")
          .eq("template_id", gymPlan.template_id);
        if (cancelled) return;
        const count = te?.length ?? 0;
        const sets = (te ?? []).reduce((s, e: any) => s + (e.target_sets || 0), 0);
        const groups = [...new Set((te ?? []).map((e: any) => e.exercises?.body_segment).filter(Boolean))] as string[];
        setMuscleGroups(groups);
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

      // ── Weekly recap (Monday = last week, other days = this week so far) ──
      {
        const isMonday = dayOfWeek === 1;
        const rangeStart = new Date(now);
        const rangeEnd = new Date(now);
        if (isMonday) {
          rangeStart.setDate(rangeStart.getDate() - 7);
          rangeEnd.setDate(rangeEnd.getDate() - 1);
        } else {
          const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          rangeStart.setDate(rangeStart.getDate() - daysSinceMonday);
        }
        const rangeStartStr = toDateString(rangeStart);
        const rangeEndStr = toDateString(rangeEnd);

        const [{ count: wkWorkouts }, { data: wkSessions }, { data: wkPRs }] = await Promise.all([
          supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed").eq("sex", userSex).gte("date", rangeStartStr).lte("date", rangeEndStr),
          supabase.from("workout_sessions").select("id").eq("user_id", user.id).eq("status", "completed").eq("sex", userSex).gte("date", rangeStartStr).lte("date", rangeEndStr),
          supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "new_pr").eq("sex", userSex).gte("created_at", rangeStartStr + "T00:00:00").lte("created_at", rangeEndStr + "T23:59:59"),
        ]);
        if (cancelled) return;
        let wkVol = 0;
        if (wkSessions && wkSessions.length > 0) {
          const ids = wkSessions.map((s: any) => s.id);
          const { data: logs } = await supabase.from("exercise_set_logs").select("weight, reps").in("workout_session_id", ids);
          wkVol = (logs ?? []).reduce((s, l: any) => s + ((Number(l.weight) || 0) * (Number(l.reps) || 0)), 0);
        }
        if (cancelled) return;
        if (isMonday) {
          setWeeklyRecap({ workouts: wkWorkouts ?? 0, volume: Math.round(wkVol), prs: (wkPRs as any)?.length ?? (wkPRs as any) ?? 0, streak: stats.streak });
        } else {
          setThisWeekStats({ workouts: wkWorkouts ?? 0, volume: Math.round(wkVol), prs: (wkPRs as any)?.length ?? (wkPRs as any) ?? 0 });
        }
      }

      // ── Week days bar (Mon–Sun for current week) ──
      {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const { data: weekDates } = await supabase
          .from("workout_sessions").select("date").eq("user_id", user.id).eq("status", "completed").eq("sex", userSex)
          .gte("date", toDateString(monday)).lte("date", toDateString(sunday));
        if (cancelled) return;
        const completedSet = new Set((weekDates ?? []).map((r: any) => r.date));
        const dots: boolean[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          dots.push(completedSet.has(toDateString(d)));
        }
        setStreakDots(dots);
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
      if (stats.recoveryPct !== null && stats.recoveryPct >= 95) insights.push("Fully recovered — optimal training window");
      else if (stats.recoveryPct !== null && stats.recoveryPct < 40) insights.push("Recovery low — consider a lighter session");
      if (stats.weeklyVolume > 0) insights.push(`${Math.round(kgToUnit(stats.weeklyVolume, weightUnit)).toLocaleString()} ${weightUnit} volume this week`);
      if (insights.length > 0) {
        const hourIdx = new Date().getHours();
        setInsight(insights[hourIdx % insights.length]);
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
          supabase.from("habits").select("id, name, icon, auto_source, current_streak").eq("user_id", user.id).eq("archived", false),
          supabase.from("habit_completions").select("habit_id").eq("user_id", user.id).eq("completed_date", todayDate),
        ]);
        if (!cancelled && habitsData && habitsData.length > 0) {
          const completedIds = new Set((compData ?? []).map((c: any) => c.habit_id));
          const pending = habitsData.filter((h: any) => !completedIds.has(h.id) && !h.auto_source);
          const allHabits = habitsData.map((h: any) => ({ id: h.id, name: h.name, icon: h.icon, done: completedIds.has(h.id) }));
          setHabitStats({ completed: allHabits.filter((h) => h.done).length, total: habitsData.length, habits: allHabits });
          setPendingHabits(pending.slice(0, 3));

          const milestones = [100, 60, 30, 14, 7];
          for (const h of habitsData as any[]) {
            const s = h.current_streak ?? 0;
            const m = milestones.find(m => s === m);
            if (m) { setHabitMilestone({ name: h.name, streak: s }); break; }
          }
        }
      }

      // Body weight trend (±2kg in 7 days)
      if (isEnabled("progress")) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: trendWeights } = await supabase
          .from("body_weight_logs")
          .select("weight, logged_at")
          .eq("user_id", user.id)
          .eq("sex", userSex)
          .gte("logged_at", weekAgo.toISOString())
          .order("logged_at", { ascending: true })
          .limit(10);
        if (!cancelled && trendWeights && trendWeights.length >= 2) {
          const oldest = trendWeights[0].weight;
          const newest = trendWeights[trendWeights.length - 1].weight;
          const delta = Number((newest - oldest).toFixed(1));
          if (Math.abs(delta) >= 2) {
            setWeightTrend({ delta: Math.abs(delta), direction: delta > 0 ? "up" : "down" });
          }
        }
      }

      // Milestone toast (streak milestones, workout milestones, level milestones)
      if (!cancelled) {
        const toastKey = `hub_milestone_${dateStr}`;
        try {
          const shown = localStorage.getItem(toastKey);
          if (!shown) {
            let toast: string | null = null;
            if (stats.streak > 0 && [7, 14, 30, 60, 100].includes(stats.streak)) toast = `${stats.streak}-day streak! Keep it going.`;
            else if (stats.totalWorkouts > 0 && stats.totalWorkouts % 100 === 0) toast = `${stats.totalWorkouts} workouts completed!`;
            else if (level > 0 && level % 10 === 0) toast = `Level ${level} reached!`;
            if (toast) {
              setMilestoneToast(toast);
              localStorage.setItem(toastKey, "1");
              setTimeout(() => setMilestoneToast(null), 4000);
            }
          }
        } catch {}
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
    setHabitCompleted(habitId);
    setTimeout(() => setHabitCompleted(null), 1200);
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
  const greeting = (() => {
    const base = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    if (lastVisit) {
      const hoursSince = (Date.now() - lastVisit) / 3600000;
      if (hoursSince > 48) return "Welcome back";
      if (hoursSince > 24) return `${base} again`;
    }
    return base;
  })();
  const nudge = (() => {
    if (perfectDay) return "Perfect day. Every box checked.";
    if (recentPR) return "Still riding that PR high?";
    if (todayPlan?.completed) {
      if (stats.streak >= 14) return `${stats.streak} days strong. Relentless.`;
      if (stats.streak >= 7) return `${stats.streak}-day streak. Keep building.`;
      return "Session done. Recovery mode.";
    }
    if (todayPlan && !todayPlan.is_rest) {
      if (stats.recoveryPct !== null && stats.recoveryPct >= 90) return "Fully charged. Time to train.";
      if (stats.recoveryPct !== null && stats.recoveryPct < 40) return "Recovery low — listen to your body.";
      return `${todayPlan.title} is waiting for you.`;
    }
    if (todayPlan?.is_rest) return "Rest is earned. Recover well.";
    if (hour < 6) return "Early riser. Respect.";
    if (hour >= 22) return "Rest up for tomorrow.";
    return "No plan today — freestyle or rest.";
  })();

  // Smart card ordering — lower order = higher on page
  const cardOrder = useMemo(() => {
    let prOrder = 10, missedOrder = 11, cycleOrder = 12, recapOrder = 13, insightOrder = 14;
    let fatigueOrder = 15, volumeOrder = 16, weightTrendOrder = 17, habitMilestoneOrder = 18;
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
    if (todayPlan && !todayPlan.completed && !todayPlan.is_rest) {
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
    return { prOrder, missedOrder, cycleOrder, recapOrder, insightOrder, fatigueOrder, volumeOrder, weightTrendOrder, habitMilestoneOrder, workoutOrder, levelOrder, statsOrder, attrOrder, recoveryBodyOrder, energyOrder, hydrationOrder, habitsOrder };
  }, [recentPR, missedWorkout, stats.recoveryPct, todayPlan, cyclePhase, hour, isEnabled, calorieSummary, todayIntake, fatigueAlerts]);

  const ambientColor = stats.recoveryPct !== null
    ? stats.recoveryPct >= 80 ? "52 211 153" : stats.recoveryPct >= 50 ? "251 146 60" : "239 68 68"
    : "var(--accent-rgb)";

  const timeTint = hour >= 5 && hour < 12 ? "140 160 200" : hour >= 12 && hour < 17 ? "180 170 150" : hour >= 17 && hour < 21 ? "200 160 120" : "100 100 160";

  function dismissNudge(key: string) {
    setDismissedNudges(prev => {
      const next = new Set(prev);
      next.add(key);
      try { localStorage.setItem("hub_dismissed_nudges", JSON.stringify({ keys: [...next], date: toDateString(new Date()) })); } catch {}
      return next;
    });
  }

  const nudges = useMemo(() => {
    const list: { key: string; text: string; icon: string; href: string; module: string }[] = [];
    if (hour >= 14 && isEnabled("nutrition") && calorieSummary && !todayIntake) {
      list.push({ key: "lunch", text: "Don't forget lunch — tap to log", icon: "🍽", href: "/nutrition", module: "nutrition" });
    }
    if (hour >= 18 && isEnabled("habits") && habitStats && habitStats.completed < habitStats.total) {
      const left = habitStats.total - habitStats.completed;
      list.push({ key: "habits_evening", text: `${left} habit${left !== 1 ? "s" : ""} left tonight`, icon: "✨", href: "/habits", module: "habits" });
    }
    if (hour < 12 && isEnabled("wellness") && (hydrationMl === null || hydrationMl === 0)) {
      list.push({ key: "water_morning", text: "Start your hydration — 0L so far", icon: "💧", href: "/wellness", module: "wellness" });
    }
    return list.filter(n => !dismissedNudges.has(n.key));
  }, [hour, isEnabled, calorieSummary, todayIntake, habitStats, hydrationMl, dismissedNudges]);

  const dailyScore = useMemo(() => {
    let weightedDone = 0, weightedTotal = 0;
    if (isEnabled("gym") && todayPlan && !todayPlan.is_rest && (todayPlan.count > 0 || todayPlan.completed)) {
      weightedTotal += 3;
      if (todayPlan.completed) weightedDone += 3;
    }
    if (isEnabled("nutrition") && calorieSummary) {
      weightedTotal += 2;
      const eaten = todayIntake?.kcal ?? 0;
      if (eaten >= calorieSummary.calorieTarget * 0.8) weightedDone += 2;
    }
    if (isEnabled("wellness")) {
      weightedTotal += 1;
      if (hydrationMl !== null && hydrationMl >= waterGoalMl) weightedDone += 1;
    }
    if (isEnabled("habits") && habitStats && habitStats.total > 0) {
      weightedTotal += 2;
      if (habitStats.completed === habitStats.total) weightedDone += 2;
    }
    if (weightedTotal === 0) return null;
    return Math.round((weightedDone / weightedTotal) * 100);
  }, [isEnabled, todayPlan, calorieSummary, todayIntake, hydrationMl, waterGoalMl, habitStats]);

  const heroTimePeriod = hour >= 5 && hour < 12 ? "morning" : hour >= 17 && hour < 21 ? "evening" : hour >= 21 || hour < 5 ? "night" : "";

  useEffect(() => {
    if (dailyScore === 100 && !perfectDay) setPerfectDay(true);
  }, [dailyScore, perfectDay]);

  const hasAlerts = !!(recentPR || (fatigueAlerts.length > 0) || missedWorkout || (isEnabled("cycle") && cyclePhase) || (weightTrend && isEnabled("progress")) || (habitMilestone && isEnabled("habits")) || weeklyRecap);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative"
      onTouchStart={(e) => { if (window.scrollY === 0) pullStartY.current = e.touches[0].clientY; }}
      onTouchEnd={() => { pullStartY.current = null; }}
      onTouchMove={(e) => {
        if (pullStartY.current !== null && window.scrollY === 0) {
          const dy = e.touches[0].clientY - pullStartY.current;
          if (dy > 80 && !refreshing) {
            pullStartY.current = null;
            setRefreshing(true);
            triggerHaptic("medium");
            window.location.reload();
          }
        }
      }}
    >
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: `radial-gradient(ellipse at 50% -10%, rgb(${perfectDay ? "250 204 21" : timeTint} / ${perfectDay ? "0.08" : "0.07"}) 0%, transparent 55%)` }} />

      {milestoneToast && (
        <motion.div
          initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-lg"
          style={{ background: "rgb(var(--fg-rgb) / 0.08)", backdropFilter: "blur(12px)", border: "1px solid rgb(var(--fg-rgb) / 0.06)" }}
        >
          <Award size={16} className="text-[rgb(var(--accent-rgb))] shrink-0" />
          <span className="text-xs font-semibold text-[var(--fg-80)]">{milestoneToast}</span>
        </motion.div>
      )}

      <motion.div
        className="relative z-10 max-w-xl mx-auto px-4 pt-8 flex flex-col gap-5"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >

        {/* ─── Hero: Greeting + Avatar + Level/Rank/XP/Goal ─── */}
        <motion.div variants={staggerItem}>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold font-display text-[rgb(var(--accent-light-rgb))]">
                {profile?.username ? `${greeting}, ${profile.username}` : greeting}
              </h1>
              <p className="text-[10px] font-mono text-[var(--fg-25)] mt-0.5">{today ?? "..."} {time ? `· ${time}` : ""}</p>
              <p className="text-[11px] text-[var(--fg-40)] mt-0.5">{nudge}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isOnline && (
                <span className="px-1.5 py-0.5 rounded text-[7px] font-mono font-bold tracking-wider text-orange-400/80 bg-orange-400/10 border border-orange-400/15">OFFLINE</span>
              )}
              <button
                onClick={() => { triggerHaptic("light"); router.push("/notifications"); }}
                className="relative w-9 h-9 rounded-xl bg-[var(--fg-04)] border border-[var(--fg-06)] flex items-center justify-center text-[var(--fg-40)] hover:text-[var(--fg-70)] transition active:scale-95"
              >
                <Bell size={16} />
                {notifLoaded && notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[rgb(var(--accent-rgb))] text-black text-[8px] font-bold flex items-center justify-center">{notifications.length}</span>
                )}
              </button>
              <button
                onClick={() => { triggerHaptic("light"); router.push("/profile"); }}
                className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 active:scale-95 transition"
              >
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16.5" fill="none" stroke="rgb(var(--accent-rgb) / 0.15)" strokeWidth="2" />
                  <circle cx="18" cy="18" r="16.5" fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="2" strokeDasharray={`${xpProgress * 1.036} 103.6`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-[3px] rounded-full bg-[rgb(var(--accent-rgb)/0.1)] border border-[rgb(var(--accent-rgb)/0.2)] flex items-center justify-center text-[rgb(var(--accent-rgb))] font-bold text-xs overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    (profile?.username?.[0] ?? "?").toUpperCase()
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Level / Rank / XP bar / Goal — merged into hero */}
          {statsLoaded && (
            <div className="mt-3 rounded-xl bg-[var(--fg-02)] border border-[var(--fg-06)] px-3.5 py-2.5 cursor-pointer active:scale-[0.99] transition" onClick={() => { triggerHaptic("light"); router.push("/character"); }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[rgb(var(--accent-rgb)/0.1)] border border-[rgb(var(--accent-rgb)/0.2)] flex items-center justify-center text-sm font-bold text-[rgb(var(--accent-rgb))]">{level}</span>
                  <div>
                    <p className="text-xs font-semibold text-[var(--fg-70)]">Level {level}</p>
                    <p className="text-[9px] font-mono text-[var(--fg-25)]">
                      <span className={rank.color}>{rank.name}</span>
                      {nextRank && <span className="text-[var(--fg-15)]"> · {nextRank.name} at Lv.{nextRank.minLevel}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {stats.goal && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--fg-04)] border border-[var(--fg-06)] text-[9px] font-mono text-[var(--fg-35)]">
                      <Target size={9} className="text-[rgb(var(--accent-rgb)/0.5)]" />
                      {stats.goal}
                    </span>
                  )}
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[8px] font-mono tracking-wider ${rank.color}`}
                    style={{ borderColor: `${rank.glow?.replace("0.6", "0.3") ?? "var(--fg-10)"}`, backgroundColor: `${rank.glow?.replace("0.6", "0.06") ?? "var(--fg-03)"}` }}
                  >
                    <Award size={8} />
                    {rank.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={10} className="text-[rgb(var(--accent-rgb))] shrink-0" />
                <div className="flex-1 h-1.5 bg-[var(--fg-06)] rounded-full overflow-hidden relative">
                  <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }} transition={{ duration: 0.8, ease: "easeOut" }} style={{ background: `linear-gradient(90deg, rgb(var(--accent-rgb) / 0.7), rgb(var(--accent-rgb)))` }} />
                  {[25, 50, 75].map((m) => (
                    <div key={m} className="absolute top-0 bottom-0 w-px bg-[var(--fg-10)]" style={{ left: `${m}%` }} />
                  ))}
                </div>
                <span className="text-[8px] font-mono text-[var(--fg-20)] shrink-0">
                  {levelInfo.isMaxLevel ? "MAX" : `${levelInfo.xpIntoCurrentLevel}/${levelInfo.xpNeededForNext}`}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* ─── At-a-Glance Strip (auto-scroll marquee) ─── */}
        {statsLoaded && (() => {
          const pills = [
            dailyScore !== null && { label: `${dailyScore}%`, sub: "today", color: dailyScore === 100 ? "rgb(250,204,21)" : "rgb(var(--accent-rgb))", href: "" },
            isEnabled("xp") && { label: `Lv.${level}`, sub: rank.name, color: "rgb(var(--accent-rgb))", href: "/character" },
            { label: `${stats.streak}`, sub: "streak", color: "rgb(251,146,60)", href: "/track" },
            isEnabled("recovery") && stats.recoveryPct !== null && { label: `${stats.recoveryPct}%`, sub: "recovery", color: stats.recoveryPct >= 80 ? "rgb(52,211,153)" : stats.recoveryPct >= 50 ? "rgb(251,146,60)" : "rgb(239,68,68)", href: "/recovery" },
            isEnabled("nutrition") && calorieSummary && { label: `${Math.max(0, calorieSummary.calorieTarget - (todayIntake?.kcal ?? 0))}`, sub: "kcal left", color: "rgb(245,158,11)", href: "/nutrition" },
            isEnabled("progress") && stats.bodyWeight !== null && { label: `${formatWeight(stats.bodyWeight, weightUnit, 1)}`, sub: weightUnit, color: "rgb(139,92,246)", href: "/track" },
          ].filter(Boolean) as { label: string; sub: string; color: string; href: string }[];
          const renderPill = (pill: { label: string; sub: string; color: string; href: string }, i: number) => (
            <button key={`${pill.sub}-${i}`} onClick={pill.href ? () => { triggerHaptic("light"); router.push(pill.href); } : undefined} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--fg-08)] bg-[var(--fg-03)] active:scale-95 transition">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: pill.color }} />
              <span className="text-xs font-bold font-mono text-[var(--fg-80)]">{pill.label}</span>
              <span className="text-[9px] font-mono text-[var(--fg-25)]">{pill.sub}</span>
            </button>
          );
          return (
            <motion.div variants={staggerItem} ref={pillRef} onTouchStart={handlePillTouch} className="pill-marquee-wrap overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1 relative">
              <div className="absolute inset-y-0 left-0 w-4 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, var(--bg-primary), transparent)" }} />
              <div className="pill-marquee-track flex gap-2 w-max">
                {pills.map((p, i) => renderPill(p, i))}
                {pills.map((p, i) => renderPill(p, i + pills.length))}
              </div>
              <div className="absolute inset-y-0 right-0 w-4 z-10 pointer-events-none" style={{ background: "linear-gradient(to left, var(--bg-primary), transparent)" }} />
            </motion.div>
          );
        })()}

        {/* ─── Alerts ─── */}
        {hasAlerts && (() => {
          const alertItems: { key: string; icon: React.ReactNode; color: string; text: React.ReactNode; sub?: string; action?: React.ReactNode; order: number }[] = [];

          if (fatigueAlerts.length > 0) {
            const isCrit = fatigueAlerts.some(a => a.severity === "critical");
            alertItems.push({
              key: "fatigue",
              icon: <ShieldAlert size={14} />,
              color: isCrit ? "248,113,113" : "251,191,36",
              text: <>{fatigueAlerts[0].message}</>,
              sub: fatigueAlerts[0].detail,
              order: cardOrder.fatigueOrder,
            });
          }

          if (recentPR) {
            alertItems.push({
              key: "pr",
              icon: <Trophy size={14} />,
              color: "250,204,21",
              text: <>PR: <span className="font-semibold text-yellow-300/90">{recentPR.exercise}</span></>,
              action: <button onClick={() => router.push("/track")} className="text-[10px] font-mono text-yellow-400/70 hover:text-yellow-300 transition">View →</button>,
              order: cardOrder.prOrder,
            });
          }

          if (missedWorkout) {
            alertItems.push({
              key: "missed",
              icon: <AlertCircle size={14} />,
              color: "251,146,60",
              text: <>Missed: <span className="font-semibold text-orange-300">{missedWorkout}</span></>,
              action: (
                <div className="flex items-center gap-2">
                  <button onClick={() => setMissedWorkout(null)} className="text-[10px] font-mono text-[var(--fg-25)] hover:text-[var(--fg-50)] transition">Skip</button>
                  <button onClick={() => router.push("/schedule")} className="text-[10px] font-mono text-orange-300/80 hover:text-orange-300 transition">Go →</button>
                </div>
              ),
              order: cardOrder.missedOrder,
            });
          }

          if (weightTrend && isEnabled("progress")) {
            alertItems.push({
              key: "weight",
              icon: <TrendingUp size={14} />,
              color: "168,85,247",
              text: <>{weightTrend.direction === "up" ? "↑" : "↓"} {formatWeight(weightTrend.delta, weightUnit, 1)} {weightUnit} this week</>,
              action: <button onClick={() => router.push("/track")} className="text-[10px] font-mono text-purple-400/60 hover:text-purple-300 transition">Log →</button>,
              order: cardOrder.weightTrendOrder,
            });
          }

          if (habitMilestone && isEnabled("habits")) {
            alertItems.push({
              key: "habit",
              icon: <Flame size={14} />,
              color: MODULE_REGISTRY.habits.colorRgb,
              text: <><span className="font-semibold text-rose-300/90">{habitMilestone.name}</span> · {habitMilestone.streak}-day streak</>,
              action: <button onClick={() => router.push("/habits")} className="text-[10px] font-mono text-rose-400/60 hover:text-rose-300 transition">View →</button>,
              order: cardOrder.habitMilestoneOrder,
            });
          }

          if (isEnabled("cycle") && cyclePhase) {
            alertItems.push({
              key: "cycle",
              icon: <Droplets size={14} />,
              color: MODULE_REGISTRY.cycle.colorRgb,
              text: <><span className="font-semibold text-pink-300/90">{cyclePhase.phase}</span> Phase · Day {cyclePhase.day}</>,
              sub: cyclePhase.tip,
              action: <button onClick={() => router.push("/cycle")} className="text-[10px] font-mono text-pink-400/60 hover:text-pink-300 transition">Log →</button>,
              order: cardOrder.cycleOrder,
            });
          }

          alertItems.sort((a, b) => a.order - b.order);

          return (
            <motion.div variants={staggerItem} className="rounded-xl border border-[var(--fg-08)] bg-[var(--fg-02)] overflow-hidden">
              {alertItems.map((item, i) => (
                <div key={item.key} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-[var(--fg-05)]" : ""}`}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: `rgb(${item.color})`, boxShadow: `0 0 6px rgb(${item.color} / 0.4)` }} />
                  <span className="shrink-0" style={{ color: `rgb(${item.color} / 0.7)` }}>{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[var(--fg-55)] truncate">{item.text}</p>
                    {item.sub && <p className="text-[9px] font-mono text-[var(--fg-25)] mt-0.5 truncate">{item.sub}</p>}
                  </div>
                  {item.action && <div className="shrink-0">{item.action}</div>}
                </div>
              ))}
            </motion.div>
          );
        })()}

        {/* ─── Weekly Overview (This Week / Last Week + Streak Dots) ─── */}
        {(weeklyRecap || thisWeekStats) && (
          <motion.div variants={staggerItem} className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.12)] bg-[var(--fg-03)] p-4 cursor-pointer active:scale-[0.98] transition" style={{ order: cardOrder.recapOrder }} onClick={() => { triggerHaptic("light"); router.push("/track"); }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-[rgb(var(--accent-rgb))]" />
                <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.4)]">{weeklyRecap ? "LAST WEEK" : "THIS WEEK"}</p>
              </div>
              {stats.streak > 0 && (
                <div className="flex items-center gap-1.5">
                  <Flame size={11} className="text-orange-400/60" />
                  <span className="text-[10px] font-mono font-semibold text-orange-400/80">{stats.streak}d streak</span>
                </div>
              )}
            </div>
            <div className={`grid ${weeklyRecap ? "grid-cols-4" : "grid-cols-3"} gap-2 mb-3`}>
              {(weeklyRecap
                ? [
                    { v: weeklyRecap.workouts, l: "WORKOUTS" },
                    { v: Math.round(kgToUnit(weeklyRecap.volume, weightUnit)).toLocaleString(), l: `VOL (${weightUnit})` },
                    { v: weeklyRecap.prs, l: "PRs", color: "text-yellow-400/90" },
                    { v: weeklyRecap.streak, l: "STREAK", color: "text-orange-400/90" },
                  ]
                : [
                    { v: thisWeekStats!.workouts, l: "WORKOUTS" },
                    { v: Math.round(kgToUnit(thisWeekStats!.volume, weightUnit)).toLocaleString(), l: `VOL (${weightUnit})` },
                    { v: thisWeekStats!.prs, l: "PRs", color: "text-yellow-400/90" },
                  ]
              ).map((s) => (
                <div key={s.l} className="text-center">
                  <p className={`text-xl font-bold font-mono ${s.color ?? "text-[var(--fg-90)]"}`}>{s.v}</p>
                  <p className="text-[8px] font-mono text-[var(--fg-25)]">{s.l}</p>
                </div>
              ))}
            </div>
            {streakDots.length === 7 && (
              <div className="pt-2.5 border-t border-[var(--fg-05)]">
                <div className="flex justify-between">
                  {["M", "T", "W", "T", "F", "S", "S"].map((label, i) => {
                    const isToday = i === ((new Date().getDay() + 6) % 7);
                    return (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${streakDots[i] ? "bg-[rgb(var(--accent-rgb))]" : isToday ? "border border-[var(--fg-15)] bg-[var(--fg-04)]" : "bg-[var(--fg-04)]"}`} style={streakDots[i] ? { boxShadow: "0 0 6px rgb(var(--accent-rgb) / 0.3)" } : undefined}>
                          {streakDots[i] && <Check size={10} className="text-black" />}
                        </div>
                        <span className={`text-[7px] font-mono ${isToday ? "text-[var(--fg-50)] font-bold" : "text-[var(--fg-18)]"}`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Contextual Insight ─── */}
        {insight && (
          <motion.div variants={staggerItem} className="rounded-xl border border-[rgb(var(--accent-rgb)/0.15)] px-4 py-3.5 flex items-center gap-3" style={{ order: cardOrder.insightOrder, background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.06), rgb(var(--accent-rgb) / 0.02))", boxShadow: "0 0 15px -5px rgb(var(--accent-rgb) / 0.1)" }}>
            <Sparkles size={16} className="text-[rgb(var(--accent-rgb))] shrink-0" />
            <p className="text-xs font-mono text-[var(--fg-60)]">{insight}</p>
          </motion.div>
        )}

        {/* ─── Today's Workout Card ─── */}
        <motion.div variants={staggerItem} style={{ order: cardOrder.workoutOrder }}>
          {todayLoading ? (
            <div className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.15)] bg-[var(--fg-03)] p-4">
              <div className="animate-pulse space-y-2 py-2">
                <div className="h-5 w-40 rounded bg-[var(--fg-06)]" />
                <div className="h-3 w-28 rounded bg-[var(--fg-04)]" />
              </div>
            </div>
          ) : !todayPlan ? (
            <div className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.15)] bg-[var(--fg-03)] p-4" style={{ boxShadow: "0 0 20px -5px rgb(var(--accent-rgb) / 0.1), inset 0 1px 0 rgb(var(--accent-rgb) / 0.05)" }}>
              <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.4)] mb-2">TODAY&apos;S WORKOUT</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[var(--fg-80)]">No Workout Planned</p>
                  <p className="text-[11px] text-[var(--fg-30)] mt-0.5">Set up your schedule to get started</p>
                </div>
                <button onClick={() => router.push("/schedule")} className="shrink-0 px-4 py-2 rounded-xl bg-[var(--fg-06)] border border-[var(--fg-08)] text-xs font-medium text-[var(--fg-60)] hover:text-[var(--fg-90)] hover:bg-[var(--fg-10)] transition">
                  Schedule
                </button>
              </div>
            </div>
          ) : todayPlan.completed ? (
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.03] p-4">
              <p className="text-[9px] font-mono tracking-widest text-emerald-400/40 mb-2">TODAY&apos;S WORKOUT</p>
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
            </div>
          ) : todayPlan.is_rest ? (
            <div className="rounded-2xl border border-blue-400/15 bg-blue-400/[0.03] p-4">
              <p className="text-[9px] font-mono tracking-widest text-blue-400/40 mb-2">TODAY&apos;S WORKOUT</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <HeartPulse size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-[var(--fg-80)]">Rest Day</p>
                  <p className="text-[11px] text-[var(--fg-30)] mt-0.5">Recovery is part of the plan</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition" onClick={() => { triggerHaptic("medium"); router.push("/schedule"); }} style={{ background: "linear-gradient(145deg, rgb(var(--accent-rgb) / 0.1), rgb(var(--accent-rgb) / 0.03) 40%, var(--fg-02))", boxShadow: "0 4px 30px -5px rgb(var(--accent-rgb) / 0.2), 0 0 0 1px rgb(var(--accent-rgb) / 0.15), inset 0 1px 0 rgb(var(--accent-rgb) / 0.1)" }}>
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[rgb(var(--accent-rgb))] to-transparent opacity-60" />
              <div className="p-4">
                <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-rgb)/0.5)] mb-2.5">TODAY&apos;S WORKOUT</p>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[rgb(var(--accent-rgb)/0.12)] border border-[rgb(var(--accent-rgb)/0.25)] flex items-center justify-center">
                      <Dumbbell size={22} className="text-[rgb(var(--accent-rgb))]" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[var(--fg-90)]">{todayPlan.title}</p>
                      <p className="text-[11px] font-mono text-[var(--fg-35)] mt-0.5">
                        {todayPlan.count} exercise{todayPlan.count !== 1 ? "s" : ""} · {todayPlan.sets} sets · ~{estMinutes} min
                      </p>
                      {muscleGroups.length > 0 && (
                        <p className="text-[9px] font-mono text-[rgb(var(--accent-rgb)/0.5)] mt-1">{muscleGroups.join(" · ")}</p>
                      )}
                    </div>
                  </div>
                  <button className="shrink-0 w-14 h-14 rounded-full bg-[rgb(var(--accent-rgb))] flex items-center justify-center text-black hover:brightness-110 transition" style={{ boxShadow: "0 0 25px rgb(var(--accent-rgb) / 0.4), 0 4px 12px rgb(var(--accent-rgb) / 0.3)" }}>
                    <Play size={24} fill="black" className="ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Level, Stats, Attributes removed — level merged into hero, stats into weekly overview, attributes on character page */}

        {/* ─── Body Status: Recovery + Weight + Hydration in one card ─── */}
        {(isEnabled("recovery") || isEnabled("progress") || (hydrationMl !== null && isEnabled("wellness"))) && (
          <motion.div variants={staggerItem} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4, delay: 0.05 }} className="rounded-2xl border border-[var(--fg-08)] bg-[var(--fg-02)] overflow-hidden" style={{ order: cardOrder.recoveryBodyOrder }}>
            <div className={`grid gap-px bg-[var(--fg-05)]`} style={{ gridTemplateColumns: `repeat(${[isEnabled("recovery"), isEnabled("progress"), hydrationMl !== null && isEnabled("wellness")].filter(Boolean).length}, 1fr)` }}>
              {isEnabled("recovery") && (
                <div className="bg-[var(--fg-02)] p-3 cursor-pointer active:scale-[0.97] transition" onClick={() => { triggerHaptic("light"); router.push("/recovery"); }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <HeartPulse size={10} style={{ color: `rgb(${MODULE_REGISTRY.recovery.colorRgb})` }} />
                    <p className="text-[7px] font-mono tracking-wider text-[var(--fg-25)]">RECOVERY</p>
                  </div>
                  <p className="text-xl font-bold font-mono text-[var(--fg-90)]">{stats.recoveryPct ?? "—"}<span className="text-[9px] text-[var(--fg-25)]">%</span></p>
                  <p className="text-[8px] font-mono text-[var(--fg-18)] mt-0.5">
                    {stats.recoveryPct !== null ? (stats.recoveryPct >= 80 ? "Ready" : stats.recoveryPct >= 50 ? "Partial" : "Rest") : "—"}
                  </p>
                </div>
              )}
              {isEnabled("progress") && (
                <div className="bg-[var(--fg-02)] p-3 cursor-pointer active:scale-[0.97] transition" onClick={() => { triggerHaptic("light"); router.push("/track"); }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingUp size={10} style={{ color: `rgb(${MODULE_REGISTRY.progress.colorRgb})` }} />
                    <p className="text-[7px] font-mono tracking-wider text-[var(--fg-25)]">WEIGHT</p>
                  </div>
                  <p className="text-xl font-bold font-mono text-[var(--fg-90)]">
                    {stats.bodyWeight !== null ? formatWeight(stats.bodyWeight, weightUnit, 1) : "—"}<span className="text-[9px] text-[var(--fg-25)]"> {weightUnit}</span>
                  </p>
                  {stats.bodyWeightChange !== null ? (
                    <p className={`text-[8px] font-mono mt-0.5 ${stats.bodyWeightChange > 0 ? "text-orange-300/70" : stats.bodyWeightChange < 0 ? "text-emerald-300/70" : "text-[var(--fg-18)]"}`}>
                      {stats.bodyWeightChange === 0 ? "No change" : `${stats.bodyWeightChange > 0 ? "↑" : "↓"} ${formatWeight(Math.abs(stats.bodyWeightChange), weightUnit, 1)}`}
                    </p>
                  ) : (
                    <p className="text-[8px] font-mono text-[var(--fg-18)] mt-0.5">—</p>
                  )}
                </div>
              )}
              {hydrationMl !== null && isEnabled("wellness") && (
                <div className="bg-[var(--fg-02)] p-3 cursor-pointer active:scale-[0.97] transition" onClick={() => { triggerHaptic("light"); router.push("/wellness"); }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Droplets size={10} className="text-blue-400/70" />
                    <p className="text-[7px] font-mono tracking-wider text-[var(--fg-25)]">WATER</p>
                  </div>
                  <p className="text-xl font-bold font-mono text-[var(--fg-90)]">{(hydrationMl / 1000).toFixed(1)}<span className="text-[9px] text-[var(--fg-25)]">L</span></p>
                  <div className="h-1 rounded-full bg-[var(--fg-06)] overflow-hidden mt-1.5">
                    <motion.div className="h-full rounded-full bg-blue-400/50" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (hydrationMl / waterGoalMl) * 100)}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Habits Card with Segment Ring ─── */}
        {habitStats && isEnabled("habits") && (() => {
          const HABIT_RING_COLORS = [
            { from: "#ef4444", to: "#f87171" }, { from: "#10b981", to: "#34d399" },
            { from: "#3b82f6", to: "#60a5fa" }, { from: "#f59e0b", to: "#fbbf24" },
            { from: "#a855f7", to: "#c084fc" }, { from: "#ec4899", to: "#f472b6" },
            { from: "#06b6d4", to: "#22d3ee" }, { from: "#f97316", to: "#fb923c" },
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
            return `M ${ctr + r * Math.cos(s2)} ${ctr + r * Math.sin(s2)} A ${r} ${r} 0 ${(eDeg - sDeg) > 180 ? 1 : 0} 1 ${ctr + r * Math.cos(e2)} ${ctr + r * Math.sin(e2)}`;
          }
          return (
            <motion.div variants={staggerItem} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4, delay: 0.1 }} className="rounded-2xl border border-rose-400/15 overflow-hidden cursor-pointer active:scale-[0.98] transition" style={{ order: cardOrder.habitsOrder, background: "linear-gradient(135deg, rgb(244 63 94 / 0.06), rgb(168 85 247 / 0.03))", boxShadow: "0 0 20px -5px rgb(244 63 94 / 0.1)" }} onClick={() => { triggerHaptic("light"); router.push("/habits"); }}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flame size={14} className="text-rose-400/60" />
                    <p className="text-[9px] font-mono tracking-widest text-rose-300/40">DAILY HABITS</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-[var(--fg-30)]">{habitStats.completed === habitStats.total && habitStats.total > 0 ? "Perfect Day!" : `${pct}%`}</span>
                    <ChevronRight size={12} className="text-[var(--fg-15)]" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0" style={{ width: svgSize, height: svgSize }}>
                    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
                      <defs>
                        {habitStats.habits.map((_, i) => {
                          const c = HABIT_RING_COLORS[i % HABIT_RING_COLORS.length];
                          return (<linearGradient key={`hsg-${i}`} id={`hsg-${i}`} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={c.from} /><stop offset="100%" stopColor={c.to} /></linearGradient>);
                        })}
                        <filter id="hub-glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                      </defs>
                      {habitStats.habits.map((h, i) => {
                        const startDeg = i * (segDeg + gapDeg);
                        const d = hubArc(startDeg, startDeg + segDeg);
                        const c = HABIT_RING_COLORS[i % HABIT_RING_COLORS.length];
                        return (
                          <g key={h.id}>
                            <path d={d} fill="none" stroke={`${c.from}20`} strokeWidth={sw} strokeLinecap="round" />
                            {h.done && (
                              <>
                                <motion.path d={d} fill="none" stroke={`${c.from}40`} strokeWidth={sw + 4} strokeLinecap="round" filter="url(#hub-glow)" pathLength={1} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.6 }} transition={{ duration: 0.6, delay: 0.15 + i * 0.08, ease: [0.34, 1.56, 0.64, 1] }} />
                                <motion.path d={d} fill="none" stroke={`url(#hsg-${i})`} strokeWidth={sw} strokeLinecap="round" pathLength={1} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.34, 1.56, 0.64, 1] }} />
                              </>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}>
                        <AnimatedPercent value={pct} className="text-lg font-bold font-mono text-[var(--fg-70)]" />
                      </motion.div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    {habitStats.habits.slice(0, 4).map((h, i) => {
                      const c = HABIT_RING_COLORS[i % HABIT_RING_COLORS.length];
                      return (
                        <div key={h.id} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: h.done ? c.from : `${c.from}33`, boxShadow: h.done ? `0 0 4px ${c.from}` : "none" }} />
                          <span className={`text-[10px] font-mono truncate ${h.done ? "text-[var(--fg-50)] line-through" : "text-[var(--fg-35)]"}`}>{h.icon} {h.name}</span>
                          {h.done && <span className="text-[8px] text-emerald-400/50 ml-auto shrink-0">✓</span>}
                        </div>
                      );
                    })}
                    {habitStats.habits.length > 4 && <p className="text-[9px] font-mono text-[var(--fg-15)]">+{habitStats.habits.length - 4} more</p>}
                  </div>
                </div>
              </div>
              {pendingHabits.length > 0 && (
                <div className="border-t border-[var(--fg-04)] px-4 py-2 flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {pendingHabits.map((h) => (
                    <motion.button key={h.id} onClick={() => quickCompleteHabit(h.id)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--fg-06)] bg-[var(--fg-02)] hover:bg-[var(--fg-06)] text-[10px] font-mono text-[var(--fg-40)] hover:text-[var(--fg-60)] transition active:scale-95"
                      animate={habitCompleted === h.id ? { backgroundColor: ["rgb(16 185 129 / 0.2)", "rgb(16 185 129 / 0)"], borderColor: ["rgb(16 185 129 / 0.5)", "rgb(var(--fg-rgb) / 0.06)"] } : {}}
                      transition={{ duration: 0.8 }}
                    >
                      {habitCompleted === h.id ? <span className="text-emerald-400">✓</span> : <span>{h.icon}</span>} {h.name}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* ─── Energy Dashboard ─── */}
        {isEnabled("nutrition") && calorieSummary && (() => {
          const eaten = todayIntake?.kcal ?? 0;
          const target = calorieSummary.calorieTarget;
          const remaining = target - eaten;
          const pct = Math.min((eaten / target) * 100, 100);
          const over = eaten > target;
          return (
            <motion.div variants={staggerItem} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4, delay: 0.15 }} className="rounded-2xl border p-4" style={{ order: cardOrder.energyOrder, borderColor: `rgb(${MODULE_REGISTRY.nutrition.colorRgb} / 0.2)`, background: `linear-gradient(135deg, rgb(${MODULE_REGISTRY.nutrition.colorRgb} / 0.05), var(--fg-03))`, boxShadow: `0 0 25px -5px rgb(${MODULE_REGISTRY.nutrition.colorRgb} / 0.12), inset 0 1px 0 rgb(${MODULE_REGISTRY.nutrition.colorRgb} / 0.06)` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame size={14} style={{ color: `rgb(${MODULE_REGISTRY.nutrition.colorRgb})` }} />
                  <p className="text-[9px] font-mono tracking-widest" style={{ color: `rgb(${MODULE_REGISTRY.nutrition.colorRgb} / 0.5)` }}>ENERGY</p>
                </div>
                <button onClick={() => setShowQuickLog(!showQuickLog)} className="flex items-center gap-1 text-[9px] font-mono text-[rgb(var(--accent-rgb)/0.6)] hover:text-[rgb(var(--accent-rgb))] transition">
                  <Plus size={10} /> Log Food
                </button>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{remaining > 0 ? remaining : 0}</span>
                  <span className="text-xs font-mono text-[var(--fg-25)]">kcal left</span>
                </div>
                <span className="text-[9px] font-mono text-[var(--fg-20)]">{eaten} / {target}</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--fg-06)] mb-3 overflow-hidden">
                <motion.div className={`h-full rounded-full ${over ? "bg-red-400" : "bg-[rgb(var(--accent-rgb))]"}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "PROTEIN", v: Math.round(todayIntake?.protein_g ?? 0), t: calorieSummary.macros.protein, c: "text-rose-300" },
                  { l: "CARBS", v: Math.round(todayIntake?.carbs_g ?? 0), t: calorieSummary.macros.carbs, c: "text-amber-300" },
                  { l: "FAT", v: Math.round(todayIntake?.fat_g ?? 0), t: calorieSummary.macros.fat, c: "text-blue-300" },
                ].map((m) => (
                  <div key={m.l} className="rounded-lg bg-[var(--fg-03)] border border-[var(--fg-06)] p-2 text-center">
                    <p className="text-[8px] font-mono text-[var(--fg-25)]">{m.l}</p>
                    <p className={`text-sm font-bold font-mono ${m.c}`}>{m.v}<span className="text-[var(--fg-20)]">/{m.t}g</span></p>
                  </div>
                ))}
              </div>
              {showQuickLog && (
                <div className="mt-3 pt-3 border-t border-[var(--fg-06)] space-y-2">
                  <input type="text" value={qlLabel} onChange={(e) => setQlLabel(e.target.value)} placeholder="What did you eat?" className="w-full h-9 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] px-3 text-sm font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition placeholder:text-[var(--fg-15)]" />
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { l: "KCAL *", v: qlKcal, s: setQlKcal, c: "" },
                      { l: "PROT", v: qlProtein, s: setQlProtein, c: "text-rose-300/50" },
                      { l: "CARB", v: qlCarbs, s: setQlCarbs, c: "text-amber-300/50" },
                      { l: "FAT", v: qlFat, s: setQlFat, c: "text-blue-300/50" },
                    ].map((f) => (
                      <div key={f.l}>
                        <label className={`text-[8px] font-mono block mb-1 ${f.c || "text-[var(--fg-30)]"}`}>{f.l}</label>
                        <input type="number" min="0" inputMode="numeric" onWheel={(e) => (e.target as HTMLElement).blur()} value={f.v} onChange={(e) => f.s(e.target.value)} placeholder="—" className="w-full h-9 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-sm font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition placeholder:text-[var(--fg-15)]" />
                      </div>
                    ))}
                  </div>
                  <button onClick={handleQuickLog} disabled={!qlKcal || qlSaving} className="w-full py-2 rounded-lg bg-[rgb(var(--accent-rgb))] text-black text-xs font-semibold hover:brightness-110 disabled:opacity-40 transition">
                    {qlSaving ? "Saving..." : "Log Entry"}
                  </button>
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* ─── Nudges ─── */}
        {nudges.length > 0 && (
          <motion.div variants={staggerItem} className="flex flex-col gap-2">
            {nudges.map((n) => (
              <div key={n.key} className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[var(--fg-02)]">
                <span className="text-[11px] shrink-0">{n.icon}</span>
                <button onClick={() => router.push(n.href)} className="flex-1 text-left text-[11px] text-[var(--fg-40)] hover:text-[var(--fg-60)] transition">{n.text}</button>
                <button onClick={() => dismissNudge(n.key)} className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[var(--fg-12)] hover:text-[var(--fg-35)] text-xs">✕</button>
              </div>
            ))}
          </motion.div>
        )}

        {/* ─── Recent Notifications ─── */}
        {notifLoaded && notifications.length > 0 && (
          <motion.div variants={staggerItem} className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.12)] bg-[var(--fg-03)] overflow-hidden mb-6" style={{ order: 99, boxShadow: "0 0 15px -5px rgb(var(--accent-rgb) / 0.08)" }}>
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <p className="text-[9px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.4)]">NOTIFICATIONS</p>
              <button onClick={() => router.push("/notifications")} className="text-[9px] font-mono text-[rgb(var(--accent-rgb)/0.5)] hover:text-[rgb(var(--accent-rgb))] transition">View All</button>
            </div>
            <div className="px-3 pb-3 space-y-1">
              {notifications.slice(0, 3).map((n) => {
                const notifColor = n.type === "new_pr" ? "text-yellow-400" : n.type === "streak" ? "text-orange-400" : n.type === "achievement" ? "text-purple-400" : "text-[var(--fg-25)]";
                const NotifIcon = n.type === "new_pr" ? Trophy : n.type === "streak" ? Flame : n.type === "achievement" ? Award : Bell;
                return (
                  <motion.div key={n.id} drag="x" dragConstraints={{ left: -80, right: 0 }} dragElastic={0.1} onDragEnd={(_: any, info: any) => { if (info.offset.x < -50) { triggerHaptic("medium"); dismissNotification(n.id); } }} className="cursor-grab active:cursor-grabbing">
                    <button onClick={() => dismissNotification(n.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--fg-02)] transition text-left active:scale-[0.98]">
                      <NotifIcon size={12} className={`${notifColor} shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-[var(--fg-60)] truncate">{n.message}</p>
                        <p className="text-[9px] font-mono text-[var(--fg-15)] mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

      </motion.div>
    </main>
  );
}
