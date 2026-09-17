"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, ChevronRight, Check, ChevronLeft, X,
  Sparkles, SkipForward, ChevronDown, BookOpen, Zap, Target,
  Flame, Shield, Eye, Waves, Dumbbell,
} from "lucide-react";
import Image from "next/image";
import SwipeNav from "../../components/ui/swipe-nav";
import { useModules } from "../../lib/useModules";
import { useAuth } from "../../lib/AuthProvider";
import { getTrainSections } from "../../lib/navPills";
import { supabase } from "../../lib/supabase";
import {
  DISCIPLINES, PHASE1_DISCIPLINES, SESSION_TYPE_LABELS,
  TECHNIQUE_LIBRARY, COMBO_LIBRARY, ROUND_PRESETS, WARMUPS, COOLDOWNS, getCooldownType,
  DISCIPLINE_ORIGINS,
  calculateSessionXp, getSessionTypesForDiscipline,
  getConditioningDrills, getSparringConcepts, getShadowboxPrompts,
  getBagWorkCombos, getKataSequences, getFlowDrills,
  type DisciplineId, type SessionType,
} from "../../lib/martialArtsEngine";
import { MA_PLAN_LIBRARY } from "../../lib/martialArtsPlanLibrary";

type View = "hub" | "discipline" | "session" | "receipt";
type SessionPhase = "setup" | "warmup" | "round" | "rest" | "cooldown" | "done";

type RoundLog = {
  roundIndex: number;
  roundType: SessionType;
  durationSec: number;
  restSec: number;
  techniques: string[];
  intensity: "light" | "medium" | "hard";
  notes: string;
};

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtMinutes(sec: number) {
  return `${Math.floor(sec / 60)}m`;
}

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════

