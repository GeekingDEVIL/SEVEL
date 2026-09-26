"use client";

import { useEffect, useState } from "react";
import { X, TrendingUp, Trophy, Dumbbell, Target, Info, Zap } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthProvider";
import { kgToUnit } from "../lib/units";

type Props = {
    exerciseId: string;
    exerciseName: string;
    equipment: string;
    bodySegment: string;
    weightUnit: "kg" | "lbs";
    userSex: string;
    imageUrl?: string | null;
    onClose: () => void;
    currentSetVolumes?: number[];
};

type WeekPoint = { week: string; e1rm: number };

function Sparkline({ data, width = 260, height = 80, unit }: { data: WeekPoint[]; width?: number; height?: number; unit: string }) {
    if (data.length < 2) return null;
    const values = data.map((d) => d.e1rm);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pad = 20;
    const w = width - pad * 2;
    const h = height - pad * 2;

    const points = data.map((d, i) => {
        const x = pad + (i / (data.length - 1)) * w;
        const y = pad + h - ((d.e1rm - min) / range) * h;
        return { x, y, val: d.e1rm };
    });

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const areaD = `${pathD} L${points[points.length - 1].x},${pad + h} L${points[0].x},${pad + h} Z`;
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    const trending = last.val >= prev.val;

    const ySteps = 3;
    const gridLines = Array.from({ length: ySteps }, (_, i) => {
        const val = min + (range * i) / (ySteps - 1);
        const y = pad + h - ((val - min) / range) * h;
        return { y, label: Math.round(val) };
    });

    return (
        <svg width="100%" height={height + 10} viewBox={`0 0 ${width} ${height + 10}`} preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0" />
                </linearGradient>
            </defs>
            {gridLines.map((g, i) => (
                <g key={i}>
                    <line x1={pad} y1={g.y} x2={width - pad} y2={g.y} stroke="var(--fg-06)" strokeWidth="0.5" />
                    <text x={pad - 4} y={g.y + 3} textAnchor="end" fill="var(--fg-20)" fontSize="7" fontFamily="monospace">{g.label}</text>
                </g>
            ))}
            <path d={areaD} fill="url(#sparkGrad)" />
            <path d={pathD} fill="none" stroke="rgb(var(--accent-rgb) / 0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2} fill={i === points.length - 1 ? (trending ? "rgb(var(--accent-rgb))" : "rgb(239 68 68 / 0.8)") : "rgb(var(--accent-rgb) / 0.3)"} />
            ))}
            <text x={last.x} y={last.y - 8} textAnchor="middle" fill={trending ? "rgb(var(--accent-rgb))" : "rgb(239 68 68 / 0.8)"} fontSize="8" fontWeight="bold" fontFamily="monospace">
                {Math.round(last.val)} {unit}
            </text>
            {data.length > 2 && (
                <>
                    <text x={points[0].x} y={pad + h + 10} textAnchor="start" fill="var(--fg-15)" fontSize="6" fontFamily="monospace">
                        {data[0].week.slice(5)}
                    </text>
                    <text x={last.x} y={pad + h + 10} textAnchor="end" fill="var(--fg-15)" fontSize="6" fontFamily="monospace">
                        {data[data.length - 1].week.slice(5)}
                    </text>
                </>
            )}
        </svg>
    );
}

