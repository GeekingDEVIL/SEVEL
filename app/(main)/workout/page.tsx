"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, X, ChevronDown, ChevronRight, Dumbbell, BookOpen, Zap, Filter, Database } from "lucide-react";
import SwipeNav from "../../components/ui/swipe-nav";
import CubeLoader from "../../components/ui/cube-loader";
import ExerciseDetailSheet from "../../components/ExerciseDetailSheet";
import PlanBrowserModal from "../../components/PlanBrowserModal";
import { useModules } from "../../lib/useModules";
import { useAuth } from "../../lib/AuthProvider";
import { getTrainSections } from "../../lib/navPills";
import { supabase } from "../../lib/supabase";
import { useUnits } from "../../lib/useUnits";
import { useSex } from "../../lib/useSex";
import { QUICK_START_TEMPLATES, type QuickStartTemplate } from "../../lib/quickStartTemplates";

const SEGMENT_ORDER = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Cardio", "Other"];
const SEGMENT_COLORS: Record<string, string> = {
    Chest: "239 68 68", Shoulders: "249 115 22", Back: "59 130 246",
    Arms: "168 85 247", Legs: "16 185 129", Core: "234 179 8",
    Cardio: "236 72 153", Other: "107 114 128",
};

const DISCIPLINE_FILTER_ORDER = ["strength", "boxing", "muay_thai", "bjj", "mma", "karate", "taekwondo", "calisthenics", "cardio", "mobility"] as const;
const DISCIPLINE_COLORS_HEX: Record<string, string> = {
    boxing: "#ef4444", muay_thai: "#f97316", kickboxing: "#f97316",
    bjj: "#a78bfa", wrestling: "#8b5cf6", judo: "#7c3aed", mma: "#ec4899",
    karate: "#3b82f6", taekwondo: "#60a5fa", calisthenics: "#34d399",
    cardio: "#fbbf24", mobility: "#22d3ee", strength: "#94a3b8",
};

type Exercise = {
    id: string; name: string; body_segment: string; primary_muscle: string;
    secondary_muscles: string[]; equipment: string; equipment_type: string;
    category: string; difficulty: string; is_unilateral: boolean;
    per_side_weight: boolean; instructions: string | null; tracking_method: string | null;
    image_url: string | null; discipline: string | null;
};

