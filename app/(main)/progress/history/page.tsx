"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Dumbbell, ChevronLeft, ChevronDown, ChevronRight, ChevronUp, Flame, Check, X, ArrowLeftRight } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/AuthProvider";
import { useSex } from "../../../lib/useSex";
import { useUnits } from "../../../lib/useUnits";
import { kgToUnit } from "../../../lib/units";
import MuscleHeatMap from "../../../components/MuscleHeatMap";
import CubeLoader from "../../../components/ui/cube-loader";
import { buildMonthlyInsights, type MonthlyComparison } from "../../../lib/monthlyInsights";
import { buildStrengthBenchmark, type StrengthBenchmarkResult } from "../../../lib/strengthBenchmark";
import { buildPhasePerformance, type PhasePerformanceResult } from "../../../lib/phasePerformance";
import { fetchCycleLogs, computeAdaptiveCycleLength } from "../../../lib/cycleAwareTrend";

// ── Types ──────────────────────────────────────────────────────────────

type SessionRecord = {
    id: string;
    date: string;
    title: string;
    duration_seconds: number;
    total_sets: number;
    total_volume: number;
    xp_earned: number;
};

type WeeklyVolume = {
    week: string;
    volume: number;
    sets: number;
};

type LeaderboardRow = { user_id: string; username: string; avatar_url: string | null; best_weight: number };
type LeaderboardCard = { exerciseName: string; top: LeaderboardRow[]; myRank: number; total: number; myWeight: number };

type ActivityRange = "7D" | "30D" | "6M" | "12M" | "All";

type SessionMuscles = Record<string, string[]>; // session_id -> body_segments[]

