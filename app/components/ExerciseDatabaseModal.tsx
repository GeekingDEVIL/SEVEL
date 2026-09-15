"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import CubeLoader from "./ui/cube-loader";

type Exercise = {
    id: string;
    name: string;
    body_segment: string;
    primary_muscle: string;
    secondary_muscles: string[];
    movement_pattern: string;
    equipment: string;
    equipment_type: string;
    category: string;
    difficulty: string;
    is_unilateral: boolean;
    per_side_weight: boolean;
    instructions: string | null;
    tracking_method: string | null;
    image_url: string | null;
    created_by?: string | null;
};

export default function ExerciseDatabaseModal({ onClose }: { onClose: () => void }) {
    const [mounted, setMounted] = useState(false);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState("");
    const [segmentFilter, setSegmentFilter] = useState<string>("all");
    const [equipmentFilter, setEquipmentFilter] = useState<string>("all");
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

    useEffect(() => {
        setMounted(true);
        async function load() {
            const { data } = await supabase.from("exercises").select("*").order("name");
            setExercises((data as Exercise[]) ?? []);
            setLoading(false);
        }
        load();
    }, []);

    const segments = useMemo(() => Array.from(new Set(exercises.map((ex) => ex.body_segment || "Other"))).sort(), [exercises]);
    const equipmentTypes = useMemo(() => Array.from(new Set(exercises.map((ex) => ex.equipment).filter(Boolean))).sort(), [exercises]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return exercises.filter((ex) => {
            if (segmentFilter !== "all" && (ex.body_segment || "Other") !== segmentFilter) return false;
            if (equipmentFilter !== "all" && ex.equipment !== equipmentFilter) return false;
            if (q && !(ex.name.toLowerCase().includes(q) || ex.primary_muscle.toLowerCase().includes(q) || ex.equipment.toLowerCase().includes(q))) return false;
            return true;
        });
    }, [exercises, query, segmentFilter, equipmentFilter]);

    const activeFilterCount = (segmentFilter !== "all" ? 1 : 0) + (equipmentFilter !== "all" ? 1 : 0);

    const grouped = useMemo(() => {
        const map: Record<string, Exercise[]> = {};
        filtered.forEach((ex) => {
            const key = ex.body_segment || "Other";
            if (!map[key]) map[key] = [];
            map[key].push(ex);
        });
        return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filtered]);

    // Auto-expand groups while actively searching or narrowed to a single segment, so results are visible without extra taps.
    useEffect(() => {
        if (query.trim() || segmentFilter !== "all" || equipmentFilter !== "all") {
            setOpenGroups(new Set(grouped.map(([name]) => name)));
        }
    }, [query, segmentFilter, equipmentFilter, grouped]);

    function toggleGroup(name: string) {
        setOpenGroups((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    }

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={selectedExercise ? () => setSelectedExercise(null) : onClose} />
            <div className="relative w-full max-w-lg max-h-[94vh] bg-[var(--bg-card)] border border-[var(--fg-08)] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">

                {!selectedExercise ? (
                    <>
                        {/* Header */}
                        <div className="px-5 pt-5 pb-3 shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h2 className="text-lg font-bold text-[var(--fg-90)]">Exercise Database</h2>
                                    <p className="text-[10px] font-mono text-[var(--fg-30)] mt-0.5">{filtered.length} exercises</p>
                                </div>
                                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[var(--fg-08)] text-[var(--fg-35)] hover:text-[var(--fg-70)] transition">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-25)]" />
                                <input
                                    type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search exercises, muscles, equipment..."
                                    className="w-full rounded-xl bg-[var(--fg-03)] border border-[var(--fg-06)] pl-9 pr-4 py-2.5 text-sm text-[var(--fg-80)] placeholder:text-[var(--fg-20)] focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.3)]"
                                />
                            </div>

                            {/* Quick filter chips */}
                            <div className="flex gap-1.5 flex-wrap mt-2.5">
                                <button
                                    onClick={() => setSegmentFilter("all")}
                                    className={`text-[9px] font-mono px-2.5 py-1 rounded-full border transition ${segmentFilter === "all" ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-08)] text-[var(--fg-30)] hover:text-[var(--fg-55)]"}`}
                                >
                                    ALL
                                </button>
                                {segments.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setSegmentFilter(segmentFilter === s ? "all" : s)}
                                        className={`text-[9px] font-mono px-2.5 py-1 rounded-full border transition ${segmentFilter === s ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))]" : "border-[var(--fg-08)] text-[var(--fg-30)] hover:text-[var(--fg-55)]"}`}
                                    >
                                        {s.toUpperCase()}
                                    </button>
                                ))}
                                {equipmentTypes.length > 1 && (
                                    <select
                                        value={equipmentFilter}
                                        onChange={(e) => setEquipmentFilter(e.target.value)}
                                        className="text-[9px] font-mono px-2 py-1 rounded-full border border-[var(--fg-08)] bg-[var(--fg-02)] text-[var(--fg-40)] focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)]"
                                    >
                                        <option value="all">ANY EQUIPMENT</option>
                                        {equipmentTypes.map((eq) => (
                                            <option key={eq} value={eq}>{eq}</option>
                                        ))}
                                    </select>
                                )}
                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={() => { setSegmentFilter("all"); setEquipmentFilter("all"); }}
                                        className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 text-[var(--fg-25)] hover:text-[var(--fg-50)] transition"
                                    >
                                        <X size={9} /> Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-[var(--fg-04)]" />

                        {/* List */}
                        <div className="flex-1 overflow-y-auto custom-scroll px-4 py-3">
                            {loading ? (
                                <CubeLoader message="Loading exercises…" />
                            ) : grouped.length === 0 ? (
                                <div className="text-center py-16">
                                    <Search size={24} className="mx-auto mb-3 text-[var(--fg-15)]" />
                                    <p className="text-sm font-semibold text-[var(--fg-25)]">No Exercises Found</p>
                                    <p className="text-xs text-[var(--fg-20)] mt-1">Try a different search or filter.</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {grouped.map(([groupName, items]) => {
                                        const isOpen = openGroups.has(groupName);
                                        return (
                                            <div key={groupName} className="rounded-xl border border-[var(--fg-05)] bg-[var(--fg-01)] overflow-hidden">
                                                <button
                                                    onClick={() => toggleGroup(groupName)}
                                                    className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-[var(--fg-02)] transition"
                                                >
                                                    <span className="text-[11px] font-bold tracking-wider text-[var(--fg-60)]">{groupName.toUpperCase()}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-mono text-[var(--fg-20)]">{items.length}</span>
                                                        <ChevronDown size={13} className={`text-[var(--fg-25)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                                    </div>
                                                </button>
                                                {isOpen && (
                                                    <div className="border-t border-[var(--fg-04)]">
                                                        {items.map((ex) => (
                                                            <button
                                                                key={ex.id}
                                                                onClick={() => setSelectedExercise(ex)}
                                                                className="w-full flex items-center gap-3 text-left px-3.5 py-2.5 border-b border-[var(--fg-03)] last:border-b-0 hover:bg-[var(--fg-02)] transition group"
                                                            >
                                                                {ex.image_url ? (
                                                                    <img src={ex.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-[var(--fg-06)]" />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-lg shrink-0 bg-[var(--fg-03)] border border-[var(--fg-06)]" />
                                                                )}
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <p className="text-[13px] font-medium text-[var(--fg-80)] truncate">{ex.name}</p>
                                                                        {ex.created_by && <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-emerald-400/10 text-emerald-300 border-emerald-400/20 shrink-0">CUSTOM</span>}
                                                                    </div>
                                                                    <p className="text-[9px] font-mono text-[var(--fg-30)] mt-0.5">
                                                                        {ex.primary_muscle} · {ex.equipment}
                                                                    </p>
                                                                </div>
                                                                <ChevronRight size={13} className="text-[var(--fg-10)] group-hover:text-[var(--fg-30)] transition shrink-0" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* ─── Exercise Detail ─── */
                    <>
                        <div className="px-5 pt-5 pb-4 shrink-0">
                            <button onClick={() => setSelectedExercise(null)} className="flex items-center gap-1 text-[10px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] transition mb-3">
                                <ChevronDown size={12} className="rotate-90" /> BACK
                            </button>
                            <div className="flex items-start gap-3">
                                {selectedExercise.image_url ? (
                                    <img src={selectedExercise.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[var(--fg-08)]" />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl shrink-0 bg-[var(--fg-03)] border border-[var(--fg-08)]" />
                                )}
                                <div className="min-w-0">
                                    <h2 className="text-base font-bold text-[var(--fg-90)] leading-tight">{selectedExercise.name}</h2>
                                    <p className="text-[10px] font-mono text-[var(--fg-35)] mt-1">{selectedExercise.primary_muscle} · {selectedExercise.equipment} · {selectedExercise.difficulty}</p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-[var(--fg-04)]" />

                        <div className="flex-1 overflow-y-auto custom-scroll px-5 py-4 space-y-4">
                            {selectedExercise.image_url && (
                                <img src={selectedExercise.image_url} alt={selectedExercise.name} className="w-full max-w-xs rounded-xl border border-[var(--fg-06)]" />
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    ["MOVEMENT", selectedExercise.movement_pattern],
                                    ["DIFFICULTY", selectedExercise.difficulty],
                                    ["EQUIPMENT", selectedExercise.equipment_type],
                                    ["CATEGORY", selectedExercise.category],
                                    ["TRACKING", selectedExercise.tracking_method || "Weight × Reps"],
                                    ["UNILATERAL", selectedExercise.is_unilateral ? "Yes" : "No"],
                                ].map(([label, value]) => (
                                    <div key={label as string} className="rounded-lg border border-[var(--fg-05)] bg-[var(--fg-02)] p-2.5">
                                        <p className="text-[8px] font-mono text-[var(--fg-25)]">{label}</p>
                                        <p className="text-[11px] font-medium text-[var(--fg-65)] mt-0.5">{(value as string) || "—"}</p>
                                    </div>
                                ))}
                            </div>

                            {selectedExercise.secondary_muscles?.length > 0 && (
                                <div>
                                    <p className="text-[9px] font-mono text-[var(--fg-25)] mb-1.5">SECONDARY MUSCLES</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedExercise.secondary_muscles.map((m) => (
                                            <span key={m} className="text-[9px] font-mono px-2.5 py-1 rounded-lg bg-[var(--fg-03)] border border-[var(--fg-06)] text-[var(--fg-40)]">{m}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedExercise.instructions ? (
                                <div>
                                    <p className="text-[9px] font-mono text-[var(--fg-25)] mb-1.5">INSTRUCTIONS</p>
                                    <p className="text-[11px] text-[var(--fg-50)] leading-relaxed whitespace-pre-line">{selectedExercise.instructions}</p>
                                </div>
                            ) : (
                                <p className="text-[9px] font-mono text-[var(--fg-15)] italic">No instructions added yet.</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
