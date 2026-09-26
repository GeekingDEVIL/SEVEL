"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Check, ChevronLeft, X,
  Sparkles, ChevronDown, BookOpen, Zap, Target,
  Dumbbell, Play, Calendar, Timer, TrendingUp,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import SwipeNav from "../../components/ui/swipe-nav";
import { useModules } from "../../lib/useModules";
import { useAuth } from "../../lib/AuthProvider";
import { getTrainSections } from "../../lib/navPills";
import { supabase } from "../../lib/supabase";
import {
  DISCIPLINES, PHASE1_DISCIPLINES, SESSION_TYPE_LABELS,
  TECHNIQUE_LIBRARY, COMBO_LIBRARY, WARMUPS,
  DISCIPLINE_ORIGINS,
  getSessionTypesForDiscipline,
  type DisciplineId, type SessionType,
} from "../../lib/martialArtsEngine";
import { MA_PLAN_LIBRARY } from "../../lib/martialArtsPlanLibrary";

function fmtMinutes(secs: number): string {
  const m = Math.floor(secs / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════

type View = "hub" | "discipline";

export default function MartialArtsPage() {
  const { enabledKeys } = useModules();
  const { user } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<View>("hub");
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineId | null>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [disciplineStats, setDisciplineStats] = useState<Record<string, { sessions: number; hours: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const maDisciplines = ["boxing", "muay_thai", "kickboxing", "bjj", "wrestling", "judo", "mma", "karate", "taekwondo", "kung_fu", "krav_maga", "capoeira", "aikido"];
    Promise.all([
      supabase.from("workout_sessions").select("id, date, title, duration_seconds, total_sets, xp_earned, status, completed_at").eq("user_id", user.id).eq("status", "completed").order("date", { ascending: false }).limit(50),
    ]).then(([sessionsRes]) => {
      const allSessions = sessionsRes.data ?? [];
      const maSessions = allSessions.filter((s: any) => s.title && maDisciplines.some(d => (s.title as string).toLowerCase().includes(d.replace("_", " "))));
      setRecentSessions(maSessions.slice(0, 10).map((s: any) => {
        const disc = maDisciplines.find(d => (s.title as string).toLowerCase().includes(d.replace("_", " "))) || "boxing";
        return { ...s, discipline: disc };
      }));
      const stats: Record<string, { sessions: number; hours: number }> = {};
      for (const s of maSessions) {
        const disc = maDisciplines.find(d => (s.title as string).toLowerCase().includes(d.replace("_", " "))) || "boxing";
        if (!stats[disc]) stats[disc] = { sessions: 0, hours: 0 };
        stats[disc].sessions++;
        stats[disc].hours += (s.duration_seconds || 0) / 3600;
      }
      setDisciplineStats(stats);
      setLoading(false);
    });
  }, [user]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">
      <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-4">
        {view === "hub" && <SwipeNav sections={getTrainSections(enabledKeys)} />}
        <AnimatePresence mode="wait">
          {view === "hub" && <HubView key="hub" recentSessions={recentSessions} disciplineStats={disciplineStats} loading={loading} onSelectDiscipline={(d) => { setSelectedDiscipline(d); setView("discipline"); }} />}
          {view === "discipline" && selectedDiscipline && <DisciplineView key="disc" discipline={selectedDiscipline} stats={disciplineStats[selectedDiscipline]} recentSessions={recentSessions.filter(s => s.discipline === selectedDiscipline)} onBack={() => setView("hub")} onGoToSchedule={() => router.push("/schedule")} />}
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

function DisciplineView({ discipline, stats, recentSessions, onBack, onGoToSchedule }: {
  discipline: DisciplineId;
  stats?: { sessions: number; hours: number };
  recentSessions: any[];
  onBack: () => void;
  onGoToSchedule: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const d = DISCIPLINES[discipline];
  const origin = DISCIPLINE_ORIGINS[discipline];
  const techniques = TECHNIQUE_LIBRARY.filter(t => t.discipline === discipline);
  const sessionTypes = getSessionTypesForDiscipline(discipline);

  const [discSetStats, setDiscSetStats] = useState<{ totalSets: number; totalVolume: number; exerciseCount: number } | null>(null);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: logs } = await supabase
        .from("exercise_set_logs")
        .select("id, weight, reps, exercise_id, exercises!inner(discipline)")
        .eq("user_id", user.id)
        .eq("exercises.discipline", discipline);
      if (!logs || logs.length === 0) { setDiscSetStats({ totalSets: 0, totalVolume: 0, exerciseCount: 0 }); return; }
      const exIds = new Set(logs.map((l: any) => l.exercise_id));
      const totalVol = logs.reduce((s: number, l: any) => s + ((l.weight || 0) * (l.reps || 0)), 0);
      setDiscSetStats({ totalSets: logs.length, totalVolume: totalVol, exerciseCount: exIds.size });
    })();
  }, [user, discipline]);
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
                <button onClick={onGoToSchedule}
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
                      <Play size={12} className="inline mr-1 -mt-0.5" />Go to Schedule
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

              {/* Discipline stats dashboard (3.3 + 3.4) */}
              {((stats && stats.sessions > 0) || (discSetStats && discSetStats.totalSets > 0)) && (
                <div className="space-y-2">
                  <p className="text-[9px] font-mono tracking-widest text-[var(--fg-15)] px-1">YOUR {d.name.toUpperCase()} STATS</p>
                  <div className="flex gap-2">
                    {[
                      ...(stats && stats.sessions > 0 ? [
                        { label: "SESSIONS", value: String(stats.sessions), icon: <Zap size={11} /> },
                        { label: "HOURS", value: stats.hours.toFixed(1), icon: <Timer size={11} /> },
                      ] : []),
                      ...(discSetStats && discSetStats.totalSets > 0 ? [
                        { label: "SETS", value: String(discSetStats.totalSets), icon: <Dumbbell size={11} /> },
                        { label: "EXERCISES", value: String(discSetStats.exerciseCount), icon: <Target size={11} /> },
                      ] : [
                        { label: "AVG/WK", value: stats && stats.sessions >= 7 ? (stats.sessions / Math.max(1, Math.ceil(stats.sessions / 7))).toFixed(1) : String(stats?.sessions ?? 0), icon: <TrendingUp size={11} /> },
                      ]),
                    ].slice(0, 3).map(s => (
                      <div key={s.label} className="flex-1 rounded-xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-2.5">
                        <div className="flex items-center gap-1 mb-1">
                          <span style={{ color: `rgb(${d.colorRgb} / 0.6)` }}>{s.icon}</span>
                          <p className="text-[7px] font-mono tracking-widest text-[var(--fg-20)]">{s.label}</p>
                        </div>
                        <p className="text-lg font-black text-[var(--fg-80)] leading-none">{s.value}</p>
                      </div>
                    ))}
                  </div>
                  {discSetStats && discSetStats.totalVolume > 0 && (
                    <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-03)] px-3 py-2 flex items-center justify-between">
                      <span className="text-[9px] font-mono text-[var(--fg-25)]">Total Volume</span>
                      <span className="text-[12px] font-bold font-mono text-[var(--fg-60)]">{discSetStats.totalVolume.toLocaleString()} kg</span>
                    </div>
                  )}
                  {/* Recent sessions for this discipline */}
                  {recentSessions.length > 0 && (
                    <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-03)] divide-y divide-[var(--fg-04)]">
                      {recentSessions.slice(0, 3).map(s => (
                        <div key={s.id} className="flex items-center gap-3 px-3 py-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `rgb(${d.colorRgb} / 0.1)` }}>
                            <span className="text-sm">{d.emoji}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-medium text-[var(--fg-50)] truncate">{s.title || d.name}</p>
                            <p className="text-[8px] font-mono text-[var(--fg-20)]">{s.date}</p>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-[var(--fg-40)]">+{s.xp_earned || 0}xp</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Training types — expanded cards with action buttons */}
              <div className="space-y-2">
                <p className="text-[9px] font-mono tracking-widest text-[var(--fg-15)] px-1">{isNew ? "CHOOSE A TRAINING TYPE" : "START TRAINING"}</p>
                <div className="space-y-2">
                  {sessionTypes.map(st => {
                    const info = SESSION_TYPE_LABELS[st];
                    return (
                      <div key={st} className="w-full text-left rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] overflow-hidden">
                        <div className="p-3.5">
                          <div className="flex items-start gap-3">
                            <span className="text-xl shrink-0 mt-0.5">{info.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold text-[var(--fg-70)] mb-1">{info.name}</p>
                              <p className="text-[10px] text-[var(--fg-40)] leading-relaxed mb-2">{info.howItWorks}</p>
                              <div className="flex flex-wrap gap-1.5">
                                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full ${info.difficulty === "beginner" ? "bg-emerald-500/10 text-emerald-400/70" : info.difficulty === "intermediate" ? "bg-amber-500/10 text-amber-400/70" : "bg-red-500/10 text-red-400/70"}`}>{info.difficulty}</span>
                                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--fg-04)] text-[var(--fg-25)]">~{info.suggestedMin} min</span>
                                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--fg-04)] text-[var(--fg-25)]">{info.equipment}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex border-t border-[var(--fg-06)]">
                          <button onClick={onGoToSchedule} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] hover:bg-[var(--fg-03)] border-r border-[var(--fg-06)] transition">
                            <Calendar size={11} /> Add to Schedule
                          </button>
                          <button onClick={() => { router.push(`/schedule?startMa=${discipline}&st=${st}`); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-mono font-semibold transition" style={{ color: `rgb(${d.colorRgb})` }}>
                            <Play size={11} fill={`rgb(${d.colorRgb})`} /> Start Now
                          </button>
                        </div>
                      </div>
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

