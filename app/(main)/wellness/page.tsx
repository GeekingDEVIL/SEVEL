"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Droplets, Plus, Minus, Undo2, Flame, HeartPulse, ChevronLeft, Settings, TrendingUp, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthProvider";
import { useModules } from "../../lib/useModules";
import CubeLoader from "../../components/ui/cube-loader";
import { staggerContainer, staggerItem } from "../../lib/motion";
import OnboardingTooltip from "../../components/ui/onboarding-tooltip";
import { autoCompleteHabits } from "../../lib/habitAutoComplete";

const DEFAULT_GOAL_ML = 3000;
const GOAL_OPTIONS = [2000, 2500, 3000, 3500, 4000, 4500, 5000];
const QUICK_AMOUNTS = [250, 500, 750, 1000];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type WaterLog = {
  id: string;
  amount_ml: number;
  logged_at: string;
};

type DayTotal = {
  date: string;
  label: string;
  total: number;
  metGoal: boolean;
};

function getDayTotals(logs: WaterLog[], days: number, goal: number): DayTotal[] {
  const result: DayTotal[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayLogs = logs.filter((l) => l.logged_at.slice(0, 10) === dateStr);
    const total = dayLogs.reduce((s, l) => s + l.amount_ml, 0);
    result.push({
      date: dateStr,
      label: i === 0 ? "Today" : DAY_LABELS[d.getDay()],
      total,
      metGoal: total >= goal,
    });
  }
  return result;
}

function computeStreak(dayTotals: DayTotal[]): number {
  let streak = 0;
  for (let i = dayTotals.length - 1; i >= 0; i--) {
    if (dayTotals[i].metGoal) streak++;
    else break;
  }
  return streak;
}