type WeekGroup = {
    key: string; // "this-week", "last-week", or "2024-09-16"
    label: string;
    sessions: SessionRecord[];
    defaultExpanded: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────

const ACTIVITY_RANGES: ActivityRange[] = ["7D", "30D", "6M", "12M", "All"];

function rangeStartDate(range: ActivityRange): Date | null {
    const now = new Date();
    switch (range) {
        case "7D": return new Date(now.getTime() - 7 * 86400000);
        case "30D": return new Date(now.getTime() - 30 * 86400000);
        case "6M": { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
        case "12M": { const d = new Date(now); d.setMonth(d.getMonth() - 12); return d; }
        case "All": return null;
    }
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekStart(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(d);
    monday.setDate(diff);
    return toDateString(monday);
}

function getWeekEnd(weekStartStr: string): string {
    const d = new Date(weekStartStr + "T00:00:00");
    d.setDate(d.getDate() + 6); // Sunday
    return toDateString(d);
}

function estimateE1RM(weight: number, reps: number): number {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function formatWeekLabel(weekStart: string): string {
    const start = new Date(weekStart + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
        return `${start.toLocaleDateString(undefined, { month: "short" })} ${start.getDate()}–${end.getDate()}`;
    }
    return `${start.toLocaleDateString(undefined, { month: "short" })} ${start.getDate()} – ${end.toLocaleDateString(undefined, { month: "short" })} ${end.getDate()}`;
}

// ── Page ───────────────────────────────────────────────────────────────

export default function HistoryPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { sex: userSex } = useSex();
    const weightUnit = useUnits();
    const isFemale = userSex === "female";

    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<SessionRecord[]>([]);
    const [earnedKeys, setEarnedKeys] = useState<Set<string>>(new Set());
    const [leaderboardCard, setLeaderboardCard] = useState<LeaderboardCard | null>(null);
    const [activityRange, setActivityRange] = useState<ActivityRange>("7D");
    const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
    const [weeklyVolumeData, setWeeklyVolumeData] = useState<WeeklyVolume[]>([]);
    const [monthlyInsights, setMonthlyInsights] = useState<MonthlyComparison | null>(null);
    const [strengthBenchmark, setStrengthBenchmark] = useState<StrengthBenchmarkResult | null>(null);
    const [phasePerformance, setPhasePerformance] = useState<PhasePerformanceResult | null>(null);

    // #16 Session muscle heatmaps
    const [sessionMuscles, setSessionMuscles] = useState<SessionMuscles>({});

    // #17 Collapsible week groups
    const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());

    // #18 Compare mode
    const [compareMode, setCompareMode] = useState(false);
    const [compareSelection, setCompareSelection] = useState<string[]>([]);

    // ── Data loaders ───────────────────────────────────────────────────

    const loadHistory = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from("workout_sessions")
            .select("id, date, title, duration_seconds, total_sets, total_volume, xp_earned")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .eq("sex", userSex)
            .order("date", { ascending: false })
            .limit(1000);
        setSessions(data ?? []);
    }, [user, userSex]);

    const loadAchievements = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from("achievements").select("achievement_key").eq("user_id", user.id);
        setEarnedKeys(new Set((data ?? []).map((a: any) => a.achievement_key)));
    }, [user]);

    const loadLeaderboardCard = useCallback(async () => {
        if (!user) return;
        const { data: mine } = await supabase
            .from("exercise_leaderboard")
            .select("exercise_id, exercise_name, best_weight")
            .eq("user_id", user.id)
            .eq("sex", userSex);
        if (!mine || mine.length === 0) { setLeaderboardCard(null); return; }

        const exerciseIds = mine.map((m: any) => m.exercise_id);
        const { data: all } = await supabase
            .from("exercise_leaderboard")
            .select("exercise_id, user_id, username, avatar_url, best_weight")
            .in("exercise_id", exerciseIds)
            .eq("sex", userSex);
        if (!all) { setLeaderboardCard(null); return; }

        const byExercise: Record<string, LeaderboardRow[]> = {};
        all.forEach((r: any) => { (byExercise[r.exercise_id] ??= []).push(r); });

        let best: { exerciseId: string; exerciseName: string; myWeight: number; percentile: number } | null = null;
        for (const m of mine as any[]) {
            const rows = byExercise[m.exercise_id] || [];
            const total = rows.length;
            const below = rows.filter((r) => r.best_weight < m.best_weight).length;
            const percentile = total > 1 ? below / (total - 1) : 1;
            if (!best || percentile > best.percentile) {
                best = { exerciseId: m.exercise_id, exerciseName: m.exercise_name, myWeight: m.best_weight, percentile };
            }
        }
        if (!best) { setLeaderboardCard(null); return; }

        const rows = (byExercise[best.exerciseId] || []).slice().sort((a, b) => b.best_weight - a.best_weight);
        const myRank = rows.findIndex((r) => r.user_id === user.id) + 1;
        setLeaderboardCard({ exerciseName: best.exerciseName, top: rows.slice(0, 3), myRank, total: rows.length, myWeight: best.myWeight });
    }, [user, userSex]);

    const loadWeeklyVolume = useCallback(async () => {
        if (!user) return;
        const { data: allSessions } = await supabase
            .from("workout_sessions")
            .select("date, total_volume, total_sets")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .eq("sex", userSex)
            .order("date", { ascending: true });

        if (!allSessions) { setWeeklyVolumeData([]); return; }

        const weekMap: Record<string, { volume: number; sets: number }> = {};
        allSessions.forEach((s: any) => {
            const week = getWeekStart(s.date);
            if (!weekMap[week]) weekMap[week] = { volume: 0, sets: 0 };
            weekMap[week].volume += Number(s.total_volume) || 0;
            weekMap[week].sets += s.total_sets || 0;
        });

        const sorted = Object.entries(weekMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([week, data]) => ({
                week: formatDate(week),
                volume: Math.round(data.volume),
                sets: data.sets,
            }));
        setWeeklyVolumeData(sorted);
    }, [user, userSex]);

    // #16 Load muscles per session
    const loadSessionMuscles = useCallback(async (sessionIds: string[]) => {
        if (!user || sessionIds.length === 0) return;
        const { data } = await supabase
            .from("exercise_set_logs")
            .select("session_id, exercises!inner(body_segment)")
            .in("session_id", sessionIds);
        if (!data) return;

        const map: SessionMuscles = {};
        data.forEach((row: any) => {
            const sid = row.session_id;
            const seg = row.exercises?.body_segment;
            if (!sid || !seg) return;
            if (!map[sid]) map[sid] = [];
            if (!map[sid].includes(seg)) map[sid].push(seg);
        });
        setSessionMuscles(map);
    }, [user]);

    // Benchmark + phase performance
    const benchmarkLoadedRef = useRef(false);
    const loadBenchmarkAndPhase = useCallback(async () => {
        if (!user || benchmarkLoadedRef.current) return;
        benchmarkLoadedRef.current = true;

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
        } else { setStrengthBenchmark(null); }

        if (isFemale && sessions.length >= 4) {
            try {
                const cycleLogs = await fetchCycleLogs(user.id);
                const periodStarts = cycleLogs.map(l => l.period_start);
                if (periodStarts.length > 0) {
                    const cycleLen = computeAdaptiveCycleLength(periodStarts);
                    const lastStart = periodStarts[0];
                    setPhasePerformance(buildPhasePerformance(
                        sessions.map(s => ({ date: s.date, total_volume: Number(s.total_volume) || 0, total_sets: Number(s.total_sets) || 0, duration_seconds: s.duration_seconds || 0 })),
                        lastStart, cycleLen,
                    ));
                } else { setPhasePerformance(null); }
            } catch { setPhasePerformance(null); }
        } else { setPhasePerformance(null); }
    }, [user, userSex, isFemale, sessions]);

    // ── Initial load ───────────────────────────────────────────────────

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            await Promise.all([loadHistory(), loadAchievements(), loadLeaderboardCard(), loadWeeklyVolume()]);
            if (cancelled) return;
            setLoading(false);
        }
        load();
        return () => { cancelled = true; };
    }, [loadHistory, loadAchievements, loadLeaderboardCard, loadWeeklyVolume]);

    // Monthly insights derived from sessions
    useEffect(() => {
        if (sessions.length === 0) { setMonthlyInsights(null); return; }
        try {
            setMonthlyInsights(buildMonthlyInsights(sessions.map(s => ({
                date: s.date,
                total_volume: Number(s.total_volume) || 0,
                total_sets: Number(s.total_sets) || 0,
                duration_seconds: s.duration_seconds || 0,
                xp_earned: s.xp_earned || 0,
            }))));
        } catch { setMonthlyInsights(null); }
    }, [sessions]);

    // Load benchmark once sessions are ready
    useEffect(() => {
        if (sessions.length > 0) loadBenchmarkAndPhase();
    }, [sessions, loadBenchmarkAndPhase]);

    // #16 Load muscles for visible sessions
    useEffect(() => {
        if (sessions.length > 0) {
            loadSessionMuscles(sessions.slice(0, 100).map(s => s.id));
        }
    }, [sessions, loadSessionMuscles]);

    // ── Derived values ─────────────────────────────────────────────────

    const rangeStart = rangeStartDate(activityRange);
    const rangeSessions = rangeStart ? sessions.filter((s) => new Date(s.date + "T00:00:00") >= rangeStart) : sessions;
    const rangeWorkoutCount = rangeSessions.length;
    const rangeHours = rangeSessions.reduce((s, r) => s + (r.duration_seconds || 0), 0) / 3600;
    const rangeVolume = rangeSessions.reduce((s, r) => s + (Number(r.total_volume) || 0), 0);

    const sessionDates = new Set(sessions.map((s) => s.date));
    const calendarBase = new Date();
    calendarBase.setDate(1);
    calendarBase.setMonth(calendarBase.getMonth() + calendarMonthOffset);
    const calendarYear = calendarBase.getFullYear();
    const calendarMonth = calendarBase.getMonth();
    const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const todayStr = toDateString(new Date());
    const calendarCells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

    // #17 Group sessions by week (Monday start)
    const weekGroups: WeekGroup[] = useMemo(() => {
        if (sessions.length === 0) return [];

        const now = new Date();
        const thisWeekStart = getWeekStart(toDateString(now));
        const lastWeekDate = new Date(now);
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);
        const lastWeekStart = getWeekStart(toDateString(lastWeekDate));

        const byWeek: Record<string, SessionRecord[]> = {};
        sessions.forEach((s) => {
            const ws = getWeekStart(s.date);
            if (!byWeek[ws]) byWeek[ws] = [];
            byWeek[ws].push(s);
        });

        const weekKeys = Object.keys(byWeek).sort((a, b) => b.localeCompare(a));
        return weekKeys.map((ws) => {
            let key: string;
            let label: string;
            let defaultExpanded: boolean;

            if (ws === thisWeekStart) {
                key = "this-week";
                label = "This Week";
                defaultExpanded = true;
            } else if (ws === lastWeekStart) {
                key = "last-week";
                label = "Last Week";
                defaultExpanded = true;
            } else {
                key = ws;
                label = formatWeekLabel(ws);
                defaultExpanded = false;
            }

            return { key, label, sessions: byWeek[ws], defaultExpanded };
        });
    }, [sessions]);

    // Initialize collapsed state based on defaults
    useEffect(() => {
        const collapsed = new Set<string>();
        weekGroups.forEach((g) => {
            if (!g.defaultExpanded) collapsed.add(g.key);
        });
        setCollapsedWeeks(collapsed);
    }, [weekGroups.length]); // Only on first group build

    const toggleWeek = (key: string) => {
        setCollapsedWeeks((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // #18 Compare logic
    const toggleCompareSession = (id: string) => {
        setCompareSelection((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length >= 2) return [prev[1], id]; // Replace oldest
            return [...prev, id];
        });
    };

    const comparedSessions = useMemo(() => {
        if (compareSelection.length !== 2) return null;
        const a = sessions.find((s) => s.id === compareSelection[0]);
        const b = sessions.find((s) => s.id === compareSelection[1]);
        if (!a || !b) return null;
        // Ensure a is the older session
        const [older, newer] = a.date <= b.date ? [a, b] : [b, a];
        return { older, newer };
    }, [compareSelection, sessions]);

    // ── Render ──────────────────────────────────────────────────────────

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">
            <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-5">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/track")}
                        className="w-8 h-8 rounded-xl border border-[var(--fg-06)] flex items-center justify-center text-[var(--fg-40)] hover:text-[var(--fg-70)] hover:border-[var(--fg-12)] transition"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold font-display text-[rgb(var(--accent-light-rgb))]">History</h1>
                        <p className="text-[11px] text-[var(--fg-30)] mt-0.5">Your training timeline</p>
                    </div>
                    {/* #18 Compare toggle */}
                    {sessions.length >= 2 && (
                        <button
                            onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); }}
                            className={`flex items-center gap-1.5 text-[10px] font-mono px-3 py-2 rounded-lg border transition ${compareMode ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-08)] text-[var(--fg-30)] hover:text-[var(--fg-50)]"}`}
                        >
                            <ArrowLeftRight size={12} />
                            {compareMode ? "CANCEL" : "COMPARE"}
                        </button>
                    )}
                </div>

                {loading ? (
                    <CubeLoader message="Loading history…" />
                ) : sessions.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[var(--fg-03)] border border-[var(--fg-06)] flex items-center justify-center">
                            <Calendar size={28} className="text-[var(--fg-15)]" />
                        </div>
                        <p className="text-sm font-semibold text-[var(--fg-25)]">NO WORKOUTS YET</p>
                        <p className="text-xs text-[var(--fg-20)] mt-1">Complete your first workout to see history here.</p>
                    </div>
                ) : (
                    <div className="space-y-5">

                        {/* ── Hero Stats ──────────────────────────────────────── */}
                        <div
                            className="relative overflow-hidden rounded-2xl border border-[rgb(var(--accent-rgb)/0.2)] p-5"
                            style={{ background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.12) 0%, rgb(var(--accent-rgb) / 0.03) 60%, transparent 100%)" }}
                        >
                            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[rgb(var(--accent-rgb)/0.15)] blur-[60px]" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[9px] font-mono tracking-[0.2em] text-[rgb(var(--accent-light-rgb)/0.5)]">TRAINING OVERVIEW</p>
                                    <div className="flex gap-1">
                                        {ACTIVITY_RANGES.map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => setActivityRange(r)}
                                                className={`text-[9px] font-mono px-2 py-1 rounded-md transition ${activityRange === r ? "bg-[rgb(var(--accent-rgb)/0.25)] text-[rgb(var(--accent-light-rgb))]" : "text-[var(--fg-25)] hover:text-[var(--fg-50)]"}`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-3xl font-bold font-mono text-[var(--fg-95)] leading-none">{rangeWorkoutCount}</p>
                                        <p className="text-[9px] font-mono text-[var(--fg-30)] mt-1.5">Workouts</p>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold font-mono text-[var(--fg-95)] leading-none">{rangeHours.toFixed(1)}</p>
                                        <p className="text-[9px] font-mono text-[var(--fg-30)] mt-1.5">Hours</p>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold font-mono text-[rgb(var(--accent-light-rgb))] leading-none">{(() => { const v = kgToUnit(rangeVolume, weightUnit); return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v); })()}</p>
                                        <p className="text-[9px] font-mono text-[var(--fg-30)] mt-1.5">Volume ({weightUnit})</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Calendar ────────────────────────────────────────── */}
                        <div className="glass-card rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => setCalendarMonthOffset((o) => o - 1)} className="w-7 h-7 rounded-lg border border-[var(--fg-06)] flex items-center justify-center text-[var(--fg-40)] hover:text-[var(--fg-70)] hover:border-[var(--fg-12)] transition">
                                    <ChevronRight size={14} className="rotate-180" />
                                </button>
                                <p className="text-sm font-bold text-[var(--fg-85)] tracking-wide">{calendarBase.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
                                <button onClick={() => setCalendarMonthOffset((o) => o + 1)} disabled={calendarMonthOffset >= 0} className="w-7 h-7 rounded-lg border border-[var(--fg-06)] flex items-center justify-center text-[var(--fg-40)] hover:text-[var(--fg-70)] hover:border-[var(--fg-12)] disabled:opacity-20 transition">
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                                    <p key={i} className="text-[9px] font-mono text-[var(--fg-20)] py-1">{d}</p>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarCells.map((day, i) => {
                                    if (day === null) return <div key={`empty-${i}`} />;
                                    const cellDate = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                    const hasWorkout = sessionDates.has(cellDate);
                                    const isToday = cellDate === todayStr;
                                    return (
                                        <div key={cellDate} className="aspect-square flex items-center justify-center">
                                            <span
                                                className={`w-full h-full flex items-center justify-center rounded-lg text-[11px] font-mono transition-all ${
                                                    hasWorkout
                                                        ? "bg-[rgb(var(--accent-rgb)/0.25)] text-[rgb(var(--accent-light-rgb))] font-bold border border-[rgb(var(--accent-rgb)/0.3)]"
                                                        : "text-[var(--fg-25)]"
                                                } ${isToday ? "ring-1 ring-[var(--fg-30)]" : ""}`}
                                                style={hasWorkout ? { boxShadow: "0 0 8px -2px rgb(var(--accent-rgb) / 0.4)" } : undefined}
                                            >
                                                {day}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            {(() => {
                                const monthSessions = sessions.filter(s => {
                                    const d = new Date(s.date + "T00:00:00");
                                    return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth;
                                });
                                return (
                                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--fg-04)] text-[10px] font-mono text-[var(--fg-30)]">
                                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-[rgb(var(--accent-rgb)/0.3)] border border-[rgb(var(--accent-rgb)/0.4)]" /> {monthSessions.length} sessions</span>
                                        <span>{monthSessions.length > 0 ? `${Math.round(kgToUnit(monthSessions.reduce((s, r) => s + (Number(r.total_volume) || 0), 0), weightUnit)).toLocaleString()} ${weightUnit} total` : "No workouts"}</span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* ── Weekly Volume ──────────────────────────────────── */}
                        {weeklyVolumeData.length > 0 && (() => {
                            const latest = weeklyVolumeData[weeklyVolumeData.length - 1];
                            const maxVol = Math.max(...weeklyVolumeData.map(w => w.volume));
                            const prev = weeklyVolumeData.length >= 2 ? weeklyVolumeData[weeklyVolumeData.length - 2] : null;
                            const volChange = prev && prev.volume > 0 ? Math.round(((latest.volume - prev.volume) / prev.volume) * 100) : 0;
                            return (
                                <div className="glass-card rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-[9px] font-mono tracking-[0.2em] text-[var(--fg-20)]">WEEKLY VOLUME</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{Math.round(kgToUnit(latest.volume, weightUnit)).toLocaleString()}<span className="text-[9px] text-[var(--fg-25)] ml-0.5">{weightUnit}</span></span>
                                            {volChange !== 0 && (
                                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md ${volChange > 0 ? "text-emerald-300 bg-emerald-400/10" : "text-orange-300 bg-orange-400/10"}`}>
                                                    {volChange > 0 ? "+" : ""}{volChange}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-[3px] h-20">
                                        {weeklyVolumeData.slice(-8).map((w, i, arr) => {
                                            const pct = maxVol > 0 ? Math.max(6, (w.volume / maxVol) * 100) : 6;
                                            const isCurrent = i === arr.length - 1;
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center">
                                                    <div
                                                        className={`w-full rounded-md transition-all ${isCurrent ? "bg-gradient-to-t from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent-light-rgb))]" : "bg-[var(--fg-06)]"}`}
                                                        style={{ height: `${pct}%`, ...(isCurrent ? { boxShadow: "0 0 12px -3px rgb(var(--accent-rgb) / 0.5)" } : {}) }}
                                                    />
                                                    <p className={`text-[7px] font-mono mt-1.5 ${isCurrent ? "text-[rgb(var(--accent-light-rgb)/0.6)]" : "text-[var(--fg-15)]"}`}>
                                                        {w.week.slice(5)}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ── Monthly Insights ───────────────────────────────── */}
                        {monthlyInsights && (
                            <div className="glass-card rounded-2xl p-4">
                                <p className="text-[9px] font-mono tracking-[0.2em] text-[var(--fg-20)] mb-3">MONTHLY INSIGHTS</p>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold font-mono text-[var(--fg-90)]">{monthlyInsights.current.workouts}</p>
                                        <p className="text-[9px] font-mono text-[var(--fg-30)]">Workouts</p>
                                        {monthlyInsights.frequencyChange !== null && (
                                            <p className={`text-[9px] font-mono mt-0.5 ${monthlyInsights.frequencyChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                {monthlyInsights.frequencyChange >= 0 ? "+" : ""}{monthlyInsights.frequencyChange}%
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{(() => { const v = kgToUnit(monthlyInsights.current.totalVolume, weightUnit); return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v); })()}</p>
                                        <p className="text-[9px] font-mono text-[var(--fg-30)]">Volume ({weightUnit})</p>
                                        {monthlyInsights.volumeChange !== null && (
                                            <p className={`text-[9px] font-mono mt-0.5 ${monthlyInsights.volumeChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                {monthlyInsights.volumeChange >= 0 ? "+" : ""}{monthlyInsights.volumeChange}%
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold font-mono text-[var(--fg-90)]">{monthlyInsights.current.prsHit}</p>
                                        <p className="text-[9px] font-mono text-[var(--fg-30)]">PRs Hit</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-[9px] font-mono text-[var(--fg-25)] border-t border-[var(--fg-04)] pt-3">
                                    <span className="flex items-center gap-1"><Flame size={10} className="text-orange-400" /> {monthlyInsights.streak} month streak</span>
                                    {monthlyInsights.current.uniqueExercises > 0 && (
                                        <span>{monthlyInsights.current.uniqueExercises} exercises</span>
                                    )}
                                    {monthlyInsights.durationChange !== null && (
                                        <span>Avg {Math.round(monthlyInsights.current.avgDuration / 60)}min</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Phase Performance (female only) ────────────────── */}
                        {isFemale && phasePerformance && (
                            <div className="glass-card rounded-2xl p-4">
                                <p className="text-[9px] font-mono tracking-[0.2em] text-pink-300/50 mb-3">CYCLE PHASE PERFORMANCE</p>
                                <div className="grid grid-cols-4 gap-2 mb-3">
                                    {phasePerformance.phases.map((p) => (
                                        <div key={p.phase} className="text-center">
                                            <div className="w-full h-16 rounded-lg relative overflow-hidden mb-1" style={{ background: `${p.color}15`, border: `1px solid ${p.color}30` }}>
                                                <div className="absolute bottom-0 w-full transition-all" style={{
                                                    height: `${phasePerformance.bestPhase ? Math.round((p.avgVolume / phasePerformance.bestPhase.avgVolume) * 100) : 100}%`,
                                                    background: `${p.color}30`,
                                                }} />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <p className="text-xs font-bold font-mono" style={{ color: p.color }}>{p.workouts}</p>
                                                </div>
                                            </div>
                                            <p className="text-[8px] font-mono text-[var(--fg-30)]">{p.label.slice(0, 3).toUpperCase()}</p>
                                        </div>
                                    ))}
                                </div>
                                {phasePerformance.recommendation && (
                                    <p className="text-[10px] text-[var(--fg-40)] leading-relaxed">{phasePerformance.recommendation}</p>
                                )}
                            </div>
                        )}

                        {/* ── Strength Benchmark ─────────────────────────────── */}
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

                        {/* ── #18 Comparison Panel ───────────────────────────── */}
                        {compareMode && comparedSessions && (
                            <div className="glass-card rounded-2xl p-4 border border-[rgb(var(--accent-rgb)/0.3)]" style={{ background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.06) 0%, transparent 100%)" }}>
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[9px] font-mono tracking-[0.2em] text-[rgb(var(--accent-light-rgb)/0.6)]">SESSION COMPARISON</p>
                                    <button onClick={() => setCompareSelection([])} className="text-[9px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-50)] transition">CLEAR</button>
                                </div>

                                {/* Titles */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div />
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-[var(--fg-70)] truncate">{comparedSessions.older.title || "Workout"}</p>
                                        <p className="text-[8px] font-mono text-[var(--fg-25)]">{formatDate(comparedSessions.older.date)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-[rgb(var(--accent-light-rgb))] truncate">{comparedSessions.newer.title || "Workout"}</p>
                                        <p className="text-[8px] font-mono text-[var(--fg-25)]">{formatDate(comparedSessions.newer.date)}</p>
                                    </div>
                                </div>

                                {/* Metrics */}
                                {[
                                    { label: "Volume", oldVal: comparedSessions.older.total_volume, newVal: comparedSessions.newer.total_volume, fmt: (v: number) => `${Math.round(kgToUnit(v, weightUnit)).toLocaleString()} ${weightUnit}` },
                                    { label: "Sets", oldVal: comparedSessions.older.total_sets, newVal: comparedSessions.newer.total_sets, fmt: (v: number) => String(v) },
                                    { label: "Duration", oldVal: comparedSessions.older.duration_seconds, newVal: comparedSessions.newer.duration_seconds, fmt: (v: number) => formatDuration(v) },
                                    { label: "XP", oldVal: comparedSessions.older.xp_earned, newVal: comparedSessions.newer.xp_earned, fmt: (v: number) => `+${v}` },
                                ].map((row) => {
                                    const delta = row.oldVal > 0 ? Math.round(((row.newVal - row.oldVal) / row.oldVal) * 100) : 0;
                                    return (
                                        <div key={row.label} className="grid grid-cols-3 gap-2 py-2 border-t border-[var(--fg-04)]">
                                            <p className="text-[10px] font-mono text-[var(--fg-30)]">{row.label}</p>
                                            <p className="text-[11px] font-mono text-[var(--fg-60)] text-center">{row.fmt(row.oldVal)}</p>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <p className="text-[11px] font-mono text-[var(--fg-80)]">{row.fmt(row.newVal)}</p>
                                                {delta !== 0 && (
                                                    <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${delta > 0 ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"}`}>
                                                        {delta > 0 ? "+" : ""}{delta}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Muscle comparison */}
                                {(sessionMuscles[comparedSessions.older.id] || sessionMuscles[comparedSessions.newer.id]) && (
                                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-[var(--fg-04)]">
                                        <div>
                                            <MuscleHeatMap
                                                muscles={(sessionMuscles[comparedSessions.older.id] || []).map(m => ({ muscle: m, intensity: 7 }))}
                                                height={100}
                                                compact
                                                showToggle={false}
                                            />
                                        </div>
                                        <div>
                                            <MuscleHeatMap
                                                muscles={(sessionMuscles[comparedSessions.newer.id] || []).map(m => ({ muscle: m, intensity: 7 }))}
                                                height={100}
                                                compact
                                                showToggle={false}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {compareMode && compareSelection.length < 2 && (
                            <div className="rounded-xl border border-dashed border-[rgb(var(--accent-rgb)/0.2)] bg-[rgb(var(--accent-rgb)/0.03)] px-4 py-3 text-center">
                                <p className="text-[10px] font-mono text-[rgb(var(--accent-light-rgb)/0.5)]">
                                    Select {2 - compareSelection.length} session{compareSelection.length === 1 ? "" : "s"} to compare
                                </p>
                            </div>
                        )}

                        {/* ── #17 Session List — grouped by week ──────────────── */}
                        <div>
                            <p className="text-[9px] font-mono tracking-[0.2em] text-[var(--fg-20)] mb-3">WORKOUT LOG</p>
                            <div className="space-y-3">
                                {weekGroups.map((group) => {
                                    const isCollapsed = collapsedWeeks.has(group.key);
                                    const groupVolume = group.sessions.reduce((s, r) => s + (Number(r.total_volume) || 0), 0);

                                    return (
                                        <div key={group.key}>
                                            {/* Week header — tappable */}
                                            <button
                                                onClick={() => toggleWeek(group.key)}
                                                className="w-full flex items-center justify-between px-1 py-2 group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isCollapsed ? (
                                                        <ChevronRight size={12} className="text-[var(--fg-20)] group-hover:text-[var(--fg-40)] transition" />
                                                    ) : (
                                                        <ChevronDown size={12} className="text-[var(--fg-20)] group-hover:text-[var(--fg-40)] transition" />
                                                    )}
                                                    <p className="text-[10px] font-mono font-bold tracking-wide text-[var(--fg-40)] group-hover:text-[var(--fg-60)] transition">
                                                        {group.label.toUpperCase()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 text-[9px] font-mono text-[var(--fg-20)]">
                                                    <span>{group.sessions.length} session{group.sessions.length !== 1 ? "s" : ""}</span>
                                                    <span>{Math.round(kgToUnit(groupVolume, weightUnit)).toLocaleString()} {weightUnit}</span>
                                                </div>
                                            </button>

                                            {/* Session cards */}
                                            {!isCollapsed && (
                                                <div className="space-y-1.5">
                                                    {group.sessions.map((s) => {
                                                        const muscles = sessionMuscles[s.id] || [];
                                                        const isSelected = compareSelection.includes(s.id);

                                                        return (
                                                            <div
                                                                key={s.id}
                                                                onClick={compareMode ? () => toggleCompareSession(s.id) : undefined}
                                                                className={`group flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all ${
                                                                    compareMode
                                                                        ? isSelected
                                                                            ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.08)] cursor-pointer"
                                                                            : "border-[var(--fg-06)] bg-[var(--fg-02)] hover:bg-[var(--fg-04)] cursor-pointer"
                                                                        : "border-[var(--fg-06)] bg-[var(--fg-02)] hover:bg-[var(--fg-04)] hover:border-[var(--fg-10)]"
                                                                }`}
                                                            >
                                                                {/* #18 Checkbox in compare mode */}
                                                                {compareMode && (
                                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${isSelected ? "border-[rgb(var(--accent-rgb))] bg-[rgb(var(--accent-rgb)/0.3)]" : "border-[var(--fg-15)]"}`}>
                                                                        {isSelected && <Check size={12} className="text-[rgb(var(--accent-light-rgb))]" />}
                                                                    </div>
                                                                )}

                                                                {/* #16 Mini muscle heatmap or dumbbell icon */}
                                                                {muscles.length > 0 ? (
                                                                    <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                                                                        <MuscleHeatMap
                                                                            muscles={muscles.map(m => ({ muscle: m, intensity: 7 }))}
                                                                            height={40}
                                                                            compact
                                                                            showToggle={false}
                                                                            showLegend={false}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-xl bg-[rgb(var(--accent-rgb)/0.1)] border border-[rgb(var(--accent-rgb)/0.15)] flex items-center justify-center shrink-0" style={{ boxShadow: "0 0 10px -4px rgb(var(--accent-rgb) / 0.3)" }}>
                                                                        <Dumbbell size={15} className="text-[rgb(var(--accent-light-rgb))]" />
                                                                    </div>
                                                                )}

                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[13px] font-bold text-[var(--fg-90)] truncate">{s.title || "Workout"}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[10px] font-mono text-[var(--fg-25)]">{formatDate(s.date)}</span>
                                                                        <span className="w-0.5 h-0.5 rounded-full bg-[var(--fg-15)]" />
                                                                        <span className="text-[10px] font-mono text-[var(--fg-25)]">{formatDuration(s.duration_seconds || 0)}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2.5 shrink-0">
                                                                    <div className="text-right">
                                                                        <p className="text-[11px] font-mono text-[var(--fg-60)]">{s.total_sets} sets</p>
                                                                        <p className="text-[10px] font-mono text-[var(--fg-25)]">{Math.round(kgToUnit(Number(s.total_volume) || 0, weightUnit)).toLocaleString()} {weightUnit}</p>
                                                                    </div>
                                                                    <div className="px-2 py-1 rounded-lg bg-[rgb(var(--accent-rgb)/0.1)] border border-[rgb(var(--accent-rgb)/0.15)]">
                                                                        <p className="text-[10px] font-mono font-bold text-[rgb(var(--accent-light-rgb))]">+{s.xp_earned}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
