"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, ChevronRight, Trophy, Dumbbell, TrendingUp } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/AuthProvider";
import { useSex } from "../../../lib/useSex";
import { useUnits } from "../../../lib/useUnits";
import { kgToUnit } from "../../../lib/units";
import { buildStrengthBenchmark, type StrengthBenchmarkResult } from "../../../lib/strengthBenchmark";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import CubeLoader from "../../../components/ui/cube-loader";

// ── Types ──────────────────────────────────────────────

type ExercisePR = {
    exercise_id: string;
    exercise_name: string;
    body_segment: string;
    best_weight: number;
    best_reps_at_weight: number;
    estimated_1rm: number;
    date: string;
};

type StrengthDataPoint = {
    date: string;
    weight: number;
    reps: number;
    e1rm: number;
};

// ── Helpers ────────────────────────────────────────────

function formatDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function estimateE1RM(weight: number, reps: number): number {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-[var(--fg-08)] bg-[var(--bg-card)]/95 px-3 py-2 text-[10px] font-mono">
            <p className="text-[var(--fg-50)] mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color }}>
                    {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
                </p>
            ))}
        </div>
    );
};

// ── Linear regression helper ───────────────────────────

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } | null {
    const n = points.length;
    if (n < 2) return null;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const p of points) {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumX2 += p.x * p.x;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

// ── Page ───────────────────────────────────────────────

export default function StrengthPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { sex: userSex } = useSex();
    const weightUnit = useUnits();
    const [loading, setLoading] = useState(true);

    // Strength state
    const [prs, setPrs] = useState<ExercisePR[]>([]);
    const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
    const [strengthHistory, setStrengthHistory] = useState<StrengthDataPoint[]>([]);
    const [strengthLoading, setStrengthLoading] = useState(false);
    const [goals, setGoals] = useState<Record<string, number>>({});
    const [goalInput, setGoalInput] = useState("");
    const [editingGoal, setEditingGoal] = useState(false);
    const [strengthBenchmark, setStrengthBenchmark] = useState<StrengthBenchmarkResult | null>(null);

    // For sparklines in PR Wall, we cache per-exercise history
    const [sparklineData, setSparklineData] = useState<Record<string, { date: string; e1rm: number }[]>>({});

    // ── Data Loading ───────────────────────────────────

    const loadGoals = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from("exercise_goals").select("exercise_id, goal_weight").eq("user_id", user.id);
        const map: Record<string, number> = {};
        (data ?? []).forEach((g: any) => { map[g.exercise_id] = Number(g.goal_weight); });
        setGoals(map);
    }, [user]);

    async function saveGoal(exerciseId: string) {
        if (!user || !goalInput) return;
        const value = Number(goalInput);
        if (!value || value <= 0) return;
        await supabase.from("exercise_goals").upsert(
            { user_id: user.id, exercise_id: exerciseId, goal_weight: value, updated_at: new Date().toISOString() },
            { onConflict: "user_id,exercise_id" },
        );
        setGoals((prev) => ({ ...prev, [exerciseId]: value }));
        setGoalInput("");
        setEditingGoal(false);
    }

    const loadPRs = useCallback(async () => {
        if (!user) return;
        const { data: logs } = await supabase
            .from("exercise_set_logs")
            .select("exercise_id, weight, reps, completed_at, exercises!inner(name, body_segment), workout_sessions!inner(sex)")
            .eq("user_id", user.id)
            .eq("workout_sessions.sex", userSex)
            .gt("weight", 0)
            .order("weight", { ascending: false });

        if (!logs) { setPrs([]); return; }

        const bestByExercise: Record<string, ExercisePR> = {};
        // Also collect all points per exercise for sparklines
        const allPoints: Record<string, { date: string; e1rm: number }[]> = {};

        logs.forEach((log: any) => {
            const eid = log.exercise_id;
            const w = Number(log.weight);
            const r = Number(log.reps);
            const e1rm = estimateE1RM(w, r);
            const dateStr = log.completed_at ? log.completed_at.split("T")[0] : "";

            if (!bestByExercise[eid] || e1rm > bestByExercise[eid].estimated_1rm) {
                bestByExercise[eid] = {
                    exercise_id: eid,
                    exercise_name: log.exercises?.name ?? "Unknown",
                    body_segment: log.exercises?.body_segment ?? "Other",
                    best_weight: w,
                    best_reps_at_weight: r,
                    estimated_1rm: e1rm,
                    date: dateStr,
                };
            }

            // Collect for sparklines — group best e1rm per date per exercise
            if (!allPoints[eid]) allPoints[eid] = [];
            allPoints[eid].push({ date: dateStr, e1rm });
        });

        // Dedupe sparkline data: best e1rm per date, sorted by date
        const sparklines: Record<string, { date: string; e1rm: number }[]> = {};
        for (const [eid, pts] of Object.entries(allPoints)) {
            const byDate: Record<string, number> = {};
            pts.forEach((p) => {
                if (!byDate[p.date] || p.e1rm > byDate[p.date]) byDate[p.date] = p.e1rm;
            });
            sparklines[eid] = Object.entries(byDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, e1rm]) => ({ date, e1rm }));
        }
        setSparklineData(sparklines);

        const sorted = Object.values(bestByExercise).sort((a, b) => b.estimated_1rm - a.estimated_1rm);
        setPrs(sorted);
    }, [user, userSex]);

    async function loadStrengthHistory(exerciseId: string) {
        if (!user) return;
        setStrengthLoading(true);
        setSelectedExercise(exerciseId);
        setEditingGoal(false);
        setGoalInput("");

        const { data } = await supabase
            .from("exercise_set_logs")
            .select("weight, reps, completed_at, workout_sessions!inner(sex)")
            .eq("user_id", user.id)
            .eq("exercise_id", exerciseId)
            .eq("workout_sessions.sex", userSex)
            .gt("weight", 0)
            .order("completed_at", { ascending: true });

        const byDate: Record<string, StrengthDataPoint> = {};
        (data ?? []).forEach((log: any) => {
            const dateStr = log.completed_at ? log.completed_at.split("T")[0] : "";
            const w = Number(log.weight);
            const r = Number(log.reps);
            const e1rm = estimateE1RM(w, r);
            if (!byDate[dateStr] || e1rm > byDate[dateStr].e1rm) {
                byDate[dateStr] = { date: formatDate(dateStr), weight: w, reps: r, e1rm };
            }
        });

        setStrengthHistory(Object.values(byDate));
        setStrengthLoading(false);
    }

    const loadBenchmark = useCallback(async () => {
        if (!user) return;
        const { data: logs } = await supabase
            .from("exercise_set_logs")
            .select("exercise_id, weight, reps, completed_at, exercises!inner(name, body_segment), workout_sessions!inner(sex)")
            .eq("user_id", user.id)
            .eq("workout_sessions.sex", userSex)
            .gt("weight", 0)
            .order("completed_at", { ascending: true })
            .limit(2000);
        if (logs && logs.length > 0) {
            try {
                setStrengthBenchmark(buildStrengthBenchmark(logs.map((l: any) => ({
                    exercise_id: l.exercise_id,
                    exercise_name: l.exercises?.name ?? "Unknown",
                    body_segment: l.exercises?.body_segment ?? "Other",
                    weight: Number(l.weight),
                    reps: Number(l.reps),
                    completed_at: l.completed_at,
                }))));
            } catch { setStrengthBenchmark(null); }
        } else {
            setStrengthBenchmark(null);
        }
    }, [user, userSex]);

    // ── Initial Load ───────────────────────────────────

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            await Promise.all([loadPRs(), loadGoals(), loadBenchmark()]);
            if (cancelled) return;
            setLoading(false);
        }
        load();
        return () => { cancelled = true; };
    }, [loadPRs, loadGoals, loadBenchmark]);

    // ── Derived Data ───────────────────────────────────

    const displayStrengthHistory = useMemo(() =>
        strengthHistory.map((d) => ({
            ...d,
            weight: Math.round(kgToUnit(d.weight, weightUnit) * 10) / 10,
            e1rm: Math.round(kgToUnit(d.e1rm, weightUnit) * 10) / 10,
        })),
        [strengthHistory, weightUnit],
    );

    // Top PRs for the PR Wall (up to 10)
    const prWallItems = useMemo(() => prs.slice(0, 10), [prs]);

    // 1RM Projections: for exercises with 3+ data points, compute linear regression
    const projections = useMemo(() => {
        const results: {
            exercise_name: string;
            current_e1rm: number;
            milestone: number;
            projected_date: string;
            slope_per_day: number;
        }[] = [];

        for (const pr of prs.slice(0, 20)) {
            const pts = sparklineData[pr.exercise_id];
            if (!pts || pts.length < 3) continue;

            // Convert dates to day offsets, e1rm to user units
            const origin = new Date(pts[0].date + "T00:00:00").getTime();
            const regPts = pts.map((p) => ({
                x: (new Date(p.date + "T00:00:00").getTime() - origin) / 86400000,
                y: kgToUnit(p.e1rm, weightUnit),
            }));

            const reg = linearRegression(regPts);
            if (!reg || reg.slope <= 0) continue; // Only positive slopes

            const currentE1rm = kgToUnit(pr.estimated_1rm, weightUnit);

            // Find next round milestone above current e1rm
            const milestoneStep = weightUnit === "lbs" ? 25 : 10;
            const nextMilestone = Math.ceil(currentE1rm / milestoneStep) * milestoneStep;
            if (nextMilestone <= currentE1rm) continue;

            // How many days from the last data point to reach milestone?
            const lastPt = regPts[regPts.length - 1];
            const currentPredicted = reg.slope * lastPt.x + reg.intercept;
            const daysToMilestone = (nextMilestone - currentPredicted) / reg.slope;

            if (daysToMilestone <= 0 || daysToMilestone > 730) continue; // Max 2 years

            const lastDate = new Date(pts[pts.length - 1].date + "T00:00:00");
            const projDate = new Date(lastDate.getTime() + daysToMilestone * 86400000);
            const projDateStr = projDate.toLocaleDateString(undefined, { month: "short", year: "numeric" });

            results.push({
                exercise_name: pr.exercise_name,
                current_e1rm: Math.round(currentE1rm * 10) / 10,
                milestone: nextMilestone,
                projected_date: projDateStr,
                slope_per_day: reg.slope,
            });
        }

        return results.slice(0, 6);
    }, [prs, sparklineData, weightUnit]);

    // ── Render ─────────────────────────────────────────

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">
            <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-5">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/track")}
                        className="w-8 h-8 rounded-lg border border-[var(--fg-08)] flex items-center justify-center text-[var(--fg-40)] hover:text-[var(--fg-70)] hover:border-[var(--fg-15)] transition"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold font-display text-[rgb(var(--accent-light-rgb))]">Strength</h1>
                        <p className="text-[11px] text-[var(--fg-30)] mt-0.5">PRs, projections & benchmarks</p>
                    </div>
                </div>

                {loading ? (
                    <CubeLoader message="Loading strength data..." />
                ) : (
                    <div className="space-y-5">

                        {/* ══════════ PR WALL ══════════ */}
                        {prWallItems.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Trophy size={14} className="text-[rgb(var(--accent-light-rgb))]" />
                                    <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">PR WALL</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {prWallItems.map((pr) => {
                                        const spark = sparklineData[pr.exercise_id] ?? [];
                                        const sparkDisplay = spark.slice(-10).map((p) => ({
                                            e1rm: Math.round(kgToUnit(p.e1rm, weightUnit) * 10) / 10,
                                        }));
                                        return (
                                            <button
                                                key={pr.exercise_id}
                                                onClick={() => selectedExercise === pr.exercise_id ? setSelectedExercise(null) : loadStrengthHistory(pr.exercise_id)}
                                                className="relative overflow-hidden rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] hover:border-[var(--fg-12)] p-3 text-left transition group"
                                            >
                                                <p className="text-[11px] font-bold text-[var(--fg-85)] truncate mb-0.5">{pr.exercise_name}</p>
                                                <p className="text-lg font-bold font-mono text-[rgb(var(--accent-light-rgb))] leading-tight">
                                                    {Math.round(kgToUnit(pr.best_weight, weightUnit) * 10) / 10}
                                                    <span className="text-[10px] text-[var(--fg-40)]">{weightUnit}</span>
                                                    <span className="text-[10px] text-[var(--fg-30)] ml-1">x{pr.best_reps_at_weight}</span>
                                                </p>
                                                <p className="text-[8px] font-mono text-[var(--fg-25)] mt-0.5">{formatDate(pr.date)}</p>

                                                {/* Tiny sparkline */}
                                                {sparkDisplay.length >= 2 && (
                                                    <div className="h-8 mt-1.5 opacity-50 group-hover:opacity-80 transition">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={sparkDisplay}>
                                                                <Line
                                                                    type="monotone"
                                                                    dataKey="e1rm"
                                                                    stroke="rgb(var(--accent-rgb))"
                                                                    strokeWidth={1.5}
                                                                    dot={false}
                                                                    isAnimationActive={false}
                                                                />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ══════════ PROJECTIONS ══════════ */}
                        {projections.length > 0 && (
                            <div className="glass-card rounded-2xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp size={14} className="text-emerald-400" />
                                    <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">PROJECTIONS</p>
                                </div>
                                <div className="space-y-2">
                                    {projections.map((proj, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 rounded-lg border border-[var(--fg-04)] bg-[var(--fg-01)] px-3 py-2.5"
                                        >
                                            <div className="w-1.5 h-8 rounded-full bg-emerald-400/60" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] text-[var(--fg-60)] leading-relaxed">
                                                    At this rate, <span className="font-bold text-[var(--fg-85)]">{proj.milestone}{weightUnit} {proj.exercise_name}</span> by <span className="font-bold text-emerald-400">{proj.projected_date}</span>
                                                </p>
                                                <p className="text-[8px] font-mono text-[var(--fg-25)] mt-0.5">
                                                    Current e1RM: {proj.current_e1rm}{weightUnit} · +{(proj.slope_per_day * 7).toFixed(1)}{weightUnit}/week
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[8px] font-mono text-[var(--fg-15)] mt-2 text-center">Based on linear extrapolation of recent e1RM trend</p>
                            </div>
                        )}

                        {/* ══════════ PR BOARD (detailed) ══════════ */}
                        <div>
                            <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)] mb-3">PERSONAL RECORDS</p>
                            {prs.length === 0 ? (
                                <div className="text-center py-12">
                                    <Trophy size={32} className="mx-auto mb-3 text-[var(--fg-15)]" />
                                    <p className="text-sm font-semibold text-[var(--fg-25)]">NO PRs YET</p>
                                    <p className="text-xs text-[var(--fg-20)] mt-1">Log workouts with weight to see PRs here.</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {prs.slice(0, 15).map((pr) => {
                                        const isSelected = selectedExercise === pr.exercise_id;
                                        return (
                                            <div key={pr.exercise_id}>
                                                <button
                                                    onClick={() => isSelected ? setSelectedExercise(null) : loadStrengthHistory(pr.exercise_id)}
                                                    className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${isSelected ? "border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb))]/[0.05]" : "border-[var(--fg-06)] bg-[var(--fg-02)] hover:border-[var(--fg-12)]"
                                                        }`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-[var(--fg-90)] truncate">{pr.exercise_name}</p>
                                                        <p className="text-[10px] font-mono text-[var(--fg-30)]">{pr.body_segment} · {formatDate(pr.date)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold font-mono text-[var(--fg-90)]">{Math.round(kgToUnit(pr.best_weight, weightUnit) * 10) / 10}<span className="text-[10px] text-[var(--fg-40)]">{weightUnit}</span> x {pr.best_reps_at_weight}</p>
                                                            <p className="text-[9px] font-mono text-[rgb(var(--accent-light-rgb)/0.6)]">e1RM: {Math.round(kgToUnit(pr.estimated_1rm, weightUnit) * 10) / 10}{weightUnit}</p>
                                                        </div>
                                                        {isSelected ? <ChevronDown size={14} className="text-[rgb(var(--accent-light-rgb))]" /> : <ChevronRight size={14} className="text-[var(--fg-25)]" />}
                                                    </div>
                                                </button>

                                                {isSelected && (
                                                    <div className="rounded-b-lg border border-t-0 border-[rgb(var(--accent-rgb)/0.2)] bg-[rgb(var(--accent-rgb))]/[0.02] p-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div>
                                                                <p className="text-[8px] font-mono text-[var(--fg-30)] mb-0.5">GOAL</p>
                                                                {editingGoal ? (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <input
                                                                            type="number" min="0" autoFocus onWheel={(e) => (e.target as HTMLElement).blur()}
                                                                            value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                                                                            onKeyDown={(e) => e.key === "Enter" && saveGoal(pr.exercise_id)}
                                                                            className="w-16 h-7 rounded bg-[var(--fg-06)] border border-[var(--fg-10)] text-center text-xs font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)]"
                                                                        />
                                                                        <button onClick={() => saveGoal(pr.exercise_id)} className="text-[9px] font-mono text-[rgb(var(--accent-light-rgb))] px-1.5">SET</button>
                                                                    </div>
                                                                ) : (
                                                                    <button onClick={() => { setEditingGoal(true); setGoalInput(goals[pr.exercise_id] ? String(goals[pr.exercise_id]) : ""); }} className="flex items-center gap-1.5">
                                                                        <Trophy size={12} className="text-[var(--fg-25)]" />
                                                                        <span className="text-sm font-bold font-mono text-[var(--fg-80)]">{goals[pr.exercise_id] ? `${Math.round(kgToUnit(goals[pr.exercise_id], weightUnit) * 10) / 10}${weightUnit}` : "-- --"}</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[8px] font-mono text-[var(--fg-30)] mb-0.5">CURRENT MAX</p>
                                                                <p className="text-lg font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{Math.round(kgToUnit(pr.best_weight, weightUnit) * 10) / 10}<span className="text-xs text-[var(--fg-40)]">{weightUnit}</span></p>
                                                            </div>
                                                        </div>
                                                        {strengthLoading ? (
                                                            <p className="text-xs text-[var(--fg-40)] text-center py-4">Loading chart...</p>
                                                        ) : strengthHistory.length < 2 ? (
                                                            <p className="text-xs text-[var(--fg-30)] text-center py-4">Need at least 2 sessions to show a trend.</p>
                                                        ) : (
                                                            <div className="h-48">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <LineChart data={displayStrengthHistory}>
                                                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--fg-04)" />
                                                                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--fg-30)" }} />
                                                                        <YAxis tick={{ fontSize: 9, fill: "var(--fg-30)" }} domain={["auto", "auto"]} />
                                                                        <Tooltip content={<CustomTooltip />} />
                                                                        <Line
                                                                            type="monotone" dataKey="weight" stroke="rgb(var(--accent-rgb))" strokeWidth={2} name={`Weight (${weightUnit})`}
                                                                            dot={(dotProps: any) => {
                                                                                const { cx, cy, payload, index } = dotProps;
                                                                                const maxWeight = Math.max(...displayStrengthHistory.map((p) => p.weight));
                                                                                const isPR = payload.weight === maxWeight;
                                                                                return (
                                                                                    <g key={`dot-${index}`}>
                                                                                        <circle cx={cx} cy={cy} r={isPR ? 5 : 3} fill={isPR ? "rgb(var(--accent-light-rgb))" : "rgb(var(--accent-rgb))"} stroke={isPR ? "var(--bg-primary)" : "none"} strokeWidth={isPR ? 1.5 : 0} />
                                                                                        {isPR && <text x={cx} y={cy - 12} textAnchor="middle" fontSize="9" fontFamily="monospace" fill="rgb(var(--accent-light-rgb))" fontWeight="bold">PR</text>}
                                                                                    </g>
                                                                                );
                                                                            }}
                                                                        />
                                                                        <Line type="monotone" dataKey="e1rm" stroke="rgb(var(--accent-light-rgb))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Est. 1RM" />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ══════════ STRENGTH BENCHMARK ══════════ */}
                        {strengthBenchmark && (
                            <div className="glass-card rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[9px] font-mono tracking-[0.2em] text-[var(--fg-20)]">STRENGTH BENCHMARK</p>
                                    <p className="text-[9px] font-mono text-[var(--fg-20)]">{strengthBenchmark.period}</p>
                                </div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        <span className="text-emerald-400">{strengthBenchmark.totalUp} up</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                        <span className="w-2 h-2 rounded-full bg-[var(--fg-20)]" />
                                        <span className="text-[var(--fg-30)]">{strengthBenchmark.totalStable} stable</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                        <span className="w-2 h-2 rounded-full bg-red-400" />
                                        <span className="text-red-400">{strengthBenchmark.totalDown} down</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    {strengthBenchmark.exercises.slice(0, 8).map((ex) => (
                                        <div key={ex.exerciseId} className="flex items-center gap-3 rounded-lg border border-[var(--fg-04)] bg-[var(--fg-01)] px-3 py-2">
                                            <div className={`w-1.5 h-8 rounded-full ${ex.trend === "up" ? "bg-emerald-400" : ex.trend === "down" ? "bg-red-400" : "bg-[var(--fg-15)]"}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold text-[var(--fg-80)] truncate">{ex.exerciseName}</p>
                                                <p className="text-[9px] font-mono text-[var(--fg-25)]">{ex.bodySegment}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[11px] font-bold font-mono text-[var(--fg-80)]">{Math.round(kgToUnit(ex.currentE1rm, weightUnit))}<span className="text-[9px] text-[var(--fg-30)]">{weightUnit}</span></p>
                                                <p className={`text-[9px] font-mono ${ex.changePercent > 0 ? "text-emerald-400" : ex.changePercent < 0 ? "text-red-400" : "text-[var(--fg-25)]"}`}>
                                                    {ex.changePercent > 0 ? "+" : ""}{ex.changePercent}%
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {strengthBenchmark.strongestGain && (
                                    <p className="text-[10px] text-[var(--fg-30)] mt-3 border-t border-[var(--fg-04)] pt-3">
                                        Biggest gain: <span className="text-emerald-400 font-bold">{strengthBenchmark.strongestGain.exerciseName}</span> +{strengthBenchmark.strongestGain.changePercent}%
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
