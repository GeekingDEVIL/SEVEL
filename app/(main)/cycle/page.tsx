"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Droplets, Brain, Moon, Zap, Calendar,
  TrendingUp, Heart, Plus, Check, X, Flame, Wind,
  BookOpen, AlertTriangle, ChevronDown, Baby, Shield,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthProvider";
import { useSex } from "../../lib/useSex";
import {
  estimateCyclePhase, computeAdaptiveCycleLength, getCycleInsight,
  fetchCycleLogs, fetchCycleSymptoms, logPeriod, endPeriod, logSymptoms,
  detectIrregularities, computeCycleGaps,
  SYMPTOM_OPTIONS, MOOD_OPTIONS, FLOW_LEVELS, CRAVING_OPTIONS, CYCLE_GUIDE,
  type CycleLog, type CycleSymptomLog, type CycleInsight, type CycleIrregularity, type FertilityLevel,
} from "../../lib/cycleAwareTrend";
import {
  getPhaseIntelligence, computeCycleScore, getWellnessSuggestions, ENERGY_LABELS, SLEEP_LABELS, MEDICAL_DISCLAIMER,
  type PhaseIntelligence, type HealthFlag, type CycleScore, type SymptomPrediction, type WellnessSuggestion,
} from "../../lib/menstrualEngine";
import { getPhaseTrainingProfile, type PhaseTrainingProfile } from "../../lib/cycleTrainingEngine";
import CubeLoader from "../../components/ui/cube-loader";
import { staggerContainer, staggerItem, tabContent } from "../../lib/motion";
import AnimatedTabs from "../../components/ui/animated-tabs";
import { useModules } from "../../lib/useModules";

type Tab = "today" | "log" | "insights" | "learn";

const PHASE_COLORS: Record<string, { bg: string; border: string; text: string; icon: any; ring: string }> = {
  menstrual: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: Droplets, ring: "stroke-red-400" },
  follicular: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", icon: TrendingUp, ring: "stroke-green-400" },
  ovulation: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", icon: Flame, ring: "stroke-amber-400" },
  luteal: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", icon: Moon, ring: "stroke-purple-400" },
};

const PHASE_LABELS: Record<string, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulation",
  luteal: "Luteal",
};

