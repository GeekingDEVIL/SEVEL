"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Scale, TrendingDown, TrendingUp, Target, ArrowRight } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/AuthProvider";
import { useSex } from "../../../lib/useSex";
import { useUnits } from "../../../lib/useUnits";
import { kgToUnit, weightInputToKg } from "../../../lib/units";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import MeasurementModal, { type MeasurementType } from "../../../components/MeasurementModal";
import { type WeightEntry, type WeightContext, rematerializeWeightTrend } from "../../../lib/weightTrend";
import CubeLoader from "../../../components/ui/cube-loader";

/* ── Constants ── */

const MEASUREMENT_TYPES: { type: MeasurementType; color: string; bar: string }[] = [
    { type: "Biceps", color: "text-pink-300", bar: "bg-pink-400" },
    { type: "Abs", color: "text-emerald-300", bar: "bg-emerald-400" },
    { type: "Waist", color: "text-orange-300", bar: "bg-orange-400" },
    { type: "Chest", color: "text-blue-300", bar: "bg-blue-400" },
    { type: "Shoulders", color: "text-violet-300", bar: "bg-violet-400" },
    { type: "Thigh", color: "text-teal-300", bar: "bg-teal-400" },
    { type: "Calf", color: "text-yellow-300", bar: "bg-yellow-400" },
];

const WEIGHT_CONTEXTS: { value: WeightContext; label: string }[] = [
    { value: "morning", label: "MORNING" },
    { value: "pre_workout", label: "PRE-WORKOUT" },
    { value: "post_workout", label: "POST-WORKOUT" },
    { value: "manual", label: "GENERAL" },
];

/* ── Types ── */

type BodyWeightEntry = {
    weight: number;
    date: string;
    rawDate: string;
    ema?: number;
};

type WeightGoal = {
    targetWeightKg: number | null;
    targetDate: string | null;
    goalType: string;
};

/* ── Helpers ── */

function InfoTip({ term, text }: { term: string; text: string }) {
    const [open, setOpen] = useState(false);
    return (
        <span className="relative inline-block ml-1">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="inline-flex items-center justify-center w-3 h-3 rounded-full border border-[var(--fg-15)] text-[6px] font-mono text-[var(--fg-25)] hover:text-[var(--fg-50)] hover:border-[var(--fg-30)] transition"
            >i</button>
            {open && (
                <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 p-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--fg-15)] text-[8px] font-mono text-[var(--fg-50)] leading-relaxed shadow-lg" onClick={(e) => e.stopPropagation()}>
                    <strong className="text-[var(--fg-70)]">{term}</strong> — {text}
                </span>
            )}
        </span>
    );
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

function toDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(a: string, b: string): number {
    const msA = new Date(a + "T00:00:00").getTime();
    const msB = new Date(b + "T00:00:00").getTime();
    return Math.round(Math.abs(msB - msA) / 86400000);
}

function formatDurationHuman(days: number): string {
    if (days < 7) return `${days} day${days === 1 ? "" : "s"}`;
    if (days < 30) { const w = Math.floor(days / 7); return `${w} week${w === 1 ? "" : "s"}`; }
    const m = Math.round(days / 30.44);
    return `${m} month${m === 1 ? "" : "s"}`;
}

/* ── Page ── */

