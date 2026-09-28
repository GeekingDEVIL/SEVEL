"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse, TrendingUp, TrendingDown, Minus, AlertCircle, ChevronLeft, Zap, Clock, Dumbbell, Activity, ShieldCheck, ShieldAlert, Shield, ShieldX, Droplets, AlertTriangle, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";
import { analyzeRecovery, type MuscleRecoveryData, type RecoveryStatus, type RecoveryDiagnostics } from "../../lib/muscleRecovery";
import { analyzeAdaptiveVolume, getVolumeStatus, getVolumeGuidelines, type AdaptiveVolumeData } from "../../lib/volumeAnalysis";
import type { Sex } from "../../lib/calorieEngine";
import { useSex } from "../../lib/useSex";
import MuscleHeatMap from "../../components/MuscleHeatMap";
import CubeLoader from "../../components/ui/cube-loader";
import { staggerContainer, staggerItem } from "../../lib/motion";
import { useModules } from "../../lib/useModules";

function getWeekStart(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function timeAgo(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusConfig(status: RecoveryStatus): { icon: React.ReactNode; color: string; barColor: string; label: string; bgAccent: string } {
  switch (status) {
    case "recovered": return {
      icon: <ShieldCheck size={14} />,
      color: "text-emerald-300",
      barColor: "bg-emerald-400",
      label: "RECOVERED",
      bgAccent: "bg-emerald-400/8 border-emerald-400/15",
    };
    case "ready": return {
      icon: <Shield size={14} />,
      color: "text-cyan-300",
      barColor: "bg-cyan-400",
      label: "READY",
      bgAccent: "bg-cyan-400/8 border-cyan-400/15",
    };
    case "moderate": return {
      icon: <ShieldAlert size={14} />,
      color: "text-amber-300",
      barColor: "bg-amber-300",
      label: "RECOVERING",
      bgAccent: "bg-amber-300/8 border-amber-300/15",
    };
    case "fatigued": return {
      icon: <ShieldX size={14} />,
      color: "text-orange-400",
      barColor: "bg-orange-400",
      label: "FATIGUED",
      bgAccent: "bg-orange-400/8 border-orange-400/15",
    };
    case "overtrained": return {
      icon: <ShieldX size={14} />,
      color: "text-red-400",
      barColor: "bg-red-400",
      label: "REST NEEDED",
      bgAccent: "bg-red-400/8 border-red-400/15",
    };
  }
}

function recoveryBarColor(pct: number): string {
  if (pct >= 95) return "bg-emerald-400";
  if (pct >= 80) return "bg-cyan-400";
  if (pct >= 50) return "bg-amber-300";
  if (pct >= 25) return "bg-orange-400";
  return "bg-red-400";
}

function overallStatusLabel(avg: number): { label: string; color: string } {
  if (avg >= 85) return { label: "Fully Recovered", color: "text-emerald-300" };
  if (avg >= 70) return { label: "Mostly Ready", color: "text-cyan-300" };
  if (avg >= 50) return { label: "Partially Recovered", color: "text-amber-300" };
  if (avg >= 30) return { label: "Significant Fatigue", color: "text-orange-400" };
  return { label: "Rest Recommended", color: "text-red-400" };
}

export default function RecoveryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { enabledKeys } = useModules();
  const [recoveryData, setRecoveryData] = useState<Record<string, MuscleRecoveryData>>({});
  const [adaptiveData, setAdaptiveData] = useState<Record<string, AdaptiveVolumeData>>({});
  const [diagnostics, setDiagnostics] = useState<RecoveryDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);
  const [tomorrowConflicts, setTomorrowConflicts] = useState<string[]>([]);
  const { sex: userSex } = useSex();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [recovery, adaptive] = await Promise.all([
        analyzeRecovery(user.id, userSex),
        analyzeAdaptiveVolume(user.id, userSex),
      ]);
      if (cancelled) return;
      setRecoveryData(recovery.data);
      setDiagnostics(recovery.diagnostics);
      setAdaptiveData(adaptive);

      // Check tomorrow's schedule for conflicts
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
      const { data: tomorrowPlan } = await supabase
        .from("scheduled_plans")
        .select("plan_id")
        .eq("user_id", user.id)
        .eq("date", tomorrowStr)
        .limit(1);

      if (!cancelled && tomorrowPlan?.[0]?.plan_id) {
        const { data: exercises } = await supabase
          .from("scheduled_exercises")
          .select("body_part")
          .eq("plan_id", tomorrowPlan[0].plan_id);
        if (!cancelled && exercises) {
          const tomorrowMuscles = [...new Set(exercises.map((e: any) => e.body_part).filter(Boolean))];
          const fatigued = Object.entries(recovery.data)
            .filter(([, m]) => m.recoveryPct < 50)
            .map(([, m]) => m.segment);
          const conflicts = tomorrowMuscles.filter((m: string) =>
            fatigued.some(f => f.toLowerCase() === m.toLowerCase())
          );
          setTomorrowConflicts(conflicts as string[]);
        }
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, userSex]);

  const currentWeekStart = getWeekStart(new Date());

  const rows = Object.values(recoveryData).sort((a, b) => a.recoveryPct - b.recoveryPct);

  const avgRecovery = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + r.recoveryPct, 0) / rows.length)
    : null;
  const readyRows = rows.filter(r => r.recoveryPct >= 90);
  const recoveringRows = rows.filter(r => r.recoveryPct >= 40 && r.recoveryPct < 90);
  const fatiguedRows = rows.filter(r => r.recoveryPct < 40);
  const readyCount = rows.filter(r => r.recoveryPct >= 80).length;
  const fatiguedCount = rows.filter(r => r.recoveryPct < 50).length;
  const totalWeeklyVolume = rows.reduce((s, r) => s + r.weeklyVolume, 0);
  const totalFrequency = new Set(rows.flatMap(r => {
    const sessions: string[] = [];
    if (r.lastTrainedAt) sessions.push(r.lastTrainedAt.split("T")[0]);
    return sessions;
  })).size;

  const overallStatus = avgRecovery !== null ? overallStatusLabel(avgRecovery) : null;

  const heatMapMuscles = rows.map(r => ({
    muscle: r.segment,
    intensity: Math.round((r.recoveryPct / 100) * 10),
  }));

  function getRemainingHours(r: MuscleRecoveryData): number {
    if (!r.hoursElapsed) return 0;
    const remaining = Math.max(0, r.estimatedFullRecoveryHours - r.hoursElapsed);
    return Math.round(remaining);
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">

      <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-5">
        <button onClick={() => router.push("/track")} className="flex items-center gap-1 text-[var(--fg-40)] hover:text-[var(--fg-60)] transition">
          <ChevronLeft size={18} />
          <span className="text-xs font-mono">Track</span>
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-display text-[rgb(var(--accent-light-rgb))]">Recovery</h1>
            <p className="text-[11px] text-[var(--fg-30)] mt-0.5">Evidence-based per-muscle readiness</p>
          </div>
          {avgRecovery !== null && (
            <div className="text-right">
              <p className="text-2xl font-bold font-mono text-[var(--fg-90)]">{avgRecovery}%</p>
              <p className={`text-[9px] font-mono ${overallStatus!.color}`}>{overallStatus!.label}</p>
            </div>
          )}
        </div>

        {userSex === "female" && (
          <button onClick={() => router.push("/cycle")}
            className="w-full flex items-center gap-3 rounded-xl border border-pink-500/20 bg-pink-500/5 px-4 py-3 hover:bg-pink-500/10 transition">
            <Droplets size={16} className="text-pink-400 shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-[11px] font-mono text-pink-300">Cycle Tracking</p>
              <p className="text-[9px] font-mono text-[var(--fg-25)]">Log periods, symptoms & phase-aware recommendations</p>
            </div>
            <ChevronLeft size={14} className="text-[var(--fg-20)] rotate-180" />
          </button>
        )}

        {loading ? (
          <CubeLoader message="Analyzing recovery…" />
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--fg-03)] border border-[var(--fg-06)] flex items-center justify-center">
              <HeartPulse size={24} className="text-[var(--fg-15)]" />
            </div>
            {diagnostics && diagnostics.totalLogs > 0 ? (
              <>
                <p className="text-sm font-semibold text-[var(--fg-25)]">Exercises Need Body Segments</p>
                <p className="text-xs text-[var(--fg-20)] mt-1 max-w-xs mx-auto">
                  Found {diagnostics.totalLogs} logged sets but none mapped to a muscle group.
                  {diagnostics.skippedNoSegment > 0 && ` ${diagnostics.skippedNoSegment} sets have exercises without a body segment assigned.`}
                  {diagnostics.skippedCardioFullBody > 0 && ` ${diagnostics.skippedCardioFullBody} sets are Cardio/Full Body (tracked separately).`}
                </p>
                <p className="text-[10px] text-[var(--fg-15)] mt-2">Make sure your exercises have a body segment (Chest, Back, Legs, etc.) in the exercise database.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-[var(--fg-25)]">No Training Data</p>
                <p className="text-xs text-[var(--fg-20)] mt-1">Complete a few workouts to see per-muscle recovery here.</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Overview stats */}
            <div className="grid grid-cols-4 gap-1.5">
              <div className="glass-card p-3 text-center">
                <p className="text-lg font-bold font-mono text-[var(--fg-90)]">{rows.length}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)] mt-0.5">MUSCLES</p>
              </div>
              <div className="glass-card p-3 text-center">
                <p className="text-lg font-bold font-mono text-emerald-300">{readyCount}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)] mt-0.5">READY</p>
              </div>
              <div className="glass-card p-3 text-center">
                <p className="text-lg font-bold font-mono text-orange-400">{fatiguedCount}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)] mt-0.5">FATIGUED</p>
              </div>
              <div className="glass-card p-3 text-center">
                <p className="text-lg font-bold font-mono text-[var(--fg-90)]">{totalWeeklyVolume}</p>
                <p className="text-[8px] font-mono text-[var(--fg-25)] mt-0.5">SETS/WK</p>
              </div>
            </div>

            {/* Schedule conflict warning (#27) */}
            {tomorrowConflicts.length > 0 && (
              <div className="glass-card p-4 border border-orange-400/20 bg-orange-400/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-orange-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--fg-80)]">
                      Tomorrow's plan hits {tomorrowConflicts.join(", ")} which {tomorrowConflicts.length === 1 ? "is" : "are"} still fatigued
                    </p>
                    <p className="text-[10px] text-[var(--fg-30)] mt-1">Consider swapping to a different muscle group</p>
                    <button
                      onClick={() => router.push("/schedule")}
                      className="flex items-center gap-1 mt-2 text-[10px] font-mono text-[var(--fg-40)] hover:text-[var(--fg-60)] transition"
                    >
                      View tomorrow's plan <ChevronLeft size={10} className="rotate-180" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* "What can I train today?" card (#25) */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-emerald-300" />
                <span className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">READY TO TRAIN</span>
              </div>
              <div className="space-y-1.5">
                {readyRows.length > 0 && (
                  <p className="text-sm text-emerald-300">
                    {readyRows.map(r => r.segment).join(", ")} {readyRows.length === 1 ? "is" : "are"} good to go
                  </p>
                )}
                {recoveringRows.length > 0 && (
                  <p className="text-xs text-amber-300/80">
                    {recoveringRows.slice(0, 3).map(r => `${r.segment} (~${getRemainingHours(r)}h)`).join(", ")} still recovering
                  </p>
                )}
                {fatiguedRows.length > 0 && (
                  <p className="text-xs text-red-400/70">
                    {fatiguedRows.map(r => r.segment).join(", ")} — rest recommended
                  </p>
                )}
                {readyRows.length === 0 && recoveringRows.length === 0 && fatiguedRows.length === 0 && (
                  <p className="text-xs text-[var(--fg-30)]">Train to see recovery recommendations</p>
                )}
              </div>
              <button
                onClick={() => router.push("/schedule")}
                className="flex items-center gap-1 mt-3 pt-2 border-t border-[var(--fg-04)] text-[10px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-50)] transition w-full"
              >
                View schedule <ChevronLeft size={10} className="rotate-180 ml-auto" />
              </button>
            </div>

            {/* MuscleHeatMap visualization */}
            {heatMapMuscles.length > 0 && (
              <div className="glass-card p-4">
                <p className="text-[9px] font-mono tracking-widest text-[var(--fg-20)] mb-3">RECOVERY BODY MAP</p>
                <MuscleHeatMap
                  muscles={heatMapMuscles}
                  compact
                  showToggle={false}
                  showLegend
                  height={160}
                />
              </div>
            )}

            {/* Per-muscle cards grouped by status (#26) */}
            {[
              { label: "Ready", rows: readyRows, color: "text-emerald-300", dotColor: "bg-emerald-400" },
              { label: "Recovering", rows: recoveringRows, color: "text-amber-300", dotColor: "bg-amber-300" },
              { label: "Fatigued", rows: fatiguedRows, color: "text-red-400", dotColor: "bg-red-400" },
            ].filter(g => g.rows.length > 0).map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${group.dotColor}`} />
                  <span className={`text-[10px] font-mono tracking-widest ${group.color}`}>
                    {group.label.toUpperCase()} ({group.rows.length})
                  </span>
                </div>
                <motion.div className="space-y-2.5" variants={staggerContainer} initial="hidden" animate="visible">
                  {group.rows.map((r) => {
                const config = statusConfig(r.status);
                const adaptive = adaptiveData[r.segment];
                const weekSets = adaptive?.weeklyHistory.find(w => w.weekLabel === currentWeekStart)?.sets ?? r.weeklyVolume;
                const volumeStatus = getVolumeStatus(r.segment, weekSets, adaptive, userSex);
                const isExpanded = expandedSegment === r.segment;

                return (
                  <motion.div
                    key={r.segment}
                    variants={staggerItem}
                    className="glass-card overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedSegment(isExpanded ? null : r.segment)}
                      className="w-full text-left p-4 hover:bg-[var(--fg-01)] transition"
                    >
                      {/* Top row: name + status */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${config.bgAccent}`}>
                            <span className={config.color}>{config.icon}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[var(--fg-90)]">{r.segment}</p>
                            <p className="text-[10px] font-mono text-[var(--fg-30)]">{timeAgo(r.hoursElapsed)} · {r.setsInSession} sets{r.recoveryPct < 90 ? ` · ~${getRemainingHours(r)}h to ready` : ""}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold font-mono ${config.color}`}>{r.recoveryPct}%</p>
                          <p className={`text-[8px] font-mono ${config.color}`}>{config.label}</p>
                        </div>
                      </div>

                      {/* Recovery bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 rounded-full bg-[var(--fg-06)] overflow-hidden border border-[var(--fg-04)]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${r.recoveryPct}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={`h-full rounded-full ${config.barColor}`}
                          />
                        </div>
                      </div>

                      {/* Quick stats row */}
                      <div className="flex items-center gap-4 mt-2.5 text-[10px] font-mono text-[var(--fg-30)]">
                        <span className="flex items-center gap-1"><Clock size={10} /> ~{r.estimatedFullRecoveryHours}h full recovery</span>
                        <span className="flex items-center gap-1"><Dumbbell size={10} /> {weekSets} sets/wk</span>
                        <span className={`${volumeStatus.color}`}>{volumeStatus.label}</span>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-[var(--fg-04)] space-y-3">
                        {/* Science-based recommendation */}
                        <div className="flex items-start gap-2 mt-3 rounded-lg bg-[var(--fg-02)] border border-[var(--fg-06)] p-3">
                          <Activity size={14} className={`${config.color} mt-0.5 shrink-0`} />
                          <p className="text-[11px] text-[var(--fg-50)] leading-relaxed">{r.recommendation}</p>
                        </div>

                        {/* Recovery factors */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-[var(--fg-02)] border border-[var(--fg-06)] p-2.5">
                            <p className="text-[8px] font-mono text-[var(--fg-25)] mb-0.5">INTENSITY FACTOR</p>
                            <p className="text-sm font-bold font-mono text-[var(--fg-80)]">{r.intensityFactor}x</p>
                            <p className="text-[9px] text-[var(--fg-25)] mt-0.5">
                              {r.intensityFactor > 1.1 ? "High load — extended recovery" : r.intensityFactor < 0.9 ? "Light session — faster recovery" : "Moderate load"}
                            </p>
                          </div>
                          <div className="rounded-lg bg-[var(--fg-02)] border border-[var(--fg-06)] p-2.5">
                            <p className="text-[8px] font-mono text-[var(--fg-25)] mb-0.5">WEEKLY FREQUENCY</p>
                            <p className="text-sm font-bold font-mono text-[var(--fg-80)]">{r.frequencyThisWeek}x</p>
                            <p className="text-[9px] text-[var(--fg-25)] mt-0.5">
                              {r.frequencyThisWeek >= 3 ? "High frequency" : r.frequencyThisWeek === 2 ? "Standard frequency" : "Low frequency"}
                            </p>
                          </div>
                        </div>

                        {/* Volume status with trend */}
                        {adaptive && adaptive.trend !== "insufficient" && (
                          <div className="flex items-center gap-2 text-[10px] font-mono">
                            {adaptive.trend === "improving" && <><TrendingUp size={12} className="text-emerald-300" /><span className="text-emerald-300">Performance improving</span></>}
                            {adaptive.trend === "maintaining" && <><Minus size={12} className="text-cyan-300" /><span className="text-cyan-300">Performance stable</span></>}
                            {adaptive.trend === "stalling" && <><Minus size={12} className="text-amber-300" /><span className="text-amber-300">Performance stalling</span></>}
                            {adaptive.trend === "declining" && <><TrendingDown size={12} className="text-red-400" /><span className="text-red-400">Performance declining</span></>}
                            {adaptive.performanceChangePct !== null && (
                              <span className="text-[var(--fg-25)]">({adaptive.performanceChangePct > 0 ? "+" : ""}{Math.round(adaptive.performanceChangePct)}% e1RM)</span>
                            )}
                          </div>
                        )}

                        {volumeStatus.tip && (
                          <div className="flex items-start gap-1.5">
                            <AlertCircle size={12} className="text-[var(--fg-20)] mt-0.5 shrink-0" />
                            <p className="text-[10px] text-[var(--fg-30)] leading-snug">{volumeStatus.tip}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
              </div>
            ))}

            {/* Science footer */}
            <div className="rounded-xl border border-[var(--fg-04)] bg-[var(--fg-01)] p-3.5">
              <p className="text-[9px] font-mono text-[var(--fg-20)] leading-relaxed">
                Recovery model based on ACSM position stand on resistance training (2009), NSCA Essentials of Strength Training & Conditioning (Haff & Triplett), Schoenfeld et al. (2016) meta-analysis on training volume, and Bishop et al. (2008) recovery review. Uses non-linear recovery curve accounting for muscle size, session volume, and estimated intensity.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