export default function WorkoutLibraryPage() {
    const { user } = useAuth();
    const { enabledKeys } = useModules();
    const weightUnit = useUnits();
    const { sex: userSex } = useSex();

    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [segmentFilter, setSegmentFilter] = useState<string>("all");
    const [equipmentFilter, setEquipmentFilter] = useState<string>("all");
    const [disciplineFilter, setDisciplineFilter] = useState<string>("all");
    const [showFilters, setShowFilters] = useState(false);
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
    const [detailEx, setDetailEx] = useState<Exercise | null>(null);
    const [showPlanBrowser, setShowPlanBrowser] = useState(false);
    const [tab, setTab] = useState<"exercises" | "plans">("exercises");

    useEffect(() => {
        async function load() {
            const { data } = await supabase.from("exercises").select("*").order("name");
            setExercises((data as Exercise[]) ?? []);
            setLoading(false);
        }
        load();
    }, []);

    const segments = useMemo(() => {
        const s = new Set(exercises.map((ex) => ex.body_segment || "Other"));
        return SEGMENT_ORDER.filter((seg) => s.has(seg));
    }, [exercises]);

    const equipmentTypes = useMemo(
        () => Array.from(new Set(exercises.map((ex) => ex.equipment).filter(Boolean))).sort(),
        [exercises],
    );

    const disciplineCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const ex of exercises) {
            const d = ex.discipline || "strength";
            counts[d] = (counts[d] || 0) + 1;
        }
        return counts;
    }, [exercises]);

    const filtered = useMemo(() => {
        const q = query.toLowerCase().trim();
        return exercises.filter((ex) => {
            if (segmentFilter !== "all" && ex.body_segment !== segmentFilter) return false;
            if (equipmentFilter !== "all" && ex.equipment !== equipmentFilter) return false;
            if (disciplineFilter !== "all" && (ex.discipline || "strength") !== disciplineFilter) return false;
            if (q && !ex.name.toLowerCase().includes(q) && !ex.primary_muscle?.toLowerCase().includes(q) && !ex.equipment?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [exercises, query, segmentFilter, equipmentFilter, disciplineFilter]);

    const grouped = useMemo(() => {
        const map = new Map<string, Exercise[]>();
        for (const ex of filtered) {
            const seg = ex.body_segment || "Other";
            if (!map.has(seg)) map.set(seg, []);
            map.get(seg)!.push(ex);
        }
        return SEGMENT_ORDER.filter((s) => map.has(s)).map((s) => ({ segment: s, items: map.get(s)! }));
    }, [filtered]);

    function toggleGroup(seg: string) {
        setOpenGroups((prev) => {
            const next = new Set(prev);
            next.has(seg) ? next.delete(seg) : next.add(seg);
            return next;
        });
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <CubeLoader />
            </main>
        );
    }

    return (
        <main className="relative min-h-screen w-full max-w-full bg-[var(--bg-primary)] text-[var(--text-primary)] pb-36 md:pb-10 overflow-x-hidden">
            <div className="w-full max-w-xl mx-auto px-4 md:px-10 pt-4 md:pt-10 space-y-4">
                <SwipeNav sections={getTrainSections(enabledKeys)} />

                {/* Header */}
                <div className="pt-1">
                    <p className="text-[10px] font-mono tracking-widest text-[var(--fg-25)]">GYM</p>
                    <h1 className="text-2xl font-bold text-[var(--fg-90)] mt-0.5 leading-tight">Exercise Library</h1>
                    <p className="text-[11px] text-[var(--fg-35)] mt-1">Browse exercises, plans, and training templates</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-xl bg-[var(--fg-03)] border border-[var(--fg-06)]">
                    <button
                        onClick={() => setTab("exercises")}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-mono font-medium py-2 rounded-lg transition ${
                            tab === "exercises"
                                ? "bg-[rgb(var(--accent-rgb)/0.12)] text-[rgb(var(--accent-rgb))] border border-[rgb(var(--accent-rgb)/0.2)]"
                                : "text-[var(--fg-35)] hover:text-[var(--fg-60)]"
                        }`}
                    >
                        <Database size={13} /> EXERCISES
                    </button>
                    <button
                        onClick={() => setTab("plans")}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-mono font-medium py-2 rounded-lg transition ${
                            tab === "plans"
                                ? "bg-[rgb(var(--accent-rgb)/0.12)] text-[rgb(var(--accent-rgb))] border border-[rgb(var(--accent-rgb)/0.2)]"
                                : "text-[var(--fg-35)] hover:text-[var(--fg-60)]"
                        }`}
                    >
                        <BookOpen size={13} /> PLANS
                    </button>
                </div>

                {/* ═══ EXERCISES TAB ═══ */}
                {tab === "exercises" && (
                    <>
                        {/* 2.1 Discipline category cards */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                            {DISCIPLINE_FILTER_ORDER.map(disc => {
                                const count = disciplineCounts[disc] || 0;
                                if (count === 0) return null;
                                const color = DISCIPLINE_COLORS_HEX[disc] || "#94a3b8";
                                const isActive = disciplineFilter === disc;
                                const label = disc === "bjj" ? "BJJ" : disc === "mma" ? "MMA" : disc.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                                return (
                                    <button
                                        key={disc}
                                        onClick={() => setDisciplineFilter(isActive ? "all" : disc)}
                                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono font-medium transition active:scale-95 ${
                                            isActive ? "border-transparent text-white" : "border-[var(--fg-06)] text-[var(--fg-35)] hover:text-[var(--fg-55)]"
                                        }`}
                                        style={isActive ? { background: color } : { borderLeftWidth: 2, borderLeftColor: `${color}80` }}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full" style={isActive ? { background: "rgba(255,255,255,0.4)" } : { background: color }} />
                                        {label}
                                        <span className={`text-[8px] ${isActive ? "text-white/60" : "text-[var(--fg-15)]"}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 6.7 Muscle browser — tap to filter */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                            {SEGMENT_ORDER.map(seg => {
                                const count = exercises.filter(e => (e.body_segment || "Other") === seg).length;
                                if (count === 0) return null;
                                const color = SEGMENT_COLORS[seg] || SEGMENT_COLORS.Other;
                                const isActive = segmentFilter === seg;
                                return (
                                    <button
                                        key={seg}
                                        onClick={() => setSegmentFilter(isActive ? "all" : seg)}
                                        className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-mono font-medium transition active:scale-95 ${
                                            isActive
                                                ? "border-transparent text-black"
                                                : "border-[var(--fg-06)] text-[var(--fg-40)] hover:text-[var(--fg-60)]"
                                        }`}
                                        style={isActive ? { background: `rgb(${color})`, borderColor: `rgb(${color})` } : { borderLeftWidth: 2, borderLeftColor: `rgb(${color} / 0.5)` }}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${isActive ? "bg-black/30" : ""}`} style={isActive ? {} : { background: `rgb(${color})` }} />
                                        {seg}
                                        <span className={`text-[9px] ${isActive ? "text-black/50" : "text-[var(--fg-20)]"}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-20)]" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search exercises..."
                                className="w-full h-10 rounded-xl bg-[var(--fg-04)] border border-[var(--fg-06)] text-sm pl-9 pr-10 focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.3)] transition placeholder:text-[var(--fg-20)]"
                            />
                            {query && (
                                <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-20)] hover:text-[var(--fg-50)]">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-lg border transition ${
                                    showFilters || segmentFilter !== "all" || equipmentFilter !== "all" || disciplineFilter !== "all"
                                        ? "border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-rgb))] bg-[rgb(var(--accent-rgb)/0.05)]"
                                        : "border-[var(--fg-06)] text-[var(--fg-30)] hover:text-[var(--fg-50)]"
                                }`}
                            >
                                <Filter size={11} /> FILTER
                                {(segmentFilter !== "all" || equipmentFilter !== "all" || disciplineFilter !== "all") && (
                                    <span className="w-4 h-4 rounded-full bg-[rgb(var(--accent-rgb))] text-black text-[8px] font-bold flex items-center justify-center">
                                        {(segmentFilter !== "all" ? 1 : 0) + (equipmentFilter !== "all" ? 1 : 0) + (disciplineFilter !== "all" ? 1 : 0)}
                                    </span>
                                )}
                            </button>
                            <span className="text-[10px] font-mono text-[var(--fg-20)]">{filtered.length} exercises</span>
                            {(segmentFilter !== "all" || equipmentFilter !== "all" || disciplineFilter !== "all") && (
                                <button onClick={() => { setSegmentFilter("all"); setEquipmentFilter("all"); setDisciplineFilter("all"); }} className="text-[9px] font-mono text-[var(--fg-25)] hover:text-[var(--fg-50)] transition">
                                    Clear all
                                </button>
                            )}
                        </div>

                        {showFilters && (
                            <div className="space-y-3 rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-3">
                                <div>
                                    <p className="text-[8px] font-mono text-[var(--fg-25)] tracking-widest mb-1.5">MUSCLE GROUP</p>
                                    <div className="flex flex-wrap gap-1">
                                        <button onClick={() => setSegmentFilter("all")}
                                            className={`text-[9px] font-mono px-2 py-1 rounded-md border transition ${segmentFilter === "all" ? "border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-rgb))] bg-[rgb(var(--accent-rgb)/0.08)]" : "border-[var(--fg-06)] text-[var(--fg-30)]"}`}>
                                            All
                                        </button>
                                        {segments.map((s) => (
                                            <button key={s} onClick={() => setSegmentFilter(s === segmentFilter ? "all" : s)}
                                                className={`text-[9px] font-mono px-2 py-1 rounded-md border transition ${segmentFilter === s ? "border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-rgb))] bg-[rgb(var(--accent-rgb)/0.08)]" : "border-[var(--fg-06)] text-[var(--fg-30)]"}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[8px] font-mono text-[var(--fg-25)] tracking-widest mb-1.5">EQUIPMENT</p>
                                    <div className="flex flex-wrap gap-1">
                                        <button onClick={() => setEquipmentFilter("all")}
                                            className={`text-[9px] font-mono px-2 py-1 rounded-md border transition ${equipmentFilter === "all" ? "border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-rgb))] bg-[rgb(var(--accent-rgb)/0.08)]" : "border-[var(--fg-06)] text-[var(--fg-30)]"}`}>
                                            All
                                        </button>
                                        {equipmentTypes.map((eq) => (
                                            <button key={eq} onClick={() => setEquipmentFilter(eq === equipmentFilter ? "all" : eq)}
                                                className={`text-[9px] font-mono px-2 py-1 rounded-md border transition ${equipmentFilter === eq ? "border-[rgb(var(--accent-rgb)/0.3)] text-[rgb(var(--accent-rgb))] bg-[rgb(var(--accent-rgb)/0.08)]" : "border-[var(--fg-06)] text-[var(--fg-30)]"}`}>
                                                {eq}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Grouped exercise list */}
                        <div className="space-y-2">
                            {grouped.map(({ segment, items }) => {
                                const isOpen = openGroups.has(segment);
                                const color = SEGMENT_COLORS[segment] || SEGMENT_COLORS.Other;
                                return (
                                    <div key={segment} className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] overflow-hidden">
                                        <button
                                            onClick={() => toggleGroup(segment)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--fg-03)] transition"
                                        >
                                            <div className="w-1 h-6 rounded-full" style={{ background: `rgb(${color})` }} />
                                            <span className="text-sm font-medium text-[var(--fg-80)] flex-1 text-left">{segment}</span>
                                            <span className="text-[10px] font-mono text-[var(--fg-25)]">{items.length}</span>
                                            {isOpen ? <ChevronDown size={14} className="text-[var(--fg-25)]" /> : <ChevronRight size={14} className="text-[var(--fg-25)]" />}
                                        </button>
                                        {isOpen && (
                                            <div className="border-t border-[var(--fg-04)]">
                                                {items.map((ex) => (
                                                    <button
                                                        key={ex.id}
                                                        onClick={() => setDetailEx(ex)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--fg-03)] transition border-b border-[var(--fg-03)] last:border-b-0"
                                                    >
                                                        {ex.image_url ? (
                                                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-[var(--fg-06)] shrink-0">
                                                                <img src={ex.image_url} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-06)] flex items-center justify-center shrink-0">
                                                                <Dumbbell size={12} className="text-[var(--fg-15)]" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <p className="text-[13px] font-medium text-[var(--fg-80)] truncate">{ex.name}</p>
                                                            <p className="text-[9px] font-mono text-[var(--fg-25)]">{ex.equipment} · {ex.primary_muscle}</p>
                                                        </div>
                                                        <ChevronRight size={13} className="shrink-0 text-[var(--fg-15)]" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {filtered.length === 0 && (
                            <div className="text-center py-12">
                                <Dumbbell size={24} className="mx-auto text-[var(--fg-10)] mb-2" />
                                <p className="text-sm text-[var(--fg-30)]">No exercises found</p>
                                <p className="text-[10px] text-[var(--fg-20)] mt-1">Try adjusting your search or filters</p>
                            </div>
                        )}
                    </>
                )}

                {/* ═══ PLANS TAB ═══ */}
                {tab === "plans" && (
                    <>
                        {/* Quick-start templates */}
                        <div>
                            <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-2">QUICK-START TEMPLATES</p>
                            <div className="space-y-2">
                                {QUICK_START_TEMPLATES.map((t) => (
                                    <div key={t.key} className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4 hover:bg-[var(--fg-04)] transition">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[var(--fg-85)]">{t.name}</p>
                                                <p className="text-[10px] font-mono text-[var(--fg-30)] mt-0.5">{t.daysPerWeek} days/week</p>
                                                <p className="text-[10px] text-[var(--fg-25)] mt-1 leading-relaxed">{t.muscleCoverage}</p>
                                            </div>
                                            <div className="shrink-0 w-10 h-10 rounded-lg bg-[rgb(var(--accent-rgb)/0.08)] border border-[rgb(var(--accent-rgb)/0.15)] flex items-center justify-center">
                                                <Zap size={16} className="text-[rgb(var(--accent-rgb))]" />
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-[var(--fg-04)]">
                                            <div className="flex flex-wrap gap-1">
                                                {t.days.map((d, i) => (
                                                    <span key={i} className="text-[8px] font-mono px-2 py-0.5 rounded-full border border-[var(--fg-06)] text-[var(--fg-30)] bg-[var(--fg-02)]">
                                                        {d.dayName}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Browse plans button */}
                        <button
                            onClick={() => setShowPlanBrowser(true)}
                            className="w-full flex items-center justify-center gap-2 text-sm font-medium py-3.5 rounded-xl border border-[rgb(var(--accent-rgb)/0.2)] bg-[rgb(var(--accent-rgb)/0.05)] text-[rgb(var(--accent-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.1)] transition"
                        >
                            <BookOpen size={16} /> Browse All Plans
                        </button>
                    </>
                )}
            </div>

            {/* Modals */}
            {detailEx && (
                <ExerciseDetailSheet
                    exerciseId={detailEx.id}
                    exerciseName={detailEx.name}
                    equipment={detailEx.equipment}
                    bodySegment={detailEx.body_segment}
                    weightUnit={weightUnit}
                    userSex={userSex}
                    imageUrl={detailEx.image_url}
                    onClose={() => setDetailEx(null)}
                />
            )}
            <PlanBrowserModal
                open={showPlanBrowser}
                onClose={() => setShowPlanBrowser(false)}
                onImport={() => {}}
                importing={false}
                userSex={userSex}
            />
        </main>
    );
}