export default function WeightPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { sex: userSex } = useSex();
    const weightUnit = useUnits();

    const [loading, setLoading] = useState(true);
    const [bodyWeightData, setBodyWeightData] = useState<BodyWeightEntry[]>([]);
    const [newWeight, setNewWeight] = useState("");
    const [weightContext, setWeightContext] = useState<WeightContext>("morning");
    const [measurements, setMeasurements] = useState<Record<string, number | null>>({});
    const [activeMeasurement, setActiveMeasurement] = useState<MeasurementType | null>(null);
    const [weightGoal, setWeightGoal] = useState<WeightGoal | null>(null);

    /* ── Data loading ── */

    const loadBodyWeight = useCallback(async () => {
        if (!user) return;
        const [{ data: logs }, { data: trend }] = await Promise.all([
            supabase
                .from("body_weight_logs")
                .select("weight, logged_at, context, date")
                .eq("user_id", user.id)
                .eq("sex", userSex)
                .order("logged_at", { ascending: true })
                .limit(180),
            supabase
                .from("weight_trend")
                .select("date, raw_kg, ema_kg")
                .eq("user_id", user.id)
                .eq("sex", userSex)
                .order("date", { ascending: true }),
        ]);

        const emaByDate: Record<string, number> = {};
        (trend ?? []).forEach((t: any) => { emaByDate[t.date] = Number(t.ema_kg); });

        const byDate: Record<string, { weights: number[] }> = {};
        (logs ?? []).forEach((d: any) => {
            const dateKey = d.date || (d.logged_at as string).split("T")[0];
            if (!byDate[dateKey]) byDate[dateKey] = { weights: [] };
            byDate[dateKey].weights.push(Number(d.weight));
        });

        const entries: BodyWeightEntry[] = Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dateKey, val]) => {
                const avg = val.weights.reduce((a, b) => a + b, 0) / val.weights.length;
                return {
                    weight: Math.round(avg * 10) / 10,
                    date: new Date(dateKey + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                    rawDate: dateKey,
                    ema: emaByDate[dateKey] ? Math.round(emaByDate[dateKey] * 10) / 10 : undefined,
                };
            });

        setBodyWeightData(entries);
    }, [user, userSex]);

    const loadMeasurements = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from("body_measurements")
            .select("type, value_cm, logged_at")
            .eq("user_id", user.id)
            .order("logged_at", { ascending: false });
        const latest: Record<string, number | null> = {};
        (data ?? []).forEach((m: any) => { if (latest[m.type] === undefined) latest[m.type] = Number(m.value_cm); });
        setMeasurements(latest);
    }, [user]);

    const loadWeightGoal = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from("user_goals")
            .select("target_weight_kg, target_date, goal_type")
            .eq("user_id", user.id)
            .eq("sex", userSex)
            .eq("is_active", true)
            .limit(1);
        const g = data?.[0] as any;
        if (g && g.target_weight_kg) {
            setWeightGoal({
                targetWeightKg: Number(g.target_weight_kg),
                targetDate: g.target_date ?? null,
                goalType: g.goal_type ?? "general_fitness",
            });
        } else {
            setWeightGoal(null);
        }
    }, [user, userSex]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            await Promise.all([loadBodyWeight(), loadMeasurements(), loadWeightGoal()]);
            if (cancelled) return;
            setLoading(false);
        }
        load();
        return () => { cancelled = true; };
    }, [loadBodyWeight, loadMeasurements, loadWeightGoal]);

    /* ── Log weight ── */

    async function logBodyWeight() {
        if (!user || !newWeight) return;
        const rawValue = Number(newWeight);
        if (rawValue <= 0) return;
        const storedKg = weightInputToKg(rawValue, weightUnit);
        const today = toDateString(new Date());

        await supabase.from("body_weight_logs").insert({
            user_id: user.id,
            weight: storedKg,
            context: weightContext,
            entered_unit: weightUnit,
            date: today,
            sex: userSex,
        });

        if (weightContext === "morning") {
            await rematerializeWeightTrend(user.id, userSex);
        }

        setNewWeight("");
        await loadBodyWeight();
    }

    /* ── Display data ── */

    const displayBodyWeightData = useMemo(() =>
        bodyWeightData.map((d) => ({
            ...d,
            weight: Math.round(kgToUnit(d.weight, weightUnit) * 10) / 10,
            ema: d.ema != null ? Math.round(kgToUnit(d.ema, weightUnit) * 10) / 10 : undefined,
        })),
        [bodyWeightData, weightUnit],
    );

    const unitLabel = weightUnit.toUpperCase();

    /* ── Before/After delta (#22) ── */

    const journeySummary = useMemo(() => {
        if (bodyWeightData.length < 2) return null;
        const first = bodyWeightData[0];
        const latest = bodyWeightData[bodyWeightData.length - 1];
        const startKg = first.weight;
        const nowKg = latest.weight;
        const deltaKg = Math.round((nowKg - startKg) * 10) / 10;
        const days = daysBetween(first.rawDate, latest.rawDate);
        const duration = formatDurationHuman(days);

        const startDisplay = Math.round(kgToUnit(startKg, weightUnit) * 10) / 10;
        const nowDisplay = Math.round(kgToUnit(nowKg, weightUnit) * 10) / 10;
        const deltaDisplay = Math.round(kgToUnit(Math.abs(deltaKg), weightUnit) * 10) / 10;

        let progressPct: number | null = null;
        if (weightGoal?.targetWeightKg) {
            const targetKg = weightGoal.targetWeightKg;
            const totalDistance = Math.abs(targetKg - startKg);
            if (totalDistance > 0) {
                const traveled = Math.abs(nowKg - startKg);
                // Only count progress in the right direction
                const rightDirection = (targetKg < startKg && nowKg < startKg) || (targetKg > startKg && nowKg > startKg);
                progressPct = rightDirection ? Math.min(Math.round((traveled / totalDistance) * 100), 100) : 0;
            }
        }

        return { startDisplay, nowDisplay, deltaDisplay, deltaKg, duration, progressPct };
    }, [bodyWeightData, weightUnit, weightGoal]);

    /* ── Goal timeline projection (#21) ── */

    const goalProjection = useMemo(() => {
        if (!weightGoal?.targetWeightKg || bodyWeightData.length < 4) return null;
        const targetKg = weightGoal.targetWeightKg;

        // Get the last 4 weeks of trend entries for rate calculation
        const trendEntries = bodyWeightData.filter((d) => d.ema !== undefined);
        if (trendEntries.length < 2) return null;

        // Use last ~28 days of data
        const recentCutoffDate = new Date();
        recentCutoffDate.setDate(recentCutoffDate.getDate() - 28);
        const cutoffStr = toDateString(recentCutoffDate);
        const recentTrend = trendEntries.filter((d) => d.rawDate >= cutoffStr);

        if (recentTrend.length < 2) return null;

        const firstTrend = recentTrend[0];
        const lastTrend = recentTrend[recentTrend.length - 1];
        const trendDays = daysBetween(firstTrend.rawDate, lastTrend.rawDate);
        if (trendDays < 7) return null;

        const weeklyChangeKg = ((lastTrend.ema! - firstTrend.ema!) / trendDays) * 7;
        const remainingKg = targetKg - lastTrend.ema!;

        const targetDisplay = Math.round(kgToUnit(targetKg, weightUnit) * 10) / 10;

        // Wrong direction or stalled
        if (Math.abs(weeklyChangeKg) < 0.05) {
            return { targetDisplay, message: "At current rate, goal may need adjustment", projected: null, needsAdjustment: true };
        }

        // Going wrong direction
        if ((remainingKg > 0 && weeklyChangeKg < 0) || (remainingKg < 0 && weeklyChangeKg > 0)) {
            return { targetDisplay, message: "At current rate, goal may need adjustment", projected: null, needsAdjustment: true };
        }

        const weeksToGoal = Math.abs(remainingKg / weeklyChangeKg);
        const projectedDate = new Date();
        projectedDate.setDate(projectedDate.getDate() + Math.round(weeksToGoal * 7));
        const projectedStr = projectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: projectedDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });

        return { targetDisplay, message: null, projected: projectedStr, needsAdjustment: false };
    }, [bodyWeightData, weightGoal, weightUnit]);

    /* ── Render ── */

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 md:pb-10 relative">
            <div className="relative z-10 max-w-xl mx-auto px-4 pt-6 space-y-5">

                {/* Header with back button */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/track")}
                        className="w-8 h-8 rounded-lg border border-[var(--fg-08)] flex items-center justify-center text-[var(--fg-40)] hover:text-[var(--fg-70)] hover:border-[var(--fg-15)] transition"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold font-display text-[rgb(var(--accent-light-rgb))]">Weight</h1>
                        <p className="text-[11px] text-[var(--fg-30)] mt-0.5">Body weight & measurements</p>
                    </div>
                </div>

                {loading ? (
                    <CubeLoader message="Loading weight data..." />
                ) : (
                    <div className="space-y-4">

                        {/* ── #22 Before/After Delta Card ── */}
                        {journeySummary && (
                            <div
                                className="relative overflow-hidden rounded-2xl border border-[rgb(var(--accent-rgb)/0.2)] p-5"
                                style={{ background: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.12) 0%, rgb(var(--accent-rgb) / 0.03) 60%, transparent 100%)" }}
                            >
                                <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[rgb(var(--accent-rgb)/0.15)] blur-[60px]" />
                                <div className="relative z-10">
                                    <p className="text-[9px] font-mono tracking-[0.2em] text-[rgb(var(--accent-light-rgb)/0.5)] mb-3">YOUR JOURNEY</p>

                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg font-bold font-mono text-[var(--fg-50)]">{journeySummary.startDisplay}</span>
                                        <ArrowRight size={14} className="text-[var(--fg-20)]" />
                                        <span className="text-lg font-bold font-mono text-[var(--fg-95)]">{journeySummary.nowDisplay}</span>
                                        <span className="text-xs font-mono text-[var(--fg-30)]">{unitLabel}</span>
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] font-mono">
                                        <span className={`font-bold ${journeySummary.deltaKg < 0 ? "text-emerald-300" : journeySummary.deltaKg > 0 ? "text-orange-300" : "text-[var(--fg-50)]"}`}>
                                            {journeySummary.deltaKg > 0 ? "+" : journeySummary.deltaKg < 0 ? "-" : ""}{journeySummary.deltaDisplay} {unitLabel}
                                        </span>
                                        <span className="text-[var(--fg-25)]">in {journeySummary.duration}</span>
                                    </div>

                                    {/* Progress bar toward goal */}
                                    {journeySummary.progressPct !== null && (
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[8px] font-mono text-[var(--fg-25)]">GOAL PROGRESS</span>
                                                <span className="text-[8px] font-mono text-[rgb(var(--accent-light-rgb))]">{journeySummary.progressPct}%</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-[var(--fg-06)] overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${journeySummary.progressPct}%`,
                                                        background: "linear-gradient(90deg, rgb(var(--accent-rgb)), rgb(var(--accent-light-rgb)))",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── #21 Goal Timeline Projection ── */}
                        {goalProjection && (
                            <div className="rounded-lg border border-[var(--fg-08)] bg-[var(--fg-02)] p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[rgb(var(--accent-rgb)/0.12)] border border-[rgb(var(--accent-rgb)/0.2)] flex items-center justify-center shrink-0">
                                        <Target size={14} className="text-[rgb(var(--accent-light-rgb))]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-1">GOAL PROJECTION</p>
                                        {goalProjection.needsAdjustment ? (
                                            <>
                                                <p className="text-sm font-mono text-[var(--fg-70)]">
                                                    Target <span className="font-bold text-[var(--fg-90)]">{goalProjection.targetDisplay} {unitLabel}</span>
                                                </p>
                                                <p className="text-[10px] font-mono text-amber-300/70 mt-1">{goalProjection.message}</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm font-mono text-[var(--fg-70)]">
                                                    Target <span className="font-bold text-[var(--fg-90)]">{goalProjection.targetDisplay} {unitLabel}</span>
                                                    <span className="text-[var(--fg-30)]"> — </span>
                                                    projected to reach by <span className="font-bold text-emerald-300">{goalProjection.projected}</span>
                                                </p>
                                                <p className="text-[9px] font-mono text-[var(--fg-25)] mt-1">Based on avg. weekly change over last 4 weeks</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Measurements */}
                        <div className="glass-card p-4">
                            <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)] mb-4">MEASUREMENTS</p>
                            <div className="flex items-end justify-between gap-2 h-28 mb-3">
                                {MEASUREMENT_TYPES.map((m) => {
                                    const val = measurements[m.type];
                                    const maxVal = Math.max(30, ...MEASUREMENT_TYPES.map((t) => measurements[t.type] ?? 0));
                                    const heightPct = val ? Math.max(12, (val / maxVal) * 100) : 8;
                                    return (
                                        <div key={m.type} className="flex-1 flex flex-col items-center justify-end h-full">
                                            <div className={`w-full max-w-8 rounded-t ${val ? m.bar : "bg-[var(--fg-06)]"}`} style={{ height: `${heightPct}%` }} />
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-start justify-between gap-2">
                                {MEASUREMENT_TYPES.map((m) => (
                                    <div key={m.type} className="flex-1 flex flex-col items-center gap-1">
                                        <button
                                            onClick={() => setActiveMeasurement(m.type)}
                                            className={`w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold ${m.bar} text-black`}
                                        >
                                            +
                                        </button>
                                        <p className={`text-[8px] font-mono ${m.color} text-center leading-tight`}>{m.type.toUpperCase()}</p>
                                        {measurements[m.type] != null && <p className="text-[8px] font-mono text-[var(--fg-30)]">{measurements[m.type]}cm</p>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Log weight */}
                        <div className="rounded-lg border border-[rgb(var(--accent-rgb)/0.15)] bg-[var(--fg-02)] p-4" style={{ boxShadow: "inset 0 1px 0 rgb(var(--accent-rgb) / 0.06)" }}>
                            <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)] mb-3">LOG BODY WEIGHT</p>

                            {/* Context selector */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {WEIGHT_CONTEXTS.map((ctx) => (
                                    <button
                                        key={ctx.value}
                                        onClick={() => setWeightContext(ctx.value)}
                                        className={`text-[9px] font-mono px-2.5 py-1.5 rounded-md border transition ${weightContext === ctx.value ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-08)] text-[var(--fg-30)] hover:text-[var(--fg-50)]"}`}
                                    >
                                        {ctx.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    inputMode="decimal"
                                    onWheel={(e) => (e.target as HTMLElement).blur()}
                                    value={newWeight}
                                    onChange={(e) => setNewWeight(e.target.value)}
                                    placeholder="—"
                                    className="flex-1 min-w-0 h-12 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-xl font-bold font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition"
                                />
                                <span className="shrink-0 text-[10px] font-mono px-3 py-3 text-[var(--fg-40)]">{unitLabel}</span>
                                <button
                                    onClick={logBodyWeight}
                                    disabled={!newWeight}
                                    className="shrink-0 text-[10px] font-mono px-4 py-3 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.1)] disabled:opacity-30 disabled:cursor-not-allowed transition"
                                >
                                    LOG
                                </button>
                            </div>
                            {weightContext === "morning" && (
                                <p className="text-[9px] font-mono text-[rgb(var(--accent-light-rgb)/0.5)] mt-2">Morning weigh-ins feed the trend line. Other entries are logged but don&apos;t affect your trend.</p>
                            )}
                        </div>

                        {/* Weight trend chart */}
                        <div className="rounded-lg border border-[rgb(var(--accent-rgb)/0.15)] bg-[var(--fg-02)] p-4" style={{ boxShadow: "inset 0 1px 0 rgb(var(--accent-rgb) / 0.06)" }}>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">WEIGHT TREND</p>
                                {bodyWeightData.some((d) => d.ema) && (
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1.5 text-[8px] font-mono text-[var(--fg-25)]">
                                            <span className="w-3 h-0.5 rounded-full bg-[var(--fg-20)] inline-block" /> RAW
                                        </span>
                                        <span className="flex items-center gap-1.5 text-[8px] font-mono text-cyan-300/60">
                                            <span className="w-3 h-0.5 rounded-full bg-cyan-400 inline-block" /> TREND
                                        </span>
                                    </div>
                                )}
                            </div>
                            {bodyWeightData.length < 2 ? (
                                <div className="h-40 flex items-center justify-center border border-dashed border-[var(--fg-10)] rounded-lg">
                                    <p className="text-xs font-mono text-[var(--fg-30)] text-center px-4">
                                        {bodyWeightData.length === 0 ? "No weight logs yet. Log your morning weight to start tracking." : "Need at least 2 entries to show a trend."}
                                    </p>
                                </div>
                            ) : (
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={displayBodyWeightData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--fg-04)" />
                                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--fg-30)" }} />
                                            <YAxis tick={{ fontSize: 9, fill: "var(--fg-30)" }} domain={["auto", "auto"]} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line type="monotone" dataKey="weight" stroke="var(--fg-20)" strokeWidth={1} dot={{ r: 2.5, fill: "var(--fg-15)", strokeWidth: 0 }} name={`Raw (${weightUnit})`} activeDot={{ r: 4, fill: "var(--fg-40)" }} />
                                            {bodyWeightData.some((d) => d.ema) && (
                                                <Line type="monotone" dataKey="ema" stroke="#22d3ee" strokeWidth={2.5} dot={false} name={`Trend (${weightUnit})`} connectNulls />
                                            )}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            {bodyWeightData.length >= 2 && !bodyWeightData.some((d) => d.ema) && (
                                <p className="text-[9px] font-mono text-[var(--fg-20)] mt-2 text-center">
                                    Log morning weigh-ins to see the EMA
                                    <InfoTip term="EMA" text="Exponential Moving Average — a smoothed trend line that filters out daily weight fluctuations from water, food timing, etc. Shows your true weight direction." />
                                    {" "}trend line
                                </p>
                            )}
                        </div>

                        {/* Explainer — only shown once there's some data */}
                        {bodyWeightData.length > 0 && bodyWeightData.length <= 7 && (
                            <div className="rounded-lg border border-amber-500/10 bg-amber-500/[0.03] px-4 py-3">
                                <p className="text-[9px] font-mono text-amber-200/60 leading-relaxed">Initial weight changes are mostly glycogen and water (~3g water per 1g glycogen stored), not fat. Give the trend line 2-3 weeks before reading real direction.</p>
                            </div>
                        )}

                        {/* Latest stats */}
                        {displayBodyWeightData.length > 0 && (() => {
                            const latest = displayBodyWeightData[displayBodyWeightData.length - 1];
                            const trendEntries = displayBodyWeightData.filter((d) => d.ema !== undefined);
                            const trendStart = trendEntries.length >= 2 ? trendEntries[0].ema! : null;
                            const trendEnd = trendEntries.length >= 2 ? trendEntries[trendEntries.length - 1].ema! : null;
                            const trendChange = trendStart !== null && trendEnd !== null ? Math.round((trendEnd - trendStart) * 10) / 10 : null;
                            const weeklyRate = trendEntries.length >= 7 && trendStart !== null && trendEnd !== null
                                ? Math.round(((trendEnd - trendStart) / (trendEntries.length / 7)) * 10) / 10
                                : null;

                            return (
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="glass-card p-3 text-center">
                                        <p className="text-[8px] font-mono text-[var(--fg-30)]">CURRENT</p>
                                        <p className="text-lg font-bold font-mono text-[var(--fg-90)]">{latest.weight} <span className="text-xs text-[var(--fg-30)]">{unitLabel}</span></p>
                                    </div>
                                    <div className="glass-card p-3 text-center">
                                        <p className="text-[8px] font-mono text-[var(--fg-30)]">{trendEnd !== null ? "TREND" : "LOWEST"}</p>
                                        {trendEnd !== null ? (
                                            <p className="text-lg font-bold font-mono text-cyan-300">{trendEnd} <span className="text-xs text-[var(--fg-30)]">{unitLabel}</span></p>
                                        ) : (
                                            <p className="text-lg font-bold font-mono text-emerald-300">{Math.min(...displayBodyWeightData.map((d) => d.weight))} <span className="text-xs text-[var(--fg-30)]">{unitLabel}</span></p>
                                        )}
                                    </div>
                                    <div className="glass-card p-3 text-center">
                                        <p className="text-[8px] font-mono text-[var(--fg-30)]">{weeklyRate !== null ? "/WEEK" : "CHANGE"}</p>
                                        {weeklyRate !== null ? (
                                            <p className={`text-lg font-bold font-mono ${weeklyRate > 0 ? "text-orange-300" : weeklyRate < 0 ? "text-emerald-300" : "text-[var(--fg-50)]"}`}>{weeklyRate > 0 ? "+" : ""}{weeklyRate} <span className="text-xs text-[var(--fg-30)]">{unitLabel}</span></p>
                                        ) : displayBodyWeightData.length >= 2 ? (() => {
                                            const change = Math.round((latest.weight - displayBodyWeightData[0].weight) * 10) / 10;
                                            return <p className={`text-lg font-bold font-mono ${change > 0 ? "text-orange-300" : change < 0 ? "text-emerald-300" : "text-[var(--fg-50)]"}`}>{change > 0 ? "+" : ""}{change} <span className="text-xs text-[var(--fg-30)]">{unitLabel}</span></p>;
                                        })() : <p className="text-lg font-bold font-mono text-[var(--fg-30)]">—</p>}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {activeMeasurement && (
                <MeasurementModal
                    type={activeMeasurement}
                    lastValue={measurements[activeMeasurement] ?? null}
                    onClose={() => setActiveMeasurement(null)}
                    onSaved={(type, value) => setMeasurements((prev) => ({ ...prev, [type]: value }))}
                />
            )}
        </main>
    );
}
