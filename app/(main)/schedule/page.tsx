"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, GripVertical, Pencil, Database, Play, Moon, Flame, PersonStanding, ChevronDown, ChevronUp, X, Dumbbell, BarChart3, BookOpen, Copy, RefreshCw, ChevronRight, Swords } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { DndContext, closestCenter, PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "../../lib/supabase";
import { analyzeAdaptiveVolume, getVolumeStatus, getVolumeGuidelines, type AdaptiveVolumeData, type MuscleTrend } from "../../lib/volumeAnalysis";
import { analyzeRecovery, type MuscleRecoveryData } from "../../lib/muscleRecovery";
import type { Sex } from "../../lib/calorieEngine";
import { useSex } from "../../lib/useSex";
import { useUnits } from "../../lib/useUnits";
import { kgToUnit } from "../../lib/units";
import { QUICK_START_TEMPLATES, type QuickStartTemplate } from "../../lib/quickStartTemplates";
import { useAuth } from "../../lib/AuthProvider";
import AddExerciseModal from "../../components/AddExerciseModal";
import ExerciseDatabaseModal from "../../components/ExerciseDatabaseModal";
import MusclePickerModal from "../../components/MusclePickerModal";
import PlanBrowserModal from "../../components/PlanBrowserModal";
import ExerciseDetailSheet from "../../components/ExerciseDetailSheet";
import type { WorkoutPlan } from "../../lib/planLibrary";
import { DISCIPLINES, SESSION_TYPE_LABELS, PHASE1_DISCIPLINES, getSessionTypesForDiscipline, type DisciplineId, type SessionType } from "../../lib/martialArtsEngine";

type LocalExercise = {
    id: string;
    isNew: boolean;
    exercise_id: string;
    name: string;
    body_segment: string;
    isCardio: boolean;
    equipment: string;
    is_unilateral: boolean;
    per_side_weight: boolean;
    image_url: string | null;
    target_sets: number;
    target_reps: string;
    target_weight: number | null;
    rest_seconds: number | null;
    notes: string;
    target_duration_minutes: number | null;
    target_incline: number | null;
    target_speed: number | null;
};

function isDualWeightEx(ex: LocalExercise): boolean {
    if (ex.isCardio || ex.equipment.toLowerCase() === "bodyweight") return false;
    return ex.per_side_weight;
}

type RecurringPlan = {
    template_id: string | null; is_rest: boolean; template_name: string; exercise_count: number; muscles: string[];
    session_type: "gym" | "ma"; ma_discipline: DisciplineId | null; ma_session_type: SessionType | null;
};

const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function getWeekDates(offset: number) {
    const today = new Date();
    const current = new Date(today);
    current.setDate(today.getDate() + offset * 7);
    const day = current.getDay();
    const monday = new Date(current);
    monday.setDate(current.getDate() - ((day + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function toDateString(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mapExerciseRow(row: any): LocalExercise {
    const segment = row.exercises?.body_segment ?? "Other";
    const equip = row.exercises?.equipment ?? "Other";
    return {
        id: row.id, isNew: false, exercise_id: row.exercise_id,
        name: row.exercises?.name ?? "Unknown", body_segment: segment,
        isCardio: segment === "Cardio",
        equipment: equip, is_unilateral: row.exercises?.is_unilateral ?? false, per_side_weight: row.exercises?.per_side_weight ?? false,
        image_url: row.exercises?.image_url ?? null,
        target_sets: row.target_sets ?? 1, target_reps: row.target_reps ?? "",
        target_weight: row.target_weight ?? null, rest_seconds: row.rest_seconds ?? null,
        notes: row.notes ?? "",
        target_duration_minutes: row.target_duration_minutes ?? null,
        target_incline: row.target_incline ?? null, target_speed: row.target_speed ?? null,
    };
}

function groupExercisesBySegment(list: LocalExercise[]) {
    const groups: { label: string; items: LocalExercise[] }[] = [];
    let currentLabel: string | null = null;
    for (const ex of list) {
        const label = ex.body_segment === "Cardio" ? "Finisher" : ex.body_segment || "Other";
        if (label !== currentLabel) { groups.push({ label, items: [] }); currentLabel = label; }
        groups[groups.length - 1].items.push(ex);
    }
    return groups;
}

function SetsStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
        <div className="flex items-center gap-1 rounded-md border border-[rgb(var(--accent-rgb)/0.2)] bg-[var(--fg-03)] px-1 shrink-0">
            <button onClick={() => onChange(Math.max(1, value - 1))} className="w-6 h-7 flex items-center justify-center text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.1)] rounded">−</button>
            <span className="w-5 text-center text-sm font-bold">{value}</span>
            <button onClick={() => onChange(value + 1)} className="w-6 h-7 flex items-center justify-center text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.1)] rounded">+</button>
        </div>
    );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="text-center py-12">
            <div className="w-9 h-9 mx-auto mb-3 rotate-45 border-2 border-[var(--fg-15)] rounded-sm" />
            <p className="text-sm font-bold tracking-widest text-[var(--fg-30)]">{title}</p>
            <p className="text-xs text-[var(--fg-20)] mt-1">{subtitle}</p>
        </div>
    );
}

function ExerciseThumb({ ex }: { ex: LocalExercise }) {
    if (ex.image_url) {
        return (
            <div className="w-9 h-9 rounded-lg overflow-hidden border border-[var(--fg-06)] shrink-0">
                <img src={ex.image_url} alt="" className="w-full h-full object-cover" />
            </div>
        );
    }
    return (
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--fg-04)] border border-[var(--fg-06)] shrink-0">
            <Dumbbell size={14} className="text-[var(--fg-20)]" />
        </div>
    );
}