const FERTILITY_META: Record<FertilityLevel, { label: string; color: string; bg: string; border: string }> = {
  none: { label: "Not fertile", color: "text-[var(--fg-30)]", bg: "bg-[var(--fg-03)]", border: "border-[var(--fg-06)]" },
  low: { label: "Low fertility", color: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  high: { label: "Fertile", color: "text-pink-300", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  peak: { label: "Peak fertility", color: "text-pink-400", bg: "bg-pink-500/15", border: "border-pink-500/30" },
};

const PHASE_GRADIENT: Record<string, [string, string]> = {
  menstrual: ["#f87171", "#fb7185"],
  follicular: ["#4ade80", "#34d399"],
  ovulation: ["#fbbf24", "#f59e0b"],
  luteal: ["#a78bfa", "#8b5cf6"],
};

function CycleRing({ cycleDay, cycleLength, phase }: { cycleDay: number; cycleLength: number; phase: string }) {
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = cycleDay / cycleLength;
  const offset = circumference * (1 - progress);
  const pc = PHASE_COLORS[phase];
  const [c1, c2] = PHASE_GRADIENT[phase] ?? PHASE_GRADIENT.follicular;
  const gradId = `ring-grad-${phase}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${c1}08 0%, transparent 70%)` }} />
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--fg-04)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius - 4} fill="none" stroke="var(--fg-02)" strokeWidth={1} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={`url(#${gradId})`} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${c1}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold font-mono ${pc.text}`} style={{ textShadow: `0 0 20px ${c1}30` }}>{cycleDay}</span>
        <span className="text-[8px] font-mono text-[var(--fg-25)] mt-0.5">of {cycleLength}</span>
      </div>
    </div>
  );
}

export default function CyclePage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { enabledKeys } = useModules();
  const { sex: userSex } = useSex();
  const pathTab = pathname.split("/").pop() as Tab | undefined;
  const validCycleTabs: Tab[] = ["today", "log", "insights", "learn"];
  const resolvedTab = pathTab && validCycleTabs.includes(pathTab) ? pathTab : "today";
  const [tab, setTab] = useState<Tab>(resolvedTab);
  useEffect(() => { setTab(resolvedTab); }, [resolvedTab]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<CycleLog[]>([]);
  const [symptoms, setSymptoms] = useState<CycleSymptomLog[]>([]);
  const [insight, setInsight] = useState<CycleInsight | null>(null);
  const [irregularities, setIrregularities] = useState<CycleIrregularity[]>([]);
  const [intelligence, setIntelligence] = useState<PhaseIntelligence | null>(null);

  const [periodDate, setPeriodDate] = useState(() => { const _d = new Date(); return `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`; });
  const [flowLevel, setFlowLevel] = useState("medium");
  const [logSaving, setLogSaving] = useState(false);

  const [todaySymptoms, setTodaySymptoms] = useState<string[]>([]);
  const [todayEnergy, setTodayEnergy] = useState<number | null>(null);
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [todaySleep, setTodaySleep] = useState<number | null>(null);
  const [todayCraving, setTodayCraving] = useState<string | null>(null);
  const [symptomSaved, setSymptomSaved] = useState(false);

  const [wellnessSuggestions, setWellnessSuggestions] = useState<WellnessSuggestion[]>([]);
  const [openGuide, setOpenGuide] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [hormonalBc, setHormonalBc] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const today = (() => { const _d = new Date(); return `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, "0")}-${String(_d.getDate()).padStart(2, "0")}`; })();

  const loadData = useCallback(async () => {
    if (!user) return;
    const [cycleLogs, cycleSymptoms, { data: prof }] = await Promise.all([
      fetchCycleLogs(user.id),
      fetchCycleSymptoms(user.id, 60),
      supabase.from("profiles").select("hormonal_bc").eq("id", user.id).maybeSingle(),
    ]);

    setHormonalBc(prof?.hormonal_bc ?? false);
    setLogs(cycleLogs);
    setSymptoms(cycleSymptoms);

    if (userSex !== "female") {
      setLoading(false);
      return;
    }

    const periodStarts = cycleLogs.map((l) => l.period_start);
    const cycleLen = computeAdaptiveCycleLength(periodStarts);

    const { data: goals } = await supabase
      .from("user_goals")
      .select("cycle_start_date")
      .eq("user_id", user.id)
      .eq("sex", userSex)
      .limit(1);

    const lastStart = periodStarts[0] ?? goals?.[0]?.cycle_start_date ?? today;
    const cycleInsight = getCycleInsight(lastStart, cycleLen, today, periodStarts);
    setInsight(cycleInsight);

    const irr = detectIrregularities(periodStarts, cycleLogs);
    setIrregularities(irr);

    const intel = getPhaseIntelligence(cycleLogs, cycleSymptoms);
    setIntelligence(intel);

    const todayLog = cycleSymptoms.find((s) => s.date === today);
    if (todayLog) {
      setTodaySymptoms(todayLog.symptoms ?? []);
      setTodayEnergy(todayLog.energy_level);
      setTodayMood(todayLog.mood);
      setTodaySleep(todayLog.sleep_quality);
      setTodayCraving(todayLog.craving);
      setSymptomSaved(true);
      const phase = cycleInsight?.currentPhase ?? null;
      setWellnessSuggestions(getWellnessSuggestions(todayLog.symptoms ?? [], todayLog.mood, todayLog.energy_level, todayLog.sleep_quality, todayLog.craving, phase));
    }

    setLoading(false);
  }, [user, today, userSex]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleLogPeriod() {
    if (!user) return;
    setLogSaving(true);
    await logPeriod(user.id, periodDate, flowLevel);
    setLogSaving(false);
    await loadData();
    router.replace("/cycle/today");
  }

  async function handleEndPeriod(log: CycleLog) {
    if (!user) return;
    await endPeriod(user.id, log.period_start, today);
    await loadData();
  }

  async function handleSaveSymptoms() {
    if (!user) return;
    await logSymptoms(user.id, today, {
      symptoms: todaySymptoms,
      energy_level: todayEnergy ?? undefined,
      mood: todayMood ?? undefined,
      sleep_quality: todaySleep ?? undefined,
      craving: todayCraving ?? undefined,
    });
    setSymptomSaved(true);
    const phase = insight?.currentPhase ?? null;
    setWellnessSuggestions(getWellnessSuggestions(todaySymptoms, todayMood, todayEnergy, todaySleep, todayCraving, phase));
  }

  async function toggleHormonalBc() {
    if (!user) return;
    const next = !hormonalBc;
    setHormonalBc(next);
    await supabase.from("profiles").update({ hormonal_bc: next }).eq("id", user.id);
  }

  function toggleSymptom(s: string) {
    setSymptomSaved(false);
    setTodaySymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center">
        <CubeLoader message="Loading cycle data…" />
      </main>
    );
  }

  if (userSex !== "female") {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-[var(--fg-40)] text-sm">Cycle tracking is available in female mode.</p>
          <button onClick={() => router.push("/profile")} className="text-[10px] font-mono text-[rgb(var(--accent-light-rgb))] hover:underline">
            Go to Profile Settings
          </button>
        </div>
      </main>
    );
  }

  const phaseStyle = insight ? PHASE_COLORS[insight.currentPhase] : PHASE_COLORS.follicular;
  const fertMeta = insight ? FERTILITY_META[insight.fertility] : FERTILITY_META.none;
  const activePeriod = logs[0] && !logs[0].period_end ? logs[0] : null;

  const trainingProfile: PhaseTrainingProfile | null = insight
    ? getPhaseTrainingProfile(
        insight.currentPhase as any,
        insight.cycleDay,
        insight.phaseDaysRemaining,
        hormonalBc,
        todaySymptoms.length > 0 ? todaySymptoms : undefined,
        todayEnergy,
      )
    : null;

  function fmtDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">

      <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-4">
        <button onClick={() => router.push("/track")} className="flex items-center gap-1 text-[var(--fg-40)] hover:text-[var(--fg-60)] transition">
          <ChevronLeft size={18} />
          <span className="text-xs font-mono">Track</span>
        </button>

        {/* ── Phase Hero ── */}
        {insight && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-02)] overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] opacity-20" style={{ background: PHASE_GRADIENT[insight.currentPhase]?.[0] ?? "#4ade80" }} />
            <div className="relative px-5 pt-5 pb-4">
              <div className="flex items-center gap-5">
                <CycleRing cycleDay={insight.cycleDay} cycleLength={insight.cycleLength} phase={insight.currentPhase} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xl font-bold tracking-wide ${phaseStyle.text}`}>
                    {PHASE_LABELS[insight.currentPhase]}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--fg-35)] mt-1">{insight.phaseDaysRemaining}d left in phase</p>

                  {/* Fertility badge */}
                  <div className={`inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full border ${fertMeta.border} ${fertMeta.bg}`}>
                    {insight.fertility === "peak" || insight.fertility === "high" ? (
                      <Baby size={11} className={fertMeta.color} />
                    ) : (
                      <Shield size={11} className={fertMeta.color} />
                    )}
                    <span className={`text-[9px] font-mono font-semibold ${fertMeta.color}`}>{fertMeta.label.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              {/* Phase progress bar */}
              <div className="mt-4 flex items-center gap-1">
                {(["menstrual", "follicular", "ovulation", "luteal"] as const).map((p) => {
                  const isActive = p === insight.currentPhase;
                  const pc = PHASE_COLORS[p];
                  const [gc1] = PHASE_GRADIENT[p] ?? PHASE_GRADIENT.follicular;
                  return (
                    <div key={p} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full h-1.5 rounded-full transition-all ${isActive ? "" : "bg-[var(--fg-06)]"}`}>
                        {isActive ? (
                          <div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${gc1}, ${gc1}90)`, boxShadow: `0 0 8px ${gc1}30` }} />
                        ) : null}
                      </div>
                      <span className={`text-[7px] font-mono ${isActive ? pc.text : "text-[var(--fg-15)]"}`}>{PHASE_LABELS[p].slice(0, 3).toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prediction & fertility window */}
            <div className="border-t border-[var(--fg-04)] px-5 py-3 flex flex-wrap gap-x-6 gap-y-2">
              {insight.nextPeriodEstimate && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--fg-30)]">
                  <Calendar size={11} />
                  <span>Next period: <span className="text-[var(--fg-60)]">
                    {insight.nextPeriodRange
                      ? `${fmtDate(insight.nextPeriodRange[0])} – ${fmtDate(insight.nextPeriodRange[1])}`
                      : fmtDate(insight.nextPeriodEstimate)}
                  </span></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--fg-30)]">
                <Flame size={11} />
                <span>Fertile window: Day {insight.fertileWindowStart}–{insight.fertileWindowEnd}</span>
              </div>
            </div>

            {/* Active period banner */}
            {activePeriod && (
              <div className="border-t border-red-500/10 px-5 py-3 flex items-center justify-between bg-red-500/[0.03]">
                <div className="flex items-center gap-2">
                  <Droplets size={12} className="text-red-400" />
                  <span className="text-[10px] font-mono text-red-400">Period in progress — started {fmtDate(activePeriod.period_start)}</span>
                </div>
                <button onClick={() => handleEndPeriod(activePeriod)} className="text-[9px] font-mono px-2.5 py-1 rounded-lg border border-red-500/20 text-red-400/70 hover:text-red-400 transition">
                  End
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Tabs ── */}
        <AnimatedTabs
          tabs={[
            { key: "today", label: "TODAY", icon: Zap },
            { key: "log", label: "LOG", icon: Plus },
            { key: "insights", label: "INSIGHTS", icon: TrendingUp },
            { key: "learn", label: "LEARN", icon: BookOpen },
          ]}
          activeTab={tab}
          onTabChange={(k) => router.replace(`/cycle/${k}`)}
          accentRgb="236 72 153"
        />

        <AnimatePresence mode="wait">
          {/* ═════ TODAY ═════ */}
          {tab === "today" && insight && (
            <motion.div key="today" className="space-y-3" variants={tabContent} initial="hidden" animate="visible" exit="exit">
              {/* Phase info */}
              <div className={`rounded-xl border ${phaseStyle.border} ${phaseStyle.bg} p-4 relative overflow-hidden`}>
                <div className="absolute top-0 left-0 w-1 h-full rounded-r" style={{ background: PHASE_GRADIENT[insight.currentPhase]?.[0] ?? "#4ade80" }} />
                <p className={`text-[11px] font-semibold ${phaseStyle.text} mb-1.5 pl-2`}>What's happening in your body</p>
                <p className="text-[12px] text-[var(--fg-60)] leading-relaxed pl-2">{insight.phaseInfo}</p>
              </div>

              {/* Training recommendation from cycleTrainingEngine (#31) */}
              {trainingProfile && (
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className={phaseStyle.text} />
                    <span className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">TRAINING ADJUSTMENTS</span>
                  </div>
                  <div className="rounded-lg p-3 border" style={{ borderColor: trainingProfile.banner.color + "30", background: trainingProfile.banner.color + "08" }}>
                    <p className="text-sm font-bold" style={{ color: trainingProfile.banner.color }}>{trainingProfile.banner.headline}</p>
                    <p className="text-[10px] text-[var(--fg-50)] mt-1 leading-relaxed">{trainingProfile.banner.detail}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-[var(--fg-02)] border border-[var(--fg-06)] p-2 text-center">
                      <p className="text-lg font-bold font-mono text-[var(--fg-80)]">{Math.round(trainingProfile.intensityModifier * 100)}%</p>
                      <p className="text-[7px] font-mono text-[var(--fg-25)]">INTENSITY</p>
                    </div>
                    <div className="rounded-lg bg-[var(--fg-02)] border border-[var(--fg-06)] p-2 text-center">
                      <p className="text-lg font-bold font-mono text-[var(--fg-80)]">{Math.round(trainingProfile.volumeModifier * 100)}%</p>
                      <p className="text-[7px] font-mono text-[var(--fg-25)]">VOLUME</p>
                    </div>
                    <div className="rounded-lg bg-[var(--fg-02)] border border-[var(--fg-06)] p-2 text-center">
                      <p className="text-lg font-bold font-mono text-[var(--fg-80)]">{trainingProfile.restMultiplier}x</p>
                      <p className="text-[7px] font-mono text-[var(--fg-25)]">REST</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--fg-04)] font-mono text-[var(--fg-40)]">{trainingProfile.styleName}</span>
                    <span className="text-[var(--fg-30)]">Warm-up: {trainingProfile.warmUpGuidance.minutes}min {trainingProfile.warmUpGuidance.focus}</span>
                  </div>
                </div>
              )}

              {/* Nutrition */}
              <div className="glass-card p-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-0.5 h-full bg-amber-400/40 rounded-r" />
                <div className="flex items-center gap-1.5 mb-2 pl-1.5">
                  <Heart size={11} className={phaseStyle.text} />
                  <span className="text-[8px] font-mono tracking-widest text-[var(--fg-25)]">NUTRITION</span>
                </div>
                <p className="text-[10px] text-[var(--fg-55)] leading-relaxed pl-1.5">
                  {trainingProfile?.nutritionTip ?? insight.nutritionRec}
                </p>
              </div>
              <p className="text-[7px] font-mono text-[var(--fg-12)] leading-relaxed -mt-1 px-1">{MEDICAL_DISCLAIMER}</p>

              {/* Symptom predictions from engine */}
              {intelligence && intelligence.predictions.length > 0 && (
                <div className="glass-card p-4 space-y-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Brain size={12} className={phaseStyle.text} />
                    <span className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">WHAT TO EXPECT TODAY</span>
                  </div>
                  {intelligence.predictions.map((pred) => (
                    <div key={pred.symptom} className="flex items-start gap-3 rounded-lg bg-[var(--fg-01)] border border-[var(--fg-04)] p-3 relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-0.5 h-full rounded-r ${
                        pred.likelihood === "likely" ? "bg-amber-400" :
                        pred.likelihood === "possible" ? "bg-[var(--fg-20)]" : "bg-[var(--fg-10)]"
                      }`} />
                      <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                        pred.likelihood === "likely" ? "bg-amber-500/15 text-amber-400" :
                        pred.likelihood === "possible" ? "bg-[var(--fg-04)] text-[var(--fg-30)]" :
                        "bg-[var(--fg-02)] text-[var(--fg-15)]"
                      }`}>{pred.likelihood === "likely" ? "LIKELY" : pred.likelihood === "possible" ? "MAYBE" : "LOW"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-[var(--fg-65)]">{pred.symptom}</p>
                        <p className="text-[9px] text-[var(--fg-30)] mt-0.5 leading-relaxed">{pred.reason}</p>
                        <p className="text-[9px] text-[rgb(var(--accent-light-rgb)/0.5)] mt-0.5">{pred.tip}</p>
                      </div>
                    </div>
                  ))}
                  <p className="text-[7px] font-mono text-[var(--fg-12)] mt-2 leading-relaxed">{MEDICAL_DISCLAIMER}</p>
                </div>
              )}

              {/* Hormone & nutrition intel */}
              {intelligence && (
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Wind size={12} className={phaseStyle.text} />
                    <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">HORMONE PROFILE</p>
                  </div>
                  <p className="text-[10px] text-[var(--fg-50)] leading-relaxed">{intelligence.symptoms.hormoneProfile}</p>
                  <div className="border-t border-[var(--fg-04)] pt-3">
                    <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-2">KEY NUTRIENTS THIS PHASE</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {intelligence.nutrition.keyNutrients.map((n) => (
                        <div key={n.nutrient} className="rounded-lg bg-[var(--fg-02)] border border-[var(--fg-04)] p-2.5">
                          <span className="text-[9px] font-mono font-semibold text-[rgb(var(--accent-light-rgb))]">{n.nutrient}</span>
                          <p className="text-[8px] text-[var(--fg-30)] leading-relaxed mt-0.5">{n.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[8px] text-[var(--fg-15)] italic pt-1">{intelligence.nutrition.caloricNote}</p>
                  <div className="border-t border-[var(--fg-04)] pt-2 mt-2">
                    <p className="text-[7px] font-mono text-[var(--fg-12)] leading-relaxed">{MEDICAL_DISCLAIMER}</p>
                  </div>
                </div>
              )}

              {/* Quick symptom check-in */}
              <div className="glass-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Heart size={12} className={phaseStyle.text} />
                    <p className="text-[10px] font-mono tracking-widest text-[var(--fg-30)]">HOW ARE YOU FEELING?</p>
                  </div>
                  {symptomSaved && <span className="text-[9px] font-mono text-green-400 flex items-center gap-1"><Check size={10} /> Saved</span>}
                </div>

                {/* Mood row */}
                <div>
                  <p className="text-[8px] font-mono text-[var(--fg-15)] mb-2">MOOD</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {MOOD_OPTIONS.map((m) => (
                      <button key={m} onClick={() => { setTodayMood(m); setSymptomSaved(false); }}
                        className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition ${todayMood === m ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-06)] text-[var(--fg-30)] hover:text-[var(--fg-55)]"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--fg-04)]" />

                {/* Energy */}
                <div>
                  <p className="text-[8px] font-mono text-[var(--fg-15)] mb-2">ENERGY</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => { setTodayEnergy(n); setSymptomSaved(false); }}
                        className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border transition ${todayEnergy === n ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)]" : "border-[var(--fg-06)] hover:bg-[var(--fg-02)]"}`}>
                        <span className="text-[14px]">{n === 1 ? "🪫" : n === 2 ? "😴" : n === 3 ? "😐" : n === 4 ? "💪" : "🔥"}</span>
                        <span className={`text-[7px] font-mono ${todayEnergy === n ? "text-[rgb(var(--accent-light-rgb)/0.7)]" : "text-[var(--fg-20)]"}`}>{ENERGY_LABELS[n - 1]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--fg-04)]" />

                {/* Symptoms */}
                <div>
                  <p className="text-[8px] font-mono text-[var(--fg-15)] mb-2">SYMPTOMS</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SYMPTOM_OPTIONS.map((s) => (
                      <button key={s} onClick={() => toggleSymptom(s)}
                        className={`text-[9px] font-mono px-2.5 py-1.5 rounded-lg border transition ${todaySymptoms.includes(s) ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-06)] text-[var(--fg-25)] hover:text-[var(--fg-50)] hover:bg-[var(--fg-02)]"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--fg-04)]" />

                {/* Cravings & sleep in a row */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-[8px] font-mono text-[var(--fg-15)] mb-2">CRAVINGS</p>
                    <div className="flex flex-wrap gap-1">
                      {CRAVING_OPTIONS.map((c) => (
                        <button key={c} onClick={() => { setTodayCraving(c); setSymptomSaved(false); }}
                          className={`text-[9px] font-mono px-2.5 py-1.5 rounded-lg border transition ${todayCraving === c ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-06)] text-[var(--fg-25)] hover:bg-[var(--fg-02)]"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <p className="text-[8px] font-mono text-[var(--fg-15)] mb-2">SLEEP</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => { setTodaySleep(n); setSymptomSaved(false); }}
                          className={`flex flex-col items-center gap-0.5 w-10 py-2 text-[12px] rounded-lg border transition ${todaySleep === n ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)]" : "border-[var(--fg-06)] hover:bg-[var(--fg-02)]"}`}>
                          <span>{n === 1 ? "😵" : n === 2 ? "😣" : n === 3 ? "😐" : n === 4 ? "😊" : "😴"}</span>
                          <span className={`text-[6px] font-mono ${todaySleep === n ? "text-[rgb(var(--accent-light-rgb)/0.7)]" : "text-[var(--fg-15)]"}`}>{SLEEP_LABELS[n - 1]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {!symptomSaved && (todayMood || todayEnergy || todaySymptoms.length > 0 || todayCraving || todaySleep) && (
                  <button onClick={handleSaveSymptoms}
                    className="w-full py-3 rounded-xl text-[11px] font-mono font-semibold bg-[rgb(var(--accent-rgb)/0.15)] border border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.25)] active:scale-[0.98] transition">
                    Save Today's Check-in
                  </button>
                )}
              </div>

              {/* Wellness Suggestions */}
              {symptomSaved && wellnessSuggestions.length > 0 && (
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Heart size={12} className={phaseStyle.text} />
                    <span className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">SUGGESTIONS FOR YOU</span>
                  </div>
                  <div className="space-y-2">
                    {wellnessSuggestions.map((s, i) => {
                      const catColor = s.category === "movement" ? "#4ade80" :
                        s.category === "nutrition" ? "#fbbf24" :
                        s.category === "mindfulness" ? "#a78bfa" :
                        s.category === "sleep" ? "#60a5fa" :
                        s.category === "hydration" ? "#22d3ee" : "#f472b6";
                      return (
                        <div key={i} className="rounded-lg bg-[var(--fg-01)] border border-[var(--fg-04)] p-3 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-0.5 h-full rounded-r" style={{ backgroundColor: catColor }} />
                          <div className="pl-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[7px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${catColor}15`, color: catColor }}>{s.category.toUpperCase()}</span>
                              <p className="text-[11px] font-medium text-[var(--fg-65)]">{s.title}</p>
                            </div>
                            <p className="text-[9px] text-[var(--fg-35)] leading-relaxed">{s.description}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {s.trigger && <span className="text-[7px] font-mono text-[var(--fg-20)] px-1.5 py-0.5 rounded bg-[var(--fg-03)]">because: {s.trigger}</span>}
                              {s.source && <p className="text-[7px] font-mono text-[var(--fg-15)]">{s.source}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-[var(--fg-04)] pt-2.5 mt-3">
                    <p className="text-[7px] font-mono text-[var(--fg-15)] leading-relaxed">{MEDICAL_DISCLAIMER}</p>
                  </div>
                </div>
              )}

              {/* ── Hormonal Contraception Toggle ── */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Shield size={14} className="text-violet-400/70" />
                    <div>
                      <p className="text-[11px] font-medium text-[var(--fg-70)]">Hormonal contraception</p>
                      <p className="text-[9px] font-mono text-[var(--fg-30)] mt-0.5">Flattens phase-based training adjustments</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleHormonalBc}
                    className={`relative w-10 h-[22px] rounded-full border transition-all ${
                      hormonalBc
                        ? "bg-violet-500/30 border-violet-400/40"
                        : "bg-[var(--fg-04)] border-[var(--fg-08)]"
                    }`}
                  >
                    <div className={`absolute top-[3px] w-4 h-4 rounded-full transition-all ${
                      hormonalBc
                        ? "left-[21px] bg-violet-400"
                        : "left-[3px] bg-[var(--fg-30)]"
                    }`} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═════ LOG ═════ */}
          {tab === "log" && (
            <motion.div key="log" className="space-y-3" variants={tabContent} initial="hidden" animate="visible" exit="exit">
              {/* ── Calendar ── */}
              {(() => {
                const year = calMonth.getFullYear();
                const month = calMonth.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const _td = new Date();
                const todayStr = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, "0")}-${String(_td.getDate()).padStart(2, "0")}`;

                const periodDays = new Map<string, { flow: string; isStart: boolean; isEnd: boolean }>();
                for (const log of logs) {
                  const start = new Date(log.period_start + "T00:00:00");
                  const end = log.period_end ? new Date(log.period_end + "T00:00:00") : new Date();
                  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                    periodDays.set(ds, {
                      flow: log.flow_level,
                      isStart: ds === log.period_start,
                      isEnd: ds === log.period_end,
                    });
                  }
                }

                const symptomMap = new Map<string, CycleSymptomLog>();
                for (const s of symptoms) symptomMap.set(s.date, s);

                const fertileStart = insight ? insight.fertileWindowStart : null;
                const fertileEnd = insight ? insight.fertileWindowEnd : null;
                const lastPeriodStart = logs[0]?.period_start ?? null;

                function getCycleDay(dateStr: string): number | null {
                  if (!lastPeriodStart) return null;
                  const diff = Math.floor((new Date(dateStr + "T00:00:00").getTime() - new Date(lastPeriodStart + "T00:00:00").getTime()) / 86400000);
                  return diff >= 0 ? diff + 1 : null;
                }

                function isFertile(dateStr: string): boolean {
                  if (!fertileStart || !fertileEnd) return false;
                  const cd = getCycleDay(dateStr);
                  return cd !== null && cd >= fertileStart && cd <= fertileEnd;
                }

                const flowBg: Record<string, string> = {
                  spotting: "rgba(248,113,113,0.15)",
                  light: "rgba(248,113,113,0.25)",
                  medium: "rgba(248,113,113,0.40)",
                  heavy: "rgba(248,113,113,0.60)",
                  very_heavy: "rgba(248,113,113,0.75)",
                };

                const selSym = selectedDay ? symptomMap.get(selectedDay) : null;
                const selPeriod = selectedDay ? periodDays.get(selectedDay) : null;
                const selDate = selectedDay ? new Date(selectedDay + "T00:00:00") : null;

                return (
                  <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-02)] overflow-hidden relative">
                    {/* Ambient glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-[60px] opacity-[0.04] bg-red-400 pointer-events-none" />

                    {/* Month nav */}
                    <div className="relative flex items-center justify-between px-4 py-2.5">
                      <button onClick={() => setCalMonth(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-[var(--fg-06)] active:bg-[var(--fg-08)] transition">
                        <ChevronLeft size={14} className="text-[var(--fg-40)]" />
                      </button>
                      <p className="text-[12px] font-semibold text-[var(--fg-70)] tracking-wide">
                        {calMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                      </p>
                      <button onClick={() => setCalMonth(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-[var(--fg-06)] active:bg-[var(--fg-08)] transition">
                        <ChevronRight size={14} className="text-[var(--fg-40)]" />
                      </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 px-1.5">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                        <div key={i} className="text-center text-[7px] font-mono text-[var(--fg-25)] py-1 tracking-wider">{d}</div>
                      ))}
                    </div>

                    {/* Day grid */}
                    <div className="grid grid-cols-7 px-1.5 pb-1.5 gap-[2px]">
                      {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isToday = dateStr === todayStr;
                        const pd = periodDays.get(dateStr);
                        const hasSym = symptomMap.has(dateStr);
                        const fertile = isFertile(dateStr);
                        const isSelected = selectedDay === dateStr;
                        const isFuture = dateStr > todayStr;

                        return (
                          <button
                            key={day}
                            onClick={() => { setSelectedDay(isSelected ? null : dateStr); setPeriodDate(dateStr); }}
                            className={`relative flex flex-col items-center justify-center rounded-md h-[38px] transition-all ${
                              isSelected ? "ring-1.5 ring-[rgb(var(--accent-rgb)/0.6)] bg-[var(--fg-04)]" :
                              isToday ? "ring-1 ring-[var(--fg-25)]" : ""
                            } ${!pd && !fertile ? "hover:bg-[var(--fg-03)]" : ""}`}
                            style={pd ? { background: flowBg[pd.flow] ?? "rgba(248,113,113,0.3)" } : fertile ? { background: "rgba(236,72,153,0.06)" } : undefined}
                          >
                            <span className={`text-[11px] font-mono leading-none ${
                              isToday ? "font-bold text-[var(--text-primary)]" :
                              pd ? "text-red-300 font-semibold" :
                              fertile ? "text-pink-300/60" :
                              isFuture ? "text-[var(--fg-20)]" :
                              "text-[var(--fg-40)]"
                            }`}>{day}</span>
                            <div className="flex gap-[3px] mt-[3px] h-[4px]">
                              {pd?.isStart && <div className="w-[4px] h-[4px] rounded-full bg-red-400 shadow-[0_0_3px_rgba(248,113,113,0.5)]" />}
                              {hasSym && <div className="w-[4px] h-[4px] rounded-full bg-[rgb(var(--accent-light-rgb))]" />}
                              {fertile && !pd && <div className="w-[4px] h-[4px] rounded-full bg-pink-400/40" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-3 px-3 py-1.5 border-t border-[var(--fg-04)]">
                      {[
                        { color: "bg-red-400/50", label: "Period" },
                        { color: "bg-pink-400/40", label: "Fertile" },
                        { color: "bg-[rgb(var(--accent-light-rgb))]", label: "Logged" },
                      ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                          <span className="text-[7px] font-mono text-[var(--fg-20)]">{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Selected day detail */}
                    {selectedDay && (selSym || selPeriod) && (
                      <div className="border-t border-[var(--fg-06)] px-4 py-3 space-y-2" style={{ background: "var(--fg-01)" }}>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-medium text-[var(--fg-60)]">
                            {selDate?.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                          </p>
                          <button onClick={() => setSelectedDay(null)} className="p-0.5 rounded hover:bg-[var(--fg-06)] text-[var(--fg-20)] hover:text-[var(--fg-50)] transition"><X size={12} /></button>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                          {selPeriod && (
                            <div className="flex items-center gap-1.5">
                              <Droplets size={11} className="text-red-400" />
                              <span className="text-[10px] font-mono text-red-400/80">
                                {FLOW_LEVELS.find(f => f.value === selPeriod.flow)?.label ?? selPeriod.flow}
                                {selPeriod.isStart ? " — started" : ""}
                              </span>
                            </div>
                          )}
                          {selSym?.mood && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-mono text-[var(--fg-25)]">Mood</span>
                              <span className="text-[10px] text-[var(--fg-50)]">{selSym.mood}</span>
                            </div>
                          )}
                          {selSym?.energy_level && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-mono text-[var(--fg-25)]">Energy</span>
                              <span className="text-[10px] text-[var(--fg-50)]">{ENERGY_LABELS[selSym.energy_level - 1]}</span>
                            </div>
                          )}
                          {selSym?.sleep_quality && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-mono text-[var(--fg-25)]">Sleep</span>
                              <span className="text-[10px] text-[var(--fg-50)]">{SLEEP_LABELS[selSym.sleep_quality - 1]}</span>
                            </div>
                          )}
                          {selSym?.craving && selSym.craving !== "None" && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-mono text-[var(--fg-25)]">Craving</span>
                              <span className="text-[10px] text-[var(--fg-50)]">{selSym.craving}</span>
                            </div>
                          )}
                        </div>

                        {selSym && selSym.symptoms.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {selSym.symptoms.map(sym => (
                              <span key={sym} className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--fg-04)] border border-[var(--fg-06)] text-[var(--fg-35)]">{sym}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Log period ── */}
              <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-02)] overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[var(--fg-04)] flex items-center justify-between">
                  <p className="text-[9px] font-mono tracking-widest text-[var(--fg-30)]">LOG PERIOD</p>
                  <p className="text-[10px] font-mono text-[var(--fg-40)]">{new Date(periodDate + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
                </div>

                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-5 gap-1">
                    {FLOW_LEVELS.map((f) => (
                      <button key={f.value} onClick={() => setFlowLevel(f.value)}
                        className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-all ${flowLevel === f.value ? "border-red-500/40 bg-red-500/10 text-red-400 shadow-[0_0_8px_rgba(248,113,113,0.1)]" : "border-[var(--fg-06)] text-[var(--fg-25)] hover:border-[var(--fg-10)]"}`}>
                        <span className="text-[10px] leading-none">{"●".repeat(f.dots)}</span>
                        <span className="text-[7px] font-mono">{f.label}</span>
                      </button>
                    ))}
                  </div>

                  <button onClick={handleLogPeriod} disabled={logSaving}
                    className="w-full py-2 rounded-xl text-[10px] font-mono font-semibold bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/15 active:bg-red-500/20 transition disabled:opacity-50">
                    {logSaving ? "Saving…" : "Log Period Start"}
                  </button>
                </div>
              </div>

              {/* ── Cycle stats ── */}
              {insight && (
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: insight.cycleLength, label: "AVG LENGTH", sub: "days" },
                    { value: logs.length, label: "LOGGED", sub: "periods" },
                    { value: `${insight.fertileWindowStart}–${insight.fertileWindowEnd}`, label: "FERTILE", sub: "window" },
                  ].map(({ value, label, sub }) => (
                    <div key={label} className="rounded-xl border border-[var(--fg-04)] bg-[var(--fg-02)] p-2.5 text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--accent-rgb)/0.03)] to-transparent" />
                      <p className="relative text-[16px] font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{value}</p>
                      <p className="relative text-[6px] font-mono text-[var(--fg-20)] mt-0.5 tracking-wider">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═════ INSIGHTS ═════ */}
          {tab === "insights" && (
            <motion.div key="insights" className="space-y-4" variants={tabContent} initial="hidden" animate="visible" exit="exit">
              {/* Cycle Health Score */}
              {intelligence?.cycleScore && (() => {
                const scoreColor = intelligence.cycleScore.score >= 85 ? "#4ade80" :
                  intelligence.cycleScore.score >= 70 ? "rgb(var(--accent-light-rgb))" :
                  intelligence.cycleScore.score >= 50 ? "#fbbf24" : "#f87171";
                return (
                  <div className="glass-card p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-10" style={{ background: scoreColor }} />
                    <div className="relative flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[9px] font-mono tracking-widest text-[var(--fg-20)]">CYCLE HEALTH SCORE</p>
                        <p className="text-[8px] text-[var(--fg-15)] mt-0.5">Based on FIGO & ACOG clinical ranges</p>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-bold font-mono" style={{ color: scoreColor, textShadow: `0 0 20px ${scoreColor}30` }}>{intelligence.cycleScore.score}</span>
                        <p className="text-[9px] font-mono" style={{ color: scoreColor, opacity: 0.6 }}>{intelligence.cycleScore.label}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {intelligence.cycleScore.factors.map((f) => (
                        <div key={f.factor} className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            f.status === "good" ? "bg-green-400" : f.status === "watch" ? "bg-amber-400" : "bg-red-400"
                          }`} style={{ boxShadow: `0 0 4px ${f.status === "good" ? "#4ade8040" : f.status === "watch" ? "#fbbf2440" : "#f8717140"}` }} />
                          <span className="text-[10px] text-[var(--fg-50)]">{f.factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Medical health flags */}
              {intelligence && intelligence.healthFlags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-mono tracking-widest text-[var(--fg-20)]">HEALTH ANALYSIS</p>
                  {intelligence.healthFlags.map((flag) => (
                    <div key={flag.id} className={`rounded-xl border p-3.5 space-y-2 ${
                      flag.severity === "see-doctor" ? "border-red-500/20 bg-red-500/[0.04]" :
                      flag.severity === "heads-up" ? "border-amber-500/20 bg-amber-500/[0.04]" :
                      "border-[var(--fg-06)] bg-[var(--fg-02)]"
                    }`}>
                      <div className="flex items-start gap-2.5">
                        {flag.severity === "see-doctor" ? (
                          <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                        ) : flag.severity === "heads-up" ? (
                          <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                        ) : (
                          <Check size={14} className="text-green-400 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-semibold ${
                            flag.severity === "see-doctor" ? "text-red-400" :
                            flag.severity === "heads-up" ? "text-amber-400" : "text-[var(--fg-60)]"
                          }`}>{flag.title}</p>
                          <p className="text-[10px] text-[var(--fg-50)] leading-relaxed mt-1">{flag.description}</p>
                          {flag.actionable && (
                            <p className="text-[9px] text-[rgb(var(--accent-light-rgb)/0.6)] mt-1.5 leading-relaxed">{flag.actionable}</p>
                          )}
                          {flag.source && (
                            <p className="text-[7px] font-mono text-[var(--fg-15)] mt-1.5">{flag.source}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Period history */}
              <div>
                <p className="text-[9px] font-mono tracking-widest text-[var(--fg-20)] mb-2">PERIOD HISTORY</p>
                {logs.length === 0 ? (
                  <div className="text-center py-8 rounded-xl border border-[var(--fg-04)] bg-[var(--fg-02)]">
                    <Droplets size={24} className="mx-auto text-[var(--fg-10)] mb-2" />
                    <p className="text-[11px] text-[var(--fg-25)]">No periods logged yet</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {logs.map((log, idx) => {
                      const start = new Date(log.period_start + "T00:00:00");
                      const end = log.period_end ? new Date(log.period_end + "T00:00:00") : null;
                      const duration = end ? Math.round((end.getTime() - start.getTime()) / 86400000) + 1 : null;
                      const flowInfo = FLOW_LEVELS.find((f) => f.value === log.flow_level);
                      const prevLog = logs[idx + 1];
                      const gap = prevLog ? Math.round((start.getTime() - new Date(prevLog.period_start + "T00:00:00").getTime()) / 86400000) : null;
                      return (
                        <div key={log.id} className="flex items-center gap-3 rounded-xl border border-[var(--fg-04)] bg-[var(--fg-02)] p-3">
                          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <Droplets size={14} className="text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-mono text-[var(--fg-60)]">
                              {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              {end && ` – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {duration && <span className="text-[9px] font-mono text-[var(--fg-20)]">{duration}d</span>}
                              {flowInfo && <span className="text-[9px] font-mono text-red-400/50">{"●".repeat(flowInfo.dots)}</span>}
                              {gap && <span className="text-[9px] font-mono text-[var(--fg-15)]">{gap}d cycle</span>}
                            </div>
                          </div>
                          {!log.period_end && (
                            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">ACTIVE</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent symptom logs */}
              {symptoms.length > 0 && (
                <div>
                  <p className="text-[9px] font-mono tracking-widest text-[var(--fg-20)] mb-2">RECENT CHECK-INS</p>
                  <div className="space-y-1.5">
                    {symptoms.slice(0, 10).map((s) => (
                      <div key={s.id} className="rounded-xl border border-[var(--fg-04)] bg-[var(--fg-02)] p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-[var(--fg-35)]">
                            {new Date(s.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                          <div className="flex items-center gap-2">
                            {s.energy_level && <span className="text-[9px] font-mono text-[var(--fg-20)]">Energy {s.energy_level}/5</span>}
                            {s.mood && <span className="text-[9px] font-mono text-[var(--fg-30)]">{s.mood}</span>}
                          </div>
                        </div>
                        {s.symptoms.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {s.symptoms.map((sym) => (
                              <span key={sym} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[var(--fg-04)] text-[var(--fg-25)]">{sym}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═════ LEARN ═════ */}
          {tab === "learn" && (
            <motion.div key="learn" className="space-y-3" variants={tabContent} initial="hidden" animate="visible" exit="exit">
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen size={14} className="text-[rgb(var(--accent-light-rgb))]" />
                  <p className="text-[11px] font-semibold text-[var(--fg-70)]">Your Cycle Guide</p>
                </div>
                <p className="text-[10px] text-[var(--fg-35)]">Evidence-based answers to common questions about your menstrual cycle, fertility, and health.</p>
              </div>

              {CYCLE_GUIDE.map((section, sIdx) => (
                <div key={section.title} className="glass-card overflow-hidden">
                  <button
                    onClick={() => setOpenGuide(openGuide === sIdx ? null : sIdx)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--fg-02)] transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{section.icon}</span>
                      <span className="text-[12px] font-semibold text-[var(--fg-70)]">{section.title}</span>
                    </div>
                    <ChevronDown size={14} className={`text-[var(--fg-20)] transition-transform ${openGuide === sIdx ? "rotate-180" : ""}`} />
                  </button>

                  {openGuide === sIdx && (
                    <div className="border-t border-[var(--fg-04)]">
                      {section.items.map((item) => {
                        const faqKey = `${sIdx}-${item.q}`;
                        const isOpen = openFaq === faqKey;
                        return (
                          <div key={item.q} className="border-b border-[var(--fg-03)] last:border-b-0">
                            <button
                              onClick={() => setOpenFaq(isOpen ? null : faqKey)}
                              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[var(--fg-02)] transition"
                            >
                              <span className={`text-[11px] font-medium pr-3 ${isOpen ? "text-[rgb(var(--accent-light-rgb))]" : "text-[var(--fg-55)]"}`}>{item.q}</span>
                              <ChevronDown size={12} className={`text-[var(--fg-15)] shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                            </button>
                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-4 space-y-3">
                                    <p className="text-[11px] text-[var(--fg-50)] leading-relaxed whitespace-pre-line">{item.a}</p>
                                    {item.sources && item.sources.length > 0 && (
                                      <div className="pt-2 border-t border-[var(--fg-04)]">
                                        <p className="text-[7px] font-mono tracking-widest text-[var(--fg-20)] mb-1.5">SOURCES</p>
                                        <div className="space-y-1">
                                          {item.sources.map((src, si) => (
                                            <p key={si} className="text-[9px] text-[var(--fg-25)] leading-relaxed pl-2 border-l border-[var(--fg-06)]">{src}</p>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-4">
                <p className="text-[10px] text-amber-400/70 leading-relaxed">{MEDICAL_DISCLAIMER}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