export default function WellnessPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { enabledKeys } = useModules();
  const [todayLogs, setTodayLogs] = useState<WaterLog[]>([]);
  const [weekLogs, setWeekLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState(250);
  const [animateSplash, setAnimateSplash] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [goalMl, setGoalMl] = useState(DEFAULT_GOAL_ML);
  const [hydrationCorrelation, setHydrationCorrelation] = useState<{ betterPct: number; hydratedDays: number; totalDays: number } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sevel_water_goal_ml");
      if (saved) setGoalMl(parseInt(saved, 10));
    } catch {}
  }, []);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const weekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const loadLogs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("water_logs")
      .select("id, amount_ml, logged_at")
      .eq("user_id", user.id)
      .gte("logged_at", weekStart)
      .order("logged_at", { ascending: false });
    const all = data ?? [];
    setWeekLogs(all);
    setTodayLogs(all.filter((l) => l.logged_at >= todayStart));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const [waterRes, sessionsRes] = await Promise.all([
      supabase.from("water_logs").select("amount_ml, logged_at").eq("user_id", user.id).gte("logged_at", thirtyDaysAgo.toISOString()),
      supabase.from("workout_sessions").select("completed_at, total_volume").eq("user_id", user.id).gte("completed_at", thirtyDaysAgo.toISOString()).not("total_volume", "is", null),
    ]);
    const waterData = waterRes.data ?? [];
    const sessionData = sessionsRes.data ?? [];
    if (sessionData.length >= 4) {
      const savedGoal = (() => { try { const v = localStorage.getItem("sevel_water_goal_ml"); return v ? parseInt(v, 10) : DEFAULT_GOAL_ML; } catch { return DEFAULT_GOAL_ML; } })();
      const dayWaterMap: Record<string, number> = {};
      for (const w of waterData) {
        const d = w.logged_at.slice(0, 10);
        dayWaterMap[d] = (dayWaterMap[d] || 0) + w.amount_ml;
      }
      let hydratedVol: number[] = [];
      let notHydratedVol: number[] = [];
      for (const s of sessionData) {
        const d = s.completed_at.slice(0, 10);
        const water = dayWaterMap[d] || 0;
        if (water >= savedGoal) hydratedVol.push(s.total_volume);
        else notHydratedVol.push(s.total_volume);
      }
      if (hydratedVol.length >= 2 && notHydratedVol.length >= 2) {
        const avgH = hydratedVol.reduce((a, b) => a + b, 0) / hydratedVol.length;
        const avgN = notHydratedVol.reduce((a, b) => a + b, 0) / notHydratedVol.length;
        if (avgN > 0) {
          const betterPct = Math.round(((avgH - avgN) / avgN) * 100);
          setHydrationCorrelation({ betterPct, hydratedDays: hydratedVol.length, totalDays: hydratedVol.length + notHydratedVol.length });
        }
      }
    }

    setLoading(false);
  }, [user, weekStart, todayStart]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalMl = todayLogs.reduce((sum, l) => sum + l.amount_ml, 0);
  const pct = Math.min(100, Math.round((totalMl / goalMl) * 100));
  const glasses = Math.round(totalMl / 250);

  const dayTotals = useMemo(() => getDayTotals(weekLogs, 7, goalMl), [weekLogs, goalMl]);
  const streak = useMemo(() => computeStreak(dayTotals), [dayTotals]);
  const maxDay = Math.max(goalMl, ...dayTotals.map((d) => d.total));
  const weekAvg = Math.round(dayTotals.reduce((s, d) => s + d.total, 0) / 7);
  const daysMetGoal = dayTotals.filter((d) => d.metGoal).length;

  async function logWater(ml: number) {
    if (!user || ml <= 0) return;
    setAnimateSplash(true);
    setTimeout(() => setAnimateSplash(false), 600);
    const { data } = await supabase
      .from("water_logs")
      .insert({ user_id: user.id, amount_ml: ml })
      .select("id, amount_ml, logged_at")
      .single();
    if (data) {
      const newLogs = [data, ...todayLogs];
      setTodayLogs(newLogs);
      setWeekLogs((prev) => [data, ...prev]);
      const newTotal = newLogs.reduce((s, l: any) => s + (l.amount_ml || 0), 0);
      if (newTotal >= goalMl && totalMl < goalMl) {
        autoCompleteHabits(user.id, "water_goal").catch(() => {});
      }
    }
  }

  async function undoLast() {
    if (!todayLogs.length) return;
    const last = todayLogs[0];
    await supabase.from("water_logs").delete().eq("id", last.id);
    setTodayLogs((prev) => prev.slice(1));
    setWeekLogs((prev) => prev.filter((l) => l.id !== last.id));
  }

  const fillColor = pct >= 100 ? "16 185 129" : "59 130 246";

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">
      <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-5">
        <button onClick={() => router.push("/track")} className="flex items-center gap-1 text-[var(--fg-40)] hover:text-[var(--fg-60)] transition">
          <ChevronLeft size={18} />
          <span className="text-xs font-mono">Track</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-display text-[rgb(var(--accent-light-rgb))]">Hydration</h1>
            <p className="text-[11px] text-[var(--fg-30)] mt-0.5">Stay on top of your water intake</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-[var(--fg-90)]">
              {(totalMl / 1000).toFixed(1)}<span className="text-sm text-[var(--fg-30)]">L</span>
            </p>
            <button onClick={() => setShowGoalPicker(p => !p)} className="flex items-center gap-1 text-[9px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-50)] transition">
              of {goalMl / 1000}L goal <Settings size={10} />
            </button>
          </div>
        </div>

        {loading ? (
          <CubeLoader message="Loading hydration data…" />
        ) : (
          <>
            {/* Animated Glass */}
            <div className="flex flex-col items-center py-4">
              <div className="relative w-36 h-52">
                <svg viewBox="0 0 120 180" className="w-full h-full" style={{ filter: "drop-shadow(0 0 12px rgba(59, 130, 246, 0.15))" }}>
                  <defs>
                    <clipPath id="glassClip">
                      <path d="M20,10 L15,170 Q15,175 20,175 L100,175 Q105,175 105,170 L100,10 Z" />
                    </clipPath>
                    <linearGradient id="waterGrad" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor={`rgb(${fillColor})`} stopOpacity="0.6" />
                      <stop offset="100%" stopColor={`rgb(${fillColor})`} stopOpacity="0.25" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M20,10 L15,170 Q15,175 20,175 L100,175 Q105,175 105,170 L100,10"
                    fill="none" stroke="var(--fg-15)" strokeWidth="2" strokeLinecap="round"
                  />
                  <g clipPath="url(#glassClip)">
                    <motion.rect
                      x="10" width="100" height="170" fill="url(#waterGrad)"
                      initial={{ y: 175 }}
                      animate={{ y: 175 - (pct / 100) * 165 }}
                      transition={{ type: "spring", stiffness: 60, damping: 15 }}
                    />
                    {pct > 0 && (
                      <motion.ellipse
                        cx="60" rx="55" ry="4" fill={`rgba(${fillColor}, 0.3)`}
                        initial={{ cy: 175 }}
                        animate={{ cy: 175 - (pct / 100) * 165 }}
                        transition={{ type: "spring", stiffness: 60, damping: 15 }}
                      />
                    )}
                  </g>
                  <AnimatePresence>
                    {animateSplash && (
                      <>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.circle
                            key={i} cx={40 + i * 10} r={2 + i * 0.5}
                            fill={`rgba(${fillColor}, 0.5)`}
                            initial={{ cy: 170, opacity: 1 }}
                            animate={{ cy: 170 - (pct / 100) * 165 - 20, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                          />
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span
                    key={pct}
                    className="text-3xl font-bold font-mono"
                    style={{ color: `rgb(${fillColor})`, textShadow: `0 0 20px rgba(${fillColor}, 0.4)` }}
                    initial={{ scale: 1.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    {pct}%
                  </motion.span>
                </div>
              </div>
              <p className="text-[10px] font-mono text-[var(--fg-30)] mt-2">
                {glasses} glass{glasses !== 1 ? "es" : ""} today
              </p>
              {pct >= 100 && (
                <motion.p
                  className="text-xs font-bold mt-2"
                  style={{ color: `rgb(${fillColor})` }}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Goal reached!
                </motion.p>
              )}
            </div>

            {/* Quick log buttons */}
            <div className="relative">
              <OnboardingTooltip id="hydration-quicklog" message="Tap a button to quickly log water intake" position="top" />
            </div>
            <motion.div
              className="grid grid-cols-4 gap-2"
              variants={staggerContainer} initial="hidden" animate="visible"
            >
              {QUICK_AMOUNTS.map((ml) => (
                <motion.button
                  key={ml} variants={staggerItem}
                  onClick={() => logWater(ml)}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] hover:bg-[var(--fg-05)] active:scale-95 transition"
                >
                  <Droplets size={16} className="text-blue-400/70" />
                  <span className="text-xs font-mono font-bold text-[var(--fg-80)]">{ml}ml</span>
                  <span className="text-[8px] font-mono text-[var(--fg-25)]">{ml / 250} glass</span>
                </motion.button>
              ))}
            </motion.div>

            {/* Custom amount */}
            <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-4">
              <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-3">CUSTOM AMOUNT</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCustomAmount((p) => Math.max(50, p - 50))}
                  className="w-10 h-10 rounded-lg border border-[var(--fg-10)] flex items-center justify-center text-[var(--fg-40)] hover:text-[var(--fg-70)] active:scale-95 transition"
                >
                  <Minus size={16} />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-bold font-mono text-[var(--fg-90)]">{customAmount}</span>
                  <span className="text-sm font-mono text-[var(--fg-30)] ml-1">ml</span>
                </div>
                <button
                  onClick={() => setCustomAmount((p) => Math.min(2000, p + 50))}
                  className="w-10 h-10 rounded-lg border border-[var(--fg-10)] flex items-center justify-center text-[var(--fg-40)] hover:text-[var(--fg-70)] active:scale-95 transition"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() => logWater(customAmount)}
                  className="px-4 h-10 rounded-lg font-mono text-sm font-bold text-[var(--fg-90)] active:scale-95 transition"
                  style={{ background: `rgb(${fillColor} / 0.2)`, border: `1px solid rgb(${fillColor} / 0.3)` }}
                >
                  Log
                </button>
              </div>
            </div>

            {/* Streak + Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-3 text-center">
                <Flame size={16} className="mx-auto mb-1 text-orange-400/70" />
                <p className="text-lg font-bold font-mono text-[var(--fg-90)]">{streak}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">DAY STREAK</p>
              </div>
              <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-3 text-center">
                <Droplets size={16} className="mx-auto mb-1 text-blue-400/70" />
                <p className="text-lg font-bold font-mono text-[var(--fg-90)]">{(weekAvg / 1000).toFixed(1)}L</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">WEEK AVG</p>
              </div>
              <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-3 text-center">
                <HeartPulse size={16} className="mx-auto mb-1 text-emerald-400/70" />
                <p className="text-lg font-bold font-mono text-[var(--fg-90)]">{daysMetGoal}<span className="text-xs text-[var(--fg-30)]">/7</span></p>
                <p className="text-[8px] font-mono text-[var(--fg-25)]">GOALS MET</p>
              </div>
            </div>

            {/* Goal picker (#28) */}
            <AnimatePresence>
              {showGoalPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-4">
                    <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-3">DAILY WATER GOAL</p>
                    <div className="flex flex-wrap gap-2">
                      {GOAL_OPTIONS.map(ml => (
                        <button
                          key={ml}
                          onClick={() => {
                            setGoalMl(ml);
                            try { localStorage.setItem("sevel_water_goal_ml", String(ml)); } catch {}
                            setShowGoalPicker(false);
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-mono transition ${
                            ml === goalMl
                              ? "bg-blue-500/20 border border-blue-400/30 text-blue-300"
                              : "border border-[var(--fg-06)] text-[var(--fg-50)] hover:bg-[var(--fg-04)]"
                          }`}
                        >
                          {ml / 1000}L
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hydration-performance correlation (#29) */}
            {hydrationCorrelation && hydrationCorrelation.betterPct !== 0 && (
              <div className="rounded-xl border border-blue-500/10 bg-blue-500/[0.03] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} className="text-blue-400/70" />
                  <p className="text-[9px] font-mono tracking-widest text-blue-400/40">HYDRATION × PERFORMANCE</p>
                </div>
                <p className="text-sm text-[var(--fg-70)]">
                  {hydrationCorrelation.betterPct > 0
                    ? `You perform ${hydrationCorrelation.betterPct}% better on days you hit your water goal`
                    : `Your workout volume is consistent regardless of hydration — keep it up!`}
                </p>
                <p className="text-[10px] text-[var(--fg-25)] mt-1">
                  Based on {hydrationCorrelation.totalDays} sessions over the last 30 days ({hydrationCorrelation.hydratedDays} on hydrated days)
                </p>
              </div>
            )}

            {/* 7-Day Chart */}
            <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-4">
              <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-3">LAST 7 DAYS</p>
              <div className="flex items-end gap-1.5 h-28">
                {dayTotals.map((day) => {
                  const barPct = maxDay > 0 ? (day.total / maxDay) * 100 : 0;
                  const goalLine = (goalMl / maxDay) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 h-full relative">
                      <div className="flex-1 w-full flex items-end relative">
                        {/* Goal line */}
                        <div
                          className="absolute w-full border-t border-dashed border-[var(--fg-10)]"
                          style={{ bottom: `${goalLine}%` }}
                        />
                        <motion.div
                          className="w-full rounded-t-sm"
                          style={{
                            background: day.metGoal
                              ? "linear-gradient(to top, rgb(16 185 129 / 0.5), rgb(16 185 129 / 0.2))"
                              : "linear-gradient(to top, rgb(59 130 246 / 0.4), rgb(59 130 246 / 0.15))",
                          }}
                          initial={{ height: 0 }}
                          animate={{ height: `${barPct}%` }}
                          transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.05 }}
                        />
                      </div>
                      <span className={`text-[8px] font-mono ${day.label === "Today" ? "text-[var(--fg-60)]" : "text-[var(--fg-20)]"}`}>
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[8px] font-mono text-[var(--fg-15)]">--- {goalMl / 1000}L goal</span>
                <span className="text-[8px] font-mono text-[var(--fg-15)]">
                  Best: {(Math.max(...dayTotals.map((d) => d.total)) / 1000).toFixed(1)}L
                </span>
              </div>
            </div>

            {/* Recovery Tie-in */}
            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-4">
              <div className="flex items-center gap-2 mb-2">
                <HeartPulse size={14} className="text-emerald-400/70" />
                <p className="text-[9px] font-mono tracking-widest text-emerald-400/40">RECOVERY IMPACT</p>
              </div>
              <p className="text-xs text-[var(--fg-50)]">
                {pct >= 100
                  ? "Excellent hydration today. Proper hydration improves muscle recovery by up to 25% and reduces delayed onset muscle soreness."
                  : pct >= 60
                    ? `You're ${100 - pct}% away from your hydration goal. Staying hydrated helps transport nutrients to recovering muscles.`
                    : "Low hydration can impair recovery and performance. Try to reach at least 60% of your daily goal for optimal muscle repair."}
              </p>
              {pct < 100 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-[var(--fg-04)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 60
                          ? "linear-gradient(90deg, rgb(16 185 129 / 0.4), rgb(16 185 129 / 0.7))"
                          : "linear-gradient(90deg, rgb(239 68 68 / 0.4), rgb(239 68 68 / 0.7))",
                      }}
                    />
                  </div>
                  <span className="text-[8px] font-mono text-[var(--fg-20)]">{goalMl - totalMl}ml to go</span>
                </div>
              )}
            </div>

            {/* Today's log */}
            <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">TODAY&apos;S LOG</p>
                {todayLogs.length > 0 && (
                  <button
                    onClick={undoLast}
                    className="flex items-center gap-1 text-[9px] font-mono text-[var(--fg-25)] hover:text-[var(--fg-50)] transition"
                  >
                    <Undo2 size={10} /> Undo last
                  </button>
                )}
              </div>
              {todayLogs.length === 0 ? (
                <p className="text-xs text-[var(--fg-20)] text-center py-4">No water logged yet today</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {todayLogs.map((log, i) => (
                    <motion.div
                      key={log.id}
                      initial={i === 0 ? { opacity: 0, x: -10 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-[var(--fg-02)]"
                    >
                      <div className="flex items-center gap-2">
                        <Droplets size={12} className="text-blue-400/50" />
                        <span className="text-xs font-mono text-[var(--fg-60)]">{log.amount_ml}ml</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--fg-25)]">
                        {new Date(log.logged_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