function ReadOnlyRow({ ex, onDetail }: { ex: LocalExercise; onDetail?: (ex: LocalExercise) => void }) {
    const wu = useUnits();
    const dualWt = isDualWeightEx(ex);
    return (
        <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-3">
            <div className="flex items-start gap-2.5">
                <div className="cursor-pointer" onClick={() => onDetail?.(ex)}><ExerciseThumb ex={ex} /></div>
                <div className="flex-1 min-w-0">
                    <button onClick={() => onDetail?.(ex)} className="text-[13px] font-medium text-[rgb(var(--accent-light-rgb))] text-left inline-flex items-center gap-1 rounded-md px-1 py-0.5 -mx-1 -my-0.5 active:bg-[rgb(var(--accent-rgb)/0.08)] transition">
                        {ex.name}
                        <ChevronRight size={11} className="shrink-0 opacity-50" />
                    </button>
                    <p className="text-[9px] font-mono text-[var(--fg-30)] mt-0.5">{ex.body_segment}{ex.equipment && ex.equipment !== "Other" ? ` · ${ex.equipment}` : ""}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                {ex.isCardio ? (
                    <>
                        {ex.target_duration_minutes != null && <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-[var(--fg-04)] text-[var(--fg-60)]">{ex.target_duration_minutes} min</span>}
                        {ex.target_incline != null && <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-[var(--fg-04)] text-[var(--fg-60)]">{ex.target_incline}% incline</span>}
                        {ex.target_speed != null && <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-[var(--fg-04)] text-[var(--fg-60)]">{ex.target_speed} km/h</span>}
                    </>
                ) : (
                    <>
                        <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-[var(--fg-04)] text-[var(--fg-60)]">{ex.target_sets} sets</span>
                        <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-[var(--fg-04)] text-[var(--fg-60)]">{ex.target_reps} reps</span>
                        {ex.target_weight != null && (
                            <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-[var(--fg-04)] text-[var(--fg-60)]">
                                {Math.round(kgToUnit(ex.target_weight, wu))} {wu}{dualWt ? " /side" : ""}
                            </span>
                        )}
                        {ex.rest_seconds != null && <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-[var(--fg-04)] text-[var(--fg-40)]">{ex.rest_seconds}s rest</span>}
                    </>
                )}
            </div>
            {ex.notes && <p className="text-[10px] italic text-[var(--fg-30)] mt-2 ml-0.5">{ex.notes}</p>}
        </div>
    );
}

function SortableRow({ ex, onUpdate, onRemove, onSwap, onDetail }: { ex: LocalExercise; onUpdate: (id: string, patch: Partial<LocalExercise>) => void; onRemove: (id: string) => void; onSwap: (ex: LocalExercise) => void; onDetail: (ex: LocalExercise) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
    const swu = useUnits();
    const dualWt = isDualWeightEx(ex);
    const inputCls = "w-full rounded-md bg-[var(--fg-03)] border border-[var(--fg-10)] text-center text-sm py-1.5 focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.5)]";
    return (
        <div ref={setNodeRef} style={style} className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)]">
            {/* Row 1: drag + image + name + equipment + actions */}
            <div className="flex items-start gap-2 px-3 pt-3 pb-1">
                <button {...attributes} {...listeners} className="text-[var(--fg-20)] hover:text-[rgb(var(--accent-light-rgb))] cursor-grab active:cursor-grabbing shrink-0 touch-none mt-1.5"><GripVertical size={14} /></button>
                <div className="cursor-pointer mt-0.5" onClick={() => onDetail(ex)}><ExerciseThumb ex={ex} /></div>
                <div className="flex-1 min-w-0">
                    <button onClick={() => onDetail(ex)} className="text-[13px] font-medium text-[rgb(var(--accent-light-rgb))] text-left inline-flex items-center gap-1 rounded-md px-1 py-0.5 -mx-1 -my-0.5 active:bg-[rgb(var(--accent-rgb)/0.08)] transition">
                        {ex.name}
                        <ChevronRight size={11} className="shrink-0 opacity-50" />
                    </button>
                    <p className="text-[9px] font-mono text-[var(--fg-30)] mt-0.5">{ex.body_segment}{ex.equipment && ex.equipment !== "Other" ? ` · ${ex.equipment}` : ""}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-1">
                    <button onClick={() => onSwap(ex)} className="p-1.5 rounded-md text-[var(--fg-25)] hover:text-emerald-400 hover:bg-emerald-400/10 transition" title="Swap"><RefreshCw size={13} /></button>
                    <button onClick={() => onRemove(ex.id)} className="p-1.5 rounded-md text-[var(--fg-25)] hover:text-red-400 hover:bg-red-400/10 transition" title="Remove"><Trash2 size={13} /></button>
                </div>
            </div>

            {/* Row 2: inputs — always visible */}
            <div className="px-3 pb-3 pt-1">
                {ex.isCardio ? (
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-[8px] font-mono text-[var(--fg-30)]">MIN</label>
                            <input type="number" min="0" onWheel={(e) => (e.target as HTMLElement).blur()} inputMode="numeric" value={ex.target_duration_minutes ?? ""} onChange={(e) => onUpdate(ex.id, { target_duration_minutes: e.target.value ? Number(e.target.value) : null })} placeholder="—" className={inputCls} />
                        </div>
                        <div>
                            <label className="text-[8px] font-mono text-[var(--fg-30)]">INCLINE %</label>
                            <input type="number" min="0" onWheel={(e) => (e.target as HTMLElement).blur()} inputMode="decimal" value={ex.target_incline ?? ""} onChange={(e) => onUpdate(ex.id, { target_incline: e.target.value ? Number(e.target.value) : null })} placeholder="—" className={inputCls} />
                        </div>
                        <div>
                            <label className="text-[8px] font-mono text-[var(--fg-30)]">KM/H</label>
                            <input type="number" min="0" onWheel={(e) => (e.target as HTMLElement).blur()} inputMode="decimal" value={ex.target_speed ?? ""} onChange={(e) => onUpdate(ex.id, { target_speed: e.target.value ? Number(e.target.value) : null })} placeholder="—" className={inputCls} />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-2">
                        <div>
                            <label className="text-[8px] font-mono text-[var(--fg-30)]">SETS</label>
                            <SetsStepper value={ex.target_sets} onChange={(v) => onUpdate(ex.id, { target_sets: v })} />
                        </div>
                        <div>
                            <label className="text-[8px] font-mono text-[var(--fg-30)]">REPS</label>
                            <input type="text" value={ex.target_reps} onChange={(e) => onUpdate(ex.id, { target_reps: e.target.value })} placeholder="8-12" className={inputCls} />
                        </div>
                        <div className="relative">
                            <label className="text-[8px] font-mono text-[var(--fg-30)]">
                                {swu.toUpperCase()}{dualWt && <span className="text-[rgb(var(--accent-rgb))] font-bold ml-0.5">/SIDE</span>}
                            </label>
                            <input type="number" min="0" onWheel={(e) => (e.target as HTMLElement).blur()} inputMode="decimal" value={ex.target_weight ?? ""} onChange={(e) => onUpdate(ex.id, { target_weight: e.target.value ? Number(e.target.value) : null })} placeholder="—" className={inputCls} />
                        </div>
                        <div>
                            <label className="text-[8px] font-mono text-[var(--fg-30)]">REST</label>
                            <input type="number" min="0" onWheel={(e) => (e.target as HTMLElement).blur()} inputMode="numeric" value={ex.rest_seconds ?? ""} onChange={(e) => onUpdate(ex.id, { rest_seconds: e.target.value ? Number(e.target.value) : null })} placeholder="90" className={inputCls} />
                        </div>
                    </div>
                )}
                {/* Notes */}
                <input type="text" value={ex.notes} onChange={(e) => onUpdate(ex.id, { notes: e.target.value })} placeholder="Notes (optional)" className="w-full mt-2 rounded-md bg-transparent border border-[var(--fg-06)] px-2 text-[10px] font-mono py-1.5 text-[var(--fg-40)] placeholder:text-[var(--fg-15)] focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.3)]" />
            </div>
        </div>
    );
}

// ─── Day Editor Modal ────────────────────────────────────────────
function DayEditorModal({
    weekday, plan, onClose, onSaved,
    sensors, user, userSex, allPlans,
}: {
    weekday: number;
    plan: RecurringPlan | undefined;
    onClose: () => void;
    onSaved: () => void;
    sensors: ReturnType<typeof useSensors>;
    user: any;
    userSex: string;
    allPlans: Record<number, RecurringPlan>;
}) {
    const [title, setTitle] = useState(plan?.template_name || "");
    const [exercises, setExercises] = useState<LocalExercise[]>([]);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);
    const [isRest, setIsRest] = useState(plan?.is_rest ?? false);
    const [showCopyPicker, setShowCopyPicker] = useState(false);
    const [copying, setCopying] = useState(false);
    const [templateId, setTemplateId] = useState<string | null>(plan?.template_id ?? null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [editMode, setEditMode] = useState(!plan);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [swapTarget, setSwapTarget] = useState<LocalExercise | null>(null);
    const [detailExercise, setDetailExercise] = useState<LocalExercise | null>(null);
    const weightUnit = useUnits();

    const [planMode, setPlanMode] = useState<"gym" | "ma">(plan?.session_type ?? "gym");
    const [maDiscipline, setMaDiscipline] = useState<DisciplineId | null>(plan?.ma_discipline ?? null);
    const [maSessionType, setMaSessionType] = useState<SessionType | null>(plan?.ma_session_type ?? null);

    useEffect(() => {
        (async () => {
            if (plan?.template_id) {
                const { data: rows } = await supabase
                    .from("workout_template_exercises")
                    .select("id, order_index, target_sets, target_reps, target_weight, rest_seconds, notes, target_duration_minutes, target_incline, target_speed, exercise_id, exercises(name, body_segment, equipment, is_unilateral, per_side_weight, image_url)")
                    .eq("template_id", plan.template_id)
                    .order("order_index");
                setExercises((rows ?? []).map(mapExerciseRow));
            }
            setLoading(false);
        })();
    }, [plan]);

    function handleAdd(exercise: { id: string; name: string; body_segment?: string; equipment?: string; is_unilateral?: boolean; per_side_weight?: boolean; image_url?: string | null }) {
        const segment = exercise.body_segment || "Other";
        const cardio = segment === "Cardio";
        setExercises((prev) => {
            if (prev.some((e) => e.exercise_id === exercise.id)) return prev;
            return [...prev, {
                id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, isNew: true, exercise_id: exercise.id, name: exercise.name,
                body_segment: segment, isCardio: cardio,
                equipment: exercise.equipment ?? "Other", is_unilateral: exercise.is_unilateral ?? false, per_side_weight: exercise.per_side_weight ?? false,
                image_url: exercise.image_url ?? null,
                target_sets: cardio ? 1 : 3, target_reps: cardio ? "" : "8-10", target_weight: null, rest_seconds: cardio ? null : 90, notes: "",
                target_duration_minutes: cardio ? 10 : null, target_incline: null, target_speed: null,
            }];
        });
    }

    function handleRemove(id: string) {
        const item = exercises.find((e) => e.id === id);
        if (item && !item.isNew) setDeletedIds((prev) => [...prev, id]);
        setExercises((prev) => prev.filter((e) => e.id !== id));
    }

    function handleUpdate(id: string, patch: Partial<LocalExercise>) {
        setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setExercises((items) => {
            const oldIndex = items.findIndex((i) => i.id === active.id);
            const newIndex = items.findIndex((i) => i.id === over.id);
            return arrayMove(items, oldIndex, newIndex);
        });
    }

    function handleSwap(replacement: { id: string; name: string; body_segment?: string; equipment?: string; is_unilateral?: boolean; per_side_weight?: boolean; image_url?: string | null }) {
        if (!swapTarget) return;
        const segment = replacement.body_segment || "Other";
        const cardio = segment === "Cardio";
        setExercises((prev) => prev.map((e) => {
            if (e.id !== swapTarget.id) return e;
            const old = e;
            if (!old.isNew) setDeletedIds((d) => [...d, old.id]);
            return {
                id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, isNew: true, exercise_id: replacement.id, name: replacement.name,
                body_segment: segment, isCardio: cardio,
                equipment: replacement.equipment ?? "Other", is_unilateral: replacement.is_unilateral ?? false, per_side_weight: replacement.per_side_weight ?? false,
                image_url: replacement.image_url ?? null,
                target_sets: old.target_sets, target_reps: old.target_reps, target_weight: old.target_weight,
                rest_seconds: old.rest_seconds, notes: old.notes,
                target_duration_minutes: old.target_duration_minutes, target_incline: old.target_incline, target_speed: old.target_speed,
            };
        }));
        setSwapTarget(null);
    }

    async function handleSave() {
        if (!user) return;
        setSaving(true);

        if (isRest) {
            await supabase.from("recurring_plans").upsert(
                { user_id: user.id, weekday, template_id: null, is_rest: true, sex: userSex, session_type: "gym", ma_discipline: null, ma_session_type: null },
                { onConflict: "user_id,weekday,sex" }
            );
        } else if (planMode === "ma" && maDiscipline && maSessionType) {
            await supabase.from("recurring_plans").upsert(
                { user_id: user.id, weekday, template_id: null, is_rest: false, sex: userSex, session_type: "ma", ma_discipline: maDiscipline, ma_session_type: maSessionType },
                { onConflict: "user_id,weekday,sex" }
            );
        } else {
            const finalTitle = title.trim() || `${WEEKDAY_FULL[weekday]} Plan`;
            let tid = templateId;
            if (!tid) {
                const { data: created } = await supabase.from("workout_templates").insert({ user_id: user.id, name: finalTitle }).select().single();
                tid = created?.id ?? null;
                setTemplateId(tid);
            } else {
                await supabase.from("workout_templates").update({ name: finalTitle }).eq("id", tid);
            }
            if (!tid) { setSaving(false); return; }

            if (deletedIds.length) await supabase.from("workout_template_exercises").delete().in("id", deletedIds);

            for (let i = 0; i < exercises.length; i++) {
                const ex = exercises[i];
                if (ex.isNew) {
                    await supabase.from("workout_template_exercises").insert({
                        template_id: tid, user_id: user.id, exercise_id: ex.exercise_id, order_index: i,
                        target_sets: ex.target_sets, target_reps: ex.target_reps, target_weight: ex.target_weight,
                        rest_seconds: ex.rest_seconds, notes: ex.notes,
                        target_duration_minutes: ex.target_duration_minutes, target_incline: ex.target_incline, target_speed: ex.target_speed,
                    });
                } else {
                    await supabase.from("workout_template_exercises").update({
                        order_index: i, target_sets: ex.target_sets, target_reps: ex.target_reps,
                        target_weight: ex.target_weight, rest_seconds: ex.rest_seconds, notes: ex.notes,
                        target_duration_minutes: ex.target_duration_minutes, target_incline: ex.target_incline, target_speed: ex.target_speed,
                    }).eq("id", ex.id);
                }
            }

            await supabase.from("recurring_plans").upsert(
                { user_id: user.id, weekday, template_id: tid, is_rest: false, sex: userSex, session_type: "gym", ma_discipline: null, ma_session_type: null },
                { onConflict: "user_id,weekday,sex" }
            );
        }

        setSaving(false);
        setSaved(true);
        setTimeout(() => { onSaved(); onClose(); }, 400);
    }

    async function handleClear() {
        if (!user) return;
        if (!confirm(`Clear ${WEEKDAY_FULL[weekday]}'s plan?`)) return;
        await supabase.from("recurring_plans").delete().eq("user_id", user.id).eq("weekday", weekday).eq("sex", userSex);
        onSaved();
        onClose();
    }

    async function handleCopyFrom(sourceWeekday: number) {
        const sourcePlan = allPlans[sourceWeekday];
        if (!sourcePlan?.template_id) return;
        setCopying(true);
        const { data: rows } = await supabase
            .from("workout_template_exercises")
            .select("id, order_index, target_sets, target_reps, target_weight, rest_seconds, notes, target_duration_minutes, target_incline, target_speed, exercise_id, exercises(name, body_segment, equipment, is_unilateral, per_side_weight, image_url)")
            .eq("template_id", sourcePlan.template_id)
            .order("order_index");
        if (rows?.length) {
            setExercises(rows.map((r) => ({
                ...mapExerciseRow(r),
                id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}-${r.exercise_id}`,
                isNew: true,
            })));
            setDeletedIds((prev) => [...prev, ...exercises.filter((e) => !e.isNew).map((e) => e.id)]);
            setTitle(sourcePlan.template_name || title);
            setIsRest(false);
        }
        setCopying(false);
        setShowCopyPicker(false);
    }

    const copyableDays = WEEKDAY_ORDER.filter((wd) => wd !== weekday && allPlans[wd] && !allPlans[wd].is_rest && allPlans[wd].template_id);

    const hasContent = isRest || exercises.length > 0 || (planMode === "ma" && maDiscipline && maSessionType);
    const totalSets = exercises.reduce((sum, e) => sum + (e.target_sets || 0), 0);
    const existingIds = new Set(exercises.map((e) => e.exercise_id));

    const content = (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-xl max-h-[92vh] bg-[var(--bg-elevated)] border border-[rgb(var(--accent-rgb)/0.15)] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--fg-06)] shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-[var(--fg-90)]">{WEEKDAY_FULL[weekday]}</h2>
                        <p className="text-[10px] font-mono text-[var(--fg-35)] mt-0.5">
                            {isRest ? "Rest day" : planMode === "ma" && maDiscipline ? `${DISCIPLINES[maDiscipline]?.name} training` : plan ? `${exercises.length} exercises · ${totalSets} sets` : "No plan yet"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {plan && !editMode && (
                            <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-lg border border-[var(--fg-10)] text-[var(--fg-50)] hover:text-[var(--fg-80)] transition">
                                <Pencil size={11} /> EDIT
                            </button>
                        )}
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full border border-[var(--fg-10)] text-[var(--fg-40)] hover:text-[var(--fg-80)] transition">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scroll px-5 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[rgb(var(--accent-rgb)/0.4)] border-t-[rgb(var(--accent-rgb))] rounded-full animate-spin" /></div>
                    ) : !editMode ? (
                        isRest ? (
                            <EmptyState title="REST DAY" subtitle="Recovery is part of the plan." />
                        ) : planMode === "ma" && maDiscipline && maSessionType ? (() => {
                            const d = DISCIPLINES[maDiscipline];
                            const st = SESSION_TYPE_LABELS[maSessionType];
                            return (
                                <div className="space-y-4">
                                    <div className="rounded-2xl border p-5 text-center" style={{ borderColor: `rgb(${d.colorRgb} / 0.15)`, background: `rgb(${d.colorRgb} / 0.04)` }}>
                                        <span className="text-3xl block mb-2">{d.emoji}</span>
                                        <p className="text-base font-bold" style={{ color: `rgb(${d.colorRgb})` }}>{d.name}</p>
                                        <p className="text-[11px] text-[var(--fg-40)] mt-1">{st.emoji} {st.name}</p>
                                        <p className="text-[10px] text-[var(--fg-25)] mt-2">{st.description}</p>
                                        <div className="flex items-center justify-center gap-3 mt-3">
                                            <span className="text-[9px] font-mono px-2 py-1 rounded-full bg-[var(--fg-04)] text-[var(--fg-35)]">~{st.suggestedMin} min</span>
                                            <span className="text-[9px] font-mono px-2 py-1 rounded-full bg-[var(--fg-04)] text-[var(--fg-35)]">{st.difficulty}</span>
                                            <span className="text-[9px] font-mono px-2 py-1 rounded-full bg-[var(--fg-04)] text-[var(--fg-35)]">{st.equipment}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => { window.location.href = "/martial-arts"; }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition" style={{ borderColor: `rgb(${d.colorRgb} / 0.3)`, color: `rgb(${d.colorRgb})` }}>
                                        <Play size={14} /> Start Training
                                    </button>
                                </div>
                            );
                        })() : exercises.length === 0 ? (
                            <EmptyState title="NO EXERCISES" subtitle="Tap Edit to add exercises." />
                        ) : (
                            <div className="space-y-4">
                                {plan?.template_name && <p className="text-base font-bold text-[var(--fg-90)] mb-1">{plan.template_name}</p>}
                                {groupExercisesBySegment(exercises).map((group, gi) => (
                                    <div key={`${group.label}-${gi}`}>
                                        <p className="text-[10px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)] mb-2">{group.label.toUpperCase()}</p>
                                        <div className="space-y-1.5">
                                            {group.items.map((ex) => <ReadOnlyRow key={ex.id} ex={ex} onDetail={(e) => setDetailExercise(e)} />)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <>
                            {/* Edit Mode Controls */}
                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                <button
                                    onClick={() => setIsRest((v) => !v)}
                                    className={`flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-lg border transition ${isRest ? "border-orange-400/50 bg-orange-400/15 text-orange-200" : "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"}`}
                                >
                                    {isRest ? <><Flame size={12} /> MAKE TRAINING DAY</> : <><Moon size={12} /> MARK AS REST</>}
                                </button>
                                {plan && (
                                    <button onClick={handleClear} className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-lg border border-red-400/20 text-red-400/60 hover:text-red-400 transition">
                                        <Trash2 size={11} /> CLEAR
                                    </button>
                                )}
                                {copyableDays.length > 0 && planMode === "gym" && (
                                    <button
                                        onClick={() => setShowCopyPicker((v) => !v)}
                                        className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.08)] text-[rgb(var(--accent-light-rgb)/0.7)] hover:text-[rgb(var(--accent-light-rgb))] transition ml-auto"
                                    >
                                        <Copy size={11} /> COPY FROM…
                                    </button>
                                )}
                            </div>

                            {/* Gym / MA toggle */}
                            {!isRest && (
                                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--fg-03)] border border-[var(--fg-06)] mb-4">
                                    <button onClick={() => setPlanMode("gym")} className={`py-2 rounded-lg text-[10px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition ${planMode === "gym" ? "bg-[rgb(var(--accent-rgb)/0.15)] text-[rgb(var(--accent-light-rgb))] border border-[rgb(var(--accent-rgb)/0.3)]" : "text-[var(--fg-40)] hover:text-[var(--fg-60)] border border-transparent"}`}>
                                        <Dumbbell size={12} /> GYM
                                    </button>
                                    <button onClick={() => setPlanMode("ma")} className={`py-2 rounded-lg text-[10px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition ${planMode === "ma" ? "bg-[rgb(var(--accent-rgb)/0.15)] text-[rgb(var(--accent-light-rgb))] border border-[rgb(var(--accent-rgb)/0.3)]" : "text-[var(--fg-40)] hover:text-[var(--fg-60)] border border-transparent"}`}>
                                        <Swords size={12} /> MARTIAL ARTS
                                    </button>
                                </div>
                            )}

                            {showCopyPicker && (
                                <div className="mb-4 p-3 rounded-xl border border-[rgb(var(--accent-rgb)/0.2)] bg-[rgb(var(--accent-rgb)/0.04)]">
                                    <p className="text-[10px] font-mono text-[var(--fg-40)] mb-2.5">COPY PLAN FROM</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {copyableDays.map((wd) => (
                                            <button
                                                key={wd}
                                                disabled={copying}
                                                onClick={() => handleCopyFrom(wd)}
                                                className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-[var(--fg-08)] bg-[var(--fg-02)] hover:border-[rgb(var(--accent-rgb)/0.4)] hover:bg-[rgb(var(--accent-rgb)/0.06)] transition text-center disabled:opacity-40"
                                            >
                                                <span className="text-xs font-bold text-[var(--fg-70)]">{WEEKDAY_LABELS[wd]}</span>
                                                <span className="text-[9px] font-mono text-[var(--fg-30)] truncate max-w-full">{allPlans[wd]?.template_name || "Plan"}</span>
                                                <span className="text-[8px] font-mono text-[var(--fg-20)]">{allPlans[wd]?.exercise_count} ex</span>
                                            </button>
                                        ))}
                                    </div>
                                    {copying && <p className="text-[10px] font-mono text-[rgb(var(--accent-light-rgb)/0.6)] mt-2 text-center">Copying…</p>}
                                </div>
                            )}

                            {isRest ? (
                                <EmptyState title="REST DAY" subtitle="Every future occurrence stays a rest day." />
                            ) : planMode === "ma" ? (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-mono tracking-widest text-[var(--fg-40)]">CHOOSE DISCIPLINE</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PHASE1_DISCIPLINES.map((did) => {
                                            const d = DISCIPLINES[did];
                                            const selected = maDiscipline === did;
                                            return (
                                                <button key={did} onClick={() => { setMaDiscipline(did); setMaSessionType(null); }}
                                                    className={`rounded-xl border p-3 text-left transition active:scale-[0.97] ${selected ? "ring-1" : "hover:border-[var(--fg-15)]"}`}
                                                    style={selected ? { borderColor: `rgb(${d.colorRgb} / 0.4)`, background: `rgb(${d.colorRgb} / 0.06)`, boxShadow: `0 0 12px -4px rgb(${d.colorRgb} / 0.3)` } : { borderColor: "rgb(var(--fg-06))" }}
                                                >
                                                    <span className="text-lg">{d.emoji}</span>
                                                    <p className="text-xs font-bold mt-1" style={selected ? { color: `rgb(${d.colorRgb})` } : { color: "var(--fg-70)" }}>{d.name}</p>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {maDiscipline && (() => {
                                        const d = DISCIPLINES[maDiscipline];
                                        const types = getSessionTypesForDiscipline(maDiscipline);
                                        return (
                                            <>
                                                <p className="text-[10px] font-mono tracking-widest text-[var(--fg-40)] mt-2">SESSION TYPE</p>
                                                <div className="space-y-1.5">
                                                    {types.map((st) => {
                                                        const info = SESSION_TYPE_LABELS[st];
                                                        const selected = maSessionType === st;
                                                        return (
                                                            <button key={st} onClick={() => setMaSessionType(st)}
                                                                className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition active:scale-[0.98] ${selected ? "ring-1" : "hover:border-[var(--fg-15)]"}`}
                                                                style={selected ? { borderColor: `rgb(${d.colorRgb} / 0.4)`, background: `rgb(${d.colorRgb} / 0.06)`, boxShadow: `0 0 12px -4px rgb(${d.colorRgb} / 0.3)` } : { borderColor: "rgb(var(--fg-06))" }}
                                                            >
                                                                <span className="text-base">{info.emoji}</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold" style={selected ? { color: `rgb(${d.colorRgb})` } : { color: "var(--fg-70)" }}>{info.name}</p>
                                                                    <p className="text-[10px] text-[var(--fg-30)] mt-0.5 truncate">{info.description}</p>
                                                                </div>
                                                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--fg-04)] text-[var(--fg-30)]">~{info.suggestedMin}m</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        );
                                    })()}

                                    {maDiscipline && maSessionType && (
                                        <div className="rounded-xl border p-4 text-center" style={{ borderColor: `rgb(${DISCIPLINES[maDiscipline].colorRgb} / 0.2)`, background: `rgb(${DISCIPLINES[maDiscipline].colorRgb} / 0.04)` }}>
                                            <p className="text-lg">{DISCIPLINES[maDiscipline].emoji}</p>
                                            <p className="text-sm font-bold mt-1" style={{ color: `rgb(${DISCIPLINES[maDiscipline].colorRgb})` }}>{DISCIPLINES[maDiscipline].name} — {SESSION_TYPE_LABELS[maSessionType].name}</p>
                                            <p className="text-[10px] text-[var(--fg-35)] mt-1">This will repeat every {WEEKDAY_FULL[weekday]}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                        placeholder={`${WEEKDAY_FULL[weekday]} Plan`}
                                        className="w-full bg-transparent text-base font-bold text-[var(--fg-90)] placeholder:text-[var(--fg-25)] focus:outline-none mb-4 border-b border-[var(--fg-06)] pb-2 focus:border-[rgb(var(--accent-rgb)/0.4)]"
                                    />
                                    {exercises.length > 0 && (
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="glass-card p-2.5 text-center">
                                                <p className="text-[9px] font-mono text-[var(--fg-30)]">EXERCISES</p>
                                                <p className="text-lg font-bold">{exercises.length}</p>
                                            </div>
                                            <div className="glass-card p-2.5 text-center">
                                                <p className="text-[9px] font-mono text-[var(--fg-30)]">TOTAL SETS</p>
                                                <p className="text-lg font-bold">{totalSets}</p>
                                            </div>
                                        </div>
                                    )}
                                    {exercises.length === 0 ? (
                                        <EmptyState title="NO EXERCISES YET" subtitle="Add exercises to build this day." />
                                    ) : (
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                            <SortableContext items={exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                                                <div className="space-y-2 mb-4">
                                                    {exercises.map((ex) => <SortableRow key={ex.id} ex={ex} onUpdate={handleUpdate} onRemove={handleRemove} onSwap={(e) => setSwapTarget(e)} onDetail={(e) => setDetailExercise(e)} />)}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    )}
                                    <button
                                        onClick={() => setAddModalOpen(true)}
                                        className={`flex items-center gap-1.5 text-xs font-mono transition ${exercises.length === 0 ? "w-full justify-center px-4 py-2.5 rounded-lg bg-[rgb(var(--accent-rgb))] text-black font-bold hover:bg-[rgb(var(--accent-light-rgb))]" : "text-[rgb(var(--accent-light-rgb))] hover:text-[rgb(var(--accent-light-rgb))]"}`}
                                    >
                                        <Plus size={14} /> ADD EXERCISE
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer — Save button in edit mode */}
                {editMode && (
                    <div className="px-5 py-3 border-t border-[var(--fg-06)] shrink-0">
                        <button
                            onClick={handleSave}
                            disabled={!hasContent || saving}
                            className="w-full py-3 rounded-lg font-bold text-sm bg-[rgb(var(--accent-rgb))] text-black hover:bg-[rgb(var(--accent-light-rgb))] disabled:opacity-30 transition"
                            style={{ boxShadow: hasContent ? "0 0 20px -4px rgb(var(--accent-rgb) / 0.5)" : undefined }}
                        >
                            {saved ? "SAVED ✓" : saving ? "SAVING..." : "SAVE"}
                        </button>
                    </div>
                )}
            </div>

            {addModalOpen && <AddExerciseModal onAdd={handleAdd} onClose={() => setAddModalOpen(false)} existingIds={existingIds} />}
            {swapTarget && <AddExerciseModal onAdd={handleSwap} onClose={() => setSwapTarget(null)} existingIds={existingIds} />}
            {detailExercise && (
                <ExerciseDetailSheet
                    exerciseId={detailExercise.exercise_id}
                    exerciseName={detailExercise.name}
                    equipment={detailExercise.equipment}
                    bodySegment={detailExercise.body_segment}
                    weightUnit={weightUnit}
                    userSex={userSex}
                    imageUrl={detailExercise.image_url}
                    onClose={() => setDetailExercise(null)}
                />
            )}
        </div>
    );

    return createPortal(content, document.body);
}

// ─── Main Page ───────────────────────────────────────────────────
export default function SchedulePage() {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const pathTab = pathname.split("/").pop() as "week" | "today" | undefined;
    const validTabs: ("week" | "today")[] = ["today", "week"];
    const resolvedTab = pathTab && validTabs.includes(pathTab) ? pathTab : "today";
    const [activeTab, setActiveTab] = useState<"week" | "today">(resolvedTab);
    useEffect(() => { setActiveTab(resolvedTab); }, [resolvedTab]);
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
    const [showDatabase, setShowDatabase] = useState(false);
    const [showMusclePicker, setShowMusclePicker] = useState(false);

    const [recurringPlans, setRecurringPlans] = useState<Record<number, RecurringPlan>>({});
    const [recurringLoaded, setRecurringLoaded] = useState(false);

    const [editorWeekday, setEditorWeekday] = useState<number | null>(null);

    const [viewLoading, setViewLoading] = useState(true);
    const [viewExercises, setViewExercises] = useState<LocalExercise[]>([]);
    const [recoveryWarnings, setRecoveryWarnings] = useState<{ segment: string; pct: number; status: string; lastTrained: string }[]>([]);
    const [weeklyVolume, setWeeklyVolume] = useState<{ segment: string; sets: number; days: number }[]>([]);
    const [adaptiveData, setAdaptiveData] = useState<Record<string, AdaptiveVolumeData>>({});
    const [adaptiveLoaded, setAdaptiveLoaded] = useState(false);
    const [importingTemplate, setImportingTemplate] = useState<string | null>(null);
    const [planBrowserOpen, setPlanBrowserOpen] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("browse") === "1");
    const [importingPlan, setImportingPlan] = useState(false);
    const [importConfirm, setImportConfirm] = useState<{ plan: WorkoutPlan; label: string } | null>(null);
    const [volumeExpanded, setVolumeExpanded] = useState(false);
    const [todayAddModal, setTodayAddModal] = useState(false);
    const [viewDetailExercise, setViewDetailExercise] = useState<LocalExercise | null>(null);
    const { sex: userSex } = useSex();
    const weightUnit = useUnits();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
    );

    const calendarRef = useRef<HTMLDivElement>(null);
    const weekDates = getWeekDates(weekOffset);
    const today = toDateString(new Date());

    // ── Load recurring plans ──
    const loadRecurring = useCallback(async () => {
        if (!user) return;
        const { data: plans } = await supabase
            .from("recurring_plans")
            .select("weekday, template_id, is_rest, session_type, ma_discipline, ma_session_type, workout_templates(name)")
            .eq("user_id", user.id)
            .eq("sex", userSex ?? "male");

        const templateIds = (plans ?? []).map((p: any) => p.template_id).filter(Boolean);
        let countByTemplate: Record<string, number> = {};
        let musclesByTemplate: Record<string, Set<string>> = {};
        if (templateIds.length) {
            const { data: rows } = await supabase
                .from("workout_template_exercises")
                .select("template_id, exercises(body_segment)")
                .in("template_id", templateIds);
            (rows ?? []).forEach((r: any) => {
                countByTemplate[r.template_id] = (countByTemplate[r.template_id] ?? 0) + 1;
                const seg = r.exercises?.body_segment;
                if (seg && seg !== "Cardio") {
                    if (!musclesByTemplate[r.template_id]) musclesByTemplate[r.template_id] = new Set();
                    musclesByTemplate[r.template_id].add(seg);
                }
            });
        }

        const map: Record<number, RecurringPlan> = {};
        (plans ?? []).forEach((p: any) => {
            map[p.weekday] = {
                template_id: p.template_id, is_rest: p.is_rest,
                template_name: p.workout_templates?.name ?? "",
                exercise_count: p.template_id ? (countByTemplate[p.template_id] ?? 0) : 0,
                muscles: p.template_id && musclesByTemplate[p.template_id] ? Array.from(musclesByTemplate[p.template_id]) : [],
                session_type: p.session_type === "ma" ? "ma" : "gym",
                ma_discipline: p.ma_discipline as DisciplineId | null,
                ma_session_type: p.ma_session_type as SessionType | null,
            };
        });
        setRecurringPlans(map);
        setRecurringLoaded(true);

        if (templateIds.length) {
            const { data: allExRows } = await supabase
                .from("workout_template_exercises")
                .select("template_id, target_sets, exercises(body_segment)")
                .in("template_id", templateIds);
            const templateToWeekdays: Record<string, number> = {};
            (plans ?? []).forEach((p: any) => { if (p.template_id && !p.is_rest) templateToWeekdays[p.template_id] = (templateToWeekdays[p.template_id] ?? 0) + 1; });
            const volMap: Record<string, { sets: number; daySet: Set<string> }> = {};
            (allExRows ?? []).forEach((r: any) => {
                const seg = r.exercises?.body_segment;
                if (!seg || seg === "Cardio") return;
                const timesPerWeek = templateToWeekdays[r.template_id] ?? 1;
                if (!volMap[seg]) volMap[seg] = { sets: 0, daySet: new Set() };
                volMap[seg].sets += (r.target_sets ?? 0) * timesPerWeek;
                volMap[seg].daySet.add(r.template_id);
            });
            setWeeklyVolume(Object.entries(volMap).map(([segment, v]) => ({ segment, sets: v.sets, days: v.daySet.size })).sort((a, b) => b.sets - a.sets));
        } else {
            setWeeklyVolume([]);
        }
    }, [user, userSex]);

    useEffect(() => { loadRecurring(); }, [loadRecurring]);

    // ── Quick Start import ──
    async function importQuickStartTemplate(tpl: QuickStartTemplate) {
        if (!user) return;
        setImportingTemplate(tpl.key);
        const allNames = Array.from(new Set(tpl.days.flatMap((d) => d.exerciseNames)));
        const { data: exRows } = await supabase.from("exercises").select("id, name").in("name", allNames);
        const idByName: Record<string, string> = {};
        (exRows ?? []).forEach((e: any) => { idByName[e.name] = e.id; });
        const templateIdBySignature: Record<string, string> = {};
        for (const day of tpl.days) {
            const signature = `${day.dayName}::${day.exerciseNames.join(",")}`;
            let templateId = templateIdBySignature[signature];
            if (!templateId) {
                const { data: template } = await supabase.from("workout_templates").insert({ user_id: user.id, name: day.dayName }).select("id").single();
                if (!template) continue;
                templateId = template.id;
                templateIdBySignature[signature] = templateId;
                const rows = day.exerciseNames.map((name, i) => ({ template_id: templateId, user_id: user.id, exercise_id: idByName[name], order_index: i, target_sets: 3, target_reps: "8-12" })).filter((r) => r.exercise_id);
                if (rows.length) await supabase.from("workout_template_exercises").insert(rows);
            }
            await supabase.from("recurring_plans").upsert({ user_id: user.id, weekday: day.weekday, template_id: templateId, is_rest: false, sex: userSex ?? "male" }, { onConflict: "user_id,weekday,sex" });
        }
        await loadRecurring();
        setImportingTemplate(null);
    }

    // ── Plan Library import ──
    const WEEKDAY_MAP: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
    function parseSchedule(schedule: string): number[] {
        const rangeMatch = schedule.match(/^(\w{3})[–-](\w{3})$/);
        if (rangeMatch) {
            const start = WEEKDAY_MAP[rangeMatch[1]];
            const end = WEEKDAY_MAP[rangeMatch[2]];
            if (start !== undefined && end !== undefined) {
                const days: number[] = [];
                for (let i = start; i <= end; i++) days.push(i);
                return days;
            }
        }
        const parts = schedule.split(/[\/,&]+/).map((s) => s.trim());
        const weekdays: number[] = [];
        for (const part of parts) {
            for (const [abbr, wd] of Object.entries(WEEKDAY_MAP)) {
                if (part.startsWith(abbr)) { weekdays.push(wd); break; }
            }
        }
        return weekdays;
    }

    function importPlanFromLibrary(plan: WorkoutPlan) {
        if (!user) return;
        if (hasPlan) {
            const currentPlanNames = [...new Set(Object.values(recurringPlans).filter(p => !p.is_rest && p.template_name).map(p => p.template_name))];
            const currentLabel = currentPlanNames.length > 0 ? currentPlanNames.join(", ") : "your current plan";
            setImportConfirm({ plan, label: currentLabel });
            return;
        }
        executeImport(plan);
    }

    async function executeImport(plan: WorkoutPlan) {
        if (!user) return;
        setImportConfirm(null);
        setImportingPlan(true);
        try {
            const allNames = Array.from(new Set(plan.workouts.flatMap((d) => d.exercises.map((e) => e.name).filter(Boolean))));
            const { data: exRows } = await supabase.from("exercises").select("id, name").in("name", allNames);
            const idByName: Record<string, string> = {};
            (exRows ?? []).forEach((e: any) => { idByName[e.name] = e.id; });
            const unmatched = allNames.filter((n) => !idByName[n]);
            if (unmatched.length > 0) {
                const { data: allEx } = await supabase.from("exercises").select("id, name");
                if (allEx) {
                    const lowerMap: Record<string, { id: string; name: string }> = {};
                    allEx.forEach((e: any) => { lowerMap[e.name.toLowerCase()] = e; });
                    for (const name of unmatched) {
                        const found = lowerMap[name.toLowerCase()];
                        if (found) idByName[name] = found.id;
                    }
                }
            }
            function parseRest(rest: string): number | null { const m = rest.match(/(\d+)/); return m ? parseInt(m[1], 10) : null; }
            const weekdays = parseSchedule(plan.schedule);
            for (const day of plan.workouts) {
                const wd = weekdays[day.dayNum - 1];
                if (wd === undefined) continue;
                const templateName = `${plan.name} — ${day.focus}`;
                const { data: template } = await supabase.from("workout_templates").insert({ user_id: user.id, name: templateName }).select("id").single();
                if (!template) continue;
                const rows = day.exercises.map((ex, i) => ({ template_id: template.id, user_id: user.id, exercise_id: idByName[ex.name], order_index: i, target_sets: ex.sets, target_reps: ex.reps, rest_seconds: parseRest(ex.rest) })).filter((r) => r.exercise_id);
                if (rows.length) await supabase.from("workout_template_exercises").insert(rows);
                await supabase.from("recurring_plans").upsert({ user_id: user.id, weekday: wd, template_id: template.id, is_rest: false, sex: userSex ?? "male" }, { onConflict: "user_id,weekday,sex" });
            }
            await loadRecurring();
            setPlanBrowserOpen(false);
        } catch (e) {
            console.error("Plan import failed:", e);
        } finally {
            setImportingPlan(false);
        }
    }

    useEffect(() => {
        if (!user) return;
        analyzeAdaptiveVolume(user.id, userSex ?? "male").then((data) => { setAdaptiveData(data); setAdaptiveLoaded(true); });
    }, [user, userSex]);

    useEffect(() => {
        setTimeout(() => {
            const container = calendarRef.current;
            if (!container) return;
            const todayCard = container.querySelector<HTMLElement>("[data-today='true']");
            if (todayCard) todayCard.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
        }, 100);
    }, [weekOffset]);

    // ── Load selected day view ──
    const loadSelectedDayView = useCallback(async () => {
        if (!recurringLoaded) return;
        setViewLoading(true);
        const weekday = new Date(selectedDate + "T00:00:00").getDay();
        const plan = recurringPlans[weekday];
        if (!plan || plan.is_rest || !plan.template_id) { setViewExercises([]); setRecoveryWarnings([]); setViewLoading(false); return; }
        const { data: rows } = await supabase
            .from("workout_template_exercises")
            .select("id, order_index, target_sets, target_reps, target_weight, target_duration_minutes, target_incline, target_speed, exercise_id, exercises(name, body_segment, equipment, is_unilateral, per_side_weight, image_url)")
            .eq("template_id", plan.template_id)
            .order("order_index");
        setViewExercises((rows ?? []).map(mapExerciseRow));
        setViewLoading(false);

        if (user) {
            const todaysMuscles = new Set((rows ?? []).map((r: any) => r.exercises?.body_segment).filter(Boolean));
            if (todaysMuscles.size > 0) {
                const { data: recoveryMap } = await analyzeRecovery(user.id, userSex);
                const warnings: { segment: string; pct: number; status: string; lastTrained: string }[] = [];
                for (const seg of todaysMuscles) {
                    const rd = recoveryMap[seg];
                    if (rd && rd.recoveryPct < 85) {
                        warnings.push({
                            segment: seg,
                            pct: rd.recoveryPct,
                            status: rd.status,
                            lastTrained: rd.lastTrainedAt ? new Date(rd.lastTrainedAt).toLocaleDateString(undefined, { weekday: "short" }) : "—",
                        });
                    }
                }
                setRecoveryWarnings(warnings.sort((a, b) => a.pct - b.pct));
            } else { setRecoveryWarnings([]); }
        }
    }, [selectedDate, recurringPlans, recurringLoaded, user, userSex]);

    useEffect(() => { loadSelectedDayView(); }, [loadSelectedDayView]);

    async function handleAddExerciseToday(exercise: { id: string; name: string; body_segment?: string }) {
        if (!user || !selectedPlan?.template_id) return;
        const segment = exercise.body_segment || "Other";
        const cardio = segment === "Cardio";
        await supabase.from("workout_template_exercises").insert({
            template_id: selectedPlan.template_id, user_id: user.id, exercise_id: exercise.id,
            order_index: viewExercises.length,
            target_sets: cardio ? 1 : 3, target_reps: cardio ? "" : "8-10", target_weight: null,
            rest_seconds: cardio ? null : 90, notes: "",
            target_duration_minutes: cardio ? 10 : null, target_incline: null, target_speed: null,
        });
        loadSelectedDayView();
        loadRecurring();
    }

    const dayLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" });
    const selectedWeekday = new Date(selectedDate + "T00:00:00").getDay();
    const selectedPlan = recurringPlans[selectedWeekday];
    const viewTotalSets = viewExercises.reduce((sum, e) => sum + (e.target_sets || 0), 0);

    const hasPlan = recurringLoaded && Object.keys(recurringPlans).length > 0;
    const trainingDays = Object.values(recurringPlans).filter((p) => !p.is_rest).length;
    const restDays = Object.values(recurringPlans).filter((p) => p.is_rest).length;

    return (
        <main className="relative min-h-screen w-full max-w-full bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-10 pb-24 md:pb-10 overflow-x-hidden">
            <div className="pointer-events-none fixed top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-blue-600/15 rounded-full blur-[150px]" />
            <div className="pointer-events-none fixed bottom-[-15%] right-[5%] w-[500px] h-[500px] bg-[rgb(var(--accent-rgb)/0.1)] rounded-full blur-[130px]" />
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.7)_100%)]" />

            <div className="relative z-10 w-full max-w-xl mx-auto space-y-5">
                {/* ─── Header ─── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold font-display tracking-wide text-[rgb(var(--accent-light-rgb))]">Schedule</h1>
                        <p className="text-[var(--fg-35)] text-xs mt-0.5 font-mono">
                            {hasPlan ? `${trainingDays} training · ${restDays} rest · ${7 - trainingDays - restDays} unset` : "Set your week once. It repeats."}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => setShowMusclePicker(true)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--fg-08)] text-[var(--fg-35)] hover:text-[var(--fg-70)] hover:border-[rgb(var(--accent-rgb)/0.3)] transition" title="Muscle Map"><PersonStanding size={16} /></button>
                        <button onClick={() => setShowDatabase(true)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--fg-08)] text-[var(--fg-35)] hover:text-[var(--fg-70)] hover:border-[rgb(var(--accent-rgb)/0.3)] transition" title="Exercise Database"><Database size={16} /></button>
                        <button onClick={() => setPlanBrowserOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--fg-08)] text-[var(--fg-35)] hover:text-[var(--fg-70)] hover:border-[rgb(var(--accent-rgb)/0.3)] transition" title="Plan Library"><BookOpen size={16} /></button>
                    </div>
                </div>

                {/* ─── Tabs ─── */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--fg-03)] border border-[var(--fg-06)]">
                    <button
                        onClick={() => router.replace("/schedule/today")}
                        className={`py-2 rounded-lg text-xs font-bold tracking-wide transition ${activeTab === "today" ? "bg-[rgb(var(--accent-rgb)/0.15)] text-[rgb(var(--accent-light-rgb))] border border-[rgb(var(--accent-rgb)/0.3)]" : "text-[var(--fg-40)] hover:text-[var(--fg-60)] border border-transparent"}`}
                    >
                        TODAY
                    </button>
                    <button
                        onClick={() => router.replace("/schedule/week")}
                        className={`py-2 rounded-lg text-xs font-bold tracking-wide transition ${activeTab === "week" ? "bg-[rgb(var(--accent-rgb)/0.15)] text-[rgb(var(--accent-light-rgb))] border border-[rgb(var(--accent-rgb)/0.3)]" : "text-[var(--fg-40)] hover:text-[var(--fg-60)] border border-transparent"}`}
                    >
                        MY WEEK
                    </button>
                </div>

                {activeTab === "week" ? (
                    <>
                        {/* ─── Empty State: No Plan ─── */}
                        {recurringLoaded && !hasPlan && (
                            <div className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.2)] bg-gradient-to-b from-[rgb(var(--accent-rgb)/0.06)] to-transparent p-6 text-center">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl border border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.1)] flex items-center justify-center">
                                    <Dumbbell size={24} className="text-[rgb(var(--accent-light-rgb))]" />
                                </div>
                                <h2 className="text-lg font-bold text-[var(--fg-90)] mb-1">No plan yet</h2>
                                <p className="text-xs text-[var(--fg-35)] mb-5 max-w-xs mx-auto">Import a proven program or build your own — tap any day below to start.</p>

                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {QUICK_START_TEMPLATES.slice(0, 4).map((tpl) => (
                                        <button
                                            key={tpl.key}
                                            onClick={() => importQuickStartTemplate(tpl)}
                                            disabled={importingTemplate !== null}
                                            className="text-left rounded-xl border border-[var(--fg-08)] bg-[var(--fg-02)] p-3 hover:border-[rgb(var(--accent-rgb)/0.3)] disabled:opacity-40 transition"
                                        >
                                            <p className="text-[11px] font-bold text-[var(--fg-80)] truncate">{tpl.name}</p>
                                            <p className="text-[9px] font-mono text-[var(--fg-30)] mt-0.5">{tpl.daysPerWeek}D/WK · {tpl.muscleCoverage}</p>
                                            {importingTemplate === tpl.key && <p className="text-[9px] font-mono text-[rgb(var(--accent-light-rgb))] mt-1">Importing...</p>}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setPlanBrowserOpen(true)}
                                    className="w-full py-2.5 rounded-xl border border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.08)] text-xs font-bold text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.15)] transition"
                                >
                                    Browse 70+ Pro Plans →
                                </button>
                            </div>
                        )}

                        {/* ─── 7-Day Cards ─── */}
                        <div className="space-y-2">
                            {WEEKDAY_ORDER.map((wd) => {
                                const plan = recurringPlans[wd];
                                const todayWd = new Date().getDay();
                                const isToday = wd === todayWd;
                                return (
                                    <button
                                        key={wd}
                                        onClick={() => setEditorWeekday(wd)}
                                        className={`w-full text-left rounded-xl border p-3.5 transition active:scale-[0.98] group ${
                                            plan?.is_rest
                                                ? "border-emerald-400/15 bg-emerald-400/[0.03] hover:border-emerald-400/30"
                                                : plan?.session_type === "ma" && plan.ma_discipline
                                                    ? `border-[rgb(${DISCIPLINES[plan.ma_discipline]?.colorRgb ?? "var(--accent-rgb)"}/0.15)] bg-[rgb(${DISCIPLINES[plan.ma_discipline]?.colorRgb ?? "var(--accent-rgb)"}/0.03)] hover:border-[rgb(${DISCIPLINES[plan.ma_discipline]?.colorRgb ?? "var(--accent-rgb)"}/0.35)]`
                                                    : plan
                                                        ? "border-[rgb(var(--accent-rgb)/0.12)] bg-[var(--fg-02)] hover:border-[rgb(var(--accent-rgb)/0.35)]"
                                                        : "border-[var(--fg-06)] bg-[var(--fg-01)] hover:border-[var(--fg-15)]"
                                        } ${isToday ? "ring-1 ring-[rgb(var(--accent-rgb)/0.3)]" : ""}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Day indicator */}
                                            {(() => {
                                                const isMa = plan?.session_type === "ma" && plan.ma_discipline;
                                                const maColor = isMa ? DISCIPLINES[plan.ma_discipline!]?.colorRgb : null;
                                                return (
                                                    <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                                                        plan?.is_rest ? "bg-emerald-400/10" : isMa && maColor ? "" : plan ? "bg-[rgb(var(--accent-rgb)/0.1)]" : "bg-[var(--fg-03)]"
                                                    }`} style={isMa && maColor ? { background: `rgb(${maColor} / 0.1)` } : undefined}>
                                                        <span className={`text-[9px] font-mono leading-none ${plan?.is_rest ? "text-emerald-300/60" : plan ? "text-[rgb(var(--accent-light-rgb)/0.6)]" : "text-[var(--fg-25)]"}`} style={isMa && maColor ? { color: `rgb(${maColor} / 0.6)` } : undefined}>
                                                            {WEEKDAY_LABELS[wd].slice(0, 3)}
                                                        </span>
                                                        {isToday && <span className="w-1 h-1 rounded-full bg-[rgb(var(--accent-light-rgb))] mt-0.5" />}
                                                    </div>
                                                );
                                            })()}

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                {plan ? (
                                                    plan.is_rest ? (
                                                        <>
                                                            <p className="text-sm font-medium text-emerald-300/80">Rest Day</p>
                                                            <p className="text-[10px] font-mono text-emerald-300/30">Recovery</p>
                                                        </>
                                                    ) : plan.session_type === "ma" && plan.ma_discipline ? (() => {
                                                        const d = DISCIPLINES[plan.ma_discipline!];
                                                        const st = plan.ma_session_type ? SESSION_TYPE_LABELS[plan.ma_session_type] : null;
                                                        return (
                                                            <>
                                                                <p className="text-sm font-medium truncate" style={{ color: `rgb(${d?.colorRgb ?? "var(--accent-rgb)"})` }}>
                                                                    {d?.emoji} {d?.name ?? plan.ma_discipline}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                                    {st && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border" style={{ borderColor: `rgb(${d?.colorRgb}/0.2)`, background: `rgb(${d?.colorRgb}/0.08)`, color: `rgb(${d?.colorRgb}/0.7)` }}>{st.emoji} {st.name}</span>}
                                                                </div>
                                                            </>
                                                        );
                                                    })() : (
                                                        <>
                                                            <p className="text-sm font-medium text-[var(--fg-85)] truncate">{plan.template_name || "Workout"}</p>
                                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                                <span className="text-[10px] font-mono text-[var(--fg-30)]">{plan.exercise_count} ex</span>
                                                                {plan.muscles.slice(0, 3).map((m) => (
                                                                    <span key={m} className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[rgb(var(--accent-rgb)/0.08)] text-[rgb(var(--accent-light-rgb)/0.55)] border border-[rgb(var(--accent-rgb)/0.12)]">{m}</span>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )
                                                ) : (
                                                    <>
                                                        <p className="text-sm text-[var(--fg-25)]">No plan</p>
                                                        <p className="text-[10px] font-mono text-[var(--fg-15)]">Tap to set up</p>
                                                    </>
                                                )}
                                            </div>

                                            {/* Chevron */}
                                            <ChevronDown size={14} className="text-[var(--fg-15)] group-hover:text-[var(--fg-30)] transition shrink-0 -rotate-90" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* ─── Weekly Volume (collapsible) ─── */}
                        {weeklyVolume.length > 0 && (
                            <div className="glass-card">
                                <button
                                    onClick={() => setVolumeExpanded((v) => !v)}
                                    className="w-full flex items-center justify-between px-4 py-3 transition"
                                >
                                    <div className="flex items-center gap-2">
                                        <BarChart3 size={14} className="text-[var(--fg-30)]" />
                                        <span className="text-[10px] font-mono tracking-widest text-[var(--fg-40)]">WEEKLY VOLUME</span>
                                        {adaptiveLoaded && Object.values(adaptiveData).some((d) => d.hasEnoughData) && (
                                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border border-[rgb(var(--accent-rgb)/0.2)] bg-[rgb(var(--accent-rgb)/0.08)] text-[rgb(var(--accent-light-rgb)/0.6)]">PERSONALIZED</span>
                                        )}
                                    </div>
                                    {volumeExpanded ? <ChevronUp size={14} className="text-[var(--fg-25)]" /> : <ChevronDown size={14} className="text-[var(--fg-25)]" />}
                                </button>

                                {volumeExpanded && (
                                    <div className="px-4 pb-4 space-y-3">
                                        {weeklyVolume.map((v) => {
                                            const guide = getVolumeGuidelines(userSex)[v.segment] ?? { min: 8, max: 20, note: "" };
                                            const adaptive = adaptiveData[v.segment];
                                            const status = getVolumeStatus(v.segment, v.sets, adaptive, userSex);
                                            const usePersonal = adaptive?.hasEnoughData && adaptive.personalMin !== null && adaptive.personalMax !== null;
                                            const min = usePersonal ? adaptive!.personalMin! : guide.min;
                                            const max = usePersonal ? adaptive!.personalMax! : guide.max;
                                            const barMax = Math.max(max + 4, v.sets);
                                            const pct = Math.min(100, (v.sets / barMax) * 100);
                                            const optStartPct = (min / barMax) * 100;
                                            const optEndPct = (max / barMax) * 100;
                                            const trendIcon = status.trend === "improving" ? "↑" : status.trend === "maintaining" ? "→" : status.trend === "stalling" ? "↓" : status.trend === "declining" ? "↓↓" : null;
                                            const trendColor = status.trend === "improving" ? "text-emerald-300" : status.trend === "maintaining" ? "text-[var(--fg-40)]" : status.trend === "stalling" ? "text-amber-300" : status.trend === "declining" ? "text-red-400" : "";
                                            return (
                                                <div key={v.segment}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] font-mono text-[var(--fg-60)]">{v.segment}</p>
                                                            {trendIcon && <span className={`text-[9px] font-mono font-bold ${trendColor}`}>{trendIcon}</span>}
                                                            {adaptive?.performanceChangePct !== null && adaptive?.performanceChangePct !== undefined && adaptive.hasEnoughData && (
                                                                <span className={`text-[8px] font-mono ${adaptive.performanceChangePct >= 0 ? "text-emerald-300/60" : "text-red-400/60"}`}>{adaptive.performanceChangePct >= 0 ? "+" : ""}{adaptive.performanceChangePct.toFixed(1)}%</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-mono font-bold ${status.color}`}>{status.label}</span>
                                                            <span className="text-xs font-bold font-mono text-[var(--fg-70)]">{v.sets}</span>
                                                            <span className="text-[8px] font-mono text-[var(--fg-30)]">/ {min}–{max}</span>
                                                        </div>
                                                    </div>
                                                    <div className="relative h-2 rounded-full bg-[var(--fg-05)] overflow-hidden">
                                                        <div className="absolute top-0 bottom-0 rounded-full bg-[rgb(var(--accent-rgb)/0.1)]" style={{ left: `${optStartPct}%`, width: `${optEndPct - optStartPct}%` }} />
                                                        <div
                                                            className={`absolute top-0 bottom-0 left-0 rounded-full transition-all ${status.label === "NONE" ? "bg-[var(--fg-10)]" : status.label === "LOW" ? "bg-amber-400/70" : status.label === "OPTIMAL" ? "bg-[rgb(var(--accent-rgb)/0.7)]" : status.label === "HIGH" ? "bg-orange-400/70" : "bg-red-400/70"}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    {status.tip && <p className={`text-[9px] font-mono mt-1 ${status.color} opacity-70`}>{status.tip}</p>}
                                                </div>
                                            );
                                        })}
                                        <p className="text-[8px] font-mono text-[var(--fg-20)] pt-1">
                                            {adaptiveLoaded && Object.values(adaptiveData).some((d) => d.hasEnoughData) ? "✦ = personalized from your training history." : "General guidelines — personalize after 4+ weeks of logging."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    /* ─── TODAY TAB ─── */
                    <>
                        {/* Calendar Strip */}
                        <div className="glass-card p-3">
                            <div className="flex items-center justify-between mb-2.5 gap-2">
                                <button onClick={() => setWeekOffset((w) => w - 1)} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--fg-06)] text-[var(--fg-35)] hover:text-[rgb(var(--accent-light-rgb))] transition">←</button>
                                <div className="text-center min-w-0">
                                    <p className="text-[10px] font-mono text-[var(--fg-40)]">
                                        {weekDates[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {weekDates[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                    </p>
                                    {(weekOffset !== 0 || selectedDate !== today) && (
                                        <button onClick={() => { setWeekOffset(0); setSelectedDate(today); }} className="text-[9px] font-mono text-[rgb(var(--accent-light-rgb)/0.6)] hover:text-[rgb(var(--accent-light-rgb))] transition">JUMP TO TODAY</button>
                                    )}
                                </div>
                                <button onClick={() => setWeekOffset((w) => w + 1)} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--fg-06)] text-[var(--fg-35)] hover:text-[rgb(var(--accent-light-rgb))] transition">→</button>
                            </div>

                            <div ref={calendarRef} className="grid grid-cols-7 gap-1.5">
                                {weekDates.map((d) => {
                                    const dateStr = toDateString(d);
                                    const isSelected = dateStr === selectedDate;
                                    const isToday = dateStr === today;
                                    const weekday = d.getDay();
                                    const plan = recurringPlans[weekday];
                                    return (
                                        <button
                                            key={dateStr}
                                            data-today={isToday ? "true" : undefined}
                                            onClick={() => setSelectedDate(dateStr)}
                                            className={`relative flex flex-col items-center rounded-xl border py-2.5 transition active:scale-[0.95] ${
                                                isSelected
                                                    ? "border-[rgb(var(--accent-rgb)/0.5)] bg-[rgb(var(--accent-rgb)/0.1)]"
                                                    : "border-[var(--fg-04)] bg-[var(--fg-01)] hover:border-[var(--fg-10)]"
                                            }`}
                                        >
                                            <span className="text-[8px] font-mono text-[var(--fg-30)]">{d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2).toUpperCase()}</span>
                                            <span className={`text-sm font-bold ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--fg-70)]"}`}>{d.getDate()}</span>
                                            <span className={`w-1.5 h-1.5 rounded-full mt-1 ${plan ? (plan.is_rest ? "bg-emerald-400/50" : "bg-[rgb(var(--accent-rgb)/0.6)]") : "bg-[var(--fg-10)]"}`} />
                                            {isToday && <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[rgb(var(--accent-light-rgb))]" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selected Day Detail */}
                        <div className="rounded-xl border border-[rgb(var(--accent-rgb)/0.12)] bg-[var(--fg-02)] p-4 md:p-5">
                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                <div>
                                    <p className="text-[10px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.6)]">{dayLabel.toUpperCase()}</p>
                                    <p className="text-lg font-bold text-[var(--fg-90)] mt-0.5">
                                        {selectedPlan?.is_rest ? "Rest / Recovery" : selectedPlan?.session_type === "ma" && selectedPlan.ma_discipline ? `${DISCIPLINES[selectedPlan.ma_discipline]?.emoji ?? ""} ${DISCIPLINES[selectedPlan.ma_discipline]?.name ?? selectedPlan.ma_discipline}` : selectedPlan?.template_name || "No Plan"}
                                    </p>
                                </div>
                                {selectedDate === today && selectedPlan && !selectedPlan.is_rest && (
                                    selectedPlan.session_type === "ma" ? (
                                        <button
                                            onClick={() => router.push("/martial-arts")}
                                            className="flex items-center gap-1.5 text-[10px] font-mono px-4 py-2 rounded-xl font-bold transition"
                                            style={selectedPlan.ma_discipline ? { background: `rgb(${DISCIPLINES[selectedPlan.ma_discipline]?.colorRgb} / 0.9)`, color: "#000", boxShadow: `0 0 20px -4px rgb(${DISCIPLINES[selectedPlan.ma_discipline]?.colorRgb} / 0.5)` } : { background: "rgb(var(--accent-rgb))", color: "#000" }}
                                        >
                                            <Play size={11} fill="black" /> START TRAINING
                                        </button>
                                    ) : viewExercises.length > 0 ? (
                                        <button
                                            onClick={() => router.push("/workout")}
                                            className="flex items-center gap-1.5 text-[10px] font-mono px-4 py-2 rounded-xl bg-[rgb(var(--accent-rgb))] text-black font-bold hover:bg-[rgb(var(--accent-light-rgb))] transition"
                                            style={{ boxShadow: "0 0 20px -4px rgb(var(--accent-rgb) / 0.5)" }}
                                        >
                                            <Play size={11} fill="black" /> START WORKOUT
                                        </button>
                                    ) : null
                                )}
                            </div>

                            {viewLoading ? (
                                <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-[rgb(var(--accent-rgb)/0.4)] border-t-[rgb(var(--accent-rgb))] rounded-full animate-spin" /></div>
                            ) : !selectedPlan ? (
                                <EmptyState title="NO PLAN" subtitle="Set a plan in My Week to fill this day." />
                            ) : selectedPlan.is_rest ? (
                                <EmptyState title="REST DAY" subtitle="Recovery is part of the plan too." />
                            ) : selectedPlan.session_type === "ma" && selectedPlan.ma_discipline ? (
                                <>
                                    {(() => {
                                        const disc = DISCIPLINES[selectedPlan.ma_discipline];
                                        const stLabel = selectedPlan.ma_session_type ? SESSION_TYPE_LABELS[selectedPlan.ma_session_type] : null;
                                        return disc ? (
                                            <div className="space-y-4">
                                                <div className="rounded-xl border p-4" style={{ borderColor: `rgb(${disc.colorRgb} / 0.2)`, background: `rgb(${disc.colorRgb} / 0.05)` }}>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className="text-3xl">{disc.emoji}</span>
                                                        <div>
                                                            <p className="font-bold text-base" style={{ color: `rgb(${disc.colorRgb})` }}>{disc.name}</p>
                                                            <p className="text-[10px] font-mono text-[var(--fg-40)]">{disc.category.toUpperCase()}</p>
                                                        </div>
                                                    </div>
                                                    {stLabel && (
                                                        <div className="mt-3 pt-3 border-t" style={{ borderColor: `rgb(${disc.colorRgb} / 0.15)` }}>
                                                            <p className="text-[10px] font-mono tracking-widest text-[var(--fg-40)] mb-1">SESSION TYPE</p>
                                                            <p className="font-bold text-sm flex items-center gap-2">
                                                                <span>{stLabel.emoji}</span> {stLabel.name}
                                                            </p>
                                                            <p className="text-[11px] text-[var(--fg-40)] mt-1">{stLabel.description}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="glass-card p-2.5 text-center">
                                                        <p className="text-[8px] font-mono text-[var(--fg-30)]">DIFFICULTY</p>
                                                        <p className="text-sm font-bold capitalize">{stLabel?.difficulty ?? "—"}</p>
                                                    </div>
                                                    <div className="glass-card p-2.5 text-center">
                                                        <p className="text-[8px] font-mono text-[var(--fg-30)]">SUGGESTED</p>
                                                        <p className="text-sm font-bold">{stLabel?.suggestedMin ?? "—"}m</p>
                                                    </div>
                                                    <div className="glass-card p-2.5 text-center">
                                                        <p className="text-[8px] font-mono text-[var(--fg-30)]">HOW IT WORKS</p>
                                                        <p className="text-[9px] text-[var(--fg-50)] leading-tight mt-0.5">{stLabel?.howItWorks ?? "—"}</p>
                                                    </div>
                                                </div>
                                                {stLabel?.equipment && (
                                                    <div className="glass-card p-3">
                                                        <p className="text-[8px] font-mono text-[var(--fg-30)] mb-1">EQUIPMENT</p>
                                                        <p className="text-[11px] text-[var(--fg-60)]">{stLabel.equipment}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null;
                                    })()}
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="glass-card p-2.5 text-center">
                                            <p className="text-[8px] font-mono text-[var(--fg-30)]">EXERCISES</p>
                                            <p className="text-base font-bold">{viewExercises.length}</p>
                                        </div>
                                        <div className="glass-card p-2.5 text-center">
                                            <p className="text-[8px] font-mono text-[var(--fg-30)]">SETS</p>
                                            <p className="text-base font-bold">{viewTotalSets}</p>
                                        </div>
                                        <div className="glass-card p-2.5 text-center">
                                            <p className="text-[8px] font-mono text-[var(--fg-30)]">EST. TIME</p>
                                            <p className="text-base font-bold">{viewTotalSets * 3}m</p>
                                        </div>
                                    </div>

                                    {recoveryWarnings.length > 0 && (
                                        <div className="mb-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.03] p-3 space-y-2">
                                            <p className="text-[10px] font-mono tracking-widest text-amber-300/70">RECOVERY STATUS</p>
                                            {recoveryWarnings.map((w) => (
                                                <div key={w.segment} className="flex items-center gap-3">
                                                    <p className="text-[10px] font-mono text-[var(--fg-50)] w-20 shrink-0">{w.segment}</p>
                                                    <div className="flex-1 h-1.5 rounded-full bg-[var(--fg-05)] overflow-hidden">
                                                        <div className={`h-full rounded-full ${w.pct < 25 ? "bg-red-400/70" : w.pct < 50 ? "bg-orange-400/70" : w.pct < 80 ? "bg-amber-300/70" : "bg-cyan-400/60"}`} style={{ width: `${w.pct}%` }} />
                                                    </div>
                                                    <p className={`text-[10px] font-mono font-bold w-10 text-right ${w.pct < 25 ? "text-red-400" : w.pct < 50 ? "text-orange-400" : w.pct < 80 ? "text-amber-300" : "text-cyan-300"}`}>{w.pct}%</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {groupExercisesBySegment(viewExercises).map((group, gi) => (
                                            <div key={`${group.label}-${gi}`}>
                                                <p className="text-[10px] font-mono tracking-widest text-[rgb(var(--accent-light-rgb)/0.5)] mb-2">{group.label.toUpperCase()}</p>
                                                <div className="space-y-1.5">
                                                    {group.items.map((ex) => <ReadOnlyRow key={ex.id} ex={ex} onDetail={(e) => setViewDetailExercise(e)} />)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setTodayAddModal(true)}
                                        className="w-full mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-[rgb(var(--accent-rgb)/0.25)] py-3 text-xs font-mono text-[rgb(var(--accent-light-rgb)/0.6)] hover:border-[rgb(var(--accent-rgb)/0.5)] hover:text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.05)] transition"
                                    >
                                        <Plus size={14} /> Add Exercise
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ─── Modals ─── */}
            {editorWeekday !== null && (
                <DayEditorModal
                    weekday={editorWeekday}
                    plan={recurringPlans[editorWeekday]}
                    onClose={() => setEditorWeekday(null)}
                    onSaved={() => loadRecurring()}
                    sensors={sensors}
                    user={user}
                    userSex={userSex ?? "male"}
                    allPlans={recurringPlans}
                />
            )}
            {todayAddModal && selectedPlan?.template_id && (
                <AddExerciseModal
                    onAdd={handleAddExerciseToday}
                    onClose={() => setTodayAddModal(false)}
                    existingIds={new Set(viewExercises.map(e => e.exercise_id))}
                />
            )}
            {viewDetailExercise && (
                <ExerciseDetailSheet
                    exerciseId={viewDetailExercise.exercise_id}
                    exerciseName={viewDetailExercise.name}
                    equipment={viewDetailExercise.equipment}
                    bodySegment={viewDetailExercise.body_segment}
                    weightUnit={weightUnit}
                    userSex={userSex ?? "male"}
                    imageUrl={viewDetailExercise.image_url}
                    onClose={() => setViewDetailExercise(null)}
                />
            )}
            {showDatabase && <ExerciseDatabaseModal onClose={() => setShowDatabase(false)} />}
            {showMusclePicker && <MusclePickerModal onClose={() => setShowMusclePicker(false)} />}
            <PlanBrowserModal open={planBrowserOpen} onClose={() => setPlanBrowserOpen(false)} onImport={importPlanFromLibrary} importing={importingPlan} userSex={userSex} />

            {importConfirm && createPortal(
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-[var(--fg-08)] bg-[var(--bg-card)] p-5">
                        <p className="text-sm font-semibold text-[var(--fg-85)] mb-2">Switch plan?</p>
                        <p className="text-[11px] text-[var(--fg-35)] mb-4">
                            Replace <span className="text-[var(--fg-60)]">{importConfirm.label}</span> with <span className="text-[var(--fg-60)]">{importConfirm.plan.name}</span>? This will update the days this plan uses.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setImportConfirm(null)} className="flex-1 text-sm font-medium py-2.5 rounded-xl border border-[var(--fg-08)] text-[var(--fg-50)] hover:text-[var(--fg-80)] transition">
                                Cancel
                            </button>
                            <button onClick={() => executeImport(importConfirm.plan)} className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-[rgb(var(--accent-rgb))] text-black hover:brightness-110 transition">
                                Switch
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </main>
    );
}