export default function MartialArtsPage() {
  const { enabledKeys } = useModules();
  const { user } = useAuth();

  const [view, setView] = useState<View>("hub");
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineId | null>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [disciplineStats, setDisciplineStats] = useState<Record<string, { sessions: number; hours: number }>>({});
  const [loading, setLoading] = useState(true);

  const [sessionType, setSessionType] = useState<SessionType>("technique");
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("setup");
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(5);
  const [roundDuration, setRoundDuration] = useState(180);
  const [restDuration, setRestDuration] = useState(60);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [roundLogs, setRoundLogs] = useState<RoundLog[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  const [roundIntensity, setRoundIntensity] = useState<"light" | "medium" | "hard">("medium");
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionXp, setSessionXp] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase.from("ma_sessions").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(10),
      supabase.from("ma_sessions").select("discipline, duration_seconds").eq("user_id", user.id).eq("status", "completed"),
    ]).then(([sessionsRes, statsRes]) => {
      setRecentSessions(sessionsRes.data ?? []);
      const stats: Record<string, { sessions: number; hours: number }> = {};
      for (const s of statsRes.data ?? []) {
        if (!stats[s.discipline]) stats[s.discipline] = { sessions: 0, hours: 0 };
        stats[s.discipline].sessions++;
        stats[s.discipline].hours += (s.duration_seconds || 0) / 3600;
      }
      setDisciplineStats(stats);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimer(t => {
          const next = t - 1;
          if (next <= 0) { handleTimerEnd(); return 0; }
          return next;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  useEffect(() => {
    if (view === "session" && isRunning) {
      navigator.wakeLock?.request("screen").then(wl => { wakeLockRef.current = wl; }).catch(() => {});
    }
    return () => { wakeLockRef.current?.release().catch(() => {}); };
  }, [view, isRunning]);

  const handleTimerEnd = useCallback(() => {
    setIsRunning(false);
    if (typeof navigator.vibrate === "function") navigator.vibrate([200, 100, 200]);
    setSessionPhase(prev => {
      if (prev === "warmup") return "round";
      if (prev === "round") {
        setRoundLogs(logs => [...logs, { roundIndex: currentRound, roundType: sessionType, durationSec: roundDuration, restSec: restDuration, techniques: [...selectedTechniques], intensity: roundIntensity, notes: "" }]);
        setCurrentRound(r => r + 1);
        if (currentRound + 1 >= totalRounds) return "cooldown";
        return "rest";
      }
      if (prev === "rest") return "round";
      if (prev === "cooldown") return "done";
      return prev;
    });
  }, [currentRound, totalRounds, sessionType, roundDuration, restDuration, selectedTechniques, roundIntensity]);

  function startSession(discipline: DisciplineId, type: SessionType) {
    setSelectedDiscipline(discipline);
    setSessionType(type);
    setView("session");
    setSessionPhase("setup");
    setCurrentRound(0);
    setRoundLogs([]);
    setSelectedTechniques([]);
    setSessionStartTime(new Date());
    setTimer(0);
    setIsRunning(false);
  }

  function beginTraining() {
    setSessionPhase("warmup");
    setTimer(300);
    setIsRunning(true);
    setSessionStartTime(new Date());
  }

  function startTimerForPhase(phase: SessionPhase) {
    if (phase === "warmup") setTimer(300);
    else if (phase === "round") setTimer(roundDuration);
    else if (phase === "rest") setTimer(restDuration);
    else if (phase === "cooldown") setTimer(300);
    setIsRunning(true);
  }

  async function finishSession() {
    if (!user || !selectedDiscipline || !sessionStartTime) return;
    const now = new Date();
    const durationSec = Math.round((now.getTime() - sessionStartTime.getTime()) / 1000);
    const xp = calculateSessionXp({ sessionType, totalRounds: roundLogs.length, intensity: roundIntensity, durationMinutes: Math.round(durationSec / 60), newTechniquesCount: selectedTechniques.length, currentStreak: 0 });
    setSessionXp(xp);

    const { data: session } = await supabase.from("ma_sessions").insert({
      user_id: user.id, discipline: selectedDiscipline, session_type: sessionType,
      date: toDateStr(new Date()), started_at: sessionStartTime.toISOString(),
      completed_at: now.toISOString(), duration_seconds: durationSec,
      total_rounds: roundLogs.length, intensity: roundIntensity, xp_earned: xp, status: "completed",
    }).select("id").single();

    if (session) {
      for (const log of roundLogs) {
        await supabase.from("ma_rounds").insert({ session_id: session.id, user_id: user.id, round_index: log.roundIndex, round_type: log.roundType, duration_seconds: log.durationSec, rest_seconds: log.restSec, intensity: log.intensity, notes: log.notes });
      }
      try { await supabase.rpc("add_xp", { p_user_id: user.id, p_amount: xp }); } catch {}
    }
    setView("receipt");
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">
      <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-4">
        {view === "hub" && <SwipeNav sections={getTrainSections(enabledKeys)} />}
        <AnimatePresence mode="wait">
          {view === "hub" && <HubView key="hub" recentSessions={recentSessions} disciplineStats={disciplineStats} loading={loading} onSelectDiscipline={(d) => { setSelectedDiscipline(d); setView("discipline"); }} />}
          {view === "discipline" && selectedDiscipline && <DisciplineView key="disc" discipline={selectedDiscipline} stats={disciplineStats[selectedDiscipline]} onBack={() => setView("hub")} onStartSession={(t) => startSession(selectedDiscipline, t)} />}
          {view === "session" && selectedDiscipline && <SessionView key="sess" discipline={selectedDiscipline} sessionType={sessionType} phase={sessionPhase} currentRound={currentRound} totalRounds={totalRounds} timer={timer} isRunning={isRunning} roundLogs={roundLogs} selectedTechniques={selectedTechniques} roundIntensity={roundIntensity} roundDuration={roundDuration} restDuration={restDuration} onToggleTimer={() => isRunning ? setIsRunning(false) : startTimerForPhase(sessionPhase)} onSkipPhase={() => { setIsRunning(false); handleTimerEnd(); }} onSetTotalRounds={setTotalRounds} onSetRoundDuration={setRoundDuration} onSetRestDuration={setRestDuration} onToggleTechnique={(id) => setSelectedTechniques(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])} onSetIntensity={setRoundIntensity} onBeginTraining={beginTraining} onFinish={finishSession} onCancel={() => setView("hub")} />}
          {view === "receipt" && selectedDiscipline && <ReceiptView key="rcpt" discipline={selectedDiscipline} sessionType={sessionType} roundLogs={roundLogs} xp={sessionXp} startTime={sessionStartTime} techniques={selectedTechniques} onDone={() => { setView("hub"); if (user) { supabase.from("ma_sessions").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(10).then(({ data }) => setRecentSessions(data ?? [])); } }} />}
        </AnimatePresence>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════
// HUB VIEW — with discipline images
// ═══════════════════════════════════════════════

function HubView({ recentSessions, disciplineStats, loading, onSelectDiscipline }: {
  recentSessions: any[];
  disciplineStats: Record<string, { sessions: number; hours: number }>;
  loading: boolean;
  onSelectDiscipline: (d: DisciplineId) => void;
}) {
  const totalSessions = Object.values(disciplineStats).reduce((s, v) => s + v.sessions, 0);
  const totalHours = Object.values(disciplineStats).reduce((s, v) => s + v.hours, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-[9px] font-mono tracking-widest text-[var(--fg-20)] uppercase mb-1">Martial Arts</p>
        <h1 className="text-xl font-bold text-[var(--fg-90)] leading-tight">Choose Your Discipline</h1>
      </div>

      {/* Aggregate stats */}
      {totalSessions > 0 && (
        <div className="flex gap-3">
          {[
            { label: "SESSIONS", value: totalSessions },
            { label: "HOURS", value: totalHours.toFixed(1) },
            { label: "DISCIPLINES", value: Object.keys(disciplineStats).length },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] flex-1 p-3">
              <p className="text-[7px] font-mono tracking-widest text-[var(--fg-20)] mb-1">{s.label}</p>
              <p className="text-2xl font-black text-[var(--fg-80)] leading-none">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Discipline cards with images */}
      <div className="space-y-3">
        {PHASE1_DISCIPLINES.map((dId, i) => {
          const d = DISCIPLINES[dId];
          const origin = DISCIPLINE_ORIGINS[dId];
          const stats = disciplineStats[dId];
          return (
            <motion.button
              key={dId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onSelectDiscipline(dId)}
              className="w-full text-left rounded-2xl border border-[var(--fg-06)] overflow-hidden hover:border-[var(--fg-10)] active:scale-[0.98] transition-all group"
            >
              {/* Image header */}
              <div className="relative h-32 overflow-hidden">
                <Image
                  src={d.imageUrl}
                  alt={d.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  style={dId === "taekwondo" ? { objectPosition: "center 20%" } : undefined}
                  sizes="(max-width: 640px) 100vw, 576px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{d.name}</h3>
                      <p className="text-[10px] text-white/60 font-mono mt-0.5">
                        {origin?.tagline ?? d.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {stats && stats.sessions > 0 && (
                        <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70 backdrop-blur-sm">
                          {stats.sessions} sessions
                        </span>
                      )}
                      <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                        <ChevronRight size={14} className="text-white/80" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Category badge top-right */}
                <div className="absolute top-3 right-3 flex gap-1.5">
                  <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-black/40 text-white/70 backdrop-blur-sm capitalize">
                    {d.category}
                  </span>
                  {d.hasBelts && (
                    <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-black/40 text-white/70 backdrop-blur-sm">
                      Belts
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-mono tracking-widest text-[var(--fg-15)] px-1">RECENT SESSIONS</p>
          <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] divide-y divide-[var(--fg-04)]">
            {recentSessions.slice(0, 5).map(s => {
              const d = DISCIPLINES[s.discipline as DisciplineId];
              const type = SESSION_TYPE_LABELS[s.session_type as SessionType];
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--fg-04)] flex items-center justify-center shrink-0">
                    <span className="text-base">{d?.emoji ?? "⚔️"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-[var(--fg-60)] truncate">{d?.name ?? s.discipline}</p>
                    <p className="text-[9px] font-mono text-[var(--fg-20)]">{type?.name ?? s.session_type} · {s.total_rounds} rds · {fmtMinutes(s.duration_seconds ?? 0)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold font-mono text-[var(--fg-50)]">+{s.xp_earned} xp</p>
                    <p className="text-[8px] font-mono text-[var(--fg-15)]">{s.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Starter plans */}
      <div className="space-y-2">
        <p className="text-[9px] font-mono tracking-widest text-[var(--fg-15)] px-1">STARTER PLANS</p>
        <div className="space-y-2">
          {MA_PLAN_LIBRARY.slice(0, 4).map(plan => {
            const d = DISCIPLINES[plan.discipline];
            return (
              <button
                key={plan.id}
                onClick={() => onSelectDiscipline(plan.discipline)}
                className="w-full text-left rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-3.5 hover:bg-[var(--fg-05)] active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--fg-04)] flex items-center justify-center shrink-0">
                    <span className="text-base">{d?.emoji ?? "⚔️"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[var(--fg-70)]">{plan.name}</p>
                    <p className="text-[9px] font-mono text-[var(--fg-20)] mt-0.5">{plan.daysPerWeek}x/wk · {plan.level} · {plan.duration}</p>
                  </div>
                  <ChevronRight size={14} className="text-[var(--fg-15)] transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--fg-10)] border-t-[var(--fg-40)] animate-spin" />
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// DISCIPLINE VIEW — beginner-friendly guided layout
// ═══════════════════════════════════════════════

function DisciplineView({ discipline, stats, onBack, onStartSession }: {
  discipline: DisciplineId;
  stats?: { sessions: number; hours: number };
  onBack: () => void;
  onStartSession: (type: SessionType) => void;
}) {
  const d = DISCIPLINES[discipline];
  const origin = DISCIPLINE_ORIGINS[discipline];
  const techniques = TECHNIQUE_LIBRARY.filter(t => t.discipline === discipline);
  const sessionTypes = getSessionTypesForDiscipline(discipline);
  const plans = MA_PLAN_LIBRARY.filter(p => p.discipline === discipline);
  const warmup = WARMUPS[discipline];
  const categories = [...new Set(techniques.map(t => t.category))];
  const [activeTab, setActiveTab] = useState<"train" | "learn" | "history">("train");
  const [activeTechCat, setActiveTechCat] = useState(categories[0] ?? "punch");
  const [historyStoryExpanded, setHistoryStoryExpanded] = useState(false);
  const isNew = !stats || stats.sessions === 0;
  const beginnerTechs = techniques.filter(t => t.difficulty === "beginner");

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-0 -mx-4 -mt-6"
    >
      {/* Hero image header */}
      <div className="relative h-52 overflow-hidden">
        <Image src={d.imageUrl} alt={d.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 640px" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-black/40 to-black/20" />
        <button onClick={onBack} className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition z-10">
          <ChevronLeft size={18} className="text-white" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <h1 className="text-2xl font-bold text-white">{d.name}</h1>
          {origin && <p className="text-[11px] text-white/60 font-mono italic mt-0.5">{origin.tagline}</p>}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70 capitalize backdrop-blur-sm">{d.category}</span>
            {d.hasBelts && <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70 backdrop-blur-sm">Belt System</span>}
            {stats && stats.sessions > 0 && <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300/80 backdrop-blur-sm">{stats.sessions} sessions · {stats.hours.toFixed(1)}h</span>}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex gap-1 p-0.5 rounded-xl bg-[var(--fg-03)] border border-[var(--fg-06)]">
          {([
            { key: "train" as const, label: "Train", icon: <Zap size={12} /> },
            { key: "learn" as const, label: "Learn", icon: <Target size={12} /> },
            { key: "history" as const, label: `Origins`, icon: <BookOpen size={12} /> },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all ${activeTab === tab.key ? "bg-[var(--fg-08)] text-[var(--fg-80)]" : "text-[var(--fg-30)] hover:text-[var(--fg-50)]"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4 pt-2 pb-4">
        <AnimatePresence mode="wait">
          {/* ═══ TRAIN TAB ═══ */}
          {activeTab === "train" && (
            <motion.div key="train" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Quick Start for beginners */}
              {isNew && (
                <button onClick={() => onStartSession("technique")}
                  className="w-full text-left rounded-2xl overflow-hidden border active:scale-[0.98] transition-all"
                  style={{ borderColor: `rgb(${d.colorRgb} / 0.2)`, background: `linear-gradient(135deg, rgb(${d.colorRgb} / 0.08), rgb(${d.colorRgb} / 0.02))` }}>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.15)` }}>
                        <Sparkles size={12} style={{ color: `rgb(${d.colorRgb})` }} />
                      </div>
                      <p className="text-[9px] font-mono tracking-widest" style={{ color: `rgb(${d.colorRgb} / 0.8)` }}>RECOMMENDED FOR YOU</p>
                    </div>
                    <p className="text-[14px] font-bold text-[var(--fg-80)]">Start Your First {d.name} Session</p>
                    <p className="text-[10px] text-[var(--fg-35)] mt-1 leading-relaxed">A guided technique drill — learn the fundamentals at your own pace. No experience needed.</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/80">beginner</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[var(--fg-04)] text-[var(--fg-30)]">~15 min</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[var(--fg-04)] text-[var(--fg-30)]">3 rounds</span>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: `rgb(${d.colorRgb} / 0.06)`, borderTop: `1px solid rgb(${d.colorRgb} / 0.08)` }}>
                    <span className="text-[11px] font-semibold" style={{ color: `rgb(${d.colorRgb})` }}>
                      <Play size={12} className="inline mr-1 -mt-0.5" />Begin Session
                    </span>
                    <ChevronRight size={14} style={{ color: `rgb(${d.colorRgb} / 0.6)` }} />
                  </div>
                </button>
              )}

              {/* How it works — first-time help */}
              {isNew && (
                <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-3.5">
                  <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)] mb-2">HOW IT WORKS</p>
                  <div className="space-y-2">
                    {[
                      { step: "1", text: "Pick a training type below" },
                      { step: "2", text: "See what you'll do and adjust rounds/duration" },
                      { step: "3", text: "Hit Start — the timer guides you through warm-up, rounds, rest, and cool down" },
                    ].map(s => (
                      <div key={s.step} className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ background: `rgb(${d.colorRgb} / 0.12)`, color: `rgb(${d.colorRgb})` }}>{s.step}</div>
                        <p className="text-[11px] text-[var(--fg-45)] leading-relaxed pt-0.5">{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Training types — expanded cards */}
              <div className="space-y-2">
                <p className="text-[9px] font-mono tracking-widest text-[var(--fg-15)] px-1">{isNew ? "CHOOSE A TRAINING TYPE" : "START TRAINING"}</p>
                <div className="space-y-2">
                  {sessionTypes.map(st => {
                    const info = SESSION_TYPE_LABELS[st];
                    return (
                      <button key={st} onClick={() => onStartSession(st)} className="w-full text-left rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-3.5 hover:bg-[var(--fg-04)] active:scale-[0.99] transition-all">
                        <div className="flex items-start gap-3">
                          <span className="text-xl shrink-0 mt-0.5">{info.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[12px] font-semibold text-[var(--fg-70)]">{info.name}</p>
                              <ChevronRight size={14} className="text-[var(--fg-15)] shrink-0" />
                            </div>
                            <p className="text-[10px] text-[var(--fg-40)] leading-relaxed mb-2">{info.howItWorks}</p>
                            <div className="flex flex-wrap gap-1.5">
                              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full ${info.difficulty === "beginner" ? "bg-emerald-500/10 text-emerald-400/70" : info.difficulty === "intermediate" ? "bg-amber-500/10 text-amber-400/70" : "bg-red-500/10 text-red-400/70"}`}>{info.difficulty}</span>
                              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--fg-04)] text-[var(--fg-25)]">~{info.suggestedMin} min</span>
                              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--fg-04)] text-[var(--fg-25)]">{info.equipment}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Training plans */}
              {plans.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-mono tracking-widest text-[var(--fg-15)] px-1">TRAINING PLANS</p>
                  {plans.map(plan => (
                    <div key={plan.id} className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-3.5">
                      <p className="text-[12px] font-semibold text-[var(--fg-70)]">{plan.name}</p>
                      <p className="text-[10px] text-[var(--fg-30)] mt-0.5">{plan.description}</p>
                      <div className="flex gap-2 mt-2">
                        {[{ l: "days/wk", v: plan.daysPerWeek }, { l: "level", v: plan.level }, { l: "time", v: plan.duration }].map(c => (
                          <span key={c.l} className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-[var(--fg-04)] text-[var(--fg-30)]">{c.v} <span className="text-[var(--fg-15)]">{c.l}</span></span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Warm-up */}
              {warmup && (
                <div className="space-y-2">
                  <p className="text-[9px] font-mono tracking-widest text-[var(--fg-15)] px-1">WARM-UP ROUTINE</p>
                  <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-3.5 space-y-1.5">
                    {warmup.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[8px] font-mono font-bold text-[var(--fg-20)] mt-0.5 w-4 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                        <p className="text-[10px] text-[var(--fg-40)]">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ LEARN TAB ═══ */}
          {activeTab === "learn" && (
            <motion.div key="learn" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Beginner essentials */}
              {beginnerTechs.length > 0 && (
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)` }}>
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: `rgb(${d.colorRgb} / 0.06)` }}>
                    <Target size={13} style={{ color: `rgb(${d.colorRgb})` }} />
                    <p className="text-[10px] font-semibold text-[var(--fg-60)]">Start Here — {beginnerTechs.length} Beginner Techniques</p>
                  </div>
                  <div className="bg-[var(--fg-03)] divide-y divide-[var(--fg-04)]">
                    {beginnerTechs.slice(0, 5).map(t => (
                      <div key={t.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[12px] font-semibold text-[var(--fg-70)]">{t.name}</p>
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full capitalize bg-emerald-500/10 text-emerald-400/70">{t.category}</span>
                        </div>
                        <p className="text-[10px] text-[var(--fg-30)] leading-relaxed">{t.description}</p>
                        {t.keyPoints.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {t.keyPoints.map((kp, ki) => (
                              <span key={ki} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[var(--fg-04)] text-[var(--fg-25)]">{kp}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {beginnerTechs.length > 5 && (
                      <p className="px-4 py-2 text-[9px] font-mono text-[var(--fg-20)]">+{beginnerTechs.length - 5} more beginner techniques</p>
                    )}
                  </div>
                </div>
              )}

              {/* Category tabs for all techniques */}
              <div className="space-y-2">
                <p className="text-[9px] font-mono tracking-widest text-[var(--fg-15)] px-1">ALL TECHNIQUES ({techniques.length})</p>
                <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setActiveTechCat(cat)}
                      className={`text-[9px] font-mono px-2.5 py-1 rounded-full border capitalize whitespace-nowrap transition ${activeTechCat === cat ? "border-[var(--fg-20)] text-[var(--fg-60)] bg-[var(--fg-06)]" : "border-[var(--fg-06)] text-[var(--fg-25)]"}`}>
                      {cat} ({techniques.filter(t => t.category === cat).length})
                    </button>
                  ))}
                </div>

                {/* Category hero image */}
                {TECH_CATEGORY_IMAGES[activeTechCat] && (
                  <div className="relative h-32 rounded-2xl overflow-hidden">
                    <Image src={TECH_CATEGORY_IMAGES[activeTechCat]} alt={activeTechCat} fill className="object-cover" sizes="(max-width: 640px) 100vw, 576px" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-[13px] font-bold text-white capitalize">{activeTechCat} Techniques</p>
                      <p className="text-[9px] text-white/60 font-mono">{techniques.filter(t => t.category === activeTechCat).length} moves · tap any to learn more</p>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] divide-y divide-[var(--fg-04)]">
                  {techniques.filter(t => t.category === activeTechCat).map(t => (
                    <div key={t.id} className="px-3.5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-[var(--fg-60)]">{t.name}</p>
                          <p className="text-[9px] text-[var(--fg-25)] mt-0.5 leading-relaxed">{t.description}</p>
                        </div>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full shrink-0 capitalize ${t.difficulty === "beginner" ? "bg-emerald-500/10 text-emerald-400/70" : t.difficulty === "intermediate" ? "bg-amber-500/10 text-amber-400/70" : "bg-red-500/10 text-red-400/70"}`}>{t.difficulty}</span>
                      </div>
                      {t.keyPoints.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[7px] font-mono tracking-wider text-emerald-400/50">KEY POINTS</p>
                          {t.keyPoints.map((kp, ki) => (
                            <div key={ki} className="flex items-start gap-1.5">
                              <Check size={9} className="text-emerald-400/40 mt-0.5 shrink-0" />
                              <span className="text-[9px] text-[var(--fg-35)] leading-relaxed">{kp}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {t.commonMistakes.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[7px] font-mono tracking-wider text-red-400/50">AVOID</p>
                          {t.commonMistakes.map((cm, ci) => (
                            <div key={ci} className="flex items-start gap-1.5">
                              <X size={9} className="text-red-400/40 mt-0.5 shrink-0" />
                              <span className="text-[9px] text-[var(--fg-30)] leading-relaxed">{cm}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Belt progression */}
              {d.hasBelts && d.beltSystem && (
                <div className="space-y-2">
                  <p className="text-[9px] font-mono tracking-widest text-[var(--fg-15)] px-1">BELT PROGRESSION</p>
                  <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {d.beltSystem.map((belt, bi) => (
                        <div key={belt} className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[var(--fg-04)] text-[var(--fg-30)]">{belt}</span>
                          {bi < d.beltSystem!.length - 1 && <ChevronRight size={8} className="text-[var(--fg-10)]" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ HISTORY TAB ═══ */}
          {activeTab === "history" && origin && (
            <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Story */}
              <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.1)` }}>
                    <BookOpen size={12} style={{ color: `rgb(${d.colorRgb})` }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--fg-60)]">Origins of {d.name}</p>
                    <p className="text-[8px] font-mono text-[var(--fg-20)]">Est. {origin.founded} · {origin.origin}</p>
                  </div>
                </div>
                <p className={`text-[12px] leading-relaxed text-[var(--fg-50)] ${!historyStoryExpanded ? "line-clamp-5" : ""}`}>
                  {origin.story}
                </p>
                <button onClick={() => setHistoryStoryExpanded(!historyStoryExpanded)} className="text-[9px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] transition">
                  {historyStoryExpanded ? "Show less" : "Read full story"}
                </button>
              </div>

              {/* Timeline with images */}
              {origin.eras && origin.eras.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-mono tracking-widest text-[var(--fg-15)] px-1">TIMELINE</p>
                  <div className="space-y-0">
                    {origin.eras.map((era, ei) => (
                      <div key={ei} className="flex gap-3">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full border-2 shrink-0" style={{ borderColor: `rgb(${d.colorRgb})`, background: ei === origin.eras.length - 1 ? `rgb(${d.colorRgb})` : "transparent" }} />
                          {ei < origin.eras.length - 1 && <div className="w-px flex-1 min-h-[60px]" style={{ background: `rgb(${d.colorRgb} / 0.2)` }} />}
                        </div>
                        {/* Content */}
                        <div className="pb-4 flex-1 min-w-0">
                          <p className="text-[8px] font-mono tracking-widest mb-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>{era.period}</p>
                          <p className="text-[12px] font-semibold text-[var(--fg-70)] mb-1">{era.title}</p>
                          {era.imageUrl && (
                            <div className="rounded-xl overflow-hidden mb-2 bg-black/20">
                              <Image src={era.imageUrl} alt={era.title} width={600} height={400} className="w-full h-auto rounded-xl" sizes="(max-width: 640px) 80vw, 400px" />
                            </div>
                          )}
                          <p className="text-[10px] text-[var(--fg-35)] leading-relaxed">{era.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Philosophy */}
              <div className="rounded-2xl bg-[var(--fg-03)] border border-[var(--fg-06)] border-l-2 p-4" style={{ borderLeftColor: `rgb(${d.colorRgb} / 0.5)` }}>
                <p className="text-[7px] font-mono tracking-widest text-[var(--fg-20)] mb-1.5">PHILOSOPHY</p>
                <p className="text-[12px] italic text-[var(--fg-45)] leading-relaxed">&ldquo;{origin.philosophy}&rdquo;</p>
              </div>

              {/* Key Figures — horizontal carousel */}
              <div className="space-y-2">
                <p className="text-[9px] font-mono tracking-widest text-[var(--fg-15)] px-1">KEY FIGURES</p>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                  {origin.keyFigures.map((fig) => (
                    <FigureCard key={fig.name} fig={fig} colorRgb={d.colorRgb} />
                  ))}
                </div>
              </div>

              {/* Fun fact */}
              <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4 flex gap-2.5 items-start">
                <Sparkles size={14} className="text-amber-400/60 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[8px] font-mono tracking-widest text-amber-400/50 mb-1">FUN FACT</p>
                  <p className="text-[11px] text-[var(--fg-40)] leading-relaxed">{origin.funFact}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* No history fallback */}
          {activeTab === "history" && !origin && (
            <motion.div key="no-history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <BookOpen size={24} className="mx-auto text-[var(--fg-15)] mb-2" />
              <p className="text-[11px] text-[var(--fg-30)]">Origins coming soon for {d.name}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// SESSION VIEW — Guided flow
// ═══════════════════════════════════════════════

function SessionView({ discipline, sessionType, phase, currentRound, totalRounds, timer, isRunning, roundLogs, selectedTechniques, roundIntensity, roundDuration, restDuration, onToggleTimer, onSkipPhase, onSetTotalRounds, onSetRoundDuration, onSetRestDuration, onToggleTechnique, onSetIntensity, onBeginTraining, onFinish, onCancel }: {
  discipline: DisciplineId; sessionType: SessionType; phase: SessionPhase;
  currentRound: number; totalRounds: number; timer: number; isRunning: boolean;
  roundLogs: RoundLog[]; selectedTechniques: string[]; roundIntensity: "light" | "medium" | "hard";
  roundDuration: number; restDuration: number;
  onToggleTimer: () => void; onSkipPhase: () => void;
  onSetTotalRounds: (n: number) => void; onSetRoundDuration: (n: number) => void;
  onSetRestDuration: (n: number) => void; onToggleTechnique: (id: string) => void;
  onSetIntensity: (i: "light" | "medium" | "hard") => void;
  onBeginTraining: () => void;
  onFinish: () => void; onCancel: () => void;
}) {
  const d = DISCIPLINES[discipline];
  const techniques = TECHNIQUE_LIBRARY.filter(t => t.discipline === discipline);
  const isDone = phase === "done";
  const isSetup = phase === "setup";
  const isActive = !isSetup && !isDone;

  const maxTime = phase === "warmup" ? 300 : phase === "round" ? roundDuration : phase === "rest" ? restDuration : phase === "cooldown" ? 300 : 0;
  const pct = maxTime > 0 ? timer / maxTime : 0;
  const timerColor = phase === "rest" ? "245 158 11" : d.colorRgb;

  const totalSessionMin = Math.round((totalRounds * (roundDuration + restDuration) + 600) / 60);
  const typeInfo = SESSION_TYPE_LABELS[sessionType];

  const activeTechIds = selectedTechniques.length > 0 ? selectedTechniques : techniques.filter(t => t.difficulty === "beginner" && t.category !== "combo").map(t => t.id);
  const focusTech = activeTechIds.length > 0 ? techniques.find(t => t.id === activeTechIds[currentRound % activeTechIds.length]) : null;
  const nextTech = activeTechIds.length > 0 ? techniques.find(t => t.id === activeTechIds[(currentRound) % activeTechIds.length]) : null;
  const warmups = WARMUPS[discipline] || [];
  const cooldownType = getCooldownType(sessionType, discipline);
  const cooldowns = COOLDOWNS[cooldownType] || COOLDOWNS["striking"] || [];

  const totalPhases = 1 + totalRounds + (totalRounds - 1) + 1;
  const currentPhaseIdx = phase === "warmup" ? 0
    : phase === "round" ? 1 + currentRound * 2
    : phase === "rest" ? 2 + (currentRound - 1) * 2
    : phase === "cooldown" ? totalPhases - 1
    : totalPhases;
  const overallPct = totalPhases > 0 ? Math.min(1, (currentPhaseIdx + (1 - pct)) / totalPhases) : 0;

  // ── SETUP PHASE ──
  if (isSetup) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={onCancel} className="text-[10px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] transition flex items-center gap-1">
            <ChevronLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">{d.emoji}</span>
            <span className="text-[11px] font-bold text-[var(--fg-60)]">{d.name}</span>
          </div>
          <div className="w-10" />
        </div>

        <div className="text-center">
          <span className="text-3xl block mb-2">{typeInfo?.emoji}</span>
          <h2 className="text-lg font-bold text-[var(--fg-90)]">{typeInfo?.name}</h2>
          <p className="text-[11px] text-[var(--fg-35)] mt-1 max-w-xs mx-auto leading-relaxed">{typeInfo?.description}</p>
        </div>

        {/* Session overview stats */}
        <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4">
          <div className="flex items-center justify-between text-center">
            <div className="flex-1">
              <p className="text-2xl font-bold font-mono text-[var(--fg-80)]">{totalRounds}</p>
              <p className="text-[8px] font-mono text-[var(--fg-25)] mt-0.5">ROUNDS</p>
            </div>
            <div className="w-px h-8 bg-[var(--fg-06)]" />
            <div className="flex-1">
              <p className="text-2xl font-bold font-mono text-[var(--fg-80)]">{fmtDuration(roundDuration)}</p>
              <p className="text-[8px] font-mono text-[var(--fg-25)] mt-0.5">WORK</p>
            </div>
            <div className="w-px h-8 bg-[var(--fg-06)]" />
            <div className="flex-1">
              <p className="text-2xl font-bold font-mono text-[var(--fg-80)]">{fmtDuration(restDuration)}</p>
              <p className="text-[8px] font-mono text-[var(--fg-25)] mt-0.5">REST</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--fg-04)] text-center">
            <p className="text-[10px] font-mono text-[var(--fg-30)]">~{totalSessionMin} min total</p>
          </div>
        </div>

        {/* Session content preview — varies by type */}
        {(sessionType === "technique" || sessionType === "mixed") && (
          <SetupTechniquePreview activeTechIds={activeTechIds} techniques={techniques} colorRgb={d.colorRgb} />
        )}
        {sessionType === "conditioning" && (() => {
          const drills = getConditioningDrills(discipline);
          return (
            <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-2">
              <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">CONDITIONING CIRCUIT</p>
              {drills.slice(0, 4).map((drill, i) => (
                <div key={drill.id} className="flex items-center gap-2 py-0.5">
                  <Flame size={12} className="shrink-0" style={{ color: `rgb(${d.colorRgb} / 0.5)` }} />
                  <span className="text-[12px] text-[var(--fg-55)]">{drill.name}</span>
                  <span className={`text-[8px] font-mono ml-auto px-1.5 py-0.5 rounded-full ${drill.intensity === "hard" ? "bg-red-500/10 text-red-400/60" : "bg-amber-500/10 text-amber-400/60"}`}>{drill.intensity}</span>
                </div>
              ))}
              {drills.length > 4 && <p className="text-[10px] text-[var(--fg-25)] text-center">+{drills.length - 4} more exercises</p>}
            </div>
          );
        })()}
        {sessionType === "shadowbox" && (() => {
          const prompts = getShadowboxPrompts(discipline);
          return (
            <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-2">
              <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">SHADOW SCENARIOS</p>
              {prompts.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center gap-2 py-0.5">
                  <Eye size={12} className="shrink-0" style={{ color: `rgb(${d.colorRgb} / 0.5)` }} />
                  <span className="text-[12px] text-[var(--fg-55)]">{p.name}</span>
                </div>
              ))}
              {prompts.length === 0 && <p className="text-[11px] text-[var(--fg-35)]">Flow through combinations against an imaginary opponent</p>}
            </div>
          );
        })()}
        {sessionType === "bag_work" && (() => {
          const combos = getBagWorkCombos(discipline);
          return (
            <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-2">
              <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">POWER COMBOS</p>
              {combos.slice(0, 4).map(c => (
                <div key={c.id} className="flex items-center gap-2 py-0.5">
                  <Zap size={12} className="shrink-0" style={{ color: `rgb(${d.colorRgb} / 0.5)` }} />
                  <span className="text-[12px] text-[var(--fg-55)]">{c.name}</span>
                  <span className="text-[9px] font-mono ml-auto text-[var(--fg-25)]">{c.targetArea}</span>
                </div>
              ))}
              {combos.length === 0 && <p className="text-[11px] text-[var(--fg-35)]">Power combinations on the bag</p>}
            </div>
          );
        })()}
        {sessionType === "pad_work" && (() => {
          const combos = COMBO_LIBRARY.filter(c => c.discipline === discipline);
          return (
            <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-2">
              <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">PAD COMBINATIONS</p>
              {combos.slice(0, 4).map(c => (
                <div key={c.id} className="flex items-center gap-2 py-0.5">
                  <Target size={12} className="shrink-0" style={{ color: `rgb(${d.colorRgb} / 0.5)` }} />
                  <span className="text-[12px] text-[var(--fg-55)]">{c.name} — {c.description}</span>
                </div>
              ))}
              {combos.length === 0 && <p className="text-[11px] text-[var(--fg-35)]">Work combinations with your partner</p>}
            </div>
          );
        })()}
        {sessionType === "sparring" && (
          <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-2">
            <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">ROUND FOCUS AREAS</p>
            {getSparringConcepts(discipline).slice(0, 3).map(c => (
              <div key={c.id} className="flex items-center gap-2 py-0.5">
                <Shield size={12} className="shrink-0" style={{ color: `rgb(${d.colorRgb} / 0.5)` }} />
                <span className="text-[12px] text-[var(--fg-55)]">{c.name}</span>
              </div>
            ))}
          </div>
        )}
        {sessionType === "kata" && (() => {
          const katas = getKataSequences(discipline);
          return (
            <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-2">
              <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">FORMS TO PRACTICE</p>
              {katas.map(k => (
                <div key={k.id} className="flex items-center gap-2 py-0.5">
                  <BookOpen size={12} className="shrink-0" style={{ color: `rgb(${d.colorRgb} / 0.5)` }} />
                  <span className="text-[12px] text-[var(--fg-55)]">{k.name}</span>
                  <span className="text-[9px] font-mono ml-auto text-[var(--fg-25)]">{k.movements} moves</span>
                </div>
              ))}
              {katas.length === 0 && <p className="text-[11px] text-[var(--fg-35)]">Practice traditional forms with precision</p>}
            </div>
          );
        })()}
        {sessionType === "flow_roll" && (
          <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-2">
            <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">FLOW DRILLS</p>
            {getFlowDrills(discipline).slice(0, 3).map(d2 => (
              <div key={d2.id} className="flex items-center gap-2 py-0.5">
                <Waves size={12} className="shrink-0" style={{ color: `rgb(${d.colorRgb} / 0.5)` }} />
                <span className="text-[12px] text-[var(--fg-55)]">{d2.name}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={onBeginTraining}
          className="w-full py-4 rounded-2xl text-[15px] font-bold transition-all active:scale-[0.98] border"
          style={{
            background: `linear-gradient(135deg, rgb(${d.colorRgb} / 0.15), rgb(${d.colorRgb} / 0.05))`,
            borderColor: `rgb(${d.colorRgb} / 0.2)`,
            color: `rgb(${d.colorRgb})`,
            boxShadow: `0 0 30px rgb(${d.colorRgb} / 0.1)`,
          }}
        >
          <Play size={16} className="inline mr-2 -mt-0.5" />
          Start Training
        </button>

        <SetupCustomize
          totalRounds={totalRounds} roundDuration={roundDuration} restDuration={restDuration}
          roundIntensity={roundIntensity} selectedTechniques={selectedTechniques}
          techniques={techniques} colorRgb={d.colorRgb}
          onSetTotalRounds={onSetTotalRounds} onSetRoundDuration={onSetRoundDuration}
          onSetRestDuration={onSetRestDuration} onSetIntensity={onSetIntensity}
          onToggleTechnique={onToggleTechnique}
        />
      </motion.div>
    );
  }

  // ── ACTIVE SESSION ──
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Top bar: exit + discipline + skip */}
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-[10px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] transition flex items-center gap-1">
          <X size={14} /> Exit
        </button>
        <div className="flex items-center gap-2">
          <span className="text-base">{d.emoji}</span>
          <span className="text-[10px] font-bold text-[var(--fg-50)]">{d.name}</span>
          {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
        </div>
        <button onClick={onSkipPhase} className="text-[10px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] transition flex items-center gap-1">
          Skip <SkipForward size={12} />
        </button>
      </div>

      {/* Overall session progress bar */}
      {isActive && (
        <div className="h-1 rounded-full bg-[var(--fg-04)] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${overallPct * 100}%`, background: `rgb(${d.colorRgb})` }} />
        </div>
      )}

      {/* ═══ WARMUP ═══ */}
      {phase === "warmup" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0 cursor-pointer" onClick={onToggleTimer}>
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="35" fill="none" stroke="var(--fg-06)" strokeWidth="3" />
                <circle cx="40" cy="40" r="35" fill="none" stroke={`rgb(${timerColor})`} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 35}`} strokeDashoffset={`${2 * Math.PI * 35 * (1 - pct)}`}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold font-mono tabular-nums text-[var(--fg-90)]">{fmtDuration(timer)}</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-mono tracking-widest mb-1" style={{ color: `rgb(${timerColor} / 0.7)` }}>WARM UP</p>
              <p className="text-[14px] font-bold text-[var(--fg-80)]">Get Your Body Ready</p>
              <p className="text-[10px] text-[var(--fg-30)] mt-0.5">Loosen up before training</p>
            </div>
          </div>

          <div className="flex justify-center">
            <button onClick={onToggleTimer} className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{ background: `rgb(${timerColor} / 0.1)`, border: `1px solid rgb(${timerColor} / 0.2)` }}>
              {isRunning ? <Pause size={20} style={{ color: `rgb(${timerColor})` }} /> : <Play size={20} style={{ color: `rgb(${timerColor})` }} />}
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-2.5">
            <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">FOLLOW ALONG</p>
            {warmups.map((w, i) => (
              <div key={i} className="flex items-start gap-3 py-1">
                <div className="w-5 h-5 rounded-md border border-[var(--fg-10)] bg-[var(--fg-04)] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-mono text-[var(--fg-25)]">{i + 1}</span>
                </div>
                <p className="text-[12px] text-[var(--fg-55)] leading-snug">{w}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ ROUND — content varies by session type ═══ */}
      {phase === "round" && (() => {
        const roundHeader = (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-mono tracking-widest" style={{ color: `rgb(${timerColor} / 0.7)` }}>ROUND {currentRound + 1} OF {totalRounds}</p>
              <button onClick={onToggleTimer} className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-95"
                style={{ background: `rgb(${timerColor} / 0.08)`, border: `1px solid rgb(${timerColor} / 0.15)` }}>
                {isRunning ? <Pause size={14} style={{ color: `rgb(${timerColor})` }} /> : <Play size={14} style={{ color: `rgb(${timerColor})` }} />}
                <span className="text-lg font-bold font-mono tabular-nums" style={{ color: `rgb(${timerColor})` }}>{fmtDuration(timer)}</span>
              </button>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--fg-04)] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000 ease-linear" style={{ width: `${pct * 100}%`, background: `rgb(${timerColor})` }} />
            </div>
          </>
        );

        const roundDots = (
          <div className="flex gap-1.5 justify-center">
            {Array.from({ length: totalRounds }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full transition-all" style={{
                background: i < currentRound ? `rgb(${d.colorRgb})` : i === currentRound ? `rgb(${d.colorRgb} / 0.5)` : "var(--fg-06)",
                transform: i === currentRound ? "scale(1.3)" : "scale(1)",
              }} />
            ))}
          </div>
        );

        // ── TECHNIQUE DRILL (default) ──
        if (sessionType === "technique") {
          return (
            <div className="space-y-4">
              {roundHeader}
              {focusTech ? (
                <AnimatePresence mode="wait">
                  <motion.div key={focusTech.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="rounded-2xl border bg-[var(--fg-03)] overflow-hidden" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)` }}>
                    <div className="px-4 py-3 flex items-center justify-between" style={{ background: `rgb(${d.colorRgb} / 0.06)` }}>
                      <div>
                        <p className="text-[18px] font-bold text-[var(--fg-90)]">{focusTech.name}</p>
                        <p className="text-[10px] font-mono capitalize mt-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>{focusTech.category} · {focusTech.difficulty}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                        <Target size={20} style={{ color: `rgb(${d.colorRgb})` }} />
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <p className="text-[12px] text-[var(--fg-50)] leading-relaxed">{focusTech.description}</p>
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono tracking-widest" style={{ color: `rgb(${d.colorRgb} / 0.6)` }}>HOW TO DO IT</p>
                        {focusTech.keyPoints.map((kp, i) => (
                          <div key={i} className="flex items-start gap-2.5 py-0.5">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: `rgb(${d.colorRgb} / 0.1)` }}>
                              <Check size={11} style={{ color: `rgb(${d.colorRgb})` }} />
                            </div>
                            <p className="text-[12px] text-[var(--fg-65)] leading-snug">{kp}</p>
                          </div>
                        ))}
                      </div>
                      {focusTech.commonMistakes.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-[var(--fg-04)]">
                          <p className="text-[8px] font-mono tracking-widest text-red-400/50">COMMON MISTAKES</p>
                          {focusTech.commonMistakes.map((m, i) => (
                            <div key={i} className="flex items-start gap-2.5 py-0.5">
                              <div className="w-5 h-5 rounded-md bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                <X size={11} className="text-red-400/60" />
                              </div>
                              <p className="text-[12px] text-[var(--fg-40)] leading-snug">{m}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-6 text-center">
                  <p className="text-[14px] font-bold text-[var(--fg-70)]">Free Practice</p>
                  <p className="text-[11px] text-[var(--fg-30)] mt-1">Work on any {d.name.toLowerCase()} techniques</p>
                </div>
              )}
              {roundDots}
            </div>
          );
        }

        // ── SHADOWBOXING ──
        if (sessionType === "shadowbox") {
          const prompts = getShadowboxPrompts(discipline);
          const prompt = prompts.length > 0 ? prompts[currentRound % prompts.length] : null;
          return (
            <div className="space-y-4">
              {roundHeader}
              {prompt ? (
                <AnimatePresence mode="wait">
                  <motion.div key={prompt.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="rounded-2xl border bg-[var(--fg-03)] overflow-hidden" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)` }}>
                    <div className="px-4 py-3 flex items-center justify-between" style={{ background: `rgb(${d.colorRgb} / 0.06)` }}>
                      <div>
                        <p className="text-[18px] font-bold text-[var(--fg-90)]">{prompt.name}</p>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>Shadow Work</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                        <Eye size={20} style={{ color: `rgb(${d.colorRgb})` }} />
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="rounded-xl p-3" style={{ background: `rgb(${d.colorRgb} / 0.04)` }}>
                        <p className="text-[8px] font-mono tracking-widest mb-1.5" style={{ color: `rgb(${d.colorRgb} / 0.5)` }}>SCENARIO</p>
                        <p className="text-[13px] text-[var(--fg-65)] leading-relaxed italic">{prompt.scenario}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono tracking-widest" style={{ color: `rgb(${d.colorRgb} / 0.6)` }}>COMBO SEQUENCE</p>
                        {prompt.comboSequence.map((step, i) => (
                          <div key={i} className="flex items-center gap-2.5 py-0.5">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `rgb(${d.colorRgb} / 0.1)` }}>
                              <span className="text-[10px] font-bold font-mono" style={{ color: `rgb(${d.colorRgb})` }}>{i + 1}</span>
                            </div>
                            <p className="text-[13px] font-medium text-[var(--fg-70)]">{step}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2 pt-2 border-t border-[var(--fg-04)]">
                        <p className="text-[8px] font-mono tracking-widest" style={{ color: `rgb(${d.colorRgb} / 0.5)` }}>FOOTWORK</p>
                        <p className="text-[12px] text-[var(--fg-50)] leading-relaxed">{prompt.footworkCue}</p>
                      </div>
                      <div className="rounded-xl border border-[var(--fg-06)] p-3">
                        <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)] mb-1">VISUALIZE</p>
                        <p className="text-[11px] text-[var(--fg-40)] leading-relaxed italic">{prompt.visualizationTip}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-6 text-center">
                  <Eye size={24} className="mx-auto mb-2 text-[var(--fg-20)]" />
                  <p className="text-[14px] font-bold text-[var(--fg-70)]">Shadow Work</p>
                  <p className="text-[11px] text-[var(--fg-30)] mt-1">Visualize an opponent and flow through combinations</p>
                </div>
              )}
              {roundDots}
            </div>
          );
        }

        // ── BAG WORK ──
        if (sessionType === "bag_work") {
          const combos = getBagWorkCombos(discipline);
          const combo = combos.length > 0 ? combos[currentRound % combos.length] : null;
          return (
            <div className="space-y-4">
              {roundHeader}
              {combo ? (
                <AnimatePresence mode="wait">
                  <motion.div key={combo.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="rounded-2xl border bg-[var(--fg-03)] overflow-hidden" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)` }}>
                    <div className="px-4 py-3 flex items-center justify-between" style={{ background: `rgb(${d.colorRgb} / 0.06)` }}>
                      <div>
                        <p className="text-[18px] font-bold text-[var(--fg-90)]">{combo.name}</p>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>{combo.targetArea}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                        <Zap size={20} style={{ color: `rgb(${d.colorRgb})` }} />
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono tracking-widest" style={{ color: `rgb(${d.colorRgb} / 0.6)` }}>COMBO</p>
                        {combo.sequence.map((step, i) => {
                          const isPower = step.includes("POWER");
                          return (
                            <div key={i} className="flex items-center gap-2.5 py-0.5">
                              <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: isPower ? `rgb(${d.colorRgb} / 0.2)` : `rgb(${d.colorRgb} / 0.08)`, outline: isPower ? `1px solid rgb(${d.colorRgb} / 0.4)` : undefined }}>
                                <span className="text-[10px] font-bold font-mono" style={{ color: `rgb(${d.colorRgb})` }}>{i + 1}</span>
                              </div>
                              <p className={`text-[13px] leading-snug ${isPower ? "font-bold text-[var(--fg-90)]" : "text-[var(--fg-65)]"}`}>{step}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="rounded-xl p-3" style={{ background: `rgb(${d.colorRgb} / 0.06)`, border: `1px solid rgb(${d.colorRgb} / 0.1)` }}>
                        <p className="text-[8px] font-mono tracking-widest mb-1" style={{ color: `rgb(${d.colorRgb} / 0.6)` }}>INTENSITY CUE</p>
                        <p className="text-[12px] font-medium text-[var(--fg-65)] leading-relaxed">{combo.intensityCue}</p>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-[var(--fg-04)]">
                        <p className="text-[8px] font-mono tracking-widest" style={{ color: `rgb(${d.colorRgb} / 0.5)` }}>POWER TIP</p>
                        <p className="text-[12px] text-[var(--fg-50)] leading-relaxed">{combo.powerTip}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-6 text-center">
                  <Zap size={24} className="mx-auto mb-2 text-[var(--fg-20)]" />
                  <p className="text-[14px] font-bold text-[var(--fg-70)]">Bag Work</p>
                  <p className="text-[11px] text-[var(--fg-30)] mt-1">Work combos on the bag — focus on power and technique</p>
                </div>
              )}
              {roundDots}
            </div>
          );
        }

        // ── PAD WORK (uses COMBO_LIBRARY) ──
        if (sessionType === "pad_work") {
          const combos = COMBO_LIBRARY.filter(c => c.discipline === discipline);
          const combo = combos.length > 0 ? combos[currentRound % combos.length] : null;
          const comboTechs = combo ? combo.techniqueIds.map(tid => TECHNIQUE_LIBRARY.find(t => t.id === tid)).filter(Boolean) : [];
          return (
            <div className="space-y-4">
              {roundHeader}
              {combo ? (
                <AnimatePresence mode="wait">
                  <motion.div key={combo.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="rounded-2xl border bg-[var(--fg-03)] overflow-hidden" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)` }}>
                    <div className="px-4 py-3 flex items-center justify-between" style={{ background: `rgb(${d.colorRgb} / 0.06)` }}>
                      <div>
                        <p className="text-[18px] font-bold text-[var(--fg-90)]">{combo.name}</p>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>Pad Work · {combo.difficulty}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                        <Target size={20} style={{ color: `rgb(${d.colorRgb})` }} />
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <p className="text-[12px] text-[var(--fg-50)] leading-relaxed">{combo.description}</p>
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono tracking-widest" style={{ color: `rgb(${d.colorRgb} / 0.6)` }}>SEQUENCE</p>
                        {comboTechs.map((t, i) => t && (
                          <div key={i} className="flex items-start gap-2.5 py-0.5">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `rgb(${d.colorRgb} / 0.1)` }}>
                              <span className="text-[10px] font-bold font-mono" style={{ color: `rgb(${d.colorRgb})` }}>{i + 1}</span>
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-[var(--fg-70)]">{t.name}</p>
                              <p className="text-[10px] text-[var(--fg-35)]">{t.keyPoints[0]}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl border border-[var(--fg-06)] p-3">
                        <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)] mb-1">PARTNER CALL</p>
                        <p className="text-[11px] text-[var(--fg-40)] leading-relaxed">Call the combo out loud: {combo.description}. Mix up timing — don{"'"}t be predictable.</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-6 text-center">
                  <p className="text-[14px] font-bold text-[var(--fg-70)]">Pad Work</p>
                  <p className="text-[11px] text-[var(--fg-30)] mt-1">Work combos with your partner on the pads</p>
                </div>
              )}
              {roundDots}
            </div>
          );
        }

        // ── SPARRING ──
        if (sessionType === "sparring") {
          const concepts = getSparringConcepts(discipline);
          const concept = concepts.length > 0 ? concepts[currentRound % concepts.length] : null;
          return (
            <div className="space-y-4">
              {roundHeader}
              {concept ? (
                <AnimatePresence mode="wait">
                  <motion.div key={concept.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="rounded-2xl border bg-[var(--fg-03)] overflow-hidden" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)` }}>
                    <div className="px-4 py-3 flex items-center justify-between" style={{ background: `rgb(${d.colorRgb} / 0.06)` }}>
                      <div>
                        <p className="text-[18px] font-bold text-[var(--fg-90)]">{concept.name}</p>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>{concept.focus}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                        <Shield size={20} style={{ color: `rgb(${d.colorRgb})` }} />
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="rounded-xl p-3" style={{ background: `rgb(${d.colorRgb} / 0.04)` }}>
                        <p className="text-[8px] font-mono tracking-widest mb-1.5" style={{ color: `rgb(${d.colorRgb} / 0.5)` }}>ROUND FOCUS</p>
                        <p className="text-[13px] text-[var(--fg-65)] leading-relaxed">{concept.concept}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono tracking-widest" style={{ color: `rgb(${d.colorRgb} / 0.6)` }}>TACTICAL TIPS</p>
                        {concept.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2.5 py-0.5">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: `rgb(${d.colorRgb} / 0.1)` }}>
                              <Check size={11} style={{ color: `rgb(${d.colorRgb})` }} />
                            </div>
                            <p className="text-[12px] text-[var(--fg-65)] leading-snug">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-6 text-center">
                  <Shield size={24} className="mx-auto mb-2 text-[var(--fg-20)]" />
                  <p className="text-[14px] font-bold text-[var(--fg-70)]">Sparring Round</p>
                  <p className="text-[11px] text-[var(--fg-30)] mt-1">Stay technical — work on timing and defense</p>
                </div>
              )}
              {roundDots}
            </div>
          );
        }

        // ── CONDITIONING ──
        if (sessionType === "conditioning") {
          const drills = getConditioningDrills(discipline);
          const drillsPerRound = 3;
          const startIdx = (currentRound * drillsPerRound) % drills.length;
          const roundDrills = Array.from({ length: drillsPerRound }, (_, i) => drills[(startIdx + i) % drills.length]);
          return (
            <div className="space-y-4">
              {roundHeader}
              <AnimatePresence mode="wait">
                <motion.div key={`cond-${currentRound}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl border bg-[var(--fg-03)] overflow-hidden" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)` }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: `rgb(${d.colorRgb} / 0.06)` }}>
                    <div>
                      <p className="text-[18px] font-bold text-[var(--fg-90)]">Conditioning Circuit</p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>Round {currentRound + 1} · {drillsPerRound} exercises</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                      <Flame size={20} style={{ color: `rgb(${d.colorRgb})` }} />
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {roundDrills.map((drill, i) => (
                      <div key={drill.id} className="rounded-xl border border-[var(--fg-06)] p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.1)` }}>
                              <span className="text-[10px] font-bold font-mono" style={{ color: `rgb(${d.colorRgb})` }}>{i + 1}</span>
                            </div>
                            <p className="text-[14px] font-bold text-[var(--fg-80)]">{drill.name}</p>
                          </div>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${drill.intensity === "hard" ? "bg-red-500/10 text-red-400/70" : drill.intensity === "medium" ? "bg-amber-500/10 text-amber-400/70" : "bg-emerald-500/10 text-emerald-400/70"}`}>
                            {drill.intensity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--fg-40)] leading-relaxed">{drill.description}</p>
                        <p className="text-[10px] font-mono mt-1.5" style={{ color: `rgb(${d.colorRgb} / 0.6)` }}>{drill.duration}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
              {roundDots}
            </div>
          );
        }

        // ── KATA / FORMS ──
        if (sessionType === "kata") {
          const katas = getKataSequences(discipline);
          const kata = katas.length > 0 ? katas[currentRound % katas.length] : null;
          return (
            <div className="space-y-4">
              {roundHeader}
              {kata ? (
                <AnimatePresence mode="wait">
                  <motion.div key={kata.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="rounded-2xl border bg-[var(--fg-03)] overflow-hidden" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)` }}>
                    <div className="px-4 py-3 flex items-center justify-between" style={{ background: `rgb(${d.colorRgb} / 0.06)` }}>
                      <div>
                        <p className="text-[18px] font-bold text-[var(--fg-90)]">{kata.name}</p>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>{kata.meaning} · {kata.movements} moves</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                        <BookOpen size={20} style={{ color: `rgb(${d.colorRgb})` }} />
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono tracking-widest" style={{ color: `rgb(${d.colorRgb} / 0.6)` }}>STEP BY STEP</p>
                        {kata.steps.map((step, i) => (
                          <div key={i} className="flex items-start gap-2.5 py-1">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `rgb(${d.colorRgb} / 0.1)` }}>
                              <span className="text-[9px] font-bold font-mono" style={{ color: `rgb(${d.colorRgb})` }}>{i + 1}</span>
                            </div>
                            <p className="text-[12px] text-[var(--fg-60)] leading-snug">{step}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl border border-[var(--fg-06)] p-3">
                        <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)] mb-1">BREATHING</p>
                        <p className="text-[11px] text-[var(--fg-40)] leading-relaxed">{kata.breathingCue}</p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-6 text-center">
                  <BookOpen size={24} className="mx-auto mb-2 text-[var(--fg-20)]" />
                  <p className="text-[14px] font-bold text-[var(--fg-70)]">Forms Practice</p>
                  <p className="text-[11px] text-[var(--fg-30)] mt-1">Focus on precision, breathing, and flow</p>
                </div>
              )}
              {roundDots}
            </div>
          );
        }

        // ── FLOW ROLL ──
        if (sessionType === "flow_roll") {
          const drills = getFlowDrills(discipline);
          const drill = drills.length > 0 ? drills[currentRound % drills.length] : null;
          return (
            <div className="space-y-4">
              {roundHeader}
              {drill ? (
                <AnimatePresence mode="wait">
                  <motion.div key={drill.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="rounded-2xl border bg-[var(--fg-03)] overflow-hidden" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)` }}>
                    <div className="px-4 py-3 flex items-center justify-between" style={{ background: `rgb(${d.colorRgb} / 0.06)` }}>
                      <div>
                        <p className="text-[18px] font-bold text-[var(--fg-90)]">{drill.name}</p>
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>{drill.focus}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                        <Waves size={20} style={{ color: `rgb(${d.colorRgb})` }} />
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="rounded-xl p-3" style={{ background: `rgb(${d.colorRgb} / 0.04)` }}>
                        <p className="text-[8px] font-mono tracking-widest mb-1.5" style={{ color: `rgb(${d.colorRgb} / 0.5)` }}>CONCEPT</p>
                        <p className="text-[13px] text-[var(--fg-65)] leading-relaxed">{drill.concept}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono tracking-widest" style={{ color: `rgb(${d.colorRgb} / 0.6)` }}>RULES OF ENGAGEMENT</p>
                        {drill.rules.map((rule, i) => (
                          <div key={i} className="flex items-start gap-2.5 py-0.5">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: `rgb(${d.colorRgb} / 0.1)` }}>
                              <Check size={11} style={{ color: `rgb(${d.colorRgb})` }} />
                            </div>
                            <p className="text-[12px] text-[var(--fg-65)] leading-snug">{rule}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-6 text-center">
                  <Waves size={24} className="mx-auto mb-2 text-[var(--fg-20)]" />
                  <p className="text-[14px] font-bold text-[var(--fg-70)]">Flow Roll</p>
                  <p className="text-[11px] text-[var(--fg-30)] mt-1">Light rolling — focus on transitions and positions</p>
                </div>
              )}
              {roundDots}
            </div>
          );
        }

        // ── MIXED / DEFAULT — rotate between technique and conditioning ──
        {
          const mixedTypes: SessionType[] = ["technique", "conditioning", "shadowbox"];
          const effectiveType = mixedTypes[currentRound % mixedTypes.length];
          if (effectiveType === "conditioning") {
            const drills = getConditioningDrills(discipline);
            const drill = drills.length > 0 ? drills[currentRound % drills.length] : null;
            return (
              <div className="space-y-4">
                {roundHeader}
                <div className="rounded-2xl border bg-[var(--fg-03)] overflow-hidden" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)` }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: `rgb(${d.colorRgb} / 0.06)` }}>
                    <div>
                      <p className="text-[18px] font-bold text-[var(--fg-90)]">{drill?.name ?? "Conditioning"}</p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>Mixed · Conditioning</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                      <Flame size={20} style={{ color: `rgb(${d.colorRgb})` }} />
                    </div>
                  </div>
                  {drill && (
                    <div className="p-4 space-y-2">
                      <p className="text-[12px] text-[var(--fg-50)] leading-relaxed">{drill.description}</p>
                      <p className="text-[10px] font-mono" style={{ color: `rgb(${d.colorRgb} / 0.6)` }}>{drill.duration}</p>
                    </div>
                  )}
                </div>
                {roundDots}
              </div>
            );
          }
          if (effectiveType === "shadowbox") {
            const prompts = getShadowboxPrompts(discipline);
            const prompt = prompts.length > 0 ? prompts[currentRound % prompts.length] : null;
            return (
              <div className="space-y-4">
                {roundHeader}
                <div className="rounded-2xl border bg-[var(--fg-03)] overflow-hidden" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)` }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: `rgb(${d.colorRgb} / 0.06)` }}>
                    <div>
                      <p className="text-[18px] font-bold text-[var(--fg-90)]">{prompt?.name ?? "Shadow Work"}</p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>Mixed · Shadow Work</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                      <Eye size={20} style={{ color: `rgb(${d.colorRgb})` }} />
                    </div>
                  </div>
                  {prompt && (
                    <div className="p-4 space-y-3">
                      <p className="text-[13px] text-[var(--fg-65)] italic leading-relaxed">{prompt.scenario}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {prompt.comboSequence.map((s, i) => (
                          <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: `rgb(${d.colorRgb} / 0.08)`, color: `rgb(${d.colorRgb} / 0.8)` }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {roundDots}
              </div>
            );
          }
          // technique round
          return (
            <div className="space-y-4">
              {roundHeader}
              {focusTech ? (
                <div className="rounded-2xl border bg-[var(--fg-03)] overflow-hidden" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)` }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: `rgb(${d.colorRgb} / 0.06)` }}>
                    <div>
                      <p className="text-[18px] font-bold text-[var(--fg-90)]">{focusTech.name}</p>
                      <p className="text-[10px] font-mono capitalize mt-0.5" style={{ color: `rgb(${d.colorRgb} / 0.7)` }}>Mixed · Technique</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `rgb(${d.colorRgb} / 0.12)` }}>
                      <Target size={20} style={{ color: `rgb(${d.colorRgb})` }} />
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="text-[12px] text-[var(--fg-50)] leading-relaxed">{focusTech.description}</p>
                    <div className="space-y-1.5">
                      {focusTech.keyPoints.map((kp, i) => (
                        <div key={i} className="flex items-start gap-2 py-0.5">
                          <Check size={11} className="shrink-0 mt-0.5" style={{ color: `rgb(${d.colorRgb})` }} />
                          <p className="text-[12px] text-[var(--fg-65)] leading-snug">{kp}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-6 text-center">
                  <p className="text-[14px] font-bold text-[var(--fg-70)]">Free Practice</p>
                  <p className="text-[11px] text-[var(--fg-30)] mt-1">Work on any {d.name.toLowerCase()} techniques</p>
                </div>
              )}
              {roundDots}
            </div>
          );
        }
      })()}

      {/* ═══ REST ═══ */}
      {phase === "rest" && (
        <div className="space-y-4">
          <div className="text-center space-y-3">
            <p className="text-[9px] font-mono tracking-widest text-amber-400/60">REST</p>
            <div className="relative w-36 h-36 mx-auto cursor-pointer" onClick={onToggleTimer}>
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--fg-06)" strokeWidth="3" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(245 158 11)" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`} strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct)}`}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold font-mono tabular-nums text-[var(--fg-90)]">{fmtDuration(timer)}</span>
                <span className="text-[10px] font-mono text-amber-400/40 mt-1">breathe</span>
              </div>
            </div>
          </div>

          {nextTech && (
            <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4 space-y-2">
              <p className="text-[8px] font-mono tracking-widest text-amber-400/50">UP NEXT — ROUND {currentRound + 1}</p>
              <p className="text-[15px] font-bold text-[var(--fg-70)]">{nextTech.name}</p>
              <p className="text-[11px] text-[var(--fg-35)] leading-relaxed">{nextTech.description}</p>
              {nextTech.keyPoints.length > 0 && (
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {nextTech.keyPoints.slice(0, 3).map((kp, i) => (
                    <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300/60">{kp}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-1.5 justify-center">
            {Array.from({ length: totalRounds }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full transition-all" style={{
                background: i < currentRound ? `rgb(${d.colorRgb})` : "var(--fg-06)",
              }} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ COOLDOWN ═══ */}
      {phase === "cooldown" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0 cursor-pointer" onClick={onToggleTimer}>
              <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r="35" fill="none" stroke="var(--fg-06)" strokeWidth="3" />
                <circle cx="40" cy="40" r="35" fill="none" stroke={`rgb(${timerColor})`} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 35}`} strokeDashoffset={`${2 * Math.PI * 35 * (1 - pct)}`}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold font-mono tabular-nums text-[var(--fg-90)]">{fmtDuration(timer)}</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[9px] font-mono tracking-widest mb-1" style={{ color: `rgb(${timerColor} / 0.7)` }}>COOL DOWN</p>
              <p className="text-[14px] font-bold text-[var(--fg-80)]">Stretch & Recover</p>
              <p className="text-[10px] text-[var(--fg-30)] mt-0.5">Bring your heart rate down</p>
            </div>
          </div>

          <div className="flex justify-center">
            <button onClick={onToggleTimer} className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{ background: `rgb(${timerColor} / 0.1)`, border: `1px solid rgb(${timerColor} / 0.2)` }}>
              {isRunning ? <Pause size={20} style={{ color: `rgb(${timerColor})` }} /> : <Play size={20} style={{ color: `rgb(${timerColor})` }} />}
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-2.5">
            <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">STRETCHING ROUTINE</p>
            {cooldowns.map((c, i) => (
              <div key={i} className="flex items-start gap-3 py-1">
                <div className="w-5 h-5 rounded-md border border-[var(--fg-10)] bg-[var(--fg-04)] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-mono text-[var(--fg-25)]">{i + 1}</span>
                </div>
                <p className="text-[12px] text-[var(--fg-55)] leading-snug">{c}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ DONE ═══ */}
      {isDone && (
        <div className="text-center space-y-5 py-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
            style={{ background: `rgb(${d.colorRgb} / 0.1)`, border: `2px solid rgb(${d.colorRgb} / 0.3)` }}>
            <Check size={36} style={{ color: `rgb(${d.colorRgb})` }} />
          </motion.div>
          <div>
            <p className="text-lg font-bold text-[var(--fg-90)]">Session Complete</p>
            <p className="text-[11px] font-mono text-[var(--fg-30)] mt-1">{roundLogs.length} rounds · {activeTechIds.length} techniques · {roundIntensity}</p>
          </div>
          <button onClick={onFinish}
            className="w-full text-[15px] font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, rgb(${d.colorRgb} / 0.15), rgb(${d.colorRgb} / 0.05))`,
              border: `1px solid rgb(${d.colorRgb} / 0.2)`,
              color: `rgb(${d.colorRgb})`,
            }}>
            Save & View Receipt
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// SHARED CONSTANTS
// ═══════════════════════════════════════════════
// FIGURE CARD — auto-rotating image slideshow
// ═══════════════════════════════════════════════

function parseBioSections(bio: string): { origin: string; career: string; legacy: string } {
  const sentences = bio.split(/(?<=\.)\s+/);
  const total = sentences.length;
  if (total <= 3) return { origin: sentences[0] || "", career: sentences.slice(1, -1).join(" ") || "", legacy: sentences[total - 1] || "" };
  const originEnd = Math.min(2, Math.ceil(total * 0.25));
  const legacyStart = Math.max(originEnd + 1, total - 2);
  return {
    origin: sentences.slice(0, originEnd).join(" "),
    career: sentences.slice(originEnd, legacyStart).join(" "),
    legacy: sentences.slice(legacyStart).join(" "),
  };
}

function FigureCard({ fig, colorRgb }: {
  fig: { name: string; role: string; bio?: string; imageUrl?: string };
  colorRgb: string;
}) {
  const img = fig.imageUrl;
  const [expanded, setExpanded] = useState(false);
  const initial = fig.name.charAt(0);
  const sections = fig.bio ? parseBioSections(fig.bio) : null;

  return (
    <>
      {/* Carousel card — circular portrait + name */}
      <button
        className="snap-start shrink-0 w-[130px] flex flex-col items-center gap-2 py-3 px-2 rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] hover:bg-[var(--fg-05)] active:scale-[0.97] transition-all text-center"
        onClick={() => setExpanded(true)}
      >
        <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 shrink-0" style={{ ["--tw-ring-color" as string]: `rgb(${colorRgb} / 0.3)` }}>
          {img ? (
            <Image src={img} alt={fig.name} fill className="object-cover" sizes="80px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[28px] font-bold" style={{ background: `rgb(${colorRgb} / 0.12)`, color: `rgb(${colorRgb} / 0.5)` }}>{initial}</div>
          )}
        </div>
        <div className="min-w-0 w-full">
          <p className="text-[11px] font-semibold text-[var(--fg-70)] leading-tight truncate">{fig.name}</p>
          <p className="text-[8px] font-mono text-[var(--fg-25)] mt-0.5 leading-tight line-clamp-2">{fig.role}</p>
        </div>
      </button>

      {/* Full-screen bio overlay */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 280 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-[var(--fg-10)] bg-[var(--bg-primary)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Hero header with image */}
              <div className="relative">
                {img ? (
                  <div className="relative h-56 overflow-hidden rounded-t-3xl">
                    <Image src={img} alt={fig.name} fill className="object-cover object-top" sizes="(max-width: 640px) 100vw, 512px" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-black/30" />
                  </div>
                ) : (
                  <div className="h-32 rounded-t-3xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, rgb(${colorRgb} / 0.15), rgb(${colorRgb} / 0.05))` }}>
                    <span className="text-[56px] font-bold" style={{ color: `rgb(${colorRgb} / 0.3)` }}>{initial}</span>
                  </div>
                )}
                {/* Name overlay at bottom of hero */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <h2 className="text-[22px] font-bold text-[var(--fg-95)] drop-shadow-lg">{fig.name}</h2>
                  <p className="text-[11px] font-mono mt-0.5 drop-shadow-md" style={{ color: `rgb(${colorRgb})` }}>{fig.role}</p>
                </div>
                {/* Close button */}
                <button
                  onClick={() => setExpanded(false)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition"
                >
                  <X size={14} className="text-white/80" />
                </button>
                {/* Drag handle */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2">
                  <div className="w-10 h-1 rounded-full bg-white/30" />
                </div>
              </div>

              {/* Bio sections */}
              {sections && (
                <div className="px-5 pt-4 pb-10 space-y-4">
                  {/* Origins */}
                  {sections.origin && (
                    <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-3.5">
                      <p className="text-[8px] font-mono tracking-widest mb-2" style={{ color: `rgb(${colorRgb} / 0.6)` }}>ORIGINS</p>
                      <p className="text-[12px] text-[var(--fg-60)] leading-[1.7]">{sections.origin}</p>
                    </div>
                  )}

                  {/* Career */}
                  {sections.career && (
                    <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-3.5">
                      <p className="text-[8px] font-mono tracking-widest mb-2" style={{ color: `rgb(${colorRgb} / 0.6)` }}>CAREER</p>
                      <p className="text-[12px] text-[var(--fg-60)] leading-[1.7]">{sections.career}</p>
                    </div>
                  )}

                  {/* Legacy */}
                  {sections.legacy && (
                    <div className="rounded-xl border-l-2 p-3.5" style={{ borderLeftColor: `rgb(${colorRgb} / 0.4)`, background: `rgb(${colorRgb} / 0.04)` }}>
                      <p className="text-[8px] font-mono tracking-widest mb-2" style={{ color: `rgb(${colorRgb} / 0.6)` }}>LEGACY</p>
                      <p className="text-[12px] text-[var(--fg-55)] leading-[1.7] italic">{sections.legacy}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════════════

const TECH_CATEGORY_IMAGES: Record<string, string> = {
  punch: "/ma/techniques/punch.jpg",
  kick: "/ma/techniques/kick.jpg",
  block: "/ma/techniques/defense.jpg",
  stance: "/ma/techniques/stance.jpg",
  clinch: "/ma/techniques/clinch.jpg",
  combo: "/ma/techniques/combo.jpg",
  submission: "/ma/techniques/grapple.jpg",
  guard: "/ma/techniques/grapple.jpg",
  pass: "/ma/techniques/grapple.jpg",
  sweep: "/ma/techniques/grapple.jpg",
  escape: "/ma/techniques/grapple.jpg",
  takedown: "/ma/techniques/grapple.jpg",
  throw: "/ma/techniques/grapple.jpg",
  elbow: "/ma/techniques/clinch.jpg",
  knee: "/ma/techniques/clinch.jpg",
  form: "/ma/techniques/stance.jpg",
};

function SetupTechniquePreview({ activeTechIds, techniques, colorRgb }: {
  activeTechIds: string[];
  techniques: { id: string; name: string; description: string; category: string }[];
  colorRgb: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const showIds = expanded ? activeTechIds : activeTechIds.slice(0, 6);
  const hasMore = activeTechIds.length > 6;

  return (
    <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-3">
      <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">TECHNIQUES YOU&apos;LL PRACTICE</p>
      <div className="space-y-2">
        {showIds.map((id, i) => {
          const t = techniques.find(t => t.id === id);
          if (!t) return null;
          return (
            <div key={id} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono shrink-0" style={{ background: `rgb(${colorRgb} / 0.1)`, color: `rgb(${colorRgb} / 0.7)` }}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[var(--fg-60)]">{t.name}</p>
                <p className="text-[9px] text-[var(--fg-25)] truncate">{t.description}</p>
              </div>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full capitalize shrink-0" style={{ background: `rgb(${colorRgb} / 0.08)`, color: `rgb(${colorRgb} / 0.6)` }}>{t.category}</span>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] font-mono flex items-center gap-1 transition-colors" style={{ color: `rgb(${colorRgb} / 0.7)` }}>
          {expanded ? "Show less" : `+${activeTechIds.length - 6} more techniques`}
          <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}

function SetupCustomize({ totalRounds, roundDuration, restDuration, roundIntensity, selectedTechniques, techniques, colorRgb, onSetTotalRounds, onSetRoundDuration, onSetRestDuration, onSetIntensity, onToggleTechnique }: {
  totalRounds: number; roundDuration: number; restDuration: number;
  roundIntensity: "light" | "medium" | "hard"; selectedTechniques: string[];
  techniques: { id: string; name: string; category: string }[];
  colorRgb: string;
  onSetTotalRounds: (n: number) => void; onSetRoundDuration: (n: number) => void;
  onSetRestDuration: (n: number) => void; onSetIntensity: (i: "light" | "medium" | "hard") => void;
  onToggleTechnique: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-mono text-[var(--fg-25)] hover:text-[var(--fg-50)] transition">
        <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        {expanded ? "Hide settings" : "Customize session"}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Round settings */}
            <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-4">
              <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">ROUND SETTINGS</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "ROUNDS", help: "How many times", value: totalRounds, onChange: onSetTotalRounds, min: 1, max: 20, step: 1 },
                  { label: "WORK TIME", help: "Each round", value: roundDuration, onChange: onSetRoundDuration, min: 30, max: 600, step: 30, fmt: fmtDuration },
                  { label: "REST TIME", help: "Between rounds", value: restDuration, onChange: onSetRestDuration, min: 0, max: 300, step: 15, fmt: fmtDuration },
                ].map(({ label, help, value, onChange, min, max, step, fmt }) => (
                  <div key={label} className="text-center">
                    <p className="text-[7px] font-mono tracking-widest text-[var(--fg-20)] mb-0.5">{label}</p>
                    <p className="text-[7px] text-[var(--fg-15)] mb-2">{help}</p>
                    <p className="text-xl font-bold font-mono text-[var(--fg-80)] mb-2 tabular-nums">{fmt ? fmt(value) : value}</p>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onChange(Math.max(min, value - step))} className="w-8 h-8 rounded-lg bg-[var(--fg-04)] hover:bg-[var(--fg-08)] text-[var(--fg-40)] text-sm font-bold transition">-</button>
                      <button onClick={() => onChange(Math.min(max, value + step))} className="w-8 h-8 rounded-lg bg-[var(--fg-04)] hover:bg-[var(--fg-08)] text-[var(--fg-40)] text-sm font-bold transition">+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[var(--fg-04)]">
                <p className="w-full text-[7px] font-mono text-[var(--fg-15)] mb-0.5">Quick presets:</p>
                {Object.entries(ROUND_PRESETS).filter(([k]) => k !== "custom").map(([key, preset]) => {
                  const active = roundDuration === preset.roundSec && restDuration === preset.restSec;
                  return (
                    <button key={key} onClick={() => { onSetRoundDuration(preset.roundSec); onSetRestDuration(preset.restSec); }}
                      className={`text-[9px] font-mono px-2.5 py-1 rounded-full border transition ${active ? "border-[var(--fg-20)] text-[var(--fg-60)] bg-[var(--fg-06)]" : "border-[var(--fg-06)] text-[var(--fg-25)] hover:text-[var(--fg-50)]"}`}>
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Intensity */}
            <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-3">
              <div>
                <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">INTENSITY</p>
                <p className="text-[7px] text-[var(--fg-15)] mt-0.5">How hard will you push?</p>
              </div>
              <div className="flex gap-2">
                {(["light", "medium", "hard"] as const).map(i => {
                  const active = roundIntensity === i;
                  return (
                    <button key={i} onClick={() => onSetIntensity(i)}
                      className={`flex-1 text-[11px] font-mono py-2.5 rounded-xl border capitalize transition ${active
                        ? i === "light" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                        : i === "medium" ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        : "border-red-500/30 text-red-400 bg-red-500/10"
                        : "border-[var(--fg-06)] text-[var(--fg-25)]"}`}>
                      {i === "light" ? "🟢 " : i === "medium" ? "🟡 " : "🔴 "}{i}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Technique picker */}
            <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">FOCUS TECHNIQUES</p>
                  <p className="text-[7px] text-[var(--fg-15)] mt-0.5">Optional — pick moves to focus on</p>
                </div>
                <p className="text-[8px] font-mono text-[var(--fg-15)]">{selectedTechniques.length} selected</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {techniques.slice(0, 15).map(t => {
                  const active = selectedTechniques.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => onToggleTechnique(t.id)}
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-full border transition flex items-center gap-1 ${active ? "border-[var(--fg-20)] text-[var(--fg-60)] bg-[var(--fg-06)]" : "border-[var(--fg-06)] text-[var(--fg-25)]"}`}>
                      {active && <Check size={10} />}{t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════
// RECEIPT VIEW
// ═══════════════════════════════════════════════

function ReceiptView({ discipline, sessionType, roundLogs, xp, startTime, techniques, onDone }: {
  discipline: DisciplineId; sessionType: SessionType; roundLogs: RoundLog[];
  xp: number; startTime: Date | null; techniques: string[];
  onDone: () => void;
}) {
  const d = DISCIPLINES[discipline];
  const typeInfo = SESSION_TYPE_LABELS[sessionType];
  const durationSec = startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0;
  const techNames = techniques.map(id => TECHNIQUE_LIBRARY.find(t => t.id === id)?.name).filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      {/* Header with image */}
      <div className="relative h-36 -mx-4 -mt-6 overflow-hidden rounded-b-3xl">
        <Image src={d.imageUrl} alt={d.name} fill className="object-cover" sizes="640px" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-black/50 to-black/20" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 text-center">
          <p className="text-[9px] font-mono tracking-widest text-white/50 mb-1">SESSION COMPLETE</p>
          <h1 className="text-lg font-bold text-white">{d.name} · {typeInfo?.name}</h1>
          <p className="text-[10px] font-mono text-white/40 mt-0.5">{startTime?.toLocaleDateString()}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "ROUNDS", value: String(roundLogs.length) },
          { label: "TIME", value: fmtMinutes(durationSec) },
          { label: "XP", value: `+${xp}`, accent: true },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] px-3 py-2.5 text-center">
            <p className="text-[7px] font-mono tracking-widest text-[var(--fg-20)] mb-0.5">{s.label}</p>
            <p className={`text-xl font-bold font-mono ${s.accent ? "text-emerald-400" : "text-[var(--fg-80)]"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* XP progress */}
      <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">XP EARNED</p>
          <p className="text-sm font-bold font-mono text-emerald-400">+{xp}</p>
        </div>
        <div className="h-2 rounded-full bg-[var(--fg-06)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (xp / 300) * 100)}%` }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </div>
        <p className="text-[8px] font-mono text-[var(--fg-15)] text-right tabular-nums">{xp}/300 daily cap</p>
      </div>

      {/* Techniques */}
      {techNames.length > 0 && (
        <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-2">
          <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">TECHNIQUES DRILLED</p>
          <div className="flex flex-wrap gap-1.5">
            {techNames.map((name, i) => (
              <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[var(--fg-04)] text-[var(--fg-35)]">{name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Round breakdown */}
      {roundLogs.length > 0 && (
        <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 space-y-1">
          <p className="text-[8px] font-mono tracking-widest text-[var(--fg-20)] mb-2">ROUND BREAKDOWN</p>
          {roundLogs.map((log, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-[var(--fg-03)] last:border-0">
              <span className="text-[9px] font-mono font-bold text-[var(--fg-25)] w-5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-[10px] font-mono text-[var(--fg-40)] tabular-nums">{fmtDuration(log.durationSec)}</span>
              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full capitalize ${
                log.intensity === "light" ? "bg-emerald-500/10 text-emerald-400/70" :
                log.intensity === "medium" ? "bg-amber-500/10 text-amber-400/70" :
                "bg-red-500/10 text-red-400/70"
              }`}>{log.intensity}</span>
              <span className="text-[8px] font-mono text-[var(--fg-15)]">{log.techniques.length} tech</span>
            </div>
          ))}
        </div>
      )}

      {/* Done */}
      <button onClick={onDone}
        className="w-full text-[15px] font-bold py-4 rounded-2xl bg-[rgb(var(--accent-rgb))] text-black hover:brightness-110 active:scale-[0.98] transition-all">
        Done
      </button>
    </motion.div>
  );
}