export default function ExerciseDetailSheet({ exerciseId, exerciseName, equipment, bodySegment, weightUnit, userSex, imageUrl, onClose, currentSetVolumes }: Props) {
    const { user } = useAuth();
    const [details, setDetails] = useState<{ instructions: string | null; primary_muscle: string; secondary_muscles: string[] } | null>(null);
    const [stats, setStats] = useState<{ pr: number | null; avgWeight: number | null; totalSessions: number; e1rm: number | null } | null>(null);
    const [trend, setTrend] = useState<WeekPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [showE1rmInfo, setShowE1rmInfo] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [activeTab, setActiveTab] = useState<"stats" | "form">("stats");

    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        async function load() {
            const [detailRes, statsRes, trendRes] = await Promise.all([
                supabase.from("exercises").select("instructions, primary_muscle, secondary_muscles").eq("id", exerciseId).single(),
                supabase.from("exercise_set_logs")
                    .select("weight, reps, workout_sessions!inner(sex)")
                    .eq("user_id", user!.id)
                    .eq("exercise_id", exerciseId)
                    .eq("workout_sessions.sex", userSex)
                    .eq("is_warmup", false)
                    .gt("weight", 0)
                    .order("weight", { ascending: false })
                    .limit(200),
                supabase.from("exercise_set_logs")
                    .select("weight, reps, created_at, workout_sessions!inner(sex, date)")
                    .eq("user_id", user!.id)
                    .eq("exercise_id", exerciseId)
                    .eq("workout_sessions.sex", userSex)
                    .eq("is_warmup", false)
                    .gt("weight", 0)
                    .gte("created_at", new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString())
                    .order("created_at", { ascending: true }),
            ]);

            if (cancelled) return;

            if (detailRes.data) {
                setDetails({
                    instructions: detailRes.data.instructions,
                    primary_muscle: detailRes.data.primary_muscle ?? bodySegment,
                    secondary_muscles: detailRes.data.secondary_muscles ?? [],
                });
            }

            if (statsRes.data && statsRes.data.length > 0) {
                const rows = statsRes.data as any[];
                const weights = rows.map((r) => Number(r.weight)).filter((w) => w > 0);
                const pr = weights.length > 0 ? Math.max(...weights) : null;
                const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : null;
                const sessionDates = new Set(rows.map((r) => r.workout_sessions?.date).filter(Boolean));
                const bestE1rm = rows.reduce((best: number, r: any) => {
                    const w = Number(r.weight) || 0;
                    const reps = Number(r.reps) || 0;
                    if (w <= 0 || reps <= 0) return best;
                    const e = w * (1 + reps / 30);
                    return e > best ? e : best;
                }, 0);
                setStats({ pr, avgWeight, totalSessions: sessionDates.size, e1rm: bestE1rm > 0 ? bestE1rm : null });
            }

            if (trendRes.data && trendRes.data.length > 0) {
                const rows = trendRes.data as any[];
                const weekMap = new Map<string, number>();
                rows.forEach((r) => {
                    const date = r.workout_sessions?.date ?? r.created_at?.slice(0, 10);
                    if (!date) return;
                    const d = new Date(date + "T00:00:00");
                    const dayOfWeek = d.getDay();
                    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    const monday = new Date(d);
                    monday.setDate(d.getDate() + mondayOffset);
                    const weekKey = monday.toISOString().slice(0, 10);
                    const w = Number(r.weight) || 0;
                    const reps = Number(r.reps) || 0;
                    if (w <= 0 || reps <= 0) return;
                    const e1rm = w * (1 + reps / 30);
                    const current = weekMap.get(weekKey) ?? 0;
                    if (e1rm > current) weekMap.set(weekKey, e1rm);
                });
                const points = Array.from(weekMap.entries())
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([week, e1rm]) => ({ week, e1rm }));
                setTrend(points);
            }

            setLoading(false);
        }

        load();
        return () => { cancelled = true; };
    }, [user, exerciseId, userSex, bodySegment]);

    const e1rmDisplay = stats?.e1rm ? Math.round(kgToUnit(stats.e1rm, weightUnit)) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease]" />
            <div
                className="relative w-full max-w-lg bg-[var(--bg-elevated)] rounded-t-3xl max-h-[88vh] overflow-y-auto animate-[slideUp_0.25s_cubic-bezier(0.16,1,0.3,1)]"
                style={{ paddingBottom: "calc(max(env(safe-area-inset-bottom, 0px), 24px) + 70px)" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2 bg-[var(--bg-elevated)] rounded-t-3xl">
                    <div className="w-10 h-1 rounded-full bg-[var(--fg-12)]" />
                </div>

                <div className="px-5 pb-4">
                    {/* Hero header with image */}
                    <div className="relative mb-5">
                        {imageUrl && !imgError ? (
                            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-[var(--fg-04)] mb-3">
                                <img
                                    src={imageUrl}
                                    alt={exerciseName}
                                    className="w-full h-full object-cover"
                                    onError={() => setImgError(true)}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-elevated)] via-[var(--bg-elevated)/0.2] to-transparent" />
                                <div className="absolute bottom-3 left-3 right-10">
                                    <p className="text-[17px] font-bold text-white drop-shadow-lg leading-tight">{exerciseName}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-black/30 backdrop-blur-sm text-white/70">{equipment}</span>
                                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-black/30 backdrop-blur-sm text-white/70">{bodySegment}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-3">
                                <p className="text-[17px] font-bold text-[var(--fg-90)] leading-tight">{exerciseName}</p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--fg-06)] text-[var(--fg-40)]">{equipment}</span>
                                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--fg-06)] text-[var(--fg-40)]">{bodySegment}</span>
                                </div>
                            </div>
                        )}
                        <button onClick={onClose} className="absolute top-0 right-0 p-2 rounded-xl bg-black/20 backdrop-blur-sm hover:bg-black/40 transition text-white/70">
                            <X size={16} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-10 text-center">
                            <div className="w-5 h-5 mx-auto border-2 border-[var(--fg-15)] border-t-[rgb(var(--accent-rgb))] rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Tab switcher */}
                            <div className="flex gap-1 p-1 rounded-xl bg-[var(--fg-04)] mb-4">
                                <button
                                    onClick={() => setActiveTab("stats")}
                                    className={`flex-1 text-[10px] font-mono font-semibold py-2 rounded-lg transition ${activeTab === "stats" ? "bg-[var(--bg-elevated)] text-[var(--fg-80)] shadow-sm" : "text-[var(--fg-30)]"}`}
                                >
                                    PERFORMANCE
                                </button>
                                <button
                                    onClick={() => setActiveTab("form")}
                                    className={`flex-1 text-[10px] font-mono font-semibold py-2 rounded-lg transition ${activeTab === "form" ? "bg-[var(--bg-elevated)] text-[var(--fg-80)] shadow-sm" : "text-[var(--fg-30)]"}`}
                                >
                                    HOW TO
                                </button>
                            </div>

                            {activeTab === "stats" ? (
                                <>
                                    {/* Stats row */}
                                    {stats && (
                                        <div className="grid grid-cols-4 gap-2 mb-4">
                                            <div className="glass-card p-2.5 text-center">
                                                <Trophy size={12} className="mx-auto mb-1 text-amber-400/60" />
                                                <p className="text-sm font-bold font-mono text-[var(--fg-80)]">
                                                    {stats.pr ? Math.round(kgToUnit(stats.pr, weightUnit)) : "—"}
                                                </p>
                                                <p className="text-[7px] font-mono text-[var(--fg-25)] mt-0.5">PR</p>
                                            </div>
                                            <div className="glass-card p-2.5 text-center">
                                                <Dumbbell size={12} className="mx-auto mb-1 text-[rgb(var(--accent-rgb)/0.5)]" />
                                                <p className="text-sm font-bold font-mono text-[var(--fg-80)]">
                                                    {stats.avgWeight ? Math.round(kgToUnit(stats.avgWeight, weightUnit)) : "—"}
                                                </p>
                                                <p className="text-[7px] font-mono text-[var(--fg-25)] mt-0.5">AVG</p>
                                            </div>
                                            <div className="glass-card p-2.5 text-center">
                                                <Zap size={12} className="mx-auto mb-1 text-violet-400/60" />
                                                <p className="text-sm font-bold font-mono text-[var(--fg-80)]">
                                                    {e1rmDisplay ?? "—"}
                                                </p>
                                                <p className="text-[7px] font-mono text-[var(--fg-25)] mt-0.5">E1RM</p>
                                            </div>
                                            <div className="glass-card p-2.5 text-center">
                                                <Target size={12} className="mx-auto mb-1 text-emerald-400/60" />
                                                <p className="text-sm font-bold font-mono text-[var(--fg-80)]">{stats.totalSessions}</p>
                                                <p className="text-[7px] font-mono text-[var(--fg-25)] mt-0.5">TIMES</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* 1RM Trend */}
                                    {trend.length >= 2 && (
                                        <div className="glass-card p-3 mb-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-1.5">
                                                    <TrendingUp size={11} className="text-[rgb(var(--accent-rgb)/0.5)]" />
                                                    <span className="text-[9px] font-mono tracking-widest text-[var(--fg-30)]">EST. 1RM TREND</span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setShowE1rmInfo(!showE1rmInfo); }}
                                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--fg-04)] hover:bg-[var(--fg-08)] transition text-[var(--fg-30)]"
                                                >
                                                    <Info size={9} />
                                                    <span className="text-[8px] font-mono">How?</span>
                                                </button>
                                            </div>
                                            {showE1rmInfo && (
                                                <div className="mb-2 px-2 py-1.5 rounded-lg bg-[rgb(var(--accent-rgb)/0.05)] border border-[rgb(var(--accent-rgb)/0.1)]">
                                                    <p className="text-[9px] font-mono text-[rgb(var(--accent-rgb)/0.6)] leading-relaxed">
                                                        Estimated 1-rep max via Epley formula: <span className="font-bold">weight × (1 + reps ÷ 30)</span>. Shows your best weekly estimate over the last 8 weeks.
                                                    </p>
                                                </div>
                                            )}
                                            <Sparkline data={trend} unit={weightUnit} />
                                        </div>
                                    )}

                                    {/* Set Volume (current session) */}
                                    {currentSetVolumes && currentSetVolumes.length >= 2 && (() => {
                                        const vols = currentSetVolumes;
                                        const minV = Math.min(...vols);
                                        const maxV = Math.max(...vols);
                                        const range = maxV - minV || 1;
                                        const svgW = 260;
                                        const svgH = 70;
                                        const pad = 24;
                                        const plotW = svgW - pad * 2;
                                        const plotH = svgH - pad * 2;
                                        const coords = vols.map((v, i) => ({
                                            x: pad + (i / (vols.length - 1)) * plotW,
                                            y: pad + plotH - ((v - minV) / range) * plotH,
                                            val: v,
                                        }));
                                        const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
                                        const areaD = `${pathD} L${coords[coords.length - 1].x},${pad + plotH} L${coords[0].x},${pad + plotH} Z`;
                                        const drop = vols[vols.length - 1] < vols[0] * 0.9;
                                        const pctChange = Math.round(((vols[vols.length - 1] - vols[0]) / vols[0]) * 100);
                                        const color = drop ? "rgb(239 68 68" : "rgb(var(--accent-rgb)";
                                        return (
                                            <div className="glass-card p-3 mb-4">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Zap size={11} className={drop ? "text-red-400/50" : "text-[rgb(var(--accent-rgb)/0.5)]"} />
                                                        <span className="text-[9px] font-mono tracking-widest text-[var(--fg-30)]">SET VOLUME</span>
                                                    </div>
                                                    <span className={`text-[9px] font-mono font-medium ${drop ? "text-red-400/60" : "text-[var(--fg-25)]"}`}>
                                                        {drop ? `${pctChange}%` : pctChange > 0 ? `+${pctChange}%` : "steady"}
                                                    </span>
                                                </div>
                                                <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
                                                    <defs>
                                                        <linearGradient id="setVolGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor={`${color})`} stopOpacity="0.15" />
                                                            <stop offset="100%" stopColor={`${color})`} stopOpacity="0" />
                                                        </linearGradient>
                                                    </defs>
                                                    <polygon points={`${coords[0].x},${pad + plotH} ${coords.map(c => `${c.x},${c.y}`).join(" ")} ${coords[coords.length - 1].x},${pad + plotH}`} fill="url(#setVolGrad)" />
                                                    <path d={pathD} fill="none" stroke={`${color} / 0.6)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    {coords.map((c, i) => (
                                                        <g key={i}>
                                                            <circle cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3.5 : 2} fill={`${color} / ${i === coords.length - 1 ? "0.8" : "0.4"})`} />
                                                            <text x={c.x} y={c.y - 6} textAnchor="middle" fill="var(--fg-30)" fontSize="7" fontFamily="monospace">{Math.round(c.val)}</text>
                                                            <text x={c.x} y={pad + plotH + 10} textAnchor="middle" fill="var(--fg-15)" fontSize="6" fontFamily="monospace">S{i + 1}</text>
                                                        </g>
                                                    ))}
                                                </svg>
                                                <p className="text-[8px] font-mono text-[var(--fg-20)] mt-0.5">Weight × reps per set this session</p>
                                            </div>
                                        );
                                    })()}

                                    {/* Muscles */}
                                    {details && (
                                        <div className="mb-4">
                                            <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-2">TARGET MUSCLES</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="text-[10px] font-mono px-2.5 py-1.5 rounded-lg bg-[rgb(var(--accent-rgb)/0.1)] border border-[rgb(var(--accent-rgb)/0.2)] text-[rgb(var(--accent-light-rgb))]">
                                                    {details.primary_muscle}
                                                </span>
                                                {details.secondary_muscles.map((m: string) => (
                                                    <span key={m} className="text-[10px] font-mono px-2.5 py-1.5 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-06)] text-[var(--fg-40)]">
                                                        {m}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Form Cues */}
                                    {details?.instructions ? (
                                        <div className="space-y-2">
                                            {details.instructions.split(/[.;\n]/).filter((s) => s.trim()).map((cue, i) => (
                                                <div key={i} className="flex items-start gap-3 rounded-xl bg-[var(--fg-03)] border border-[var(--fg-06)] px-4 py-3">
                                                    <span className="text-[10px] font-mono font-bold text-[rgb(var(--accent-rgb)/0.4)] mt-px shrink-0 w-4">{i + 1}</span>
                                                    <p className="text-[11px] text-[var(--fg-60)] leading-relaxed">{cue.trim()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center">
                                            <p className="text-[11px] font-mono text-[var(--fg-20)]">No form cues available for this exercise.</p>
                                        </div>
                                    )}

                                    {/* Muscles in form tab too */}
                                    {details && (
                                        <div className="mt-4">
                                            <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-2">TARGET MUSCLES</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="text-[10px] font-mono px-2.5 py-1.5 rounded-lg bg-[rgb(var(--accent-rgb)/0.1)] border border-[rgb(var(--accent-rgb)/0.2)] text-[rgb(var(--accent-light-rgb))]">
                                                    {details.primary_muscle}
                                                </span>
                                                {details.secondary_muscles.map((m: string) => (
                                                    <span key={m} className="text-[10px] font-mono px-2.5 py-1.5 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-06)] text-[var(--fg-40)]">
                                                        {m}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>

                <style jsx>{`
                    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
                    @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
                `}</style>
            </div>
        </div>
    );
}
