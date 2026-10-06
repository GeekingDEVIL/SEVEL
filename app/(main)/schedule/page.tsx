"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, GripVertical, Pencil, Database, Play, Moon, Flame, PersonStanding, X, Dumbbell, BookOpen, Copy, RefreshCw, ChevronRight, ChevronLeft, ChevronDown, Swords, Calendar, Zap, Target, Clock, Trophy, Check, Pause, SkipForward, Timer, TrendingUp, Share2, Ban, Undo2, Minus, Info, Camera, Scroll, Repeat2, LayoutGrid, ArrowDownToLine, AlertTriangle, Lightbulb, Sun, Sunrise, Sunset, ArrowUp, ArrowDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter, PointerSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "../../lib/supabase";
import { analyzeAdaptiveVolume, getVolumeStatus, getVolumeGuidelines, type AdaptiveVolumeData } from "../../lib/volumeAnalysis";
import { analyzeRecovery } from "../../lib/muscleRecovery";
import { useSex } from "../../lib/useSex";
import { useUnits } from "../../lib/useUnits";
import { kgToUnit } from "../../lib/units";
import { QUICK_START_TEMPLATES, type QuickStartTemplate } from "../../lib/quickStartTemplates";
import { useAuth } from "../../lib/AuthProvider";
import { useModules } from "../../lib/useModules";
import { getTrainSections } from "../../lib/navPills";
import AddExerciseModal from "../../components/AddExerciseModal";
import ExerciseDatabaseModal from "../../components/ExerciseDatabaseModal";
import MusclePickerModal from "../../components/MusclePickerModal";
import PlanBrowserModal from "../../components/PlanBrowserModal";
import ExerciseDetailSheet from "../../components/ExerciseDetailSheet";
import WorkoutCompleteCard from "../../components/WorkoutCompleteCard";
import CubeLoader from "../../components/ui/cube-loader";
import SwipeNav from "../../components/ui/swipe-nav";
import { SwipeSet, SessionCounterPanel, FlapNumber, DeltaToast, MiniRuneCircle, RotationCard, type ExVolumeEntry } from "../../components/SessionUI";
import MuscleHeatMap from "../../components/MuscleHeatMap";
import StepperInput from "../../components/StepperInput";
import MaSessionInline from "../../components/MaSessionInline";
import PlateMath from "../../components/PlateMath";
import type { WorkoutPlan } from "../../lib/planLibrary";
import { DISCIPLINES, SESSION_TYPE_LABELS, PHASE1_DISCIPLINES, getSessionTypesForDiscipline, type DisciplineId, type SessionType } from "../../lib/martialArtsEngine";
import { getAnimation, midpoint, type Skeleton, type Vec2 } from "../../lib/techniqueAnimations";
import {
    useWorkoutSession,
    formatClock,
    kgToUnit as kgToUnitW,
    isDualWeight,
    getCycleAdjustedWeight,
    type WorkoutExercise,
    type SetEntry,
} from "../../lib/useWorkoutSession";
import { detectFatigue, type FatigueAlert } from "../../lib/intelligenceEngine";
import dynamic from "next/dynamic";

const LazyFormCheck = dynamic(() => import("../../components/FormCheckCamera"), { ssr: false, loading: () => (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[rgb(var(--accent-rgb)/0.3)] border-t-[rgb(var(--accent-rgb))] rounded-full animate-spin" />
    </div>
) });

// ═══════════════════════════════════════════════════════════════
// MA stick figure helpers
// ═══════════════════════════════════════════════════════════════

const DISCIPLINE_PREVIEW_TECHNIQUES: Record<string, string[]> = {
  boxing:       ["jab", "cross", "hook", "uppercut", "slip"],
  muay_thai:    ["roundhouse", "teep", "horizontal elbow", "straight knee", "muay thai stance"],
  kickboxing:   ["jab", "roundhouse", "cross", "teep", "slip"],
  bjj:          ["shrimp", "bridge", "sprawl", "breakfall", "technical standup"],
  wrestling:    ["sprawl", "breakfall"],
  judo:         ["breakfall", "sprawl"],
  mma:          ["jab", "cross", "roundhouse", "sprawl", "teep"],
  karate:       ["jab", "roundhouse", "orthodox stance"],
  taekwondo:    ["roundhouse", "teep", "orthodox stance"],
  kung_fu:      ["jab", "roundhouse", "orthodox stance"],
  krav_maga:    ["jab", "cross", "orthodox stance", "sprawl"],
  shaolin:      ["orthodox stance", "roundhouse", "teep"],
};

function MiniStickFigure({ pose, colorRgb, size = 28 }: { pose: Skeleton; colorRgb: string; size?: number }) {
  const s = size / 200;
  const h = 290 * s;
  const c = `rgb(${colorRgb})`;
  const b = "var(--fg-30)";
  const neck: Vec2 = midpoint(pose.sL, pose.sR);
  const hipL: Vec2 = [pose.hp[0] - 12, pose.hp[1]];
  const hipR: Vec2 = [pose.hp[0] + 12, pose.hp[1]];
  const ln = (a: Vec2, bv: Vec2, k: string, cl: string, w: number) => (
    <line key={k} x1={a[0]*s} y1={a[1]*s} x2={bv[0]*s} y2={bv[1]*s} stroke={cl} strokeWidth={w} strokeLinecap="round" />
  );
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} xmlns="http://www.w3.org/2000/svg">
      {ln(neck, pose.hp, "t", b, 3.5*s)}
      {ln(pose.sL, pose.sR, "sh", b, 2.5*s)}
      {ln(pose.sL, pose.eL, "ual", c, 2.5*s)}
      {ln(pose.eL, pose.wL, "fal", c, 2.5*s)}
      {ln(pose.sR, pose.eR, "uar", c, 2.5*s)}
      {ln(pose.eR, pose.wR, "far", c, 2.5*s)}
      {ln(hipL, pose.kL, "ull", b, 2.5*s)}
      {ln(pose.kL, pose.aL, "lll", b, 2.5*s)}
      {ln(hipR, pose.kR, "ulr", b, 2.5*s)}
      {ln(pose.kR, pose.aR, "llr", b, 2.5*s)}
      <circle cx={pose.wL[0]*s} cy={pose.wL[1]*s} r={4*s} fill={c} />
      <circle cx={pose.wR[0]*s} cy={pose.wR[1]*s} r={4*s} fill={c} />
      <circle cx={pose.hd[0]*s} cy={pose.hd[1]*s} r={10*s} fill="var(--fg-15)" stroke={b} strokeWidth={2*s} />
    </svg>
  );
}

function MaPreviewFigures({ discipline, colorRgb }: { discipline: string; colorRgb: string }) {
  const figures = useMemo(() => {
    const names = DISCIPLINE_PREVIEW_TECHNIQUES[discipline] ?? DISCIPLINE_PREVIEW_TECHNIQUES["boxing"];
    const result: { name: string; pose: Skeleton }[] = [];
    for (const n of names) {
      const anim = getAnimation(n);
      if (anim && result.length < 4) result.push({ name: n, pose: anim.frames[0].pose });
    }
    return result;
  }, [discipline]);

  if (figures.length === 0) return null;
  return (
    <div className="flex items-center gap-1 mt-2">
      {figures.map(f => (
        <div key={f.name} className="flex flex-col items-center">
          <MiniStickFigure pose={f.pose} colorRgb={colorRgb} size={28} />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

const MAX_SESSIONS_PER_DAY = 3;

type LocalExercise = {
    id: string; isNew: boolean; exercise_id: string; name: string;
    body_segment: string; isCardio: boolean; equipment: string;
    is_unilateral: boolean; per_side_weight: boolean; image_url: string | null;
    target_sets: number; target_reps: string; target_weight: number | null;
    rest_seconds: number | null; notes: string;
    target_duration_minutes: number | null; target_incline: number | null; target_speed: number | null;
    tracking_mode: string;
    discipline: string;
};

function isDualWeightEx(ex: LocalExercise): boolean {
    if (ex.isCardio || ex.equipment.toLowerCase() === "bodyweight") return false;
    return ex.per_side_weight;
}

function estimateE1RM(weight: number, reps: number): number {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

type PerformancePulse = "stronger" | "matching" | "weaker" | null;

function getPerformancePulse(currentWeight: number, currentReps: number, prevWeight: number | null, prevReps: number | null): PerformancePulse {
    if (!prevWeight || !prevReps) return null;
    const curVol = currentWeight * currentReps;
    const prevVol = prevWeight * prevReps;
    if (curVol > prevVol * 1.02) return "stronger";
    if (curVol < prevVol * 0.98) return "weaker";
    return "matching";
}

function getWeightStep(equipment: string, unit: "kg" | "lbs"): number {
    const eq = equipment.toLowerCase();
    if (eq.includes("barbell")) return unit === "kg" ? 2.5 : 5;
    if (eq.includes("cable") || eq.includes("machine") || eq.includes("smith")) return unit === "kg" ? 5 : 10;
    if (eq.includes("dumbbell") || eq.includes("kettlebell")) return unit === "kg" ? 2 : 5;
    return unit === "kg" ? 1 : 2.5;
}

const PULSE_COLORS: Record<string, string> = {
    stronger: "74 222 128",
    matching: "250 204 21",
    weaker: "239 68 68",
};

const DISCIPLINE_COLORS: Record<string, string> = {
    boxing: "#ef4444", muay_thai: "#f97316", kickboxing: "#f97316",
    bjj: "#a78bfa", wrestling: "#8b5cf6", judo: "#7c3aed", mma: "#ec4899",
    karate: "#3b82f6", taekwondo: "#60a5fa",
    calisthenics: "#34d399", cardio: "#fbbf24", mobility: "#22d3ee",
    kung_fu: "#eab308", krav_maga: "#6b7280", capoeira: "#eab308", aikido: "#6366f1",
};

function PrBurst({ trigger }: { trigger: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (trigger <= 0) return;
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        c.width = window.innerWidth;
        c.height = window.innerHeight;
        const cx = c.width / 2;
        const cy = c.height * 0.4;
        const colors = ["#fbbf24", "#f59e0b", "#eab308", "#facc15", "#fef08a", "#fde047"];
        const particles = Array.from({ length: 60 }, () => ({
            x: cx, y: cy,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12 - 4,
            r: Math.random() * 3 + 1.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1,
        }));
        let raf: number;
        function draw() {
            ctx!.clearRect(0, 0, c!.width, c!.height);
            let alive = false;
            for (const p of particles) {
                if (p.life <= 0) continue;
                alive = true;
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15;
                p.life -= 0.018;
                ctx!.globalAlpha = p.life;
                ctx!.fillStyle = p.color;
                ctx!.beginPath();
                ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx!.fill();
            }
            if (alive) raf = requestAnimationFrame(draw);
        }
        draw();
        return () => cancelAnimationFrame(raf);
    }, [trigger]);
    if (trigger <= 0) return null;
    return <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none" />;
}

const CROSS_TYPE_TIPS: Record<string, string> = {
    Legs: "Heavy leg day → prioritize hip & ankle mobility tonight",
    Back: "Back-focused session → stretch lats & thoracic spine later",
    Chest: "Chest work done → shoulder mobility & pec stretches recommended",
    Shoulders: "Shoulder session → rotator cuff mobility before bed",
    Core: "Core training → gentle spinal decompression (hang from bar) helps recovery",
};

const TRANSITION_TIPS: Record<string, Record<string, { tip: string; restAdj: number }>> = {
    Chest: { Back: { tip: "Chest → Back: antagonist pairing — you can superset for efficiency", restAdj: -15 }, Legs: { tip: "Upper → Lower: blood flow shift — extra 30s rest recommended", restAdj: 30 } },
    Back: { Chest: { tip: "Back → Chest: antagonist pair — shorter rest works well here", restAdj: -15 }, Legs: { tip: "Upper → Lower: different energy system — take extra rest", restAdj: 30 } },
    Legs: { Chest: { tip: "Lower → Upper: neural recovery needed — take a breather", restAdj: 20 }, Back: { tip: "Legs → Back: demanding pair — stay hydrated, longer rest", restAdj: 20 }, Shoulders: { tip: "Legs → Shoulders: good combo — shoulders recover while legs worked", restAdj: 0 } },
    Shoulders: { Chest: { tip: "Shoulders → Chest: front delts pre-fatigued — drop bench weight 5-10%", restAdj: 15 }, Arms: { tip: "Shoulders → Arms: push muscles warmed up — great flow", restAdj: -10 } },
    Arms: { Chest: { tip: "Arms → Chest: triceps pre-fatigued — focus on chest squeeze", restAdj: 15 }, Back: { tip: "Arms → Back: biceps pre-fatigued — use straps if grip fails", restAdj: 10 } },
    Cardio: { Chest: { tip: "Cardio → Strength: elevated HR — longer rest for first heavy set", restAdj: 30 }, Legs: { tip: "Cardio → Legs: legs pre-loaded — reduce volume or intensity", restAdj: 30 } },
};

const FORM_CUES: Record<string, string[]> = {
    Chest: ["Retract scaps, arch slightly", "Control the negative", "Drive through your feet", "Full ROM — touch chest"],
    Back: ["Lead with elbows, squeeze at top", "Keep core braced", "Don't shrug — depress shoulders", "Mind-muscle: feel the lat stretch"],
    Shoulders: ["Don't flare elbows past 45°", "Control the eccentric", "Brace core — no leaning back", "Pause at top for peak contraction"],
    Legs: ["Brace core, chest up", "Push through heels", "Knees track over toes", "Full depth — hip crease below knee"],
    Arms: ["Keep elbows pinned", "Squeeze at peak contraction", "Don't swing — strict form", "Full extension at bottom"],
    Core: ["Breathe out on contraction", "Posterior pelvic tilt", "Don't pull on neck", "Slow and controlled"],
    Cardio: ["Steady breathing rhythm", "Maintain posture", "Don't grip handles tight", "Find your pace"],
    Other: ["Control the movement", "Full range of motion", "Breathe steadily", "Focus on the muscle"],
};

type RecurringPlan = {
    template_id: string | null; is_rest: boolean; template_name: string; exercise_count: number; muscles: string[];
    session_type: "gym" | "ma"; ma_discipline: DisciplineId | null; ma_session_type: SessionType | null;
    estimated_minutes: number;
};

const WEEKDAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const MUSCLE_COLORS: Record<string, string> = {
    Chest: "239 68 68", Shoulders: "249 115 22", Back: "59 130 246",
    Arms: "168 85 247", Legs: "16 185 129", Core: "234 179 8",
    Cardio: "236 72 153", Other: "107 114 128",
};

function toDateString(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mapExerciseRow(row: any): LocalExercise {
    const segment = row.exercises?.body_segment ?? "Other";
    const equip = row.exercises?.equipment ?? "Other";
    const tm = row.exercises?.tracking_mode ?? (segment === "Cardio" ? "distance_time" : "weight_reps");
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
        tracking_mode: tm,
        discipline: row.exercises?.discipline ?? "strength",
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

// ═══════════════════════════════════════════════════════════════
// Small reusable components
// ═══════════════════════════════════════════════════════════════

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
            <div className="flex items-start gap-2 px-3 pt-3 pb-1">
                <button {...attributes} {...listeners} className="text-[var(--fg-20)] hover:text-[rgb(var(--accent-light-rgb))] cursor-grab active:cursor-grabbing shrink-0 touch-none mt-1.5"><GripVertical size={14} /></button>
                <div className="cursor-pointer mt-0.5" onClick={() => onDetail(ex)}><ExerciseThumb ex={ex} /></div>
                <div className="flex-1 min-w-0">
                    <button onClick={() => onDetail(ex)} className="text-[13px] font-medium text-[rgb(var(--accent-light-rgb))] text-left inline-flex items-center gap-1 rounded-md px-1 py-0.5 -mx-1 -my-0.5 active:bg-[rgb(var(--accent-rgb)/0.08)] transition">
                        {ex.discipline && ex.discipline !== "strength" && DISCIPLINE_COLORS[ex.discipline] && (
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DISCIPLINE_COLORS[ex.discipline] }} />
                        )}
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
                <input type="text" value={ex.notes} onChange={(e) => onUpdate(ex.id, { notes: e.target.value })} placeholder="Notes (optional)" className="w-full mt-2 rounded-md bg-transparent border border-[var(--fg-06)] px-2 text-[10px] font-mono py-1.5 text-[var(--fg-40)] placeholder:text-[var(--fg-15)] focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.3)]" />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// Day Editor Modal (kept intact from original)
// ═══════════════════════════════════════════════════════════════

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
    allPlans: Record<number, RecurringPlan[]>;
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

    function handleAdd(exercise: { id: string; name: string; body_segment?: string; equipment?: string; is_unilateral?: boolean; per_side_weight?: boolean; image_url?: string | null; tracking_mode?: string; discipline?: string }) {
        const segment = exercise.body_segment || "Other";
        const mode = exercise.tracking_mode || (segment === "Cardio" ? "distance_time" : "weight_reps");
        const cardio = mode === "distance_time";
        const roundsBased = mode === "rounds_duration";
        const durationOnly = mode === "duration_only";
        setExercises((prev) => {
            if (prev.some((e) => e.exercise_id === exercise.id)) return prev;
            return [...prev, {
                id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, isNew: true, exercise_id: exercise.id, name: exercise.name,
                body_segment: segment, isCardio: cardio, tracking_mode: mode,
                discipline: exercise.discipline ?? "strength",
                equipment: exercise.equipment ?? "Other", is_unilateral: exercise.is_unilateral ?? false, per_side_weight: exercise.per_side_weight ?? false,
                image_url: exercise.image_url ?? null,
                target_sets: cardio ? 1 : roundsBased ? 1 : durationOnly ? 3 : 3,
                target_reps: cardio ? "" : roundsBased ? "" : durationOnly ? "" : "8-10",
                target_weight: null, rest_seconds: cardio || roundsBased ? null : durationOnly ? 30 : 90, notes: "",
                target_duration_minutes: cardio ? 10 : roundsBased ? 3 : durationOnly ? 1 : null,
                target_incline: null, target_speed: null,
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

    function handleSwap(replacement: { id: string; name: string; body_segment?: string; equipment?: string; is_unilateral?: boolean; per_side_weight?: boolean; image_url?: string | null; tracking_mode?: string; discipline?: string }) {
        if (!swapTarget) return;
        const segment = replacement.body_segment || "Other";
        const mode = replacement.tracking_mode || (segment === "Cardio" ? "distance_time" : "weight_reps");
        const cardio = mode === "distance_time";
        setExercises((prev) => prev.map((e) => {
            if (e.id !== swapTarget.id) return e;
            const old = e;
            if (!old.isNew) setDeletedIds((d) => [...d, old.id]);
            return {
                id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`, isNew: true, exercise_id: replacement.id, name: replacement.name,
                body_segment: segment, isCardio: cardio, tracking_mode: mode,
                discipline: replacement.discipline ?? "strength",
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
        const existingCount = (allPlans[weekday] ?? []).filter(p => !p.is_rest).length;
        const isReplacing = (allPlans[weekday] ?? []).some(p => p.session_type === (isRest ? "rest" : planMode));
        if (!isRest && !isReplacing && existingCount >= MAX_SESSIONS_PER_DAY) {
            alert(`Maximum ${MAX_SESSIONS_PER_DAY} sessions per day.`);
            return;
        }
        setSaving(true);

        if (isRest) {
            await supabase.from("recurring_plans").delete().eq("user_id", user.id).eq("weekday", weekday).eq("sex", userSex);
            const { error } = await supabase.from("recurring_plans").insert(
                { user_id: user.id, weekday, template_id: null, is_rest: true, sex: userSex, session_type: "gym", ma_discipline: null, ma_session_type: null }
            );
            if (error) console.error("Save rest day failed:", error);
        } else if (planMode === "ma" && maDiscipline && maSessionType) {
            await supabase.from("recurring_plans").delete().eq("user_id", user.id).eq("weekday", weekday).eq("sex", userSex).eq("session_type", "ma");
            const { error } = await supabase.from("recurring_plans").insert(
                { user_id: user.id, weekday, template_id: null, is_rest: false, sex: userSex, session_type: "ma", ma_discipline: maDiscipline, ma_session_type: maSessionType }
            );
            if (error) console.error("Save MA plan failed:", error);
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

            await supabase.from("recurring_plans").delete().eq("user_id", user.id).eq("weekday", weekday).eq("sex", userSex).eq("session_type", "gym");
            const { error: planErr } = await supabase.from("recurring_plans").insert(
                { user_id: user.id, weekday, template_id: tid, is_rest: false, sex: userSex, session_type: "gym", ma_discipline: null, ma_session_type: null }
            );
            if (planErr) console.error("Save gym plan failed:", planErr);
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
        const sourcePlans = allPlans[sourceWeekday] ?? [];
        const sourcePlan = sourcePlans.find(p => p.session_type === "gym" && !p.is_rest && p.template_id) ?? sourcePlans[0];
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

    const copyableDays = WEEKDAY_ORDER.filter((wd) => wd !== weekday && (allPlans[wd] ?? []).some(p => !p.is_rest && p.template_id));
    const hasContent = isRest || exercises.length > 0 || (planMode === "ma" && maDiscipline && maSessionType);
    const totalSets = exercises.reduce((sum, e) => sum + (e.target_sets || 0), 0);
    const existingIds = new Set(exercises.map((e) => e.exercise_id));

    const content = (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-xl max-h-[92vh] bg-[var(--bg-elevated)] border border-[rgb(var(--accent-rgb)/0.15)] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden">
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
                                            <button key={wd} disabled={copying} onClick={() => handleCopyFrom(wd)}
                                                className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-[var(--fg-08)] bg-[var(--fg-02)] hover:border-[rgb(var(--accent-rgb)/0.4)] hover:bg-[rgb(var(--accent-rgb)/0.06)] transition text-center disabled:opacity-40"
                                            >
                                                <span className="text-xs font-bold text-[var(--fg-70)]">{WEEKDAY_LABELS[wd]}</span>
                                                <span className="text-[9px] font-mono text-[var(--fg-30)] truncate max-w-full">{(allPlans[wd] ?? []).find(p => p.template_name)?.template_name || "Plan"}</span>
                                                <span className="text-[8px] font-mono text-[var(--fg-20)]">{(allPlans[wd] ?? []).find(p => p.exercise_count)?.exercise_count ?? 0} ex</span>
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
                                            <div className="flex justify-center"><MaPreviewFigures discipline={maDiscipline} colorRgb={DISCIPLINES[maDiscipline].colorRgb} /></div>
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

// ═══════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════

export default function SchedulePage() {
    const { user } = useAuth();
    const router = useRouter();
    const { enabledKeys } = useModules();

    const [recurringPlans, setRecurringPlans] = useState<Record<number, RecurringPlan[]>>({});
    const [recurringLoaded, setRecurringLoaded] = useState(false);
    const [editorWeekday, setEditorWeekday] = useState<number | null>(null);
    const [todayExercises, setTodayExercises] = useState<LocalExercise[]>([]);
    const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
    const [completedDaySummaries, setCompletedDaySummaries] = useState<Record<number, { volume: number; minutes: number }>>({}); // #19
    const [checklistDismissed, setChecklistDismissed] = useState(false); // #22
    const [compactExercises, setCompactExercises] = useState(false); // #31
    const [currentStreak, setCurrentStreak] = useState(0);
    const [weekOffset, setWeekOffset] = useState(0); // #18 week navigation
    const [skipConfirm, setSkipConfirm] = useState(false); // #17 skip today
    const [swapDayOpen, setSwapDayOpen] = useState(false); // #16 swap day
    const [pullProgress, setPullProgress] = useState(0); // #25 pull-to-refresh
    const [isRefreshing, setIsRefreshing] = useState(false);
    const pullStartY = useRef(0);
    const isPulling = useRef(false);
    const [scrollY, setScrollY] = useState(0); // #7 parallax

    const [showDatabase, setShowDatabase] = useState(false);
    const [showMusclePicker, setShowMusclePicker] = useState(false);
    const [planBrowserOpen, setPlanBrowserOpen] = useState(false);
    const [importingTemplate, setImportingTemplate] = useState<string | null>(null);
    const [importingPlan, setImportingPlan] = useState(false);
    const [importConfirm, setImportConfirm] = useState<{ plan: WorkoutPlan; label: string } | null>(null);
    const { sex: userSex } = useSex();
    const wu = useUnits();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
    );

    // ═══════════════════════════════════════════════════════════════
    // SESSION HOOK — inline workout logging
    // ═══════════════════════════════════════════════════════════════
    const w = useWorkoutSession();
    const [editingExId, setEditingExId] = useState<string | null>(null);
    const swipeStartX = useRef(0);
    const swipeStartY = useRef(0);
    const handleCardSwipe = useCallback((dir: "left" | "right") => {
        if (!w.expandedId) return;
        const idx = w.exercisesList.findIndex(e => e.id === w.expandedId);
        if (dir === "left" && idx < w.exercisesList.length - 1) w.setExpandedId(w.exercisesList[idx + 1].id);
        if (dir === "right" && idx > 0) w.setExpandedId(w.exercisesList[idx - 1].id);
    }, [w.expandedId, w.exercisesList, w.setExpandedId]);
    const prevVolRef = useRef(0);
    const [lastDelta, setLastDelta] = useState(0);
    const [rpePrompt, setRpePrompt] = useState<{ exId: string; setIdx: number } | null>(null);
    const [noteExpandedSet, setNoteExpandedSet] = useState<string | null>(null);
    const rpeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [detailExercise, setDetailExercise] = useState<WorkoutExercise | null>(null);
    const [formCheckExercise, setFormCheckExercise] = useState<string | null>(null);
    const [fatigueAlerts, setFatigueAlerts] = useState<FatigueAlert[]>([]);
    const [fatigueDismissed, setFatigueDismissed] = useState(false);
    const autoStartingRef = useRef(false);
    const [maSessionActive, setMaSessionActive] = useState(false);
    const [adHocMa, setAdHocMa] = useState<{ discipline: DisciplineId; sessionType: SessionType } | null>(null);
    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const startMa = params.get("startMa") as DisciplineId | null;
        const st = params.get("st") as SessionType | null;
        if (startMa && st) {
            setAdHocMa({ discipline: startMa, sessionType: st });
            setMaSessionActive(true);
            window.history.replaceState({}, "", "/schedule");
        }
    }, []);
    const [receiptExpanded, setReceiptExpanded] = useState(false);
    const [todayMaSession, setTodayMaSession] = useState<{ discipline: string; sessionType: string; rounds: number; durationSec: number; xp: number; intensity: string } | null>(null);
    const [restExpanded, setRestExpanded] = useState(false);
    const [sessionLaunching, setSessionLaunching] = useState(false);
    const [showWeighIn, setShowWeighIn] = useState(false);
    const [clockTime, setClockTime] = useState(() => new Date());
    const [heroScrolled, setHeroScrolled] = useState(false);
    const [expandedWeekday, setExpandedWeekday] = useState<number | null>(null);
    const [statsAnimated, setStatsAnimated] = useState(false);
    const [heroMounted, setHeroMounted] = useState(false);
    const [lastSessionInfo, setLastSessionInfo] = useState<{ title: string; daysAgo: number; volume: number } | null>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [setJustLogged, setSetJustLogged] = useState<{ exName: string; weight: string; reps: number; streak: number } | null>(null);
    const setLogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [dropConfirm, setDropConfirm] = useState<any | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [exerciseTrayOpen, setExerciseTrayOpen] = useState(false);
    const [idleNudge, setIdleNudge] = useState<"later" | "pause" | null>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [flexTooltipShown, setFlexTooltipShown] = useState(false);
    const [smartNext, setSmartNext] = useState<{ name: string; muscle?: string } | null>(null);
    const prevConfirmedCount = useRef(0);

    // ═══ TIER 6 STATE ═══
    const [momentum, setMomentum] = useState(0);
    const momentumDecayRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const setTimestamps = useRef<number[]>([]);
    const [inFlowState, setInFlowState] = useState(false);
    const [ghostPace, setGhostPace] = useState<{ lastSetsAtTime: number; currentSets: number } | null>(null);

    // Smart next suggestion (4.4) — show brief "Up next" after confirming
    useEffect(() => {
        const count = w.confirmedExercises.size;
        if (count > prevConfirmedCount.current && count < w.exercisesList.length) {
            const next = w.exercisesList.find(e => !w.confirmedExercises.has(e.id) && !w.skippedExercises.has(e.id));
            if (next) {
                setSmartNext({ name: next.name, muscle: next.body_segment });
                const t = setTimeout(() => setSmartNext(null), 4000);
                prevConfirmedCount.current = count;
                return () => clearTimeout(t);
            }
        }
        prevConfirmedCount.current = count;
    }, [w.confirmedExercises, w.exercisesList, w.skippedExercises]);

    useEffect(() => {
        if (smartNext && w.skippedExercises.has(w.exercisesList.find(e => e.name === smartNext.name)?.id ?? "")) {
            setSmartNext(null);
        }
    }, [w.skippedExercises, w.exercisesList, smartNext]);

    // Clock for hero (#12)
    useEffect(() => {
        const t = setInterval(() => setClockTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Scroll tracking for floating button (#22) + parallax (#7)
    useEffect(() => {
        const onScroll = () => {
            if (heroRef.current) {
                const rect = heroRef.current.getBoundingClientRect();
                setHeroScrolled(rect.bottom < 100);
            }
            setScrollY(window.scrollY);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Stats counter animation trigger (#18)
    useEffect(() => {
        if (w.status === "not_started" && w.exercisesList.length > 0 && !statsAnimated) {
            const t = setTimeout(() => setStatsAnimated(true), 100);
            return () => clearTimeout(t);
        }
    }, [w.status, w.exercisesList.length, statsAnimated]);

    // Hero mount animation (#24 card entrance stagger)
    useEffect(() => {
        const t = setTimeout(() => setHeroMounted(true), 50);
        return () => clearTimeout(t);
    }, []);

    // Last session context (#3)
    useEffect(() => {
        if (!user || !w.hasLoaded) return;
        (async () => {
            const { data } = await supabase
                .from("workout_sessions")
                .select("date, title, total_volume")
                .eq("user_id", user.id)
                .eq("status", "completed")
                .order("completed_at", { ascending: false })
                .limit(1);
            if (data?.[0]) {
                const d = new Date(data[0].date + "T00:00:00");
                const now = new Date();
                const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
                const rawTitle = data[0].title;
                let title = typeof rawTitle === "string" ? rawTitle : (rawTitle?.name ?? rawTitle?.template_name ?? "Session");
                if (typeof title === "string") title = title.replace(/\[object Object\]/g, "").replace(/\s*—\s*$/, "").trim();
                setLastSessionInfo({ title: title || "Session", daysAgo, volume: data[0].total_volume || 0 });
            }
        })();
    }, [user, w.hasLoaded]);

    // Day phase gradient (#21)
    const dayPhaseGradient = useMemo(() => {
        const h = clockTime.getHours();
        if (h >= 5 && h < 10) return "linear-gradient(135deg, rgb(var(--fg-03)) 0%, rgba(251, 191, 36, 0.03) 100%)";
        if (h >= 10 && h < 16) return "linear-gradient(135deg, rgb(var(--fg-03)) 0%, rgb(var(--fg-02)) 100%)";
        if (h >= 16 && h < 20) return "linear-gradient(135deg, rgb(var(--fg-03)) 0%, rgba(59, 130, 246, 0.03) 100%)";
        return "linear-gradient(135deg, rgb(var(--fg-03)) 0%, rgba(139, 92, 246, 0.03) 100%)";
    }, [clockTime]);

    // Dynamic greeting (#5)
    const greeting = useMemo(() => {
        const h = clockTime.getHours();
        if (h >= 5 && h < 12) return "Good morning";
        if (h >= 12 && h < 17) return "Good afternoon";
        if (h >= 17 && h < 21) return "Evening session";
        return "Night owl";
    }, [clockTime]);

    // Day phase icon (#5)
    const DayPhaseIcon = useMemo(() => {
        const h = clockTime.getHours();
        if (h >= 5 && h < 12) return Sunrise;
        if (h >= 12 && h < 17) return Sun;
        if (h >= 17 && h < 21) return Sunset;
        return Moon;
    }, [clockTime]);

    // Motivational line based on streak (#6)
    const motiveLine = useMemo(() => {
        if (currentStreak >= 30) return "Legendary discipline.";
        if (currentStreak >= 14) return "Two weeks strong. Unstoppable.";
        if (currentStreak >= 7) return "A full week. Momentum is real.";
        if (currentStreak >= 3) return "Building the habit. Keep going.";
        if (currentStreak >= 1) return "Every rep counts.";
        return "Ready when you are.";
    }, [currentStreak]);

    // Streak flame scale (#19)
    const streakScale = useMemo(() => {
        if (currentStreak <= 0) return 0;
        if (currentStreak <= 3) return 1;
        if (currentStreak <= 7) return 1.2;
        if (currentStreak <= 14) return 1.4;
        if (currentStreak <= 30) return 1.6;
        return 1.8;
    }, [currentStreak]);

    // PR detection for exercises (#20)
    const prExerciseIds = useMemo(() => {
        const ids = new Set<string>();
        w.exercisesList.forEach(ex => {
            const last = w.lastPerformance[ex.exercise_id];
            if (last && last.weight != null && last.weight > 0) {
                const trend = w.overloadHints[ex.exercise_id];
                if (trend && trend.type === "weight_up") ids.add(ex.id);
            }
        });
        return ids;
    }, [w.exercisesList, w.lastPerformance, w.overloadHints]);

    // Weight progression arrows per exercise (#9)
    const weightDeltas = useMemo(() => {
        const map: Record<string, "up" | "down" | "same" | null> = {};
        w.exercisesList.forEach(ex => {
            const last = w.lastPerformance[ex.exercise_id];
            if (!last || last.weight == null || ex.target_weight == null) { map[ex.id] = null; return; }
            const diff = ex.target_weight - last.weight;
            if (diff > 0.5) map[ex.id] = "up";
            else if (diff < -0.5) map[ex.id] = "down";
            else map[ex.id] = "same";
        });
        return map;
    }, [w.exercisesList, w.lastPerformance]);

    // Estimated time per exercise (#10)
    const exerciseTimeEstimates = useMemo(() => {
        const map: Record<string, number> = {};
        w.exercisesList.forEach(ex => {
            const restSec = ex.rest_seconds ?? 90;
            const sets = ex.target_sets ?? 3;
            const setTime = 30;
            map[ex.id] = Math.round((sets * (setTime + restSec)) / 60);
        });
        return map;
    }, [w.exercisesList]);

    // Warm-up suggestion based on today's muscles (#23)
    const warmUpSuggestion = useMemo(() => {
        const muscles = [...new Set(w.exercisesList.map(ex => ex.body_segment))];
        const warmups: Record<string, string> = {
            Chest: "Band pull-aparts + arm circles (2 min)",
            Back: "Cat-cow + band face pulls (2 min)",
            Shoulders: "Band dislocates + external rotations (2 min)",
            Legs: "Bodyweight squats + leg swings (3 min)",
            Quads: "Bodyweight squats + leg swings (3 min)",
            Hamstrings: "Good mornings + leg swings (2 min)",
            Glutes: "Glute bridges + clamshells (2 min)",
            Arms: "Wrist circles + light curls (1 min)",
            Biceps: "Wrist circles + light curls (1 min)",
            Triceps: "Arm circles + light pushdowns (1 min)",
            Core: "Dead bugs + bird dogs (2 min)",
        };
        const primary = muscles[0];
        return primary && warmups[primary] ? { muscle: primary, suggestion: warmups[primary] } : null;
    }, [w.exercisesList]);

    // Idle nudge timer (4.5)
    useEffect(() => {
        if (w.status !== "active" || w.restRemaining !== null || w.sessionPaused) return;
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        setIdleNudge(null);
        idleTimerRef.current = setTimeout(() => setIdleNudge("later"), 45000);
        const pauseTimer = setTimeout(() => setIdleNudge("pause"), 120000);
        return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); clearTimeout(pauseTimer); };
    }, [w.status, w.expandedId, w.completedCount, w.restRemaining, w.sessionPaused]);

    // First-session flex tooltip (4.6)
    useEffect(() => {
        if (w.status !== "active" || flexTooltipShown) return;
        try {
            const key = "sevel_flex_tooltip_shown";
            if (localStorage.getItem(key)) { setFlexTooltipShown(true); return; }
            const timer = setTimeout(() => { setFlexTooltipShown(true); localStorage.setItem(key, "1"); }, 3000);
            return () => clearTimeout(timer);
        } catch { /* storage unavailable */ }
    }, [w.status, flexTooltipShown]);

    // Ghost data: same weekday previous week
    const [ghostSets, setGhostSets] = useState<Record<string, Array<{ weight: number | null; reps: number | null }>>>({});
    useEffect(() => {
        if (!user) return;
        const now = new Date();
        const prevWeekDate = new Date(now);
        prevWeekDate.setDate(now.getDate() - 7);
        const dateStr = toDateString(prevWeekDate);
        (async () => {
            const { data: sessions } = await supabase
                .from("workout_sessions")
                .select("id")
                .eq("user_id", user.id)
                .eq("date", dateStr)
                .eq("status", "completed")
                .limit(1);
            if (!sessions?.length) return;
            const { data: logs } = await supabase
                .from("set_logs")
                .select("exercise_id, weight, reps, set_index")
                .eq("session_id", sessions[0].id)
                .order("set_index");
            if (!logs?.length) return;
            const map: Record<string, Array<{ weight: number | null; reps: number | null }>> = {};
            logs.forEach((l: any) => {
                if (!map[l.exercise_id]) map[l.exercise_id] = [];
                map[l.exercise_id].push({ weight: l.weight, reps: l.reps });
            });
            setGhostSets(map);
        })();
    }, [user]);

    useEffect(() => {
        if (!user || !w.statsLoaded || w.status !== "not_started") return;
        let cancelled = false;
        detectFatigue(supabase, user.id, w.userSex).then(alerts => {
            if (!cancelled) setFatigueAlerts(alerts);
        });
        return () => { cancelled = true; };
    }, [user, w.statsLoaded, w.status, w.userSex]);

    // ═══ 6.4 Momentum meter — builds on set completion, decays during rest + sync to localStorage for context pill ═══
    useEffect(() => {
        if (w.status !== "active") { setMomentum(0); return; }
        if (momentumDecayRef.current) clearInterval(momentumDecayRef.current);
        momentumDecayRef.current = setInterval(() => {
            setMomentum(prev => Math.max(0, prev - 2));
        }, 3000);
        return () => { if (momentumDecayRef.current) clearInterval(momentumDecayRef.current); };
    }, [w.status]);

    useEffect(() => {
        if (w.status !== "active" || w.completedCount === 0) return;
        setTimestamps.current.push(Date.now());
        setMomentum(prev => Math.min(100, prev + 20));
    }, [w.completedCount, w.status]);

    useEffect(() => {
        try { localStorage.setItem("sevel_momentum", String(Math.round(momentum))); } catch {}
    }, [momentum]);

    // ═══ 6.5 Flow state detection — 3+ sets in < 90s each ═══
    useEffect(() => {
        const stamps = setTimestamps.current;
        if (stamps.length < 4) { setInFlowState(false); return; }
        const recent = stamps.slice(-4);
        const gaps = recent.slice(1).map((t, i) => t - recent[i]);
        const allFast = gaps.every(g => g < 90000);
        setInFlowState(allFast);
    }, [w.completedCount]);

    // ═══ 6.3 Ghost pace line — compare current vs last session ═══
    useEffect(() => {
        if (w.status !== "active" || !w.elapsed) { setGhostPace(null); return; }
        const lastTotalSets = Object.values(w.lastSets).reduce((s, arr) => s + arr.length, 0);
        if (lastTotalSets === 0) { setGhostPace(null); return; }
        const estLastDuration = lastTotalSets * 120;
        const paceAtCurrentTime = Math.round((w.elapsed / estLastDuration) * lastTotalSets);
        setGhostPace({ lastSetsAtTime: Math.min(paceAtCurrentTime, lastTotalSets), currentSets: w.completedCount });
    }, [w.status, w.elapsed, w.completedCount, w.lastSets]);

    const [minLoadDone, setMinLoadDone] = useState(false);
    const minLoadTimerRef = useRef(false);
    if (!minLoadTimerRef.current && w.loadHint === "completed") {
        minLoadTimerRef.current = true;
        setTimeout(() => setMinLoadDone(true), 2000);
    }
    const showCompletedLoader = w.loadHint === "completed" && (!w.hasLoaded || !minLoadDone);

    const sortedExercises = useMemo(() => {
        if (w.status !== "active") return w.exercisesList;
        const list = [...w.exercisesList];
        list.sort((a, b) => {
            const aSkipped = w.skippedExercises.has(a.id);
            const bSkipped = w.skippedExercises.has(b.id);
            const aSets = (w.logs[a.id] ?? []).filter((s) => !s.is_warmup);
            const bSets = (w.logs[b.id] ?? []).filter((s) => !s.is_warmup);
            const aDone = aSets.length > 0 && aSets.every((s) => s.completed) && w.confirmedExercises.has(a.id);
            const bDone = bSets.length > 0 && bSets.every((s) => s.completed) && w.confirmedExercises.has(b.id);
            if (aSkipped && !bSkipped) return 1;
            if (!aSkipped && bSkipped) return -1;
            if (aDone && !bDone) return 1;
            if (!aDone && bDone) return -1;
            if (w.expandedId === a.id && w.expandedId !== b.id) return -1;
            if (w.expandedId !== a.id && w.expandedId === b.id) return 1;
            if (a.superset_group != null && a.superset_group === b.superset_group) return a.order_index - b.order_index;
            return a.order_index - b.order_index;
        });
        return list;
    }, [w.exercisesList, w.logs, w.expandedId, w.skippedExercises, w.confirmedExercises, w.status]);

    useEffect(() => {
        const vol = w.sessionVolume ?? 0;
        if (vol > prevVolRef.current && prevVolRef.current > 0) setLastDelta(vol - prevVolRef.current);
        prevVolRef.current = vol;
    }, [w.sessionVolume]);

    function showRpePromptFn(exId: string, setIdx: number) {
        if (rpeTimerRef.current) clearTimeout(rpeTimerRef.current);
        setRpePrompt({ exId, setIdx });
    }
    function handleRpe(rpe: number) {
        if (!rpePrompt) return;
        w.updateSetRpe(rpePrompt.exId, rpePrompt.setIdx, rpe);
        if (rpeTimerRef.current) clearTimeout(rpeTimerRef.current);
        setRpePrompt(null);
    }

    async function zeroCeremonyComplete(ex: WorkoutExercise, idx: number, overrides?: { weight?: string; reps?: string }, isQuickLog?: boolean) {
        if (w.status === "not_started" && !autoStartingRef.current) {
            autoStartingRef.current = true;
            await w.startWorkout();
            autoStartingRef.current = false;
        }
        const set = w.logs[ex.id]?.find((s) => s.index === idx);
        w.completeSet(ex, idx, overrides);
        const sets = w.logs[ex.id] || [];
        const nextSet = sets.find((s) => s.index > idx && !s.completed);
        if (nextSet) {
            setFocusedField(`${ex.id}-${nextSet.index}-w`);
        } else {
            setFocusedField(null);
        }
        const loggedWeight = overrides?.weight ?? set?.weight ?? "";
        const loggedReps = Number(overrides?.reps ?? set?.reps ?? 0);
        if (setLogTimerRef.current) clearTimeout(setLogTimerRef.current);
        setSetJustLogged(prev => ({
            exName: ex.name,
            weight: loggedWeight,
            reps: loggedReps,
            streak: (prev ? prev.streak : 0) + 1,
        }));
        setLogTimerRef.current = setTimeout(() => setSetJustLogged(null), 2200);
        setRestExpanded(true);
    }

    const sessionActive = w.status === "active" || (w.status === "not_started" && w.exercisesList.length > 0);
    const showExerciseList = w.status === "active";

    // ═══════════════════════════════════════════════════════════════
    // SCHEDULE STATE (recurring plans, etc.)
    // ═══════════════════════════════════════════════════════════════

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
        let minutesByTemplate: Record<string, number> = {};
        if (templateIds.length) {
            const { data: rows } = await supabase
                .from("workout_template_exercises")
                .select("template_id, target_sets, target_duration_minutes, exercises(body_segment)")
                .in("template_id", templateIds);
            (rows ?? []).forEach((r: any) => {
                countByTemplate[r.template_id] = (countByTemplate[r.template_id] ?? 0) + 1;
                const seg = r.exercises?.body_segment;
                const sets = r.target_sets ?? 3;
                const dur = r.target_duration_minutes ?? 0;
                const estMin = seg === "Cardio" && dur > 0 ? dur : sets * 3;
                minutesByTemplate[r.template_id] = (minutesByTemplate[r.template_id] ?? 0) + estMin;
                if (seg && seg !== "Cardio") {
                    if (!musclesByTemplate[r.template_id]) musclesByTemplate[r.template_id] = new Set();
                    musclesByTemplate[r.template_id].add(seg);
                }
            });
        }

        const map: Record<number, RecurringPlan[]> = {};
        (plans ?? []).forEach((p: any) => {
            const entry: RecurringPlan = {
                template_id: p.template_id, is_rest: p.is_rest,
                template_name: p.workout_templates?.name ?? "",
                exercise_count: p.template_id ? (countByTemplate[p.template_id] ?? 0) : 0,
                muscles: p.template_id && musclesByTemplate[p.template_id] ? Array.from(musclesByTemplate[p.template_id]) : [],
                session_type: p.session_type === "ma" ? "ma" : "gym",
                ma_discipline: p.ma_discipline as DisciplineId | null,
                ma_session_type: p.ma_session_type as SessionType | null,
                estimated_minutes: p.template_id ? (minutesByTemplate[p.template_id] ?? 0) : (p.session_type === "ma" && p.ma_session_type && SESSION_TYPE_LABELS[p.ma_session_type as SessionType] ? SESSION_TYPE_LABELS[p.ma_session_type as SessionType].suggestedMin : 0),
            };
            if (!map[p.weekday]) map[p.weekday] = [];
            map[p.weekday].push(entry);
        });
        setRecurringPlans(map);
        setRecurringLoaded(true);
    }, [user, userSex]);

    useEffect(() => { loadRecurring(); }, [loadRecurring]);

    useEffect(() => {
        if (!recurringLoaded) return;
        const todayWd = new Date().getDay();
        const plans = recurringPlans[todayWd] ?? [];
        const plan = plans.find(p => p.session_type === "gym" && !p.is_rest && p.template_id) ?? plans[0];
        if (!plan || plan.is_rest || !plan.template_id) { setTodayExercises([]); return; }
        (async () => {
            const { data: rows } = await supabase
                .from("workout_template_exercises")
                .select("id, order_index, target_sets, target_reps, target_weight, target_duration_minutes, target_incline, target_speed, exercise_id, exercises(name, body_segment, equipment, is_unilateral, per_side_weight, image_url)")
                .eq("template_id", plan.template_id)
                .order("order_index");
            setTodayExercises((rows ?? []).map(mapExerciseRow));
        })();
    }, [recurringPlans, recurringLoaded]);

    useEffect(() => {
        if (!user) return;
        (async () => {
            const now = new Date();
            const day = now.getDay();
            const monday = new Date(now);
            monday.setDate(now.getDate() - ((day + 6) % 7));
            const mondayStr = toDateString(monday);

            const { data: sessions } = await supabase
                .from("workout_sessions")
                .select("date, total_volume, duration_seconds")
                .eq("user_id", user.id)
                .eq("status", "completed")
                .gte("date", mondayStr);

            const days = new Set<number>();
            const summaries: Record<number, { volume: number; minutes: number }> = {};
            [...(sessions ?? [])].forEach((s: any) => {
                const d = new Date(s.date + "T00:00:00");
                const wd = d.getDay();
                days.add(wd);
                summaries[wd] = { volume: s.total_volume || 0, minutes: Math.round((s.duration_seconds || 0) / 60) };
            });
            setCompletedDays(days);
            setCompletedDaySummaries(summaries);

            let streak = 0;
            const checkDate = new Date();
            if (!days.has(checkDate.getDay())) {
                checkDate.setDate(checkDate.getDate() - 1);
            }
            let safetyLimit = 60;
            while (safetyLimit-- > 0) {
                const wd = checkDate.getDay();
                const dayPlans = recurringPlans[wd] ?? [];
                if (dayPlans.length === 0 || dayPlans.every(p => p.is_rest)) {
                    checkDate.setDate(checkDate.getDate() - 1);
                    continue;
                }
                if (days.has(wd)) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
            setCurrentStreak(streak);
        })();
    }, [user, recurringPlans, w.status]);

    const loadTodayMaSession = useCallback(async () => {
        if (!user) return;
        const today = toDateString(new Date());
        const maDisciplines = ["boxing", "muay_thai", "kickboxing", "bjj", "wrestling", "judo", "mma", "karate", "taekwondo", "kung_fu", "krav_maga", "capoeira", "aikido"];
        const { data } = await supabase
            .from("workout_sessions")
            .select("title, total_sets, duration_seconds, xp_earned")
            .eq("user_id", user.id)
            .eq("date", today)
            .eq("status", "completed")
            .order("completed_at", { ascending: false })
            .limit(5);
        if (data && data.length > 0) {
            const maSession = data.find((s: any) => s.title && maDisciplines.some(d => s.title.toLowerCase().includes(d.replace("_", " "))));
            if (maSession) {
                const titleParts = (maSession.title || "").split(" — ");
                const disc = maDisciplines.find(d => (titleParts[0] || "").toLowerCase().includes(d.replace("_", " "))) || "boxing";
                setTodayMaSession({ discipline: disc, sessionType: titleParts[1] || "training", rounds: maSession.total_sets || 0, durationSec: maSession.duration_seconds || 0, xp: maSession.xp_earned || 0, intensity: "medium" });
            }
        }
    }, [user]);

    useEffect(() => { loadTodayMaSession(); }, [loadTodayMaSession]);

    async function importQuickStartTemplate(tpl: QuickStartTemplate) {
        if (!user) return;
        setImportingTemplate(tpl.key);
        const gymDays = tpl.days.filter(d => d.sessionType !== "ma");
        const allNames = Array.from(new Set(gymDays.flatMap((d) => d.exerciseNames)));
        const { data: exRows } = allNames.length > 0 ? await supabase.from("exercises").select("id, name").in("name", allNames) : { data: [] };
        const idByName: Record<string, string> = {};
        (exRows ?? []).forEach((e: any) => { idByName[e.name] = e.id; });
        const templateIdBySignature: Record<string, string> = {};
        for (const day of tpl.days) {
            if (day.sessionType === "ma") {
                await supabase.from("recurring_plans").delete().eq("user_id", user.id).eq("weekday", day.weekday).eq("sex", userSex ?? "male").eq("session_type", "ma");
                await supabase.from("recurring_plans").insert({ user_id: user.id, weekday: day.weekday, is_rest: false, sex: userSex ?? "male", session_type: "ma", ma_discipline: day.maDiscipline, ma_session_type: day.maSessionType });
                continue;
            }
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
            await supabase.from("recurring_plans").delete().eq("user_id", user.id).eq("weekday", day.weekday).eq("sex", userSex ?? "male").eq("session_type", "gym");
            await supabase.from("recurring_plans").insert({ user_id: user.id, weekday: day.weekday, template_id: templateId, is_rest: false, sex: userSex ?? "male", session_type: "gym" });
        }
        await loadRecurring();
        setImportingTemplate(null);
    }

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

    const hasPlan = recurringLoaded && Object.keys(recurringPlans).length > 0;

    function importPlanFromLibrary(plan: WorkoutPlan) {
        if (!user) return;
        if (hasPlan) {
            const currentPlanNames = [...new Set(Object.values(recurringPlans).flat().filter(p => !p.is_rest && p.template_name).map(p => p.template_name))];
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
                await supabase.from("recurring_plans").delete().eq("user_id", user.id).eq("weekday", wd).eq("sex", userSex ?? "male").eq("session_type", "gym");
                await supabase.from("recurring_plans").insert({ user_id: user.id, weekday: wd, template_id: template.id, is_rest: false, sex: userSex ?? "male", session_type: "gym" });
            }
            await loadRecurring();
            setPlanBrowserOpen(false);
        } catch (e) {
            console.error("Plan import failed:", e);
        } finally {
            setImportingPlan(false);
        }
    }

    // ── Derived ──
    const todayWd = new Date().getDay();
    const todayPlans = recurringPlans[todayWd] ?? [];
    const todayGymPlan = todayPlans.find(p => p.session_type === "gym" && !p.is_rest);
    const todayMaPlan = todayPlans.find(p => p.session_type === "ma");
    const todayPlan = todayGymPlan ?? todayMaPlan ?? todayPlans[0];
    const trainingDays = Object.values(recurringPlans).filter(plans => plans.some(p => !p.is_rest)).length;
    const completedThisWeek = completedDays.size;

    const todayIsMa = todayMaPlan?.session_type === "ma" && todayMaPlan.ma_discipline;
    const todayDisc = todayIsMa ? DISCIPLINES[todayMaPlan!.ma_discipline!] : null;
    const todayStLabel = todayIsMa && todayMaPlan!.ma_session_type ? SESSION_TYPE_LABELS[todayMaPlan!.ma_session_type] : null;
    const todayIsRest = todayPlans.length > 0 && todayPlans.every(p => p.is_rest);
    const todayHasGym = todayGymPlan && todayGymPlan.template_id;
    const todayHasBoth = !!todayGymPlan && !!todayMaPlan;
    const planTotalSets = todayExercises.reduce((sum, e) => sum + (e.target_sets || 0), 0);
    const gymEstMinutes = planTotalSets > 0 ? Math.round(planTotalSets * 2.5) : 0;
    const maEstMinutes = todayIsMa && todayStLabel ? todayStLabel.suggestedMin : 0;
    const estMinutes = todayHasBoth ? gymEstMinutes + maEstMinutes : todayIsMa && todayStLabel ? maEstMinutes : gymEstMinutes;
    const todayName = new Date().toLocaleDateString(undefined, { weekday: "long" }).toUpperCase();

    // Session is in a gym-loggable state (not MA, not rest, has exercises from hook)
    const gymSessionReady = w.hasLoaded && (w.status === "not_started" || w.status === "active") && w.exercisesList.length > 0 && !todayIsRest;
    const sessionCompleted = w.status === "completed" && w.summary;
    const sessionFreestyle = w.status === "freestyle";

    // Muscle group badges for today's workout
    const todayMuscles = useMemo(() => {
        const segs = new Set<string>();
        w.exercisesList.forEach((ex) => { if (ex.body_segment && ex.body_segment !== "Other") segs.add(ex.body_segment); });
        return Array.from(segs);
    }, [w.exercisesList]);

    const hitMuscles = useMemo(() => {
        const counts: Record<string, number> = {};
        w.exercisesList.forEach((ex) => {
            if (ex.body_segment && ex.body_segment !== "Other" && ex.body_segment !== "Cardio") {
                counts[ex.body_segment] = (counts[ex.body_segment] || 0) + 1;
            }
        });
        return Object.entries(counts).map(([muscle, n]) => ({ muscle, intensity: Math.min(10, 3 + n * 2) }));
    }, [w.exercisesList]);

    // Progress ring values
    const progressPct = w.totalPlanned > 0 ? Math.min(w.completedCount / w.totalPlanned, 1) : 0;
    const ringR = 28;
    const ringC = 2 * Math.PI * ringR;

    const queuedExercises = useMemo(() => {
        if (!sessionCompleted) return [];
        const queued: { name: string; type: string }[] = [];
        for (const ex of w.exercisesList) {
            const sets = (w.logs[ex.id] ?? []).filter(s => !s.is_warmup);
            if (sets.length === 0 || sets.every(s => !s.completed)) {
                const disc = ex.discipline && ex.discipline !== "strength" ? ex.discipline.replace(/_/g, " ") : ex.body_segment;
                queued.push({ name: ex.name, type: disc });
            }
        }
        if (todayIsMa && !todayMaSession) {
            queued.push({ name: todayDisc?.name ?? "Martial Arts", type: todayStLabel?.name ?? "Session" });
        }
        return queued;
    }, [sessionCompleted, w.exercisesList, w.logs, todayIsMa, todayMaSession, todayDisc, todayStLabel]);

    // Auto-expand first uncompleted exercise on mount
    const autoExpandedRef = useRef(false);
    useEffect(() => {
        if (!gymSessionReady || autoExpandedRef.current || w.expandedId) return;
        const first = w.exercisesList.find((ex) => {
            const sets = (w.logs[ex.id] ?? []).filter((s) => !s.is_warmup);
            const allDone = sets.length > 0 && sets.every((s) => s.completed) && w.confirmedExercises.has(ex.id);
            return !allDone && !w.skippedExercises.has(ex.id);
        });
        if (first) {
            w.setExpandedId(first.id);
            autoExpandedRef.current = true;
        }
    }, [gymSessionReady, w.exercisesList, w.logs, w.confirmedExercises, w.skippedExercises, w.expandedId]);

    const prevExpandedRef = useRef<string | null>(null);
    useEffect(() => {
        if (!w.expandedId || w.expandedId === prevExpandedRef.current) { prevExpandedRef.current = w.expandedId; return; }
        prevExpandedRef.current = w.expandedId;
        requestAnimationFrame(() => {
            const el = document.querySelector(`[data-exercise-id="${w.expandedId}"]`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }, [w.expandedId]);

    // #17 Skip today — mark today as rest
    const handleSkipToday = useCallback(async () => {
        if (!user) return;
        const today = toDateString(new Date());
        await supabase.from("workout_sessions").insert({
            user_id: user.id,
            date: today,
            status: "skipped",
            title: "Skipped",
            total_sets: 0, total_volume: 0, duration_seconds: 0, xp_earned: 0,
            sex: userSex || "male",
        });
        setSkipConfirm(false);
        w.setStatus("rest_day");
    }, [user, userSex, w]);

    // #16 Swap day — swap today's plan with another day
    const handleSwapDay = useCallback(async (targetWd: number) => {
        if (!user) return;
        const todayPlansArr = recurringPlans[todayWd] ?? [];
        const targetPlansArr = recurringPlans[targetWd] ?? [];
        for (const p of todayPlansArr) {
            if (p.template_id) {
                await supabase.from("recurring_plans").update({ weekday: targetWd }).eq("user_id", user.id).eq("weekday", todayWd).eq("template_id", p.template_id);
            }
        }
        for (const p of targetPlansArr) {
            if (p.template_id) {
                await supabase.from("recurring_plans").update({ weekday: todayWd }).eq("user_id", user.id).eq("weekday", targetWd).eq("template_id", p.template_id);
            }
        }
        setSwapDayOpen(false);
        loadRecurring();
    }, [user, recurringPlans, todayWd, loadRecurring]);

    // #25 Pull-to-refresh touch handlers
    const handlePullStart = useCallback((e: React.TouchEvent) => {
        if (window.scrollY > 0) return;
        pullStartY.current = e.touches[0].clientY;
        isPulling.current = true;
    }, []);
    const handlePullMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling.current || window.scrollY > 0) return;
        const diff = e.touches[0].clientY - pullStartY.current;
        if (diff > 0) {
            setPullProgress(Math.min(diff / 120, 1));
        }
    }, []);
    const handlePullEnd = useCallback(() => {
        if (pullProgress >= 1 && !isRefreshing) {
            setIsRefreshing(true);
            loadRecurring().then(() => {
                setIsRefreshing(false);
                setPullProgress(0);
            });
        } else {
            setPullProgress(0);
        }
        isPulling.current = false;
    }, [pullProgress, isRefreshing, loadRecurring]);

    // #18 Week navigation — next/prev week preview data
    const weekNavPlans = useMemo(() => {
        if (weekOffset === 0) return null;
        return recurringPlans;
    }, [weekOffset, recurringPlans]);

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════

    if (showCompletedLoader) {
        return (
            <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center">
                <CubeLoader message="Loading your results…" />
            </main>
        );
    }

    // Completed session — collapsed summary or full receipt (no longer an early return)
    const completedSummaryCard = sessionCompleted ? (() => {
        const dur = w.summary!.duration;
        const durMin = Math.floor(dur / 60);
        const vol = Math.round(kgToUnitW(w.summary!.volume, w.weightUnit));
        const gymXp = w.summary!.xpBreakdown.total;
        const maXp = todayMaSession?.xp ?? 0;
        const dailyXp = gymXp + maXp;
        const maDurMin = todayMaSession ? Math.floor(todayMaSession.durationSec / 60) : 0;
        const maDisc = todayMaSession?.discipline ? DISCIPLINES[todayMaSession.discipline as DisciplineId] : null;
        return (
            <>
                {!receiptExpanded ? (
                    <div className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.2)] bg-gradient-to-br from-[rgb(var(--accent-rgb)/0.06)] to-transparent overflow-hidden">
                        {/* Gym session row */}
                        <button onClick={() => setReceiptExpanded(true)} className="w-full flex items-center gap-4 p-4 text-left">
                            <div className="w-11 h-11 rounded-xl bg-[rgb(var(--accent-rgb)/0.15)] border border-[rgb(var(--accent-rgb)/0.2)] flex items-center justify-center shrink-0">
                                <Check size={18} className="text-[rgb(var(--accent-rgb))]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-[var(--fg-90)] truncate">{w.dayTitle}</p>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-[var(--fg-40)]">
                                    <span>{w.summary!.sets} sets</span>
                                    {vol > 0 && (<><span className="text-[var(--fg-10)]">·</span><span>{vol.toLocaleString()} {w.weightUnit}</span></>)}
                                    {durMin > 0 && (<><span className="text-[var(--fg-10)]">·</span><span>{durMin}m</span></>)}
                                    <span className="text-[var(--fg-10)]">·</span>
                                    <span className="text-[rgb(var(--accent-rgb))]">+{gymXp} XP</span>
                                </div>
                            </div>
                            <ChevronDown size={14} className="text-[var(--fg-20)]" />
                        </button>
                        {/* MA session row (if completed today) */}
                        {todayMaSession && maDisc && (
                            <div className="flex items-center gap-4 px-4 pb-3 -mt-1">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center border" style={{ background: `rgb(${maDisc.colorRgb} / 0.12)`, borderColor: `rgb(${maDisc.colorRgb} / 0.2)` }}>
                                    <span className="text-sm">{maDisc.emoji}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-[var(--fg-90)] truncate">{maDisc.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-[var(--fg-40)]">
                                        <span>{todayMaSession.rounds} rounds</span>
                                        <span className="text-[var(--fg-10)]">·</span>
                                        <span>{maDurMin}m</span>
                                        <span className="text-[var(--fg-10)]">·</span>
                                        <span style={{ color: `rgb(${maDisc.colorRgb})` }}>+{maXp} XP</span>
                                    </div>
                                </div>
                                <Check size={14} style={{ color: `rgb(${maDisc.colorRgb})` }} />
                            </div>
                        )}
                        {/* Daily XP total bar (only when both sessions done) */}
                        {todayMaSession && (
                            <div className="border-t border-[var(--fg-06)] px-4 py-2 flex items-center justify-between">
                                <span className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">DAILY TOTAL</span>
                                <span className="text-[11px] font-bold font-mono text-[rgb(var(--accent-rgb))]">+{dailyXp} XP · {durMin + maDurMin}m</span>
                            </div>
                        )}
                        {hitMuscles.length > 0 && (
                            <div className="border-t border-[var(--fg-06)] px-4 py-3">
                                <MuscleHeatMap muscles={hitMuscles} height={300} showToggle showLabels compact showLegend />
                            </div>
                        )}
                        <div className="border-t border-[var(--fg-06)] flex">
                            <button onClick={() => setReceiptExpanded(true)} className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-mono text-[var(--fg-35)] hover:text-[var(--fg-60)] py-2.5 transition">
                                <Scroll size={11} /> View Full Scroll
                            </button>
                            <div className="w-px bg-[var(--fg-06)]" />
                            <button onClick={() => router.push("/track")} className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-mono text-[var(--fg-35)] hover:text-[var(--fg-60)] py-2.5 transition">
                                <TrendingUp size={11} /> Progress
                            </button>
                            {w.todaySessions.length < w.MAX_SESSIONS_PER_DAY && (
                                <>
                                    <div className="w-px bg-[var(--fg-06)]" />
                                    <button onClick={w.startAnotherWorkout} className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-mono text-[rgb(var(--accent-rgb)/0.6)] hover:text-[rgb(var(--accent-rgb))] py-2.5 transition">
                                        <Plus size={11} /> Another
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <button onClick={() => setReceiptExpanded(false)} className="flex items-center gap-1 text-[10px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] transition mb-1">
                            <ChevronDown size={12} className="rotate-180" /> Collapse
                        </button>
                        <WorkoutCompleteCard
                            dayTitle={w.dayTitle}
                            summary={w.summary!}
                            exercisesList={w.exercisesList}
                            logs={w.logs}
                            todaySessions={w.todaySessions}
                            weekDays={w.weekDays}
                            prCount={w.prCount}
                            prExerciseIds={w.prExerciseIds}
                            weightUnit={w.weightUnit}
                            cycleProfile={w.cycleProfile}
                            sharing={w.sharing}
                            maxSessions={w.MAX_SESSIONS_PER_DAY}
                            sessionCount={w.sessionCount}
                            nextSession={w.nextSession}
                            recentSessions={w.recentSessions}
                            queuedExercises={queuedExercises}
                            muscles={hitMuscles}
                            onShare={w.handleShare}
                            onSchedule={() => setEditorWeekday(todayWd)}
                            onProgress={() => router.push("/track")}
                            onStartAnother={w.startAnotherWorkout}
                        />
                        {/* MA session summary below gym receipt when expanded */}
                        {todayMaSession && maDisc && (
                            <div className="mt-4 rounded-2xl border overflow-hidden" style={{ borderColor: `rgb(${maDisc.colorRgb} / 0.2)`, background: `rgb(${maDisc.colorRgb} / 0.04)` }}>
                                <div className="px-4 py-3 flex items-center gap-3">
                                    <span className="text-lg">{maDisc.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-[var(--fg-90)]">{maDisc.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-[var(--fg-40)]">
                                            <span>{todayMaSession.rounds} rounds</span>
                                            <span className="text-[var(--fg-10)]">·</span>
                                            <span>{maDurMin}m</span>
                                            <span className="text-[var(--fg-10)]">·</span>
                                            <span>{todayMaSession.intensity}</span>
                                            <span className="text-[var(--fg-10)]">·</span>
                                            <span style={{ color: `rgb(${maDisc.colorRgb})` }}>+{maXp} XP</span>
                                        </div>
                                    </div>
                                    <MaPreviewFigures discipline={todayMaSession.discipline} colorRgb={maDisc.colorRgb} />
                                    <Check size={16} style={{ color: `rgb(${maDisc.colorRgb})` }} />
                                </div>
                            </div>
                        )}
                        {/* Unified daily XP total */}
                        {todayMaSession && (
                            <div className="mt-3 rounded-xl border border-[var(--fg-08)] bg-[var(--fg-03)] px-4 py-2.5 flex items-center justify-between">
                                <span className="text-[9px] font-mono tracking-widest text-[var(--fg-25)]">DAILY TOTAL</span>
                                <span className="text-sm font-bold font-mono text-[rgb(var(--accent-rgb))]">+{dailyXp} XP · {durMin + maDurMin}m training</span>
                            </div>
                        )}
                    </>
                )}
                {w.showFreestylePrompt && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="w-full max-w-sm rounded-2xl border border-[var(--fg-08)] bg-[var(--bg-card)] p-5">
                            <p className="text-sm font-semibold text-[var(--fg-85)] mb-2">
                                Save as {new Date().toLocaleDateString(undefined, { weekday: "long" })} workout?
                            </p>
                            <p className="text-[11px] text-[var(--fg-35)] mb-4">
                                It&apos;ll repeat every {new Date().toLocaleDateString(undefined, { weekday: "long" })} automatically.
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => w.setShowFreestylePrompt(false)} className="flex-1 text-sm font-medium py-2.5 rounded-xl border border-[var(--fg-08)] text-[var(--fg-50)] hover:text-[var(--fg-80)] transition">No Thanks</button>
                                <button onClick={w.saveFreestyleAsRecurringPlan} disabled={w.savingFreestylePlan} className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-[rgb(var(--accent-rgb))] text-black hover:brightness-110 disabled:opacity-50 transition">{w.savingFreestylePlan ? "Saving..." : "Yes, Save"}</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    })() : null;

    // Freestyle mode — pick exercises then begin
    if (sessionFreestyle) {
        return (
            <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-24 relative">
                <div className="relative z-10 max-w-xl mx-auto px-4 pt-6">
                    <button onClick={w.goBackFromFreestyle} className="text-[10px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] transition mb-4">← Back</button>
                    <h1 className="text-xl font-bold font-display text-[rgb(var(--accent-light-rgb))] mb-1">Freestyle Session</h1>
                    <p className="text-[11px] text-[var(--fg-30)] mb-5">Pick exercises and start training</p>
                    <div className="flex gap-2 mb-4">
                        <button onClick={() => w.setShowFreestyleAddModal(true)} className="flex-1 flex items-center justify-center gap-2 text-sm font-medium py-3 rounded-xl border border-[rgb(var(--accent-rgb)/0.2)] bg-[rgb(var(--accent-rgb)/0.05)] text-[rgb(var(--accent-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.1)] transition">
                            <Plus size={16} /> Add Exercise
                        </button>
                        {w.freestyleExercises.length === 0 && (
                            <button onClick={w.repeatLastSession} className="flex items-center justify-center gap-1.5 text-sm font-medium py-3 px-4 rounded-xl border border-[var(--fg-10)] text-[var(--fg-50)] hover:text-[var(--fg-80)] hover:bg-[var(--fg-05)] transition">
                                <Repeat2 size={14} /> Repeat Last
                            </button>
                        )}
                    </div>
                    {w.freestyleExercises.length === 0 ? (
                        <div className="text-center py-10"><p className="text-[11px] text-[var(--fg-25)]">No exercises added yet.</p></div>
                    ) : (
                        <div className="space-y-2 mb-6">
                            {w.freestyleExercises.map((ex, i) => (
                                <div key={ex.id} className="flex items-center gap-3 glass-card px-4 py-3">
                                    <span className="text-[10px] font-mono text-[var(--fg-20)] w-5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-[var(--fg-80)] truncate">{ex.name}</p>
                                        <p className="text-[9px] font-mono text-[var(--fg-25)]">{ex.body_segment}</p>
                                    </div>
                                    <button onClick={() => w.removeFreestyleExercise(ex.id)} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--fg-20)] hover:text-red-400 transition"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    {w.freestyleExercises.length > 0 && (
                        <button onClick={w.beginFreestyleSession} disabled={w.startingFreestyle} className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3.5 rounded-xl bg-[rgb(var(--accent-rgb))] text-black hover:brightness-110 disabled:opacity-50 transition">
                            <Play size={16} fill="black" /> {w.startingFreestyle ? "Starting..." : "Begin Session"}
                        </button>
                    )}
                </div>
                {w.showFreestyleAddModal && <AddExerciseModal onAdd={(ex: any) => w.addFreestyleExercise(ex)} onClose={() => w.setShowFreestyleAddModal(false)} existingIds={new Set(w.freestyleExercises.map((e) => e.exercise_id))} />}
            </main>
        );
    }

    return (
        <main className="relative min-h-screen w-full max-w-full bg-[var(--bg-primary)] text-[var(--text-primary)] pb-36 md:pb-10 overflow-x-hidden"
            onTouchStart={handlePullStart} onTouchMove={handlePullMove} onTouchEnd={handlePullEnd}>
            {/* #25 Pull-to-refresh indicator */}
            {pullProgress > 0 && (
                <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-3 pointer-events-none" style={{ opacity: pullProgress }}>
                    <div className={`w-8 h-8 rounded-full border-2 border-[rgb(var(--accent-rgb))] flex items-center justify-center ${isRefreshing ? "animate-spin" : ""}`} style={{ transform: `rotate(${pullProgress * 360}deg)` }}>
                        <RefreshCw size={14} className="text-[rgb(var(--accent-light-rgb))]" />
                    </div>
                </div>
            )}
            <PrBurst trigger={w.prCount} />
            <div className="w-full max-w-xl mx-auto px-5 md:px-10 pt-5 md:pt-10 space-y-5">
                <SwipeNav sections={getTrainSections(enabledKeys)} />

                {/* ═══ COMPLETED SESSION (collapsed/expanded) ═══ */}
                {completedSummaryCard}

                {/* ═══ SKELETON LOADING (#26) ═══ */}
                {!w.hasLoaded && (!recurringLoaded || w.loadHint === "active") && (
                    <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="schedule-skeleton w-24 h-4" />
                            <div className="flex-1" />
                            <div className="schedule-skeleton w-7 h-7 rounded-lg" />
                        </div>
                        <div className="schedule-skeleton w-48 h-6" />
                        <div className="schedule-skeleton w-32 h-3" />
                        <div className="flex gap-2">
                            <div className="schedule-skeleton w-20 h-7 rounded-lg" />
                            <div className="schedule-skeleton w-16 h-7 rounded-lg" />
                            <div className="schedule-skeleton w-14 h-7 rounded-lg" />
                        </div>
                        <div className="schedule-skeleton w-full h-12 rounded-xl" />
                    </div>
                )}

                {/* ═══ HERO SECTION ═══ */}
                {gymSessionReady && w.status !== "active" && (
                    <div key={`hero-${w.status}`} ref={heroRef} className="rounded-2xl border overflow-hidden relative schedule-grain" style={{
                        background: w.status === "not_started" ? dayPhaseGradient : "linear-gradient(135deg, rgb(var(--fg-03)) 0%, rgb(var(--fg-02)) 100%)",
                        animation: w.status === "not_started" ? "stateFadeIn 0.4s ease-out both, hero-breathe 4s ease-in-out 0.4s infinite" : "stateFadeIn 0.4s ease-out both",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        transform: `translateY(${Math.min(scrollY * 0.08, 30)}px) scale(${1 - Math.min(scrollY * 0.0003, 0.03)})`,
                    }}>
                        {/* Pre-session: clean title + Begin Session */}
                        {w.status === "not_started" && (
                            <div className="p-5 relative z-[1]">
                                {/* Greeting + clock row (#5, #12) */}
                                <div className="flex items-center gap-2 mb-1.5">
                                    <DayPhaseIcon size={13} className="text-[var(--fg-20)]" />
                                    <span className="text-[11px] font-medium text-[var(--fg-35)]">{greeting}</span>
                                    <span className="text-[var(--fg-10)]">·</span>
                                    <span className="text-[11px] font-mono text-[var(--fg-20)] tabular-nums">
                                        {clockTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                                    </span>
                                    <div className="flex-1" />
                                    <button onClick={() => setEditorWeekday(todayWd)} className="w-7 h-7 rounded-lg border border-[var(--fg-08)] flex items-center justify-center text-[var(--fg-25)] hover:text-[var(--fg-50)] hover:border-[var(--fg-15)] active:scale-95 transition">
                                        <Calendar size={12} />
                                    </button>
                                    <button onClick={() => w.setStatus("freestyle")} className="w-7 h-7 rounded-lg border border-[var(--fg-08)] flex items-center justify-center text-[var(--fg-25)] hover:text-[var(--fg-50)] hover:border-[var(--fg-15)] active:scale-95 transition">
                                        <Zap size={12} />
                                    </button>
                                </div>
                                <p className="text-[9px] font-mono tracking-widest text-[var(--fg-25)] mb-0.5">{todayName}</p>
                                {/* Title with letter-spacing animation (#13) */}
                                <h1 className="text-xl font-bold text-[var(--fg-90)] leading-snug" style={{ animation: "title-spacing 0.6s ease-out both" }}>
                                    {w.dayTitle || todayPlan?.template_name || "Today"}
                                </h1>
                                {/* Motivational line (#6) */}
                                <p className="text-[10px] text-[var(--fg-20)] mt-0.5 italic">{motiveLine}</p>
                                {/* Streak flame + milestone celebration (#19, #29) */}
                                {currentStreak > 0 && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <span style={{ transform: `scale(${streakScale})`, transformOrigin: "left center", transition: "transform 0.3s ease" }}>
                                            <Flame size={12} className={currentStreak > 14 ? "text-orange-400" : currentStreak > 7 ? "text-orange-400/80" : "text-orange-400/60"} />
                                        </span>
                                        <span className={`text-[10px] font-mono font-bold ${currentStreak > 14 ? "text-orange-400" : currentStreak > 7 ? "text-orange-400/80" : "text-orange-400/60"}`}>{currentStreak} day streak</span>
                                        {/* Milestone badges at 7, 14, 30 (#29) */}
                                        {(currentStreak === 7 || currentStreak === 14 || currentStreak === 30) && (
                                            <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-400/15 text-orange-300 border border-orange-400/20" style={{ animation: "confetti-pop 0.5s ease-out both" }}>
                                                {currentStreak === 7 ? "🔥 WEEK" : currentStreak === 14 ? "🔥🔥 FORTNIGHT" : "🔥🔥🔥 MONTH"}
                                            </span>
                                        )}
                                        {currentStreak > 14 && (
                                            <span className="relative">
                                                {[0, 1, 2].map(i => (
                                                    <span key={i} className="absolute w-1 h-1 rounded-full bg-orange-400" style={{ left: `${i * 4}px`, top: "-2px", animation: `ember-float 1.${i + 2}s ease-out infinite`, animationDelay: `${i * 0.3}s` }} />
                                                ))}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {/* Training age indicator (#34) */}
                                {w.sessionCount > 0 && (
                                    <p className="text-[8px] font-mono text-[var(--fg-15)] mt-1">Session #{w.sessionCount + 1} of {w.dayTitle || todayPlan?.template_name || "program"}</p>
                                )}
                                {/* Muscle map dual view + badges (#35) */}
                                {hitMuscles.length > 0 && (
                                    <div className="mt-3">
                                        <div className="mx-auto" style={{ maxWidth: 220 }}>
                                            <MuscleHeatMap muscles={hitMuscles} height={140} compact dualView showToggle={false} />
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-1 justify-center">
                                            {todayMuscles.map((m) => {
                                                const rgb = MUSCLE_COLORS[m] || MUSCLE_COLORS.Other;
                                                return (
                                                    <span key={m} className="text-[7px] font-mono font-bold px-2 py-0.5 rounded-full tracking-wide" style={{
                                                        color: `rgb(${rgb})`,
                                                        background: `rgb(${rgb} / 0.08)`,
                                                    }}>{m}</span>
                                                );
                                            })}
                                        </div>
                                        {lastSessionInfo && (
                                            <p className="text-[8px] font-mono text-[var(--fg-20)] mt-1.5 text-center">
                                                Last {lastSessionInfo.title}: {lastSessionInfo.daysAgo === 0 ? "today" : lastSessionInfo.daysAgo === 1 ? "yesterday" : `${lastSessionInfo.daysAgo}d ago`}
                                                {lastSessionInfo.volume > 0 && ` · ${Math.round(kgToUnitW(lastSessionInfo.volume, w.weightUnit)).toLocaleString()}${w.weightUnit}`}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {/* Stats pills with counter animation (#18) */}
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-[var(--fg-04)] text-[var(--fg-40)] border border-[var(--fg-06)]" style={statsAnimated ? { animation: "countUp 0.4s ease-out 0.1s both" } : { opacity: 0 }}>{w.exercisesList.length} exercises</span>
                                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-[var(--fg-04)] text-[var(--fg-40)] border border-[var(--fg-06)]" style={statsAnimated ? { animation: "countUp 0.4s ease-out 0.2s both" } : { opacity: 0 }}>{w.totalPlanned} sets</span>
                                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-[var(--fg-04)] text-[var(--fg-40)] border border-[var(--fg-06)]" style={statsAnimated ? { animation: "countUp 0.4s ease-out 0.3s both" } : { opacity: 0 }}>~{Math.round(w.totalPlanned * 2.5)}m</span>
                                </div>
                                {/* Week progress ring with tick marks + dots (#2, #28) */}
                                {recurringLoaded && hasPlan && (() => {
                                    const weekPct = trainingDays > 0 ? completedThisWeek / trainingDays : 0;
                                    const miniR = 12;
                                    const miniC = 2 * Math.PI * miniR;
                                    return (
                                        <div className="flex items-center gap-2 mt-3">
                                            <div className="relative shrink-0">
                                                <svg width="30" height="30" viewBox="0 0 30 30" className="-rotate-90">
                                                    <circle cx="15" cy="15" r={miniR} fill="none" stroke="rgb(var(--fg-06))" strokeWidth="2.5" />
                                                    {/* Tick marks at each day position (#28) */}
                                                    {Array.from({ length: trainingDays }).map((_, i) => {
                                                        const angle = (i / trainingDays) * Math.PI * 2 - Math.PI / 2;
                                                        const x1 = 15 + (miniR - 2) * Math.cos(angle);
                                                        const y1 = 15 + (miniR - 2) * Math.sin(angle);
                                                        const x2 = 15 + (miniR + 2) * Math.cos(angle);
                                                        const y2 = 15 + (miniR + 2) * Math.sin(angle);
                                                        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgb(var(--fg-rgb) / 0.08)" strokeWidth="0.5" />;
                                                    })}
                                                    <circle cx="15" cy="15" r={miniR} fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="2.5" strokeLinecap="round"
                                                        strokeDasharray={miniC} strokeDashoffset={miniC * (1 - weekPct)}
                                                        style={{ "--ring-total": `${miniC}`, "--ring-offset": `${miniC * (1 - weekPct)}`, animation: "ring-draw 1s ease-out 0.5s both" } as React.CSSProperties} />
                                                </svg>
                                                <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold font-mono text-[rgb(var(--accent-light-rgb))]">{completedThisWeek}</span>
                                            </div>
                                            <div className="flex items-center gap-1 flex-1">
                                                {WEEKDAY_ORDER.map((wd) => {
                                                    const dayPlans = recurringPlans[wd] ?? [];
                                                    const hasTraining = dayPlans.some(p => !p.is_rest);
                                                    const doneWd = completedDays.has(wd);
                                                    const isT = wd === todayWd;
                                                    return (
                                                        <div key={wd} className="flex flex-col items-center gap-0.5 flex-1">
                                                            <span className={`text-[6px] font-mono ${isT ? "text-[rgb(var(--accent-light-rgb))] font-bold" : "text-[var(--fg-20)]"}`}>{WEEKDAY_LABELS[wd].charAt(0)}</span>
                                                            <div className={`w-full h-1 rounded-full ${doneWd ? "bg-[rgb(var(--accent-rgb))]" : isT ? "bg-[rgb(var(--accent-rgb)/0.3)]" : hasTraining ? "bg-[var(--fg-10)]" : "bg-[var(--fg-06)]"}`} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <span className="text-[9px] font-mono text-[var(--fg-25)] shrink-0">{completedThisWeek}/{trainingDays}</span>
                                        </div>
                                    );
                                })()}
                                {/* #15 Weekly volume distribution bar */}
                                {Object.keys(completedDaySummaries).length > 0 && (() => {
                                    const maxVol = Math.max(...Object.values(completedDaySummaries).map(s => s.volume), 1);
                                    return (
                                        <div className="flex items-end gap-0.5 mt-2 h-6">
                                            {WEEKDAY_ORDER.map(wd => {
                                                const vol = completedDaySummaries[wd]?.volume || 0;
                                                const pct = vol > 0 ? Math.max(vol / maxVol * 100, 8) : 0;
                                                return (
                                                    <div key={wd} className="flex-1 flex flex-col items-center gap-0.5">
                                                        <div className="w-full rounded-t-sm" style={{
                                                            height: vol > 0 ? `${pct}%` : "2px",
                                                            background: vol > 0 ? "rgb(var(--accent-rgb) / 0.5)" : "var(--fg-06)",
                                                            transition: "height 0.5s ease-out",
                                                        }} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                                {/* Begin Session / Weigh-in */}
                                {!showWeighIn ? (
                                    <div className="mt-4 space-y-2">
                                        <button onClick={() => { try { navigator?.vibrate?.(10); } catch {} setShowWeighIn(true); }} className="w-full flex items-center justify-center gap-2.5 text-[15px] font-bold py-3.5 rounded-xl text-black hover:brightness-110 active:scale-[0.98] transition-all relative overflow-hidden" style={{ background: "rgb(var(--accent-rgb))", animation: "begin-pulse 2.5s ease-in-out infinite" }}>
                                            <div className="absolute inset-0 rounded-xl" style={{ boxShadow: "0 0 30px rgb(var(--accent-rgb) / 0.25), 0 0 60px rgb(var(--accent-rgb) / 0.1)" }} />
                                            <Play size={18} fill="black" className="relative z-[1]" /> <span className="relative z-[1]">Begin Session</span>
                                        </button>
                                        {/* Quick actions (#16, #17, #21) */}
                                        <div className="flex items-center justify-center gap-3">
                                            <button onClick={() => w.setStatus("freestyle")} className="text-[10px] font-mono text-[var(--fg-20)] hover:text-[var(--fg-40)] py-1 transition">
                                                different workout →
                                            </button>
                                            <span className="text-[var(--fg-10)]">·</span>
                                            <button onClick={() => setSwapDayOpen(true)} className="text-[10px] font-mono text-[var(--fg-20)] hover:text-[var(--fg-40)] py-1 transition">
                                                swap day
                                            </button>
                                            <span className="text-[var(--fg-10)]">·</span>
                                            <button onClick={() => setSkipConfirm(true)} className="text-[10px] font-mono text-[var(--fg-20)] hover:text-red-400/60 py-1 transition">
                                                skip
                                            </button>
                                        </div>
                                        {/* #17 Skip confirmation */}
                                        {skipConfirm && (
                                            <div className="flex items-center gap-2 justify-center py-1" style={{ animation: "fadeSlideIn 0.2s ease-out both" }}>
                                                <span className="text-[10px] font-mono text-[var(--fg-40)]">Skip today?</span>
                                                <button onClick={handleSkipToday} className="text-[9px] font-mono px-3 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition">Yes</button>
                                                <button onClick={() => setSkipConfirm(false)} className="text-[9px] font-mono px-3 py-1 rounded-lg bg-[var(--fg-06)] text-[var(--fg-40)] hover:text-[var(--fg-60)] transition">No</button>
                                            </div>
                                        )}
                                        {/* #16 Swap day picker */}
                                        {swapDayOpen && (
                                            <div className="flex flex-wrap items-center gap-1.5 justify-center py-1" style={{ animation: "fadeSlideIn 0.2s ease-out both" }}>
                                                <span className="text-[9px] font-mono text-[var(--fg-30)] mr-1">Swap with:</span>
                                                {WEEKDAY_ORDER.filter(wd => wd !== todayWd).map(wd => (
                                                    <button key={wd} onClick={() => handleSwapDay(wd)} className="text-[9px] font-mono px-2 py-1 rounded-md bg-[var(--fg-06)] text-[var(--fg-40)] hover:text-[var(--fg-70)] hover:bg-[var(--fg-10)] transition">
                                                        {WEEKDAY_LABELS[wd]}
                                                    </button>
                                                ))}
                                                <button onClick={() => setSwapDayOpen(false)} className="text-[var(--fg-20)] hover:text-[var(--fg-50)] ml-1"><X size={12} /></button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-4 rounded-xl border border-[var(--fg-08)] bg-[var(--fg-03)] p-4 space-y-3">
                                        <p className="text-[11px] font-mono text-[var(--fg-50)] text-center">Log today&apos;s body weight</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <input type="number" min="0" step="0.0001" onWheel={(e) => (e.target as HTMLElement).blur()} inputMode="decimal" value={w.preWorkoutWeight} onChange={(e) => {
                                                const v = e.target.value;
                                                if (v === "" || /^\d{0,3}(\.\d{0,4})?$/.test(v)) w.setPreWorkoutWeight(v);
                                            }} placeholder="—" autoFocus
                                                className="w-32 h-10 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-lg font-bold font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] transition" />
                                            <span className="text-[11px] font-mono text-[var(--fg-25)]">{w.weightUnit}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={async () => {
                                                setSessionLaunching(true);
                                                setShowWeighIn(false);
                                                await w.startWorkout();
                                                setTimeout(() => setSessionLaunching(false), 600);
                                            }} disabled={sessionLaunching} className="flex-1 text-[11px] font-mono py-2 rounded-lg border border-[var(--fg-08)] text-[var(--fg-40)] hover:text-[var(--fg-60)] hover:border-[var(--fg-15)] active:scale-[0.98] transition">
                                                Skip
                                            </button>
                                            <button onClick={async () => {
                                                if (w.preWorkoutWeight) w.logBodyWeight();
                                                setSessionLaunching(true);
                                                setShowWeighIn(false);
                                                await w.startWorkout();
                                                setTimeout(() => setSessionLaunching(false), 600);
                                            }} disabled={sessionLaunching || !w.preWorkoutWeight} className="flex-[2] flex items-center justify-center gap-1.5 text-[13px] font-bold py-2 rounded-lg bg-[rgb(var(--accent-rgb))] text-black hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40">
                                                <Play size={14} fill="black" /> Log & Start
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Pre-session checklist (#22) + Warm-up suggestion (#23) */}
                {gymSessionReady && w.status === "not_started" && !checklistDismissed && (
                    <div className="flex items-center gap-2 flex-wrap" style={{ animation: "fadeSlideIn 0.3s ease-out 0.2s both" }}>
                        {warmUpSuggestion && (
                            <div className="flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/[0.12] text-amber-300/70">
                                <Flame size={10} className="text-amber-400/60 shrink-0" />
                                <span className="truncate">{warmUpSuggestion.suggestion}</span>
                            </div>
                        )}
                        <button onClick={() => setChecklistDismissed(true)} className="text-[var(--fg-15)] hover:text-[var(--fg-30)] transition ml-auto shrink-0"><X size={12} /></button>
                    </div>
                )}

                {/* Toolbar row removed — Edit/Freestyle now inside hero card */}

                {/* ── Toolbar row (active session: body weight + edit) ── */}
                {gymSessionReady && w.status === "active" && (
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono text-[var(--fg-20)] shrink-0">BODY WEIGHT</span>
                        {w.weightLogged ? (
                            <span className="text-xs font-bold font-mono text-[var(--fg-60)]">{w.preWorkoutWeight} {w.weightUnit}</span>
                        ) : (
                            <>
                                <input type="number" min="0" step="0.0001" onWheel={(e) => (e.target as HTMLElement).blur()} inputMode="decimal" value={w.preWorkoutWeight} onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "" || /^\d{0,3}(\.\d{0,4})?$/.test(v)) w.setPreWorkoutWeight(v);
                                }} placeholder="—"
                                    className="w-20 h-7 rounded-md bg-[var(--fg-04)] border border-[var(--fg-06)] text-center text-xs font-bold font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.3)] transition" />
                                <span className="text-[8px] font-mono text-[var(--fg-15)]">{w.weightUnit}</span>
                                {w.preWorkoutWeight && (
                                    <button onClick={w.logBodyWeight} className="text-[8px] font-mono px-2 py-1 rounded-md border border-[rgb(var(--accent-rgb)/0.2)] text-[rgb(var(--accent-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.1)] transition">Log</button>
                                )}
                            </>
                        )}
                        {w.weightLogged && <Check size={11} className="text-[rgb(var(--accent-rgb))]" />}
                        <div className="flex-1" />
                        <button onClick={() => setEditorWeekday(todayWd)} className="text-[8px] font-mono text-[var(--fg-25)] hover:text-[var(--fg-50)] transition"><Calendar size={10} className="inline mr-0.5 -mt-px" />Edit</button>
                    </div>
                )}

                {/* ── Non-session header (rest/MA/no plan) ── */}
                {!gymSessionReady && w.hasLoaded && (
                    <>
                        <div className="pt-1">
                            <p className="text-[10px] font-mono tracking-widest text-[var(--fg-30)]">{todayName}</p>
                            <h1 className="text-2xl font-bold text-[var(--fg-90)] mt-0.5 leading-tight">
                                {todayIsRest ? "Rest Day" : todayIsMa && todayDisc ? todayDisc.name : todayPlan?.template_name || "No Plan Set"}
                            </h1>
                            {todayIsMa && todayStLabel && (
                                <p className="text-xs text-[var(--fg-40)] mt-0.5">{todayStLabel.emoji} {todayStLabel.name}</p>
                            )}
                            {todayIsRest && currentStreak > 0 && (
                                <p className="text-[10px] font-mono text-emerald-400/50 mt-1">Rest days keep your {currentStreak}-day streak alive.</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setEditorWeekday(todayWd)} className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-lg border border-[var(--fg-08)] text-[var(--fg-40)] hover:text-[var(--fg-70)] hover:border-[var(--fg-15)] active:scale-95 transition">
                                <Calendar size={12} /> Schedule
                            </button>
                            <button onClick={() => setPlanBrowserOpen(true)} className="flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-lg border border-[var(--fg-08)] text-[var(--fg-40)] hover:text-[var(--fg-70)] hover:border-[var(--fg-15)] active:scale-95 transition">
                                <BookOpen size={12} /> Plans
                            </button>
                            <div className="flex-1" />
                            {currentStreak > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                                    <Flame size={11} className="text-orange-400" />
                                    <span className="text-[10px] font-mono font-bold text-orange-300">{currentStreak}</span>
                                </div>
                            )}
                        </div>
                        {/* Rest day recovery tips (#2) */}
                        {todayIsRest && (
                            <div className="flex flex-wrap gap-1.5 mt-1" style={{ animation: "fadeSlideIn 0.3s ease-out 0.1s both" }}>
                                {["Sleep 7-9h", "Hydrate 3L+", "Foam roll", "Walk 20 min", "Protein 1.6g/kg"].map(tip => (
                                    <span key={tip} className="text-[8px] font-mono px-2 py-1 rounded-full bg-emerald-500/[0.06] border border-emerald-500/[0.1] text-emerald-400/50">{tip}</span>
                                ))}
                            </div>
                        )}
                        {/* No plan enhanced guidance (#20) */}
                        {!todayIsRest && !todayIsMa && !todayPlan?.template_name && (
                            <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] p-4 mt-2" style={{ animation: "fadeSlideIn 0.3s ease-out both" }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles size={14} className="text-[rgb(var(--accent-light-rgb))]" />
                                    <span className="text-[11px] font-medium text-[var(--fg-60)]">Get started</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setPlanBrowserOpen(true)} className="text-[10px] font-mono text-[var(--fg-40)] py-2 rounded-lg border border-[var(--fg-08)] hover:border-[var(--fg-15)] transition">Browse Plans</button>
                                    <button onClick={() => w.setStatus("freestyle")} className="text-[10px] font-mono py-2 rounded-lg border border-[rgb(var(--accent-rgb)/0.2)] text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.05)] transition">Build Custom</button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ═══ SESSION COUNTER PANEL (active session) ═══ */}
                {w.status === "active" && (() => {
                    const exVols: ExVolumeEntry[] = w.exercisesList.map((ex) => {
                        const sets = (w.logs[ex.id] ?? []).filter((s) => s.completed && !s.is_warmup);
                        const mult = isDualWeight(ex) ? 2 : 1;
                        const vol = sets.reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0) * mult, 0);
                        return { name: ex.name, volume: Math.round(kgToUnitW(vol, w.weightUnit)) };
                    }).filter((e) => e.volume > 0);
                    const lastVol = w.recentSessions.length > 0 ? Math.round(kgToUnitW(w.recentSessions[0].volume, w.weightUnit)) : 0;
                    const completionPct = w.totalPlanned > 0 ? w.completedCount / w.totalPlanned : 0;
                    const volPct = lastVol > 0 ? Math.min(Math.round(kgToUnitW(w.sessionVolume, w.weightUnit)) / lastVol, 1.5) / 1.5 : completionPct;
                    const qScore = w.completedCount > 0 ? Math.round(completionPct * 50 + volPct * 50) : 0;
                    return (
                        <SessionCounterPanel
                            sets={w.completedCount}
                            totalSets={w.totalPlanned}
                            volume={Math.round(kgToUnitW(w.sessionVolume, w.weightUnit))}
                            elapsed={w.elapsed}
                            weightUnit={w.weightUnit}
                            lastDelta={Math.round(kgToUnitW(lastDelta, w.weightUnit))}
                            lastSessionVolume={lastVol}
                            exerciseVolumes={exVols}
                            qualityScore={qScore}
                        />
                    );
                })()}

                {/* ═══ SESSION TIMELINE RIBBON + TRAY TOGGLE ═══ */}
                {w.status === "active" && w.exercisesList.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-[var(--fg-04)]">
                            {w.exercisesList.map((ex) => {
                                const sets = w.logs[ex.id] ?? [];
                                const total = sets.filter(s => !s.is_warmup).length;
                                const done = sets.filter(s => s.completed && !s.is_warmup).length;
                                const pct = total > 0 ? done / total : 0;
                                const discColor = ex.discipline && ex.discipline !== "strength" && DISCIPLINE_COLORS[ex.discipline] ? DISCIPLINE_COLORS[ex.discipline] : null;
                                return (
                                    <div key={ex.id} className="flex-1 rounded-full overflow-hidden transition-all duration-500" style={{
                                        background: pct >= 1 ? (discColor ? `${discColor}99` : "rgb(var(--accent-rgb) / 0.6)") : pct > 0 ? (discColor ? `${discColor}40` : "rgb(var(--accent-rgb) / 0.25)") : "transparent",
                                    }} />
                                );
                            })}
                        </div>
                        <button onClick={() => setExerciseTrayOpen(!exerciseTrayOpen)} className="w-7 h-7 rounded-lg border border-[var(--fg-08)] flex items-center justify-center shrink-0 hover:bg-[var(--fg-05)] active:scale-95 transition" title="Exercise tray">
                            <LayoutGrid size={13} className="text-[var(--fg-30)]" />
                        </button>
                    </div>
                )}

                {/* ═══ 6.5 FLOW STATE INDICATOR ═══ */}
                {inFlowState && w.status === "active" && (
                    <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-amber-400/[0.06] border border-amber-400/15">
                        <Zap size={10} className="text-amber-400" />
                        <p className="text-[9px] font-mono font-bold text-amber-400/70 tracking-wider">FLOW STATE — UI MINIMIZED</p>
                        <Zap size={10} className="text-amber-400" />
                    </div>
                )}

                {/* ═══ 6.3 GHOST PACE LINE + 6.4 MOMENTUM METER ═══ */}
                {w.status === "active" && !inFlowState && (ghostPace || momentum > 0) && (
                    <div className="flex items-center gap-3">
                        {ghostPace && ghostPace.lastSetsAtTime > 0 && (
                            <div className="flex items-center gap-1.5 text-[8px] font-mono text-[var(--fg-20)]">
                                <span className="w-3 border-t border-dashed border-[var(--fg-15)]" />
                                <span>Last pace: {ghostPace.lastSetsAtTime} sets</span>
                                <span className={ghostPace.currentSets > ghostPace.lastSetsAtTime ? "text-emerald-400/60" : ghostPace.currentSets < ghostPace.lastSetsAtTime ? "text-red-400/50" : "text-[var(--fg-20)]"}>
                                    {ghostPace.currentSets > ghostPace.lastSetsAtTime ? `+${ghostPace.currentSets - ghostPace.lastSetsAtTime} ahead` : ghostPace.currentSets < ghostPace.lastSetsAtTime ? `${ghostPace.lastSetsAtTime - ghostPace.currentSets} behind` : "on pace"}
                                </span>
                            </div>
                        )}
                        {momentum > 0 && (
                            <div className="flex items-center gap-1.5 ml-auto">
                                <Zap size={9} className={momentum >= 80 ? "text-amber-400" : momentum >= 40 ? "text-[rgb(var(--accent-rgb)/0.5)]" : "text-[var(--fg-15)]"} />
                                <div className="w-16 h-1 rounded-full bg-[var(--fg-06)] overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700" style={{
                                        width: `${momentum}%`,
                                        background: momentum >= 80 ? "rgb(251 191 36 / 0.8)" : momentum >= 40 ? "rgb(var(--accent-rgb) / 0.5)" : "rgb(var(--fg-rgb) / 0.15)",
                                    }} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ EXERCISE TRAY (4.1) ═══ */}
                {exerciseTrayOpen && w.status === "active" && (
                    <div className="rounded-xl border border-[var(--fg-08)] bg-[var(--bg-card)] p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[9px] font-mono tracking-widest text-[var(--fg-20)]">ALL EXERCISES</p>
                            <button onClick={() => setExerciseTrayOpen(false)} className="text-[var(--fg-30)] hover:text-[var(--fg-60)]"><X size={14} /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                            {w.exercisesList.map(ex => {
                                const sets = (w.logs[ex.id] ?? []).filter(s => !s.is_warmup);
                                const done = sets.filter(s => s.completed).length;
                                const total = sets.length;
                                const isSkipped = w.skippedExercises.has(ex.id);
                                const isConfirmed = w.confirmedExercises.has(ex.id);
                                const isActive = w.expandedId === ex.id;
                                const discColor = ex.discipline && ex.discipline !== "strength" ? DISCIPLINE_COLORS[ex.discipline] : null;
                                return (
                                    <button key={ex.id} onClick={() => { w.setExpandedId(ex.id); setExerciseTrayOpen(false); }}
                                        className={`text-left rounded-lg p-2 border transition active:scale-95 ${isActive ? "border-[rgb(var(--accent-rgb)/0.4)] bg-[rgb(var(--accent-rgb)/0.06)]" : isConfirmed ? "border-emerald-500/20 bg-emerald-500/5" : isSkipped ? "border-[var(--fg-06)] bg-[var(--fg-02)] opacity-40" : "border-[var(--fg-06)] bg-[var(--fg-02)] hover:border-[var(--fg-10)]"}`}>
                                        <div className="flex items-center gap-1 mb-0.5">
                                            {discColor && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: discColor }} />}
                                            <p className="text-[9px] font-medium text-[var(--fg-60)] truncate leading-tight">{ex.name}</p>
                                        </div>
                                        <p className="text-[8px] font-mono text-[var(--fg-25)]">{isSkipped ? "skipped" : isConfirmed ? "done" : `${done}/${total}`}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ═══ IDLE NUDGE (4.5) ═══ */}
                {idleNudge && w.status === "active" && !w.sessionPaused && w.restRemaining === null && !inFlowState && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-blue-500/[0.06] border border-blue-500/12 animate-[fadeInUp_0.3s_ease]">
                        <Lightbulb size={12} className="text-blue-400/60 shrink-0" />
                        {idleNudge === "later" ? (
                            <p className="text-[9px] font-mono text-blue-300/60 flex-1">Stuck? Try <button onClick={() => { if (w.expandedId) w.laterExercise(w.expandedId); setIdleNudge(null); }} className="underline font-semibold text-blue-300/80">Later</button> to move this to the end</p>
                        ) : (
                            <p className="text-[9px] font-mono text-blue-300/60 flex-1">Been a while — <button onClick={() => { w.setSessionPaused(true); setIdleNudge(null); }} className="underline font-semibold text-blue-300/80">Pause session?</button></p>
                        )}
                        <button onClick={() => setIdleNudge(null)} className="shrink-0 text-[var(--fg-20)] hover:text-[var(--fg-50)] transition"><X size={12} /></button>
                    </div>
                )}

                {/* ═══ FIRST-SESSION FLEX TOOLTIP (4.6) ═══ */}
                {flexTooltipShown && w.status === "active" && w.completedCount === 0 && !inFlowState && (() => { try { return !localStorage.getItem("sevel_flex_tooltip_dismissed"); } catch { return true; } })() && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-violet-500/[0.06] border border-violet-500/12 animate-[fadeInUp_0.3s_ease]">
                        <Info size={12} className="text-violet-400/60 shrink-0" />
                        <p className="text-[9px] font-mono text-violet-300/60 flex-1">New: use <span className="font-semibold text-violet-300/80">Later</span> to push exercises back, <span className="font-semibold text-violet-300/80">Skip</span> to skip, or tap <LayoutGrid size={9} className="inline -mt-0.5" /> for the exercise tray</p>
                        <button onClick={() => { try { localStorage.setItem("sevel_flex_tooltip_dismissed", "1"); } catch {} setFlexTooltipShown(false); }} className="shrink-0 text-[var(--fg-20)] hover:text-[var(--fg-50)] transition"><X size={12} /></button>
                    </div>
                )}

                {/* ═══ SMART NEXT SUGGESTION (4.4) ═══ */}
                {smartNext && w.status === "active" && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-emerald-500/[0.06] border border-emerald-500/12 animate-[fadeInUp_0.3s_ease]">
                        <ChevronRight size={12} className="text-emerald-400/60 shrink-0" />
                        <p className="text-[9px] font-mono text-emerald-300/60 flex-1">Up next: <span className="font-semibold text-emerald-300/80">{smartNext.name}</span>{smartNext.muscle ? ` · ${smartNext.muscle}` : ""}</p>
                        <button onClick={() => setSmartNext(null)} className="shrink-0 text-[var(--fg-20)] hover:text-[var(--fg-50)] transition"><X size={12} /></button>
                    </div>
                )}

                {/* ═══ CROSS-TYPE INTELLIGENCE (5.3) ═══ */}
                {w.status === "active" && w.completedCount > 0 && !inFlowState && (() => {
                    const completedSegs = w.exercisesList.filter(ex => {
                        const sets = (w.logs[ex.id] ?? []).filter(s => s.completed && !s.is_warmup);
                        return sets.length > 0;
                    }).map(ex => ex.body_segment);
                    const currentEx = w.exercisesList.find(e => e.id === w.expandedId);
                    const lastCompletedSeg = completedSegs[completedSegs.length - 1];
                    const currentSeg = currentEx?.body_segment;

                    const transitionTip = lastCompletedSeg && currentSeg && lastCompletedSeg !== currentSeg
                        ? TRANSITION_TIPS[lastCompletedSeg]?.[currentSeg] : null;
                    if (transitionTip) {
                        return (
                            <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-cyan-500/[0.04] border border-cyan-500/12">
                                <Zap size={11} className="text-cyan-400/60 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-mono text-cyan-300/60">{transitionTip.tip}</p>
                                    {transitionTip.restAdj !== 0 && (
                                        <p className="text-[8px] font-mono mt-0.5" style={{ color: transitionTip.restAdj > 0 ? "rgba(251,191,36,0.5)" : "rgba(52,211,153,0.5)" }}>
                                            Rest: {transitionTip.restAdj > 0 ? "+" : ""}{transitionTip.restAdj}s recommended
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    const segSet = new Set(completedSegs);
                    const tip = Array.from(segSet).map(seg => CROSS_TYPE_TIPS[seg]).find(Boolean);
                    return tip ? (
                        <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-cyan-500/[0.04] border border-cyan-500/12">
                            <Zap size={11} className="text-cyan-400/60 shrink-0" />
                            <p className="text-[9px] font-mono text-cyan-300/60">{tip}</p>
                        </div>
                    ) : null;
                })()}

                {/* Fatigue pill moved below exercise preview */}

                {/* ═══ CYCLE TRAINING BANNER (compact) ═══ */}
                {w.cycleProfile && (w.status === "not_started" || w.status === "active") && (
                    <div className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                        w.cycleProfile.banner.color === "rose" ? "bg-rose-500/[0.04] border border-rose-500/12" :
                        w.cycleProfile.banner.color === "emerald" ? "bg-emerald-500/[0.04] border border-emerald-500/12" :
                        w.cycleProfile.banner.color === "amber" ? "bg-amber-500/[0.04] border border-amber-500/12" :
                        "bg-violet-500/[0.04] border border-violet-500/12"
                    }`}>
                        <div className="flex-1 min-w-0">
                            <p className={`text-[10px] font-mono font-medium ${
                                w.cycleProfile.banner.color === "rose" ? "text-rose-300/80" :
                                w.cycleProfile.banner.color === "emerald" ? "text-emerald-300/80" :
                                w.cycleProfile.banner.color === "amber" ? "text-amber-300/80" : "text-violet-300/80"
                            }`}>{w.cycleProfile.banner.headline}</p>
                        </div>
                        <span className={`text-xs font-bold font-mono shrink-0 ${w.cycleProfile.intensityModifier >= 1.0 ? "text-emerald-400" : w.cycleProfile.intensityModifier >= 0.85 ? "text-amber-400" : "text-rose-400"}`}>{Math.round(w.cycleProfile.intensityModifier * 100)}%</span>
                    </div>
                )}

                {/* BEGIN SESSION CTA — merged into hero card above */}

                {/* ═══ EXERCISE ROTATION (not_started) ═══ */}
                {gymSessionReady && w.status === "not_started" && w.statsLoaded && w.staleExercises.length > 0 && (
                    <RotationCard exercises={w.staleExercises} onSwap={(exId, exName) => {
                        const staleEx = w.staleExercises.find(s => s.id === exId);
                        const swapTarget = staleEx ? w.exercisesList.find(e => e.exercise_id === staleEx.id) ?? w.exercisesList.find(e => e.body_segment === staleEx.body_segment) : null;
                        if (swapTarget) w.handleSwap(swapTarget, { id: exId, name: exName });
                    }} currentExerciseIds={new Set(w.exercisesList.map(e => e.exercise_id))} />
                )}

                {/* ═══ EXERCISE PREVIEW (not_started — enhanced cards) ═══ */}
                {gymSessionReady && w.status === "not_started" && (
                    <div className="rounded-xl border border-[var(--fg-06)] bg-[var(--fg-02)] overflow-hidden relative fade-mask-y" style={{ marginTop: "-8px", position: "relative", zIndex: 1, boxShadow: "0 -4px 20px rgb(0 0 0 / 0.15)" }}>
                        {/* Compact toggle (#31) */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--fg-04)]">
                            <span className="text-[8px] font-mono tracking-widest text-[var(--fg-20)]">EXERCISES</span>
                            <button onClick={() => setCompactExercises(!compactExercises)} className="text-[8px] font-mono text-[var(--fg-20)] hover:text-[var(--fg-40)] transition flex items-center gap-1">
                                <LayoutGrid size={10} />
                                {compactExercises ? "Expand" : "Compact"}
                            </button>
                        </div>
                        {compactExercises ? (
                            <div className="grid grid-cols-2 gap-px bg-[var(--fg-04)]">
                                {w.exercisesList.map((ex, i) => {
                                    const muscleRgb = MUSCLE_COLORS[ex.body_segment] || MUSCLE_COLORS.Other;
                                    const last = w.lastPerformance[ex.exercise_id];
                                    return (
                                        <div key={ex.id} className="flex items-center gap-2 px-3 py-2 bg-[var(--fg-02)]"
                                            style={{ animation: heroMounted ? `fadeSlideIn 0.2s ease-out ${i * 0.02}s both` : "none" }}>
                                            <div className="w-0.5 h-3 rounded-full shrink-0" style={{ background: `rgb(${muscleRgb} / 0.5)` }} />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[10px] text-[var(--fg-60)] truncate block">{ex.name}</span>
                                            </div>
                                            <span className="text-[8px] font-mono text-[var(--fg-20)] shrink-0">{ex.target_sets}×{ex.target_reps || "?"}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                        w.exercisesList.map((ex, i) => {
                            const last = w.lastPerformance[ex.exercise_id];
                            const muscleRgb = MUSCLE_COLORS[ex.body_segment] || MUSCLE_COLORS.Other;
                            const discColor = ex.discipline && ex.discipline !== "strength" && DISCIPLINE_COLORS[ex.discipline] ? DISCIPLINE_COLORS[ex.discipline] : null;
                            const isFirst = i === 0;
                            const isPr = prExerciseIds.has(ex.id);
                            const delta = weightDeltas[ex.id];
                            const estMin = exerciseTimeEstimates[ex.id];
                            return (
                                <div key={ex.id} className={`flex items-center gap-3 px-4 exercise-row-press transition-all duration-150 cursor-default relative ${isFirst ? "py-3 bg-[rgb(var(--accent-rgb)/0.04)]" : "py-2.5"}`}
                                    style={{ animation: heroMounted ? `fadeSlideIn 0.3s ease-out ${i * 0.03}s both` : "none" }}>
                                    {i > 0 && <div className="absolute left-4 right-4 top-0 gradient-separator" />}
                                    <div className={`w-1 rounded-full shrink-0 ${isFirst ? "h-6" : "h-4"}`} style={{ background: isPr ? "linear-gradient(to bottom, #fbbf24, #f59e0b)" : isFirst ? "rgb(var(--accent-rgb) / 0.6)" : (discColor || `rgb(${muscleRgb} / 0.4)`) }} />
                                    {ex.image_url ? (
                                        <div className={`rounded-lg overflow-hidden border border-[var(--fg-06)] shrink-0 ${isFirst ? "w-9 h-9" : "w-7 h-7"}`}>
                                            <img src={ex.image_url} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className={`rounded-lg bg-[var(--fg-04)] border border-[var(--fg-06)] flex items-center justify-center text-[9px] font-mono text-[var(--fg-20)] shrink-0 ${isFirst ? "w-9 h-9" : "w-7 h-7"}`}>{String(i + 1).padStart(2, "0")}</div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <span className={`font-medium truncate block ${isFirst ? "text-[13px] text-[var(--fg-85)]" : "text-[12px] text-[var(--fg-70)]"}`}>{ex.name}</span>
                                        <span className="text-[8px] font-mono text-[var(--fg-20)] mt-px block">
                                            {ex.target_sets}×{ex.target_reps || "?"}{estMin ? ` · ~${estMin}m` : ""}
                                        </span>
                                    </div>
                                    {delta === "up" && <ArrowUp size={9} className="text-emerald-400 shrink-0" />}
                                    {delta === "down" && <ArrowDown size={9} className="text-red-400/60 shrink-0" />}
                                    {isPr && <Trophy size={10} className="text-amber-400 shrink-0" />}
                                    <span className="text-[9px] font-mono text-[var(--fg-25)] shrink-0 tabular-nums">
                                        {last && last.weight != null ? `${Math.round(kgToUnitW(last.weight, w.weightUnit))}${w.weightUnit}` : `${ex.target_sets}s`}
                                    </span>
                                    <GripVertical size={10} className="text-[var(--fg-10)] shrink-0 ml-0.5" />
                                </div>
                            );
                        })
                        )}
                    </div>
                )}

                {/* ═══ FATIGUE PILL (compact, dismissible) ═══ */}
                {w.status === "not_started" && fatigueAlerts.length > 0 && !fatigueDismissed && (
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${fatigueAlerts.some(a => a.severity === "critical") ? "bg-red-500/[0.06] border border-red-500/15" : "bg-amber-500/[0.06] border border-amber-500/15"}`}>
                        <Flame size={12} className={fatigueAlerts.some(a => a.severity === "critical") ? "text-red-400 shrink-0" : "text-amber-400 shrink-0"} />
                        <p className={`text-[10px] font-mono flex-1 min-w-0 ${fatigueAlerts.some(a => a.severity === "critical") ? "text-red-300/80" : "text-amber-300/80"}`}>{fatigueAlerts[0].message}</p>
                        <button onClick={() => setFatigueDismissed(true)} className="shrink-0 text-[var(--fg-20)] hover:text-[var(--fg-50)] transition"><X size={12} /></button>
                    </div>
                )}

                {/* ═══ INLINE EXERCISE LIST (active session only) ═══ */}
                {gymSessionReady && showExerciseList && (
                    <div className="space-y-2">

                        {/* Type-aware session summary (5.1) */}
                        {w.status === "active" && (() => {
                            const types = new Map<string, number>();
                            w.exercisesList.forEach(ex => {
                                const t = ex.discipline && ex.discipline !== "strength" ? ex.discipline : ex.body_segment === "Cardio" ? "cardio" : "gym";
                                types.set(t, (types.get(t) ?? 0) + 1);
                            });
                            if (types.size <= 1) return null;
                            return (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {Array.from(types.entries()).map(([t, count]) => {
                                        const dc = DISCIPLINE_COLORS[t];
                                        return (
                                            <span key={t} className="text-[8px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full border" style={{ color: dc || "rgb(var(--accent-light-rgb))", borderColor: dc ? `${dc}40` : "rgb(var(--accent-rgb) / 0.2)", background: dc ? `${dc}12` : "rgb(var(--accent-rgb) / 0.06)" }}>
                                                {t === "gym" ? "GYM" : t === "cardio" ? "CARDIO" : (DISCIPLINE_COLORS[t] ? t.toUpperCase().replace("_", " ").slice(0, 8) : t.toUpperCase())} ×{count}
                                            </span>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        {(w.status === "active" ? sortedExercises : w.exercisesList).map((ex, i) => {
                            const sets = w.logs[ex.id] ?? [];
                            const workingSetsOnly = sets.filter((s) => !s.is_warmup);
                            const warmupSetsOnly = sets.filter((s) => s.is_warmup);
                            const done = workingSetsOnly.filter((s) => s.completed).length;
                            const warmupDone = warmupSetsOnly.filter((s) => s.completed).length;
                            const isOpen = w.expandedId === ex.id;
                            const last = w.lastPerformance[ex.exercise_id];
                            const hint = w.overloadHints[ex.exercise_id];
                            const allDone = done === workingSetsOnly.length && workingSetsOnly.length > 0 && warmupDone === warmupSetsOnly.length;
                            const isSkipped = w.skippedExercises.has(ex.id);
                            const ghost = ghostSets[ex.exercise_id];

                            const prevEx = i > 0 ? w.exercisesList[i - 1] : null;
                            const showSupersetConnector = prevEx && prevEx.superset_group != null && prevEx.superset_group === ex.superset_group;

                            const focusedMode = w.status === "active" && !isOpen && !isSkipped;

                            if (focusedMode && allDone) {
                                return (
                                    <div key={ex.id} data-exercise-id={ex.id} onClick={() => w.setExpandedId(ex.id)} className="cursor-pointer">
                                    {showSupersetConnector && (
                                        <div className="flex items-center justify-center -my-1.5 relative z-10">
                                            <div className="w-px h-3 bg-fuchsia-400/20" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2.5 rounded-lg border border-[rgb(var(--accent-rgb)/0.12)] bg-[rgb(var(--accent-rgb)/0.03)] px-3 py-2">
                                        <div className="w-1 h-4 rounded-full bg-[rgb(var(--accent-rgb)/0.4)]" />
                                        <Check size={12} className="text-[rgb(var(--accent-rgb)/0.5)] shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[11px] font-medium text-[var(--fg-35)] truncate block">{ex.name}</span>
                                            {(() => {
                                                const bestSet = workingSetsOnly.filter(s => s.completed).reduce((best, s) => (!best || (Number(s.weight) || 0) > (Number(best.weight) || 0)) ? s : best, null as typeof workingSetsOnly[0] | null);
                                                if (bestSet?.weight) return <span className="text-[9px] font-mono text-[rgb(var(--accent-rgb)/0.4)]">Top: {bestSet.weight}{w.weightUnit} × {bestSet.reps}</span>;
                                                return null;
                                            })()}
                                        </div>
                                        <span className="text-[9px] font-mono text-[var(--fg-20)] shrink-0">{done}/{workingSetsOnly.length}</span>
                                    </div>
                                    </div>
                                );
                            }

                            if (focusedMode && !allDone) {
                                return (
                                    <div key={ex.id} data-exercise-id={ex.id} onClick={() => w.setExpandedId(ex.id)} className="cursor-pointer">
                                    {showSupersetConnector && (
                                        <div className="flex items-center justify-center -my-1.5 relative z-10">
                                            <div className="w-px h-3 bg-fuchsia-400/20" />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2.5 rounded-lg border border-[var(--fg-06)] bg-[var(--fg-02)] px-3 py-2.5">
                                        <div className="w-1 h-5 rounded-full" style={{ background: ex.discipline && ex.discipline !== "strength" && DISCIPLINE_COLORS[ex.discipline] ? `${DISCIPLINE_COLORS[ex.discipline]}59` : `rgb(${MUSCLE_COLORS[ex.body_segment] || MUSCLE_COLORS.Other} / 0.35)` }} />
                                        {ex.image_url ? (
                                            <div className="w-6 h-6 rounded overflow-hidden border border-[var(--fg-06)] shrink-0">
                                                <img src={ex.image_url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded bg-[var(--fg-04)] border border-[var(--fg-06)] flex items-center justify-center text-[8px] font-mono text-[var(--fg-20)] shrink-0">{String(i + 1).padStart(2, "0")}</div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[12px] font-medium text-[var(--fg-60)] truncate block">{ex.name}</span>
                                            {(() => {
                                                const lp = last;
                                                if (lp?.weight && lp.reps) return <span className="text-[9px] font-mono text-[var(--fg-20)]">Last: {lp.weight}{w.weightUnit} × {lp.reps}</span>;
                                                if (ex.target_weight) return <span className="text-[9px] font-mono text-[var(--fg-20)]">Target: {ex.target_weight}{w.weightUnit} × {ex.target_reps || "?"}</span>;
                                                if (ex.target_reps) return <span className="text-[9px] font-mono text-[var(--fg-20)]">{ex.target_reps} reps × {workingSetsOnly.length} sets</span>;
                                                return null;
                                            })()}
                                        </div>
                                        <span className="text-[9px] font-mono text-[var(--fg-25)] shrink-0">{done}/{workingSetsOnly.length}</span>
                                        <ChevronRight size={12} className="text-[var(--fg-15)] shrink-0" />
                                    </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={ex.id}>
                                {showSupersetConnector && (
                                    <div className="flex items-center justify-center -my-1.5 relative z-10">
                                        <div className="w-px h-3 bg-fuchsia-400/20" />
                                        <span className="absolute text-[7px] font-mono text-fuchsia-400/40 bg-[var(--bg-primary)] px-1">SUPERSET</span>
                                    </div>
                                )}
                                <div data-exercise-id={ex.id} className={`rounded-xl border overflow-hidden transition-all flex ${isSkipped ? "border-[var(--fg-04)] bg-[var(--fg-01)] opacity-50" : allDone ? "border-[rgb(var(--accent-rgb)/0.2)] bg-[rgb(var(--accent-rgb)/0.03)]" : isOpen ? "border-[var(--fg-10)] bg-[var(--fg-04)] shadow-lg shadow-black/10" : ex.superset_group != null ? "border-fuchsia-400/15 bg-[var(--fg-03)]" : "border-[var(--fg-06)] bg-[var(--fg-03)]"}`}
                                    onTouchStart={isOpen && w.status === "active" ? (e) => { swipeStartX.current = e.touches[0].clientX; swipeStartY.current = e.touches[0].clientY; } : undefined}
                                    onTouchEnd={isOpen && w.status === "active" ? (e) => {
                                        const dx = e.changedTouches[0].clientX - swipeStartX.current;
                                        const dy = e.changedTouches[0].clientY - swipeStartY.current;
                                        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) handleCardSwipe(dx < 0 ? "left" : "right");
                                    } : undefined}>
                                    {/* Type-aware accent bar (5.1) */}
                                    <div className="w-1 shrink-0 rounded-l-xl transition-all" style={{ background: isSkipped ? "transparent" : allDone ? "rgb(var(--accent-rgb))" : ex.discipline && ex.discipline !== "strength" && DISCIPLINE_COLORS[ex.discipline] ? `${DISCIPLINE_COLORS[ex.discipline]}${isOpen ? "b3" : "59"}` : `rgb(${MUSCLE_COLORS[ex.body_segment] || MUSCLE_COLORS.Other} / ${isOpen ? "0.7" : "0.35"})` }} />
                                    <div className="flex-1 min-w-0">
                                    {/* Exercise header */}
                                    <div className="w-full flex items-center gap-3 px-3.5 py-3 text-left">
                                        <div onClick={() => isSkipped ? w.unskipExercise(ex.id) : w.setExpandedId(isOpen ? null : ex.id)} className="shrink-0 cursor-pointer">
                                        {ex.image_url && !isSkipped ? (
                                            <div className={`w-9 h-9 rounded-lg overflow-hidden border ${allDone ? "border-[rgb(var(--accent-rgb)/0.3)]" : "border-[var(--fg-06)]"}`}>
                                                <img src={ex.image_url} alt="" className={`w-full h-full object-cover ${allDone ? "opacity-60" : ""}`} />
                                            </div>
                                        ) : (
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold ${isSkipped ? "bg-[var(--fg-03)] text-[var(--fg-15)] border border-[var(--fg-04)]" : allDone ? "bg-[rgb(var(--accent-rgb)/0.15)] text-[rgb(var(--accent-rgb))] border border-[rgb(var(--accent-rgb)/0.2)]" : "bg-[var(--fg-04)] text-[var(--fg-20)] border border-[var(--fg-06)]"}`}>
                                                {isSkipped ? <Ban size={12} /> : allDone ? <Check size={14} /> : String(i + 1).padStart(2, "0")}
                                            </div>
                                        )}
                                        </div>
                                        <div className="flex-1 min-w-0" onClick={() => isSkipped ? w.unskipExercise(ex.id) : w.setExpandedId(isOpen ? null : ex.id)} role="button" tabIndex={0}>
                                            <div className="flex items-center gap-1.5">
                                                <span role="link" className={`text-[13px] font-medium inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 cursor-pointer transition ${isSkipped ? "text-[var(--fg-30)] line-through" : "text-[rgb(var(--accent-light-rgb))] active:bg-[rgb(var(--accent-rgb)/0.08)]"}`}
                                                    onClick={(e) => { if (!isSkipped) { e.stopPropagation(); e.preventDefault(); setDetailExercise(ex); } }}>
                                                    {ex.discipline && ex.discipline !== "strength" && DISCIPLINE_COLORS[ex.discipline] && (
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DISCIPLINE_COLORS[ex.discipline] }} />
                                                    )}
                                                    {ex.name}
                                                    {!isSkipped && <ChevronRight size={11} className="shrink-0 opacity-50" />}
                                                </span>
                                                {!last && !isSkipped && !allDone && (
                                                    <span className="shrink-0 text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-300/60 border border-emerald-400/15">NEW</span>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-mono text-[var(--fg-25)]">
                                                {isSkipped ? "Skipped" : `${done}/${workingSetsOnly.length} ${ex.tracking_mode === "rounds_duration" ? "rounds" : ex.tracking_mode === "duration_only" ? "holds" : "sets"}${warmupSetsOnly.length > 0 ? ` + ${warmupDone}/${warmupSetsOnly.length} warm-up` : ""}${
                                                    ghost && w.status === "not_started" ? ` · Last ${todayName.slice(0,3)}: ${ghost[0]?.weight != null ? `${kgToUnitW(ghost[0].weight, w.weightUnit)}${w.weightUnit}` : "—"} × ${ghost[0]?.reps ?? "—"}` :
                                                    last ? ` · Last: ${last.weight != null ? kgToUnitW(last.weight, w.weightUnit) : "—"}${ex.tracking_mode === "distance_time" ? "" : ex.isBodyweight ? " BW" : w.weightUnit} × ${last.reps ?? "—"}` : ""
                                                }`}
                                            </p>
                                        </div>
                                        <div onClick={() => isSkipped ? w.unskipExercise(ex.id) : w.setExpandedId(isOpen ? null : ex.id)} className="shrink-0 cursor-pointer p-1">
                                        {isSkipped ? (
                                            <span className="text-[9px] font-mono text-[var(--fg-20)]">tap to undo</span>
                                        ) : (
                                            <ChevronDown size={14} className={`text-[var(--fg-15)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                        )}
                                        </div>
                                    </div>

                                    {/* Expanded content */}
                                    {isOpen && !isSkipped && (
                                        <div className="border-t border-[var(--fg-04)]">
                                            {hint && hint.type !== "first_time" && (
                                                <button
                                                    onClick={() => {
                                                        if (hint.suggestedWeight != null) {
                                                            const firstIncomplete = sets.find(s => !s.completed && !s.is_warmup);
                                                            if (firstIncomplete) {
                                                                w.updateSet(ex.id, firstIncomplete.index, "weight", String(kgToUnitW(hint.suggestedWeight, w.weightUnit)));
                                                            }
                                                        }
                                                    }}
                                                    className="mx-4 mt-3 w-[calc(100%-2rem)] flex items-center gap-2 rounded-lg bg-[rgb(var(--accent-rgb)/0.05)] border border-[rgb(var(--accent-rgb)/0.1)] px-3 py-2 text-left hover:bg-[rgb(var(--accent-rgb)/0.1)] active:scale-[0.98] transition">
                                                    <TrendingUp size={11} className="text-[rgb(var(--accent-rgb)/0.5)] shrink-0" />
                                                    <p className="text-[10px] font-mono text-[rgb(var(--accent-rgb)/0.6)] flex-1">{hint.text}</p>
                                                    {hint.suggestedWeight != null && (
                                                        <span className="shrink-0 text-[9px] font-mono font-bold px-2 py-1 rounded-md bg-[rgb(var(--accent-rgb)/0.15)] text-[rgb(var(--accent-rgb))]">
                                                            Try {kgToUnitW(hint.suggestedWeight, w.weightUnit)}{w.weightUnit} →
                                                        </span>
                                                    )}
                                                </button>
                                            )}

                                            {w.exerciseRisks[ex.id] && (
                                                <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/15 px-3 py-2">
                                                    <span className="text-amber-400 mt-0.5 shrink-0">⚠</span>
                                                    <div>
                                                        <p className="text-[10px] font-mono text-amber-400/70">{w.exerciseRisks[ex.id].reason}</p>
                                                        <p className="text-[9px] font-mono text-amber-400/40 mt-0.5">Alternative: {w.exerciseRisks[ex.id].alternative}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {w.cycleProfile && !ex.isCardio && !ex.isBodyweight && w.lastPerformance[ex.exercise_id]?.weight && (() => {
                                                const adj = getCycleAdjustedWeight(w.lastPerformance[ex.exercise_id].weight, w.cycleProfile!.intensityModifier);
                                                return adj.label ? (
                                                    <div className={`mx-4 mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5 ${w.cycleProfile!.intensityModifier >= 1.0 ? "bg-emerald-500/[0.05] border border-emerald-500/10" : "bg-violet-500/[0.05] border border-violet-500/10"}`}>
                                                        <p className={`text-[9px] font-mono ${w.cycleProfile!.intensityModifier >= 1.0 ? "text-emerald-400/60" : "text-violet-400/60"}`}>{adj.label}</p>
                                                    </div>
                                                ) : null;
                                            })()}

                                            {w.substitutions[ex.id] && (
                                                <div className="mx-4 mt-2 rounded-lg bg-orange-400/[0.04] border border-orange-400/10 p-3">
                                                    <p className="text-[9px] font-mono text-orange-300/60 mb-2"><Dumbbell size={9} className="inline mr-1" />{ex.equipment} not in your gear — try:</p>
                                                    <div className="space-y-1.5">
                                                        {w.substitutions[ex.id].map((sub) => (
                                                            <button key={sub.exercise.id} onClick={() => w.handleSwap(ex, { id: sub.exercise.id, name: sub.exercise.name })}
                                                                className="w-full flex items-center justify-between gap-2 rounded-md bg-[var(--fg-03)] border border-[var(--fg-06)] px-3 py-2 hover:border-emerald-400/20 hover:bg-emerald-400/[0.04] transition group">
                                                                <div className="min-w-0">
                                                                    <p className="text-xs text-[var(--fg-80)] font-medium truncate">{sub.exercise.name}</p>
                                                                    <p className="text-[9px] font-mono text-[var(--fg-30)]">{sub.reason} · {sub.exercise.equipment}</p>
                                                                </div>
                                                                <span className="text-[9px] font-mono text-emerald-400/50 group-hover:text-emerald-400/80 shrink-0">Swap →</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="px-4 pt-2.5 pb-1 flex items-center gap-3 flex-wrap">
                                                <button onClick={() => w.setSwapTargetId(ex.id)} className="flex items-center gap-1.5 text-[var(--fg-40)] text-[10px] font-mono hover:text-emerald-400 active:scale-95 transition px-2 py-1.5 rounded-md hover:bg-emerald-400/10"><RefreshCw size={11} /> Swap</button>
                                                <button onClick={() => w.laterExercise(ex.id)} className="flex items-center gap-1.5 text-[var(--fg-40)] text-[10px] font-mono hover:text-blue-400 active:scale-95 transition px-2 py-1.5 rounded-md hover:bg-blue-400/10"><ArrowDownToLine size={11} /> Later</button>
                                                <button onClick={() => done > 0 ? setDropConfirm(ex) : w.skipExercise(ex.id)} className="flex items-center gap-1.5 text-[var(--fg-40)] text-[10px] font-mono hover:text-amber-400 active:scale-95 transition px-2 py-1.5 rounded-md hover:bg-amber-400/10"><SkipForward size={11} /> Skip</button>
                                                {ex.tracking_mode !== "distance_time" && (
                                                    <button onClick={() => setFormCheckExercise(ex.name)} className="flex items-center gap-1.5 text-[var(--fg-40)] text-[10px] font-mono hover:text-cyan-400 active:scale-95 transition px-2 py-1.5 rounded-md hover:bg-cyan-400/10"><Camera size={11} /> Form</button>
                                                )}
                                                {(!ex.tracking_mode || ex.tracking_mode === "weight_reps") && !ex.isBodyweight && (
                                                    <button onClick={() => w.toggleWarmup(ex)} className={`flex items-center gap-1.5 text-[10px] font-mono transition ml-auto px-2 py-1.5 rounded-md active:scale-95 ${w.warmupExercises.has(ex.id) ? "text-amber-400 bg-amber-400/10" : "text-[var(--fg-40)] hover:text-amber-400 hover:bg-amber-400/10"}`}>
                                                        <Flame size={11} /> {w.warmupExercises.has(ex.id) ? "Remove Warm-up" : "Add Warm-up"}
                                                    </button>
                                                )}
                                            </div>

                                            {ex.isCardio ? (
                                                <div className="px-4 pb-4 pt-2 space-y-3">
                                                    {(() => {
                                                        const cs = sets[0];
                                                        const dur = Number(cs?.duration) || 0;
                                                        const spd = Number(cs?.weight) || 0;
                                                        const dist = Number(cs?.distance) || 0;
                                                        const incl = Number(cs?.reps) || 0;
                                                        const inputCls = "w-full h-12 rounded-lg bg-[var(--fg-04)] border border-[var(--fg-08)] text-center text-xl font-bold font-mono focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.4)] disabled:opacity-40 transition";
                                                        const autoCalcDistance = (newDur: number, newSpd: number) => {
                                                            if (newDur > 0 && newSpd > 0) w.updateSet(ex.id, 0, "distance", String(Math.round(newSpd * (newDur / 60) * 100) / 100));
                                                        };
                                                        return (
                                                            <>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div><p className="text-[8px] font-mono text-[var(--fg-30)] mb-1">DURATION (MIN)</p><input type="number" min="0" inputMode="numeric" onWheel={(e) => (e.target as HTMLElement).blur()} value={cs?.duration ?? ""} onChange={(e) => { w.updateSet(ex.id, 0, "duration", e.target.value); autoCalcDistance(Number(e.target.value) || 0, spd); }} disabled={cs?.completed} placeholder="—" className={inputCls} /></div>
                                                                    <div><p className="text-[8px] font-mono text-[var(--fg-30)] mb-1">DISTANCE (KM)</p><input type="number" min="0" inputMode="decimal" onWheel={(e) => (e.target as HTMLElement).blur()} value={cs?.distance ?? ""} onChange={(e) => { w.updateSet(ex.id, 0, "distance", e.target.value); const newDist = Number(e.target.value) || 0; if (dur > 0 && newDist > 0) w.updateSet(ex.id, 0, "weight", String(Math.round(newDist / (dur / 60) * 10) / 10)); }} disabled={cs?.completed} placeholder="auto" className={inputCls} /></div>
                                                                    <div><p className="text-[8px] font-mono text-[var(--fg-30)] mb-1">SPEED (KM/H)</p><input type="number" min="0" inputMode="decimal" onWheel={(e) => (e.target as HTMLElement).blur()} value={cs?.weight ?? ""} onChange={(e) => { w.updateSet(ex.id, 0, "weight", e.target.value); autoCalcDistance(dur, Number(e.target.value) || 0); }} disabled={cs?.completed} placeholder="—" className={inputCls} /></div>
                                                                    <div><p className="text-[8px] font-mono text-[var(--fg-30)] mb-1">INCLINE (%)</p><input type="number" min="0" inputMode="decimal" onWheel={(e) => (e.target as HTMLElement).blur()} value={cs?.reps ?? ""} onChange={(e) => w.updateSet(ex.id, 0, "reps", e.target.value)} disabled={cs?.completed} placeholder="—" className={inputCls} /></div>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                    {!sets[0]?.completed ? (
                                                        <button onClick={() => zeroCeremonyComplete(ex, 0)} className="w-full text-[10px] font-mono font-bold py-3 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.15)] transition">LOG CARDIO ✓</button>
                                                    ) : (
                                                        <button onClick={() => w.editSet(ex.id, 0)} className="w-full flex items-center justify-center gap-2 text-[10px] font-mono text-[rgb(var(--accent-light-rgb)/0.5)] hover:text-[rgb(var(--accent-light-rgb)/0.8)] py-2 transition"><Pencil size={10} /> ✓ Logged — tap to edit</button>
                                                    )}
                                                </div>
                                            ) : ex.tracking_mode === "rounds_duration" ? (
                                                <div className="px-4 pb-4 space-y-1 border-t border-[var(--fg-06)] pt-3">
                                                    <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] font-mono text-[var(--fg-25)] tracking-wider mb-0.5">
                                                        <span className="w-6 sm:w-7" />
                                                        <span className="flex-1 text-center">ROUND TIME</span>
                                                        <span className="flex-1 text-center">INTENSITY</span>
                                                        <span className="w-9 sm:w-11" />
                                                    </div>
                                                    {sets.map((s, si) => {
                                                        const roundNum = String(si + 1);
                                                        const intensityVal = Number(s.reps) || 2;
                                                        const durVal = Number(s.duration) || 0;
                                                        const fmtDur = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
                                                        const intensityLabel = intensityVal <= 1 ? "Light" : intensityVal >= 3 ? "Hard" : "Med";
                                                        const intensityColors: Record<string, { color: string; bg: string; border: string }> = {
                                                            "1": { color: "#34d399", bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.3)" },
                                                            "2": { color: "#fbbf24", bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.3)" },
                                                            "3": { color: "#f87171", bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.3)" },
                                                        };
                                                        const ic = intensityColors[String(intensityVal)] || intensityColors["2"];
                                                        return (
                                                        <div key={s.index}>
                                                            {s.completed ? (
                                                                <button onClick={() => w.editSet(ex.id, s.index)} className="w-full flex items-center gap-1.5 sm:gap-2 group rounded-lg py-1.5 px-1 relative overflow-visible hover:brightness-110 active:scale-[0.99] transition">
                                                                    <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full" style={{ background: "rgb(var(--accent-rgb) / 0.5)" }} />
                                                                    <div className="w-6 sm:w-7 h-6 sm:h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-mono font-bold" style={{ background: "rgb(var(--accent-rgb) / 0.15)", color: "rgb(var(--accent-light-rgb))" }}>R{roundNum}</div>
                                                                    <div className="flex-1 h-9 sm:h-10 rounded-lg flex items-center justify-center text-sm font-bold font-mono text-[var(--fg-80)]" style={{ background: "rgb(var(--accent-rgb) / 0.06)", border: "1px solid rgb(var(--accent-rgb) / 0.12)" }}>
                                                                        {fmtDur(durVal)}
                                                                    </div>
                                                                    <div className="flex-1 h-9 sm:h-10 rounded-lg flex items-center justify-center text-sm font-bold font-mono" style={{ background: ic.bg, border: `1px solid ${ic.border}`, color: ic.color }}>
                                                                        {intensityLabel}
                                                                    </div>
                                                                    <Pencil size={12} className="shrink-0 text-[var(--fg-15)] group-hover:text-[rgb(var(--accent-light-rgb))] transition w-9 sm:w-11" />
                                                                </button>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 sm:gap-2">
                                                                    <span className="text-[10px] font-mono w-6 sm:w-7 text-center shrink-0 text-[var(--fg-25)]">R{roundNum}</span>
                                                                    <StepperInput
                                                                        value={durVal || 180}
                                                                        onChange={(v: number) => w.updateSet(ex.id, s.index, "duration", String(v))}
                                                                        min={15} max={600} step={15}
                                                                        placeholder="180" suffix="sec"
                                                                        className="flex-1 min-w-0 h-[44px] rounded-lg border bg-[var(--fg-04)] border-[var(--fg-08)] focus-within:border-[rgb(var(--accent-rgb)/0.4)] font-bold font-mono transition"
                                                                    />
                                                                    <div className="flex-1 flex gap-1">
                                                                        {([{v: 1, l: "L", color: "#34d399", bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.3)"}, {v: 2, l: "M", color: "#fbbf24", bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.3)"}, {v: 3, l: "H", color: "#f87171", bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.3)"}] as const).map(({v, l, color, bg, border: bdr}) => (
                                                                            <button key={v} onClick={() => w.updateSet(ex.id, s.index, "reps", String(v))}
                                                                                style={intensityVal === v ? { background: bg, borderColor: bdr, color } : {}}
                                                                                className={`flex-1 h-[52px] rounded-lg border text-xs font-mono font-bold transition active:scale-95 ${intensityVal === v ? "" : "bg-[var(--fg-04)] border-[var(--fg-08)] text-[var(--fg-25)]"}`}>
                                                                                {l}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <button onClick={() => zeroCeremonyComplete(ex, s.index)} className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-lg border border-[var(--fg-10)] text-[var(--fg-20)] hover:border-[rgb(var(--accent-rgb)/0.4)] hover:text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb))]/[0.05] active:scale-95 flex items-center justify-center transition">
                                                                        <Check size={16} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        );
                                                    })}
                                                    <div className="flex items-center gap-3 pt-1 ml-5 sm:ml-7">
                                                        <button onClick={() => w.addSet(ex.id)} className="flex items-center gap-1.5 text-[rgb(var(--accent-light-rgb)/0.6)] text-[10px] font-mono hover:text-[rgb(var(--accent-light-rgb))] transition"><Plus size={12} /> Add round</button>
                                                    </div>
                                                    {allDone && !w.confirmedExercises.has(ex.id) && (
                                                        <button onClick={() => w.confirmExercise(ex.id)} className="w-full mt-3 text-[10px] font-mono font-bold py-2.5 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.15)] transition">CONFIRM & NEXT EXERCISE →</button>
                                                    )}
                                                </div>
                                            ) : ex.tracking_mode === "duration_only" ? (
                                                <div className="px-4 pb-4 space-y-1 border-t border-[var(--fg-06)] pt-3">
                                                    <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] font-mono text-[var(--fg-25)] tracking-wider mb-0.5">
                                                        <span className="w-6 sm:w-7" />
                                                        <span className="flex-1 text-center">HOLD TIME (SEC)</span>
                                                        <span className="w-9 sm:w-11" />
                                                    </div>
                                                    {sets.map((s, si) => {
                                                        const holdNum = String(si + 1);
                                                        const durVal = Number(s.duration) || 0;
                                                        const fmtDur = (sec: number) => sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : `${sec}s`;
                                                        return (
                                                        <div key={s.index}>
                                                            {s.completed ? (
                                                                <button onClick={() => w.editSet(ex.id, s.index)} className="w-full flex items-center gap-1.5 sm:gap-2 group rounded-lg py-1.5 px-1 relative overflow-visible hover:brightness-110 active:scale-[0.99] transition">
                                                                    <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full" style={{ background: "rgb(var(--accent-rgb) / 0.5)" }} />
                                                                    <div className="w-6 sm:w-7 h-6 sm:h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-mono font-bold" style={{ background: "rgb(var(--accent-rgb) / 0.15)", color: "rgb(var(--accent-light-rgb))" }}>{holdNum}</div>
                                                                    <div className="flex-1 h-9 sm:h-10 rounded-lg flex items-center justify-center text-sm font-bold font-mono text-[var(--fg-80)]" style={{ background: "rgb(var(--accent-rgb) / 0.06)", border: "1px solid rgb(var(--accent-rgb) / 0.12)" }}>
                                                                        {fmtDur(durVal)}
                                                                    </div>
                                                                    <Pencil size={12} className="shrink-0 text-[var(--fg-15)] group-hover:text-[rgb(var(--accent-light-rgb))] transition w-9 sm:w-11" />
                                                                </button>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 sm:gap-2">
                                                                    <span className="text-[10px] font-mono w-6 sm:w-7 text-center shrink-0 text-[var(--fg-25)]">{holdNum}</span>
                                                                    <StepperInput
                                                                        value={durVal || 30}
                                                                        onChange={(v: number) => w.updateSet(ex.id, s.index, "duration", String(v))}
                                                                        min={5} max={600} step={5}
                                                                        placeholder="30" suffix="sec"
                                                                        className="flex-1 min-w-0 h-[44px] rounded-lg border bg-[var(--fg-04)] border-[var(--fg-08)] focus-within:border-[rgb(var(--accent-rgb)/0.4)] font-bold font-mono transition"
                                                                    />
                                                                    <button onClick={() => zeroCeremonyComplete(ex, s.index)} className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-lg border border-[var(--fg-10)] text-[var(--fg-20)] hover:border-[rgb(var(--accent-rgb)/0.4)] hover:text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb))]/[0.05] active:scale-95 flex items-center justify-center transition">
                                                                        <Check size={16} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        );
                                                    })}
                                                    <div className="flex items-center gap-3 pt-1 ml-5 sm:ml-7">
                                                        <button onClick={() => w.addSet(ex.id)} className="flex items-center gap-1.5 text-[rgb(var(--accent-light-rgb)/0.6)] text-[10px] font-mono hover:text-[rgb(var(--accent-light-rgb))] transition"><Plus size={12} /> Add hold</button>
                                                    </div>
                                                    {allDone && !w.confirmedExercises.has(ex.id) && (
                                                        <button onClick={() => w.confirmExercise(ex.id)} className="w-full mt-3 text-[10px] font-mono font-bold py-2.5 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.15)] transition">CONFIRM & NEXT EXERCISE →</button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="px-4 pb-4 space-y-1 border-t border-[var(--fg-06)] pt-3">
                                                    <div className="flex items-center gap-1.5 sm:gap-2 text-[8px] font-mono text-[var(--fg-25)] tracking-wider mb-0.5">
                                                        {editingExId === ex.id ? <span className="w-6" /> : null}
                                                        <span className="w-6 sm:w-7" />
                                                        {ex.isBodyweight ? (
                                                            <span className="flex-1 text-center">REPS</span>
                                                        ) : (
                                                            <>
                                                                <span className="flex-1 text-center">{w.weightUnit.toUpperCase()}{isDualWeight(ex) && <span className="text-[rgb(var(--accent-rgb))] font-bold ml-1">/ SIDE</span>}</span>
                                                                <span className="flex-1 text-center">REPS</span>
                                                            </>
                                                        )}
                                                        <span className="w-9 sm:w-11" />
                                                    </div>

                                                    {sets.map((s, si) => {
                                                        const isWarmup = !!s.is_warmup;
                                                        const isDrop = s.set_type === "drop";
                                                        const isRestPause = s.set_type === "rest_pause";
                                                        const warmupCount = sets.filter((x) => x.is_warmup).length;
                                                        const workingIdx = isWarmup ? -1 : s.index - warmupCount;
                                                        const displayNum = isWarmup ? `W${si + 1}` : isDrop ? "D" : isRestPause ? "RP" : String(workingIdx + 1);
                                                        const prevSets = w.lastSets[ex.exercise_id] ?? [];
                                                        const prevSet = !isWarmup ? prevSets[workingIdx] : undefined;
                                                        const ghostSet = ghost && !isWarmup ? ghost[workingIdx] : undefined;
                                                        const prevW = ghostSet?.weight != null ? String(kgToUnitW(ghostSet.weight, w.weightUnit)) : prevSet?.weight != null ? String(kgToUnitW(prevSet.weight, w.weightUnit)) : "";
                                                        const prevR = ghostSet?.reps != null ? String(ghostSet.reps) : prevSet?.reps != null ? String(prevSet.reps) : "";
                                                        const predSet = !isWarmup ? (w.predictedSets[ex.exercise_id] ?? [])[workingIdx] : undefined;
                                                        const predW = predSet?.weight != null ? String(kgToUnitW(predSet.weight, w.weightUnit)) : prevW;
                                                        const predR = predSet?.reps != null ? String(predSet.reps) : prevR;
                                                        const hasPrediction = predSet && (predSet.weight !== (prevSet?.weight ?? 0) || predSet.reps !== (prevSet?.reps ?? 0));
                                                        const completedWorking = sets.filter((x) => !x.is_warmup && x.completed);
                                                        const lastCompleted = completedWorking.length > 0 ? completedWorking[completedWorking.length - 1] : null;
                                                        const hasPrevData = !!(prevW && prevR);
                                                        const userTyped = !!(s.weight || s.reps);
                                                        const wStep = getWeightStep(ex.equipment, w.weightUnit as "kg" | "lbs");
                                                        const showQuickLog = !s.completed && !isWarmup && (!ex.tracking_mode || ex.tracking_mode === "weight_reps");
                                                        const dualWt = isDualWeight(ex);
                                                        const setVol = s.completed && s.weight && s.reps ? Number(s.weight) * Number(s.reps) * (dualWt ? 2 : 1) : 0;
                                                        const e1rm = s.completed && !isWarmup && !ex.isBodyweight && s.weight && s.reps ? estimateE1RM(Number(s.weight), Number(s.reps)) : 0;
                                                        const pulse: PerformancePulse = s.completed && !isWarmup && prevSet && !ex.isBodyweight && s.weight && s.reps ? getPerformancePulse(Number(s.weight), Number(s.reps), prevSet.weight, prevSet.reps) : null;
                                                        const weightIncrement = w.weightUnit === "kg" ? 2.5 : 5;
                                                        const isDeleting = editingExId === ex.id;
                                                        const inputCls = (warm: boolean) => `flex-1 min-w-0 h-[52px] rounded-lg border font-bold font-mono focus:outline-none disabled:opacity-40 transition ${warm ? "bg-amber-400/[0.03] border-amber-400/[0.1] focus:border-amber-400/30" : isDrop ? "bg-orange-400/[0.03] border-orange-400/[0.1] focus:border-orange-400/30" : isRestPause ? "bg-violet-400/[0.03] border-violet-400/[0.1] focus:border-violet-400/30" : "bg-[var(--fg-04)] border-[var(--fg-08)] focus:border-[rgb(var(--accent-rgb)/0.4)] focus:bg-[rgb(var(--accent-rgb))]/[0.03]"}`;
                                                        const chipCls = "h-9 sm:h-10 rounded-full text-center text-sm sm:text-base font-bold font-mono";

                                                        return (
                                                        <div key={s.index} className={isWarmup ? "rounded-lg bg-amber-400/[0.04] border border-amber-400/[0.08] px-1 py-0.5" : isDrop ? "rounded-lg bg-orange-400/[0.04] border border-orange-400/[0.08] px-1 py-0.5" : isRestPause ? "rounded-lg bg-violet-400/[0.04] border border-violet-400/[0.08] px-1 py-0.5" : ""}>
                                                            <div className="flex items-center gap-1">
                                                                {isDeleting && (
                                                                    <button onClick={() => w.removeSet(ex.id, s.index)} className="w-6 h-6 shrink-0 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/25 active:scale-90 transition"><X size={12} /></button>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                {s.completed && !isWarmup ? (
                                                                    <button onClick={() => !isDeleting && w.editSet(ex.id, s.index)} className={`w-full flex items-center gap-1.5 sm:gap-2 group rounded-lg py-1.5 px-1 relative overflow-visible hover:brightness-110 active:scale-[0.99] transition ${pulse ? "animate-[perfPulse_0.6s_ease-out]" : ""}`}>
                                                                        <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full transition-colors" style={{ background: pulse ? `rgb(${PULSE_COLORS[pulse]} / 0.7)` : "rgb(var(--accent-rgb) / 0.5)" }} />
                                                                        <div className="w-6 sm:w-7 h-6 sm:h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-mono font-bold" style={{ background: "rgb(var(--accent-rgb) / 0.15)", color: "rgb(var(--accent-light-rgb))" }}>{displayNum}</div>
                                                                        {!ex.isBodyweight && (
                                                                            <div className={`flex-1 ${chipCls} flex items-center justify-center gap-1 rounded-lg`} style={{ background: "rgb(var(--accent-rgb) / 0.06)", border: "1px solid rgb(var(--accent-rgb) / 0.12)" }}>
                                                                                <span className="text-[var(--fg-80)]">{s.weight}</span>
                                                                                {dualWt && <span className="text-[8px] font-bold px-1 py-px rounded" style={{ background: "rgb(var(--accent-rgb) / 0.2)", color: "rgb(var(--accent-light-rgb))" }}>×2</span>}
                                                                            </div>
                                                                        )}
                                                                        <div className={`flex-1 ${chipCls} flex items-center justify-center rounded-lg`} style={{ background: "rgb(var(--accent-rgb) / 0.06)", border: "1px solid rgb(var(--accent-rgb) / 0.12)" }}>
                                                                            <span className="text-[var(--fg-80)]">{s.reps}</span>
                                                                            {ex.isBodyweight && <span className="text-[10px] font-mono text-[var(--fg-30)] ml-1">reps</span>}
                                                                        </div>
                                                                        {e1rm > 0 && <span className={`shrink-0 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full ${pulse === "stronger" ? "text-emerald-400/70" : pulse === "weaker" ? "text-red-400/60" : "text-[var(--fg-25)]"}`}>{Math.round(e1rm)}{pulse === "stronger" ? "▲" : pulse === "weaker" ? "▼" : ""}</span>}
                                                                        {!s.rpe ? (
                                                                            <span onClick={(e) => { e.stopPropagation(); setRpePrompt({ exId: ex.id, setIdx: s.index }); }} className="shrink-0 text-[8px] font-mono px-1.5 py-0.5 rounded-full border border-[var(--fg-08)] text-[var(--fg-20)] hover:text-[var(--fg-40)] hover:border-[var(--fg-15)] transition">RPE</span>
                                                                        ) : (
                                                                            <span onClick={(e) => { e.stopPropagation(); setRpePrompt({ exId: ex.id, setIdx: s.index }); }} className={`shrink-0 text-[8px] font-mono px-1.5 py-0.5 rounded-full border cursor-pointer ${s.rpe <= 7 ? "border-emerald-500/15 text-emerald-400/50 bg-emerald-500/[0.04]" : s.rpe <= 8 ? "border-amber-500/15 text-amber-400/50 bg-amber-500/[0.04]" : "border-red-500/15 text-red-400/50 bg-red-500/[0.04]"}`}>{s.rpe}</span>
                                                                        )}
                                                                    </button>
                                                                ) : s.completed && isWarmup ? (
                                                                    <div className="flex items-center gap-1.5 sm:gap-2 opacity-50">
                                                                        <span className="text-[10px] font-mono w-6 sm:w-7 text-center shrink-0 text-amber-400/50">{displayNum}</span>
                                                                        {s.warmup_label && <span className="text-[8px] font-mono text-amber-400/50 w-8 shrink-0">{s.warmup_label}</span>}
                                                                        <span className="flex-1 text-center text-xs font-mono text-amber-400/40">{s.weight} × {s.reps}</span>
                                                                        <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-lg border border-amber-400/30 bg-amber-400/10 flex items-center justify-center text-amber-400"><Check size={14} /></div>
                                                                    </div>
                                                                ) : (
                                                                <>
                                                                {showQuickLog && !userTyped && editingExId !== ex.id && (hasPrediction || hasPrevData || (lastCompleted && workingIdx > 0)) && (
                                                                    <div className="space-y-1 mb-1.5">
                                                                        {hasPrediction && (
                                                                            <button onClick={() => zeroCeremonyComplete(ex, s.index, { weight: predW, reps: predR }, true)}
                                                                                className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400/90 hover:bg-emerald-500/[0.12] active:scale-[0.98] transition">
                                                                                <span className="text-[11px] font-mono font-medium flex items-center gap-1.5">
                                                                                    <TrendingUp size={12} />
                                                                                    {!ex.isBodyweight ? `${predW}${w.weightUnit} × ` : ""}{predR}
                                                                                    <span className="text-[9px] text-emerald-400/50">predicted</span>
                                                                                </span>
                                                                                <Check size={12} className="opacity-40" />
                                                                            </button>
                                                                        )}
                                                                        {hasPrevData && !hasPrediction && (
                                                                            <button onClick={() => zeroCeremonyComplete(ex, s.index)}
                                                                                className="w-full flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-[rgb(var(--accent-rgb)/0.15)] bg-[rgb(var(--accent-rgb)/0.04)] text-[var(--fg-60)] hover:bg-[rgb(var(--accent-rgb)/0.08)] active:scale-[0.98] transition">
                                                                                <span className="text-[11px] font-mono font-medium flex items-center gap-1.5">
                                                                                    <Check size={12} className="text-[rgb(var(--accent-rgb)/0.5)]" />
                                                                                    Log {prevW}{w.weightUnit} × {prevR}
                                                                                    <span className="text-[9px] text-[var(--fg-25)]">{ghostSet ? `(last ${todayName.slice(0,3)})` : "last"}</span>
                                                                                </span>
                                                                            </button>
                                                                        )}
                                                                        {lastCompleted && workingIdx > 0 && (
                                                                            <button onClick={() => zeroCeremonyComplete(ex, s.index, { weight: lastCompleted.weight, reps: lastCompleted.reps })}
                                                                                className="w-full flex items-center justify-between gap-2 py-1.5 px-3 rounded-lg border border-[var(--fg-08)] bg-[var(--fg-03)] text-[var(--fg-50)] hover:bg-[var(--fg-06)] active:scale-[0.98] transition">
                                                                                <span className="text-[10px] font-mono font-medium flex items-center gap-1.5"><RefreshCw size={10} className="opacity-40" />Repeat {!ex.isBodyweight ? `${lastCompleted.weight}${w.weightUnit} × ` : ""}{lastCompleted.reps}</span>
                                                                                <Check size={12} className="opacity-30" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <SwipeSet completed={false} onComplete={() => zeroCeremonyComplete(ex, s.index)}>
                                                                    {(() => {
                                                                        const fieldKey = `${ex.id}-${s.index}`;
                                                                        const wFocused = focusedField === `${fieldKey}-w`;
                                                                        const rFocused = focusedField === `${fieldKey}-r`;
                                                                        const borderCls = isWarmup ? "border-amber-400/[0.12]" : isDrop ? "border-orange-400/[0.12]" : isRestPause ? "border-violet-400/[0.12]" : "border-[var(--fg-08)]";
                                                                        const bgCls = isWarmup ? "bg-amber-400/[0.03]" : isDrop ? "bg-orange-400/[0.03]" : isRestPause ? "bg-violet-400/[0.03]" : "bg-[var(--fg-04)]";
                                                                        const focusBorder = isWarmup ? "border-amber-400/30" : "border-[rgb(var(--accent-rgb)/0.4)]";
                                                                        return (
                                                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                                                        <span className={`text-[10px] font-mono w-6 sm:w-7 text-center shrink-0 ${isWarmup ? "text-amber-400/50" : isDrop ? "text-orange-400/50" : isRestPause ? "text-violet-400/50" : "text-[var(--fg-25)]"}`}>{displayNum}</span>
                                                                        {isWarmup && s.warmup_label && <span className="text-[8px] font-mono text-amber-400/50 w-8 shrink-0">{s.warmup_label}</span>}
                                                                        {ex.isBodyweight ? (
                                                                            <StepperInput
                                                                                value={Number(s.reps) || Number(predR) || 0}
                                                                                onChange={(v) => w.updateSet(ex.id, s.index, "reps", String(v))}
                                                                                min={0} max={200} step={1}
                                                                                placeholder={predR || "—"} label="reps"
                                                                                compact focused={rFocused}
                                                                                onFocus={() => setFocusedField(`${fieldKey}-r`)}
                                                                                className={`flex-1 min-w-0 h-[44px] rounded-lg border font-bold font-mono transition ${rFocused ? `${bgCls} ${focusBorder} shadow-[0_0_0_1px_rgb(var(--accent-rgb)/0.3)]` : `${bgCls} ${borderCls}`}`}
                                                                            />
                                                                        ) : (
                                                                            <>
                                                                                <StepperInput
                                                                                    value={Number(s.weight) || Number(predW) || 0}
                                                                                    onChange={(v) => w.updateSet(ex.id, s.index, "weight", String(v))}
                                                                                    min={0} max={500}
                                                                                    step={wStep}
                                                                                    placeholder={predW || "—"}
                                                                                    suffix={dualWt ? `${w.weightUnit}/side` : w.weightUnit}
                                                                                    compact focused={wFocused}
                                                                                    onFocus={() => setFocusedField(`${fieldKey}-w`)}
                                                                                    className={`flex-1 min-w-0 h-[44px] rounded-lg border font-bold font-mono transition ${wFocused ? `${bgCls} ${focusBorder} shadow-[0_0_0_1px_rgb(var(--accent-rgb)/0.3)]` : `${bgCls} ${borderCls}`}`}
                                                                                />
                                                                                <span className={`text-[11px] font-mono shrink-0 ${isWarmup ? "text-amber-400/30" : "text-[var(--fg-15)]"}`}>×</span>
                                                                                <StepperInput
                                                                                    value={Number(s.reps) || Number(predR) || 0}
                                                                                    onChange={(v) => w.updateSet(ex.id, s.index, "reps", String(v))}
                                                                                    min={1} max={200} step={1}
                                                                                    placeholder={predR || "—"} label="reps"
                                                                                    compact focused={rFocused}
                                                                                    onFocus={() => setFocusedField(`${fieldKey}-r`)}
                                                                                    className={`flex-1 min-w-0 h-[44px] rounded-lg border font-bold font-mono transition ${rFocused ? `${bgCls} ${focusBorder} shadow-[0_0_0_1px_rgb(var(--accent-rgb)/0.3)]` : `${bgCls} ${borderCls}`}`}
                                                                                />
                                                                            </>
                                                                        )}
                                                                        <button onClick={() => zeroCeremonyComplete(ex, s.index)} className={`w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-lg border flex items-center justify-center transition ${isWarmup ? "border-amber-400/15 text-amber-400/30 hover:border-amber-400/40 hover:text-amber-400/70 active:scale-95" : "border-[var(--fg-10)] text-[var(--fg-20)] hover:border-[rgb(var(--accent-rgb)/0.4)] hover:text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb))]/[0.05] active:scale-95"}`}>
                                                                            <Check size={16} />
                                                                        </button>
                                                                    </div>
                                                                        );
                                                                    })()}
                                                                </SwipeSet>
                                                                </>
                                                                )}
                                                                </div>
                                                            </div>
                                                            {/* Plate math for barbell exercises */}
                                                            {!s.completed && !isWarmup && !ex.isBodyweight && (!ex.tracking_mode || ex.tracking_mode === "weight_reps") && ex.equipment.toLowerCase().includes("barbell") && (Number(s.weight) || Number(prevW)) > 0 && (
                                                                <div className="ml-7 sm:ml-8 -mt-0.5 mb-1">
                                                                    <PlateMath totalWeight={Number(s.weight) || Number(prevW)} unit={w.weightUnit as "kg" | "lb"} perSide={dualWt} />
                                                                </div>
                                                            )}
                                                            {rpePrompt?.exId === ex.id && rpePrompt.setIdx === s.index && !isWarmup && (
                                                                <div className="flex items-center gap-1 ml-7 sm:ml-8 mt-1 animate-[fadeInUp_0.15s_ease]">
                                                                    <span className="text-[8px] font-mono text-[var(--fg-20)] mr-1">RPE</span>
                                                                    {[6, 7, 8, 9, 10].map((v) => (
                                                                        <button key={v} onClick={() => handleRpe(v)} className={`w-7 h-7 rounded-full text-[10px] font-mono font-bold border transition active:scale-90 ${v <= 7 ? "border-emerald-500/20 text-emerald-400/70 hover:bg-emerald-500/10" : v <= 8 ? "border-amber-500/20 text-amber-400/70 hover:bg-amber-500/10" : "border-red-500/20 text-red-400/70 hover:bg-red-500/10"}`}>{v}</button>
                                                                    ))}
                                                                    <button onClick={() => setRpePrompt(null)} className="w-7 h-7 rounded-full text-[10px] font-mono border border-[var(--fg-08)] text-[var(--fg-20)] hover:bg-[var(--fg-06)] transition active:scale-90">✕</button>
                                                                </div>
                                                            )}
                                                            {showQuickLog && !s.completed && editingExId !== ex.id && (
                                                                <div className="flex items-center gap-2 mt-1 ml-7 sm:ml-8">
                                                                    {s.note || noteExpandedSet === `${ex.id}-${s.index}` ? (
                                                                        <input type="text" value={s.note} onChange={(e) => w.updateSet(ex.id, s.index, "note", e.target.value)} placeholder="Note..."
                                                                            autoFocus={noteExpandedSet === `${ex.id}-${s.index}` && !s.note}
                                                                            onBlur={() => { if (!s.note) setNoteExpandedSet(null); }}
                                                                            className="flex-1 text-[10px] font-mono rounded-md bg-transparent border border-[var(--fg-06)] px-2 py-1 text-[var(--fg-30)] placeholder:text-[var(--fg-15)] focus:outline-none focus:border-[rgb(var(--accent-rgb)/0.2)] transition" />
                                                                    ) : (
                                                                        <button onClick={() => setNoteExpandedSet(`${ex.id}-${s.index}`)} className="text-[9px] font-mono text-[var(--fg-15)] hover:text-[var(--fg-30)] transition">+ note</button>
                                                                    )}
                                                                    {!inFlowState && workingIdx >= 0 && (() => {
                                                                        const cues = FORM_CUES[ex.body_segment] || FORM_CUES.Other;
                                                                        const cue = cues[workingIdx % cues.length];
                                                                        return <span className={`text-[8px] font-mono shrink-0 ${workingIdx >= 3 ? "text-amber-400/40" : "text-[var(--fg-12)]"}`}>{workingIdx >= 3 ? "⚡" : "💡"} {cue.length > 25 ? cue.slice(0, 25) + "…" : cue}</span>;
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        );
                                                    })}

                                                    <div className="flex items-center gap-3 pt-1 ml-5 sm:ml-7 flex-wrap">
                                                        <button onClick={() => w.addSet(ex.id)} className="flex items-center gap-1.5 text-[rgb(var(--accent-light-rgb)/0.6)] text-[10px] font-mono hover:text-[rgb(var(--accent-light-rgb))] transition"><Plus size={12} /> Add set</button>
                                                        {(!ex.tracking_mode || ex.tracking_mode === "weight_reps") && workingSetsOnly.some((s) => s.completed) && (
                                                            <>
                                                                <button onClick={() => w.addDropSet(ex.id)} className="flex items-center gap-1.5 text-[10px] font-mono text-orange-400/50 hover:text-orange-400/80 transition"><ChevronDown size={10} /> Drop set</button>
                                                                <button onClick={() => w.addRestPauseSet(ex.id)} className="flex items-center gap-1.5 text-[10px] font-mono text-violet-400/50 hover:text-violet-400/80 transition"><Pause size={10} /> Rest-pause</button>
                                                            </>
                                                        )}
                                                        {sets.length > 1 && (
                                                            <button onClick={() => setEditingExId(editingExId === ex.id ? null : ex.id)} className={`flex items-center gap-1 text-[10px] font-mono transition ${editingExId === ex.id ? "text-red-400" : "text-[var(--fg-25)] hover:text-[var(--fg-50)]"}`}>
                                                                {editingExId === ex.id ? <><Check size={12} /> Done</> : <><Minus size={12} /> Remove set</>}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {allDone && !w.confirmedExercises.has(ex.id) && (
                                                        <button onClick={() => w.confirmExercise(ex.id)} className="w-full mt-3 text-[10px] font-mono font-bold py-2.5 rounded-lg border border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.1)] text-[rgb(var(--accent-light-rgb))] hover:bg-[rgb(var(--accent-rgb)/0.15)] transition">CONFIRM & NEXT EXERCISE →</button>
                                                    )}
                                                    {w.status === "active" && (
                                                        <div className="flex items-center justify-center gap-1.5 mt-3 pt-2 border-t border-[var(--fg-04)]">
                                                            {w.exercisesList.map((dotEx, dotI) => {
                                                                const dotSets = (w.logs[dotEx.id] ?? []).filter(s => !s.is_warmup);
                                                                const dotDone = dotSets.filter(s => s.completed).length;
                                                                const dotAll = dotSets.length > 0 && dotDone === dotSets.length;
                                                                const dotSkipped = w.skippedExercises.has(dotEx.id);
                                                                const dotCurrent = dotEx.id === ex.id;
                                                                return (
                                                                    <button key={dotEx.id} onClick={() => w.setExpandedId(dotEx.id)}
                                                                        className={`rounded-full transition-all ${dotCurrent ? "w-5 h-2 bg-[rgb(var(--accent-rgb))]" : dotAll ? "w-2 h-2 bg-[rgb(var(--accent-rgb)/0.4)]" : dotSkipped ? "w-2 h-2 bg-[var(--fg-10)]" : "w-2 h-2 bg-[var(--fg-15)]"} ${!dotCurrent && dotSets.some(s => !s.completed) && !dotSkipped ? "animate-pulse" : ""}`}
                                                                        title={dotEx.name} />
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                </div>
                                </div>
                            );
                        })}

                        <button onClick={() => w.setShowAddModal(true)} className="flex items-center gap-2 text-[var(--fg-20)] text-xs font-mono hover:text-[var(--fg-50)] transition py-2">
                            <Plus size={14} /> Add exercise
                        </button>

                        {/* ═══ MUSCLES WORKED (in-session chips) ═══ */}
                        {w.status === "active" && hitMuscles.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap mt-1">
                                {hitMuscles.map(({ muscle, intensity }) => (
                                    <div key={muscle} className="flex items-center gap-1.5 rounded-lg border border-[var(--fg-06)] bg-[var(--fg-03)] px-2.5 py-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${MUSCLE_COLORS[muscle] || MUSCLE_COLORS.Other})` }} />
                                        <span className="text-[9px] font-mono font-medium text-[var(--fg-50)]">{muscle}</span>
                                        <div className="flex gap-px ml-0.5">
                                            {Array.from({ length: 5 }, (_, i) => (
                                                <div key={i} className="w-1 h-2.5 rounded-[1px]" style={{
                                                    background: i < Math.ceil(intensity / 2)
                                                        ? `rgb(${MUSCLE_COLORS[muscle] || MUSCLE_COLORS.Other} / ${0.4 + i * 0.12})`
                                                        : "var(--fg-06)"
                                                }} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {w.status === "active" && w.exercisesList.length > 0 && (() => {
                            const allExDone = w.exercisesList.every((ex) => {
                                if (w.skippedExercises.has(ex.id)) return true;
                                const eSets = (w.logs[ex.id] ?? []).filter((s) => !s.is_warmup);
                                return eSets.length > 0 && eSets.every((s) => s.completed);
                            });
                            if (!allExDone) return null;
                            return (
                                <div className="mt-4 rounded-2xl border-2 border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.06)] p-5 text-center">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <Trophy size={20} className="text-[rgb(var(--accent-rgb))]" />
                                        <span className="text-base font-bold text-[var(--fg-80)]">All exercises done!</span>
                                    </div>
                                    <p className="text-[11px] font-mono text-[var(--fg-35)] mb-4">{w.completedCount} sets · {formatClock(w.elapsed)}</p>
                                    <button onClick={() => w.setShowEndConfirm(true)} className="w-full text-sm font-bold py-3.5 rounded-xl bg-[rgb(var(--accent-rgb))] text-black hover:brightness-110 active:scale-[0.98] transition">
                                        Finish Workout
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* ═══ MA SESSION (inline martial arts training) ═══ */}
                {recurringLoaded && (!todayIsRest || adHocMa) && (todayMaPlan || adHocMa) && (
                    maSessionActive && (adHocMa || (todayMaPlan?.ma_discipline && todayMaPlan?.ma_session_type)) && user ? (
                        <MaSessionInline
                            discipline={(adHocMa?.discipline ?? todayMaPlan!.ma_discipline) as DisciplineId}
                            sessionType={(adHocMa?.sessionType ?? todayMaPlan!.ma_session_type) as SessionType}
                            userId={user.id}
                            onDone={() => { setMaSessionActive(false); setAdHocMa(null); loadRecurring(); loadTodayMaSession(); }}
                            onCancel={() => { setMaSessionActive(false); setAdHocMa(null); }}
                        />
                    ) : todayMaSession && !sessionCompleted ? (
                        /* MA completed today (standalone — not part of gym completion card) */
                        <div className="rounded-2xl border overflow-hidden"
                            style={{ borderColor: todayDisc ? `rgb(${todayDisc.colorRgb} / 0.2)` : "var(--fg-06)", background: todayDisc ? `rgb(${todayDisc.colorRgb} / 0.04)` : "var(--fg-03)" }}>
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: todayDisc ? `rgb(${todayDisc.colorRgb} / 0.12)` : undefined, borderColor: todayDisc ? `rgb(${todayDisc.colorRgb} / 0.2)` : "var(--fg-06)" }}>
                                    <Check size={16} style={{ color: todayDisc ? `rgb(${todayDisc.colorRgb})` : "rgb(var(--accent-rgb))" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-[var(--fg-90)]">{todayDisc?.name ?? "Martial Arts"}</p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-[var(--fg-40)]">
                                        <span>{todayMaSession.rounds} rounds</span>
                                        <span className="text-[var(--fg-10)]">·</span>
                                        <span>{Math.floor(todayMaSession.durationSec / 60)}m</span>
                                        <span className="text-[var(--fg-10)]">·</span>
                                        <span style={{ color: todayDisc ? `rgb(${todayDisc.colorRgb})` : "rgb(var(--accent-rgb))" }}>+{todayMaSession.xp} XP</span>
                                    </div>
                                </div>
                                {todayDisc && <MaPreviewFigures discipline={todayMaSession.discipline} colorRgb={todayDisc.colorRgb} />}
                            </div>
                        </div>
                    ) : todayMaSession ? null : (
                        <div className="rounded-2xl border overflow-hidden"
                            style={{ borderColor: todayDisc ? `rgb(${todayDisc.colorRgb} / 0.2)` : "var(--fg-06)", borderLeftWidth: 3, borderLeftColor: todayDisc ? `rgb(${todayDisc.colorRgb} / 0.5)` : undefined, background: todayDisc ? `rgb(${todayDisc.colorRgb} / 0.04)` : "var(--fg-03)" }}>
                            <div className="px-5 py-4">
                                <div className="flex items-center gap-2 mb-2">
                                    {todayDisc && <span className="text-lg">{todayDisc.emoji}</span>}
                                    <div>
                                        <p className="text-xs font-medium" style={{ color: todayDisc ? `rgb(${todayDisc.colorRgb})` : undefined }}>{todayDisc?.name}</p>
                                        {todayStLabel && <p className="text-[10px] text-[var(--fg-35)]">{todayStLabel.description}</p>}
                                    </div>
                                </div>
                                {todayDisc && <MaPreviewFigures discipline={todayMaPlan!.ma_discipline!} colorRgb={todayDisc.colorRgb} />}
                                <button
                                    onClick={() => setMaSessionActive(true)}
                                    disabled={w.todaySessions.length >= w.MAX_SESSIONS_PER_DAY}
                                    className="w-full mt-3 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40"
                                    style={{ background: todayDisc ? `rgb(${todayDisc.colorRgb})` : "rgb(var(--accent-rgb))", color: "#000" }}>
                                    <Play size={15} fill="black" />
                                    {w.todaySessions.length >= w.MAX_SESSIONS_PER_DAY ? "Daily Limit Reached" : "Begin Training"}
                                </button>
                            </div>
                        </div>
                    )
                )}

                {/* ═══ REST DAY CARD (#2 rest/deload awareness) ═══ */}
                {recurringLoaded && w.hasLoaded && todayIsRest && (
                    <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-5 py-6 text-center">
                        <Moon size={28} className="text-emerald-400/60 mx-auto mb-2" />
                        <p className="text-sm font-medium text-emerald-300">Recovery Day</p>
                        <p className="text-[11px] text-[var(--fg-35)] mt-1 mb-3">Your body grows when you rest. Muscles adapt during recovery.</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <span className="text-[9px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300/60 border border-emerald-500/15">💧 Stay hydrated</span>
                            <span className="text-[9px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300/60 border border-emerald-500/15">😴 Sleep 7-9h</span>
                            <span className="text-[9px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300/60 border border-emerald-500/15">🧘 Light stretch</span>
                        </div>
                        {currentStreak > 0 && (
                            <div className="flex items-center justify-center gap-1.5 mt-3">
                                <Flame size={11} className="text-orange-400/60" />
                                <span className="text-[10px] font-mono text-orange-400/60">{currentStreak} day streak — rest keeps it going</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ NO PLAN STATE (#7 empty state guidance, #20) ═══ */}
                {w.status === "no_plan" && recurringLoaded && w.hasLoaded && !todayIsRest && !todayIsMa && (
                    <div className="space-y-3">
                        {!hasPlan && (
                            <div className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.15)] bg-[rgb(var(--accent-rgb)/0.03)] p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-[rgb(var(--accent-rgb)/0.12)] flex items-center justify-center">
                                        <Sparkles size={18} className="text-[rgb(var(--accent-rgb))]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--fg-85)]">Set up your training</p>
                                        <p className="text-[10px] text-[var(--fg-30)]">Choose a program or build your own</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setPlanBrowserOpen(true)} className="flex-1 text-sm font-semibold py-3 rounded-xl bg-[rgb(var(--accent-rgb))] text-black hover:brightness-110 transition">Browse Plans</button>
                                    <button onClick={() => setEditorWeekday(todayWd)} className="flex-1 text-sm font-medium py-3 rounded-xl border border-[var(--fg-10)] text-[var(--fg-60)] hover:text-[var(--fg-90)] transition">Build Custom</button>
                                </div>
                            </div>
                        )}
                        <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-4">
                            <p className="text-sm font-semibold text-[var(--fg-85)] mb-1">{hasPlan ? "No workout scheduled today" : "Just train today"}</p>
                            <p className="text-[11px] text-[var(--fg-30)] mb-3">{hasPlan ? "Want to train anyway? Jump into a session." : "No plan needed — pick exercises and log as you go."}</p>
                            <div className="flex gap-2">
                                <button onClick={() => w.setStatus("freestyle")} className="flex-1 text-sm font-medium py-3 rounded-xl border border-[var(--fg-10)] text-[var(--fg-60)] hover:text-[var(--fg-90)] hover:bg-[var(--fg-05)] transition">Freestyle</button>
                                <button onClick={w.repeatLastSession} className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-3 rounded-xl border border-[var(--fg-10)] text-[var(--fg-60)] hover:text-[var(--fg-90)] hover:bg-[var(--fg-05)] transition">
                                    <Repeat2 size={14} /> Repeat Last
                                </button>
                            </div>
                            {hasPlan && (
                                <button onClick={() => setEditorWeekday(todayWd)} className="w-full flex items-center justify-center gap-1.5 text-[11px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] mt-2 py-2 transition">
                                    <Plus size={12} /> Add {new Date().toLocaleDateString(undefined, { weekday: "long" })} to Schedule
                                </button>
                            )}
                            {/* Quick-add presets by category (5.2) */}
                            <div className="grid grid-cols-3 gap-1.5 mt-3">
                                {[
                                    { label: "Push", emoji: "🏋️", seg: "Chest" },
                                    { label: "Pull", emoji: "🔙", seg: "Back" },
                                    { label: "Legs", emoji: "🦵", seg: "Legs" },
                                    { label: "Arms", emoji: "💪", seg: "Biceps" },
                                    { label: "Core", emoji: "🎯", seg: "Core" },
                                    { label: "Cardio", emoji: "🏃", seg: "Cardio" },
                                ].map(p => (
                                    <button key={p.label} onClick={() => { w.setStatus("freestyle"); setShowDatabase(true); }}
                                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-[var(--fg-06)] bg-[var(--fg-02)] text-left hover:border-[var(--fg-12)] active:scale-95 transition">
                                        <span className="text-xs">{p.emoji}</span>
                                        <span className="text-[10px] font-medium text-[var(--fg-50)]">{p.label}</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowMusclePicker(true)} className="w-full flex items-center justify-center gap-1.5 text-[11px] font-mono text-[var(--fg-30)] hover:text-[var(--fg-60)] mt-1 py-2 transition">
                                <Target size={12} /> Browse by Muscle
                            </button>
                        </div>
                    </div>
                )}

                {/* Week progress card removed — dots now integrated in hero card */}

                {/* ═══ WEEK SCHEDULE with timeline rail (#8) ═══ */}
                {recurringLoaded && w.hasLoaded && w.status !== "active" && (
                    <>
                        <div className="flex items-center justify-between pt-2">
                            <p className="text-[10px] font-mono tracking-widest text-[var(--fg-30)]">
                                {weekOffset === 0 ? "WEEKLY SCHEDULE" : weekOffset === 1 ? "NEXT WEEK" : weekOffset === -1 ? "LAST WEEK" : `WEEK ${weekOffset > 0 ? "+" : ""}${weekOffset}`}
                            </p>
                            {/* #18 Week navigation */}
                            <div className="flex items-center gap-1">
                                {weekOffset !== 0 && (
                                    <button onClick={() => setWeekOffset(0)} className="text-[8px] font-mono text-[rgb(var(--accent-light-rgb))] px-2 py-0.5 rounded-md hover:bg-[var(--fg-06)] transition">Today</button>
                                )}
                                <button onClick={() => setWeekOffset(o => o - 1)} className="p-1 rounded-md text-[var(--fg-25)] hover:text-[var(--fg-50)] hover:bg-[var(--fg-06)] transition"><ChevronLeft size={14} /></button>
                                <button onClick={() => setWeekOffset(o => o + 1)} className="p-1 rounded-md text-[var(--fg-25)] hover:text-[var(--fg-50)] hover:bg-[var(--fg-06)] transition"><ChevronRight size={14} /></button>
                            </div>
                        </div>
                        <div className="relative pl-6">
                            {/* Timeline rail (#8) */}
                            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--fg-08)]" />
                            <div className="space-y-2">
                                {WEEKDAY_ORDER.map((wd, wdIdx) => {
                                    const dayPlans = recurringPlans[wd] ?? [];
                                    const isToday = wd === todayWd;
                                    const completed = completedDays.has(wd);
                                    const isExpanded = expandedWeekday === wd || isToday;
                                    return (
                                        <div key={wd} className="relative" style={{ animation: `fadeSlideIn 0.25s ease-out ${wdIdx * 0.04}s both` }}>
                                            {/* Timeline node */}
                                            <div className="absolute -left-6 top-3.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center z-[1]" style={{
                                                borderColor: completed ? "rgb(var(--accent-rgb))" : isToday ? "rgb(var(--accent-rgb) / 0.5)" : "var(--fg-10)",
                                                background: completed ? "rgb(var(--accent-rgb))" : "var(--bg-primary)",
                                                ...(completed ? { animation: "confetti-pop 0.4s ease-out both" } : {}),
                                            }}>
                                                {completed && <Check size={8} className="text-black" strokeWidth={3} />}
                                                {isToday && !completed && <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--accent-rgb))]" />}
                                            </div>
                                            {/* Ambient glow on today node (#11) */}
                                            {isToday && <div className="absolute -left-6 top-3.5 w-3.5 h-3.5 rounded-full" style={{ boxShadow: "0 0 12px rgb(var(--accent-rgb) / 0.3)" }} />}

                                            {dayPlans.length === 0 ? (
                                                <button onClick={() => { setEditorWeekday(wd); setExpandedWeekday(wd); }}
                                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition active:scale-[0.99] ${isToday ? "border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.06)]" : "border-[var(--fg-06)] bg-[var(--fg-02)] hover:border-[var(--fg-10)]"}`}>
                                                    <span className={`text-[11px] font-mono w-8 shrink-0 ${isToday ? "font-bold text-[rgb(var(--accent-light-rgb))]" : "text-[var(--fg-40)]"}`}>{WEEKDAY_LABELS[wd]}</span>
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[rgb(var(--fg-06))]"><Plus size={14} className="text-[var(--fg-20)]" /></div>
                                                    <div className="flex-1 min-w-0 text-left"><p className={`text-[12px] ${isToday ? "text-[var(--fg-80)]" : "text-[var(--fg-60)]"}`}>No plan</p></div>
                                                    {isToday && <span className="text-[7px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-full bg-[rgb(var(--accent-rgb)/0.15)] text-[rgb(var(--accent-light-rgb))] border border-[rgb(var(--accent-rgb)/0.2)] shrink-0" style={{ boxShadow: "0 0 8px rgb(var(--accent-rgb) / 0.15)" }}>TODAY</span>}
                                                </button>
                                            ) : (
                                                <div>
                                                    {/* Collapsed: single-line summary (#7) */}
                                                    {!isExpanded ? (
                                                        <button onClick={() => setExpandedWeekday(wd)}
                                                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition active:scale-[0.99] ${completed ? "border-[rgb(var(--accent-rgb)/0.15)] bg-[rgb(var(--accent-rgb)/0.03)]" : "border-[var(--fg-06)] bg-[var(--fg-02)] hover:border-[var(--fg-10)]"}`}>
                                                            <span className="text-[11px] font-mono w-8 shrink-0 text-[var(--fg-40)]">{WEEKDAY_LABELS[wd]}</span>
                                                            <div className="flex-1 min-w-0 text-left">
                                                                <p className="text-[12px] text-[var(--fg-50)] truncate">{dayPlans.filter(p => !p.is_rest).map(p => {
                                                                    if (p.session_type === "ma" && p.ma_discipline && DISCIPLINES[p.ma_discipline]) return DISCIPLINES[p.ma_discipline].name;
                                                                    return p.template_name || "Training";
                                                                }).join(" + ") || "Rest"}</p>
                                                                {/* Stacked category labels (2.6) + muscle dots */}
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    {dayPlans.filter(p => !p.is_rest).length > 1 && dayPlans.filter(p => !p.is_rest).map((p, pi) => {
                                                                        const isMa = p.session_type === "ma" && p.ma_discipline;
                                                                        const disc = isMa ? DISCIPLINES[p.ma_discipline!] : null;
                                                                        return (
                                                                            <span key={pi} className="text-[7px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: isMa && disc ? `rgb(${disc.colorRgb})` : "rgb(var(--accent-light-rgb))", background: isMa && disc ? `rgb(${disc.colorRgb} / 0.12)` : "rgb(var(--accent-rgb) / 0.1)" }}>
                                                                                {isMa && disc ? disc.name.slice(0, 6).toUpperCase() : "GYM"}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                    {dayPlans.filter(p => !p.is_rest).flatMap(p => p.muscles).slice(0, 4).map((m, mi) => (
                                                                        <div key={mi} className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${MUSCLE_COLORS[m] || MUSCLE_COLORS.Other} / 0.6)` }} />
                                                                    ))}
                                                                    {dayPlans.filter(p => !p.is_rest).some(p => p.estimated_minutes > 0) && (
                                                                        <span className="text-[8px] font-mono text-[var(--fg-20)] ml-auto">~{dayPlans.filter(p => !p.is_rest).reduce((s, p) => s + p.estimated_minutes, 0)}min</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {completed && (
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    {completedDaySummaries[wd] && (completedDaySummaries[wd].minutes > 0 || completedDaySummaries[wd].volume > 0) && (
                                                                        <span className="text-[8px] font-mono text-[rgb(var(--accent-light-rgb)/0.6)]">
                                                                            {completedDaySummaries[wd].minutes > 0 && `${completedDaySummaries[wd].minutes}m`}
                                                                            {completedDaySummaries[wd].minutes > 0 && completedDaySummaries[wd].volume > 0 && " · "}
                                                                            {completedDaySummaries[wd].volume > 0 && `${Math.round(kgToUnitW(completedDaySummaries[wd].volume, w.weightUnit)).toLocaleString()}${w.weightUnit}`}
                                                                        </span>
                                                                    )}
                                                                    <div className="w-4 h-4 rounded-full bg-[rgb(var(--accent-rgb))] flex items-center justify-center" style={{ animation: "confetti-pop 0.4s ease-out both" }}><Check size={8} className="text-black" strokeWidth={3} /></div>
                                                                </div>
                                                            )}
                                                            <ChevronRight size={12} className="text-[var(--fg-20)] shrink-0" />
                                                        </button>
                                                    ) : (
                                                        /* Expanded: full details */
                                                        <div className="space-y-0.5">
                                                            {dayPlans.map((plan, pi) => {
                                                                const isMa = plan.session_type === "ma" && plan.ma_discipline;
                                                                const disc = isMa ? DISCIPLINES[plan.ma_discipline!] : null;
                                                                const stLabel = isMa && plan.ma_session_type ? SESSION_TYPE_LABELS[plan.ma_session_type] : null;
                                                                return (
                                                                    <button key={`${wd}-${pi}`} onClick={() => { setEditorWeekday(wd); if (!isToday) setExpandedWeekday(expandedWeekday === wd ? null : wd); }}
                                                                        className={`w-full flex items-center gap-3 px-4 py-3 ${pi === 0 ? "rounded-t-xl" : ""} ${pi === dayPlans.length - 1 ? "rounded-b-xl" : ""} ${dayPlans.length === 1 ? "!rounded-xl" : ""} border transition active:scale-[0.99] ${isToday ? "border-[rgb(var(--accent-rgb)/0.3)] bg-[rgb(var(--accent-rgb)/0.06)]" : "border-[var(--fg-06)] bg-[var(--fg-02)] hover:border-[var(--fg-10)]"}`}
                                                                        style={!plan.is_rest ? { borderLeftWidth: 3, borderLeftColor: isMa && disc ? `rgb(${disc.colorRgb} / 0.5)` : "rgb(var(--accent-rgb) / 0.4)" } : undefined}>
                                                                        <span className={`text-[11px] font-mono w-8 shrink-0 ${pi > 0 ? "invisible" : isToday ? "font-bold text-[rgb(var(--accent-light-rgb))]" : "text-[var(--fg-40)]"}`}>{WEEKDAY_LABELS[wd]}</span>
                                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: plan.is_rest ? "rgb(16 185 129 / 0.1)" : isMa && disc ? `rgb(${disc.colorRgb} / 0.1)` : "rgb(var(--accent-rgb) / 0.1)" }}>
                                                                            {plan.is_rest ? <Moon size={14} className="text-emerald-400" /> : isMa && disc ? <span className="text-sm">{disc.emoji}</span> : <Dumbbell size={14} className="text-[rgb(var(--accent-light-rgb))]" />}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0 text-left">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <p className={`text-[12px] truncate ${isToday ? "text-[var(--fg-80)] font-medium" : "text-[var(--fg-60)]"}`}>{plan.is_rest ? "Rest" : isMa && disc ? disc.name : plan.template_name || "No plan"}</p>
                                                                                {!plan.is_rest && dayPlans.length > 1 && (
                                                                                    <span className="shrink-0 text-[8px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: isMa && disc ? `rgb(${disc.colorRgb})` : "rgb(var(--accent-light-rgb))", background: isMa && disc ? `rgb(${disc.colorRgb} / 0.12)` : "rgb(var(--accent-rgb) / 0.1)" }}>
                                                                                        {isMa && disc ? disc.name.toUpperCase().slice(0, 6) : "GYM"}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {!plan.is_rest && (
                                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                                <p className="text-[9px] font-mono text-[var(--fg-25)]">{isMa && stLabel ? `${stLabel.name}${plan.estimated_minutes > 0 ? ` · ~${plan.estimated_minutes}min` : ""}` : plan.exercise_count > 0 ? `${plan.exercise_count} exercises${plan.estimated_minutes > 0 ? ` · ~${plan.estimated_minutes}min` : ""}` : ""}</p>
                                                                                {/* Muscle dots in expanded view (#14) */}
                                                                                {plan.muscles.length > 0 && (
                                                                                    <div className="flex items-center gap-0.5 ml-1">
                                                                                        {plan.muscles.slice(0, 3).map((m, mi) => (
                                                                                            <div key={mi} className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${MUSCLE_COLORS[m] || MUSCLE_COLORS.Other} / 0.6)` }} />
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        </div>
                                                                        {pi === 0 && completed && <div className="w-5 h-5 rounded-full bg-[rgb(var(--accent-rgb))] flex items-center justify-center shrink-0" style={{ animation: "confetti-pop 0.4s ease-out both" }}><span className="text-[9px] text-black font-bold">✓</span></div>}
                                                                        {pi === 0 && isToday && !completed && <span className="text-[7px] font-mono font-bold tracking-widest px-2 py-0.5 rounded-full bg-[rgb(var(--accent-rgb)/0.15)] text-[rgb(var(--accent-light-rgb))] border border-[rgb(var(--accent-rgb)/0.2)] shrink-0" style={{ boxShadow: "0 0 8px rgb(var(--accent-rgb) / 0.15)" }}>TODAY</span>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* ═══ EMPTY STATE ═══ */}
                {recurringLoaded && w.hasLoaded && !hasPlan && w.status !== "freestyle" && (
                    <div className="rounded-2xl border border-[var(--fg-06)] bg-[var(--fg-03)] p-6 text-center">
                        <Dumbbell size={28} className="text-[var(--fg-20)] mx-auto mb-3" />
                        <h2 className="text-base font-bold text-[var(--fg-80)] mb-1">Set up your week</h2>
                        <p className="text-[11px] text-[var(--fg-35)] mb-5 max-w-[260px] mx-auto">Import a proven program or tap any day above to build your own.</p>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {QUICK_START_TEMPLATES.slice(0, 4).map((tpl) => (
                                <button key={tpl.key} onClick={() => importQuickStartTemplate(tpl)} disabled={importingTemplate !== null}
                                    className="text-left rounded-xl border border-[var(--fg-08)] bg-[var(--fg-02)] p-3 hover:border-[var(--fg-15)] disabled:opacity-40 transition">
                                    <p className="text-[11px] font-bold text-[var(--fg-70)] truncate">{tpl.name}</p>
                                    <p className="text-[9px] font-mono text-[var(--fg-25)] mt-0.5">{tpl.daysPerWeek}D/WK · {tpl.muscleCoverage}</p>
                                    {importingTemplate === tpl.key && <p className="text-[9px] font-mono text-[rgb(var(--accent-light-rgb))] mt-1">Importing...</p>}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setPlanBrowserOpen(true)} className="w-full py-2.5 rounded-xl border border-[var(--fg-08)] text-[11px] font-mono text-[var(--fg-40)] hover:text-[var(--fg-60)] hover:border-[var(--fg-15)] transition">Browse 70+ plans →</button>
                    </div>
                )}
            </div>

            {/* ═══ FLOATING BEGIN SESSION ISLAND (#22) ═══ */}
            {gymSessionReady && w.status === "not_started" && heroScrolled && !showWeighIn && (
                <div className="fixed bottom-24 md:bottom-16 left-1/2 -translate-x-1/2 z-40" style={{ animation: "fadeInUp 0.25s ease-out" }}>
                    <button onClick={() => { setShowWeighIn(true); heroRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                        className="flex items-center gap-2.5 text-[13px] font-bold px-6 py-3 rounded-2xl text-black hover:brightness-110 active:scale-[0.97] transition-all"
                        style={{ background: "rgb(var(--accent-rgb))", boxShadow: "0 4px 20px rgb(var(--accent-rgb) / 0.3), 0 8px 40px rgb(var(--accent-rgb) / 0.15), 0 0 0 1px rgb(var(--accent-rgb) / 0.2)" }}>
                        <Play size={16} fill="black" /> Begin Session
                    </button>
                </div>
            )}

            {/* ═══ FIXED BOTTOM ELEMENTS ═══ */}

            {/* Undo toast */}
            {w.lastAction && w.status === "active" && (
                <div className="fixed bottom-28 md:bottom-20 left-1/2 -translate-x-1/2 z-40 animate-[fadeInUp_0.2s_ease] max-w-[90vw]">
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--fg-08)] px-4 py-2.5 shadow-lg backdrop-blur-xl" style={{ background: "var(--bg-card)" }}>
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] font-mono text-[rgb(var(--accent-light-rgb))] truncate">{w.lastAction.exName}</span>
                            <span className="text-[9px] font-mono text-[var(--fg-30)]">{w.lastAction.weight ? `${w.lastAction.weight} × ` : ""}{w.lastAction.reps} reps logged</span>
                        </div>
                        <button onClick={w.undoLastSet} className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg border border-[var(--fg-10)] text-[var(--fg-50)] hover:text-[var(--fg-80)] hover:bg-[var(--fg-05)] active:scale-95 transition shrink-0"><Undo2 size={12} /> Undo</button>
                    </div>
                </div>
            )}

            {/* Rest screen takeover */}
            {w.restRemaining !== null && w.status === "active" && (() => {
                const currentEx = w.expandedId ? w.exercisesList.find(e => e.id === w.expandedId) : null;
                const restTotal = currentEx?.rest_seconds ?? 90;
                const restPct = Math.min(1, 1 - (w.restRemaining / restTotal));
                const rR = 72; const rC = 2 * Math.PI * rR;
                const curSets = currentEx ? (w.logs[currentEx.id] ?? []) : [];
                const curNextSet = curSets.find(s => !s.completed);
                const nextUncompleted = curNextSet ? currentEx : w.exercisesList.find(e => {
                    if (e.id === currentEx?.id) return false;
                    const eSets = (w.logs[e.id] ?? []).filter(s => !s.is_warmup);
                    return eSets.length === 0 || eSets.some(s => !s.completed);
                });
                const nextEx = nextUncompleted ?? null;
                const nextSet = nextEx ? (w.logs[nextEx.id] ?? []).find(s => !s.completed) : null;
                return (
                <div className="fixed bottom-[72px] md:bottom-4 left-0 right-0 z-[60] flex justify-center px-4 animate-[fadeInUp_0.2s_ease]">
                    <div className="w-full max-w-lg rounded-2xl border border-[var(--fg-08)] px-5 py-4" style={{ backgroundColor: "var(--bg-card)", backdropFilter: "blur(20px)", boxShadow: "0 -4px 30px rgb(0 0 0 / 0.3)" }}>
                        <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                                <svg width="56" height="56" className="-rotate-90">
                                    <circle cx="28" cy="28" r={rR * 0.35} fill="none" stroke="rgb(var(--fg-rgb) / 0.06)" strokeWidth="3" />
                                    <circle cx="28" cy="28" r={rR * 0.35} fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="3" strokeLinecap="round" strokeDasharray={2 * Math.PI * rR * 0.35} strokeDashoffset={2 * Math.PI * rR * 0.35 * (1 - restPct)} className="transition-all duration-1000 ease-linear" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-base font-bold font-mono text-[var(--fg-90)] tabular-nums">{formatClock(w.restRemaining)}</span>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-mono tracking-[0.15em] text-[var(--fg-25)]">REST</p>
                                {nextEx && nextSet && (
                                    <p className="text-[11px] font-mono text-[var(--fg-50)] mt-0.5 truncate">
                                        Next: {nextEx.name} · {nextSet.weight || "—"}{w.weightUnit} × {nextSet.reps || "—"}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => w.addRestTime(15)} className="text-[10px] font-mono px-2.5 py-1.5 rounded-lg border border-[var(--fg-08)] text-[var(--fg-30)] hover:text-[var(--fg-60)] active:scale-95 transition">+15s</button>
                                <button onClick={() => w.setRestPaused((p: boolean) => !p)} className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--fg-10)] text-[var(--fg-40)] hover:text-[var(--fg-70)] active:scale-95 transition">
                                    {w.restPaused ? <Play size={14} /> : <Pause size={14} />}
                                </button>
                                <button onClick={w.dismissRestTimer} className="text-[10px] font-mono px-2.5 py-1.5 rounded-lg border border-[var(--fg-08)] text-[var(--fg-30)] hover:text-[var(--fg-60)] active:scale-95 transition">Skip</button>
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* Post-set reward toast */}
            <AnimatePresence>
            {setJustLogged && w.restRemaining === null && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                >
                    <div className="flex items-center gap-2.5 rounded-xl border border-[rgb(var(--accent-rgb)/0.2)] bg-[var(--bg-card)] shadow-lg shadow-black/20 backdrop-blur-xl px-4 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-[rgb(var(--accent-rgb)/0.15)] flex items-center justify-center">
                            <Check size={14} className="text-[rgb(var(--accent-rgb))]" />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-[var(--fg-70)]">
                                {setJustLogged.weight ? `${setJustLogged.weight} × ` : ""}{setJustLogged.reps} reps
                            </p>
                            <p className="text-[9px] font-mono text-[var(--fg-30)]">{setJustLogged.exName}</p>
                        </div>
                        {setJustLogged.streak > 1 && (
                            <span className="text-[10px] font-mono font-bold text-[rgb(var(--accent-rgb))]">🔥 {setJustLogged.streak}</span>
                        )}
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Sticky action bar */}
            {w.status === "active" && w.restRemaining === null && (
                <div className="fixed bottom-16 md:bottom-6 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:max-w-sm md:rounded-xl z-20">
                    <div className="border-t md:border border-[var(--fg-06)] bg-[var(--bg-card)] backdrop-blur-xl px-5 py-3 md:rounded-xl flex items-center gap-2">
                        {!w.sessionPaused ? (
                            <>
                                <button onClick={w.startManualRestTimer} className="text-[10px] font-mono font-medium py-3 px-3 rounded-xl border border-[var(--fg-08)] text-[var(--fg-40)] hover:text-[var(--fg-70)] transition"><Timer size={12} className="inline mr-1" />Rest</button>
                                <button onClick={() => w.setSessionPaused(true)} className="text-[10px] font-mono font-medium py-3 px-3 rounded-xl border border-[var(--fg-08)] text-[var(--fg-40)] hover:text-[var(--fg-70)] transition"><Pause size={12} className="inline mr-1" />Pause</button>
                                <button onClick={() => w.setShowEndConfirm(true)} className="flex-1 text-sm font-semibold py-3 rounded-xl bg-[rgb(var(--accent-rgb))] text-black hover:brightness-110 transition">{w.completedCount > 0 ? `Complete · ${w.completedCount} sets` : "End Session"}</button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => w.setShowCancelConfirm(true)} className="text-[10px] font-mono font-medium py-3 px-3 rounded-xl border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition"><X size={12} className="inline mr-1" />Cancel</button>
                                <button onClick={() => w.setSessionPaused(false)} className="flex-1 text-sm font-semibold py-3 rounded-xl bg-amber-500 text-black hover:brightness-110 transition flex items-center justify-center gap-2"><Play size={14} /> Resume Session</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ DROP CONFIRM DIALOG (4.3) ═══ */}
            {dropConfirm && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center pb-8" onClick={() => setDropConfirm(null)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                    <div className="relative bg-[var(--bg-card)] border border-[var(--fg-10)] rounded-2xl w-[90%] max-w-sm p-5 shadow-2xl animate-[fadeInUp_0.2s_ease]" onClick={e => e.stopPropagation()}>
                        {(() => {
                            const sets = (w.logs[dropConfirm.id] ?? []).filter((s: any) => !s.is_warmup);
                            const done = sets.filter((s: any) => s.completed).length;
                            return (
                                <>
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle size={16} className="text-amber-400" />
                                        <p className="text-[13px] font-semibold text-[var(--fg-70)]">Skip {dropConfirm.name}?</p>
                                    </div>
                                    <p className="text-[11px] text-[var(--fg-40)] mb-4">{done} completed set{done > 1 ? "s" : ""} will still be saved. The exercise will be greyed out for this session.</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setDropConfirm(null)} className="flex-1 h-10 rounded-xl border border-[var(--fg-10)] text-[11px] font-medium text-[var(--fg-50)] hover:bg-[var(--fg-05)] active:scale-[0.98] transition">Cancel</button>
                                        <button onClick={() => { w.skipExercise(dropConfirm.id); setDropConfirm(null); }} className="flex-1 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 text-[11px] font-semibold text-amber-400 hover:bg-amber-500/25 active:scale-[0.98] transition">Skip</button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* ═══ MODALS ═══ */}
            {/* Session launch overlay */}
            <AnimatePresence>
            {sessionLaunching && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[55] flex flex-col items-center justify-center"
                    style={{ background: "var(--bg-primary)" }}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                        className="flex flex-col items-center gap-4"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--accent-rgb)/0.15)] border border-[rgb(var(--accent-rgb)/0.3)] flex items-center justify-center">
                            <Dumbbell size={28} className="text-[rgb(var(--accent-rgb))]" />
                        </div>
                        <p className="text-[11px] font-mono tracking-widest text-[var(--fg-30)]">LET&apos;S GO</p>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

            {w.finishing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <CubeLoader message="Saving your workout…" />
                </div>
            )}

            {w.showEndConfirm && !w.finishing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-[var(--fg-08)] bg-[var(--bg-card)] p-5">
                        <p className="text-sm font-semibold text-[var(--fg-85)] mb-2">End workout?</p>
                        <p className="text-[11px] text-[var(--fg-35)] mb-4">
                            {w.completedCount === 0 ? "No sets completed. This session will be saved as ended early." : w.completedCount < w.totalPlanned ? `You've completed ${w.completedCount} of ${w.totalPlanned} planned sets.` : `All ${w.completedCount} sets completed. Nice work.`}
                        </p>
                        {(() => {
                            const unfinished = w.exercisesList.filter(ex => {
                                const sets = (w.logs[ex.id] ?? []).filter(s => !s.is_warmup);
                                const allDone = sets.length > 0 && sets.every(s => s.completed);
                                return !allDone && !w.skippedExercises.has(ex.id);
                            });
                            return unfinished.length > 0 ? (
                                <div className="rounded-lg bg-amber-500/8 border border-amber-500/15 px-3 py-2 mb-4">
                                    <p className="text-[11px] text-amber-300/80 font-medium">You still have {unfinished.length} exercise{unfinished.length > 1 ? "s" : ""} queued</p>
                                    <p className="text-[9px] text-[var(--fg-30)] mt-0.5">{unfinished.map(e => e.name).join(", ")}</p>
                                </div>
                            ) : null;
                        })()}
                        <div className="flex gap-2">
                            <button onClick={() => w.setShowEndConfirm(false)} className="flex-1 text-sm font-medium py-2.5 rounded-xl border border-[var(--fg-08)] text-[var(--fg-50)] hover:text-[var(--fg-80)] transition">Keep Going</button>
                            <button onClick={() => { w.setShowEndConfirm(false); w.finishWorkout(); }} className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-[rgb(var(--accent-rgb))] text-black hover:brightness-110 transition">Finish</button>
                        </div>
                    </div>
                </div>
            )}

            {w.showCancelConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-red-500/15 bg-[var(--bg-card)] p-5">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center"><X size={18} className="text-red-400" /></div>
                        <p className="text-sm font-semibold text-[var(--fg-85)] text-center mb-2">Cancel this session?</p>
                        <p className="text-[11px] text-[var(--fg-35)] text-center mb-4">All progress for this session will be permanently deleted. This cannot be undone.</p>
                        <div className="flex gap-2">
                            <button onClick={() => w.setShowCancelConfirm(false)} className="flex-1 text-sm font-medium py-2.5 rounded-xl border border-[var(--fg-08)] text-[var(--fg-50)] hover:text-[var(--fg-80)] transition">Go Back</button>
                            <button onClick={w.cancelSession} className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition">Discard Session</button>
                        </div>
                    </div>
                </div>
            )}

            {w.showDeletePlanConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-red-500/15 bg-[var(--bg-card)] p-5">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center"><Trash2 size={18} className="text-red-400" /></div>
                        <p className="text-sm font-semibold text-[var(--fg-85)] text-center mb-2">Delete entire workout plan?</p>
                        <p className="text-[11px] text-[var(--fg-35)] text-center mb-4">This will permanently delete your weekly schedule. This cannot be undone.</p>
                        <div className="flex gap-2">
                            <button onClick={() => w.setShowDeletePlanConfirm(false)} className="flex-1 text-sm font-medium py-2.5 rounded-xl border border-[var(--fg-08)] text-[var(--fg-50)] hover:text-[var(--fg-80)] transition">Cancel</button>
                            <button onClick={w.deletePlan} disabled={w.deletingPlan} className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-red-500 text-[var(--text-primary)] hover:bg-red-600 disabled:opacity-50 transition">{w.deletingPlan ? "Deleting..." : "Delete Plan"}</button>
                        </div>
                    </div>
                </div>
            )}

            {editorWeekday !== null && (
                <DayEditorModal weekday={editorWeekday} plan={(recurringPlans[editorWeekday] ?? []).find(p => p.session_type === "gym" || !p.session_type) ?? (recurringPlans[editorWeekday] ?? [])[0]} onClose={() => setEditorWeekday(null)} onSaved={() => loadRecurring()} sensors={sensors} user={user} userSex={userSex ?? "male"} allPlans={recurringPlans} />
            )}
            {showDatabase && <ExerciseDatabaseModal onClose={() => setShowDatabase(false)} />}
            {showMusclePicker && <MusclePickerModal onClose={() => setShowMusclePicker(false)} />}
            <PlanBrowserModal open={planBrowserOpen} onClose={() => setPlanBrowserOpen(false)} onImport={importPlanFromLibrary} importing={importingPlan} userSex={userSex} />

            {w.swapTargetId && <AddExerciseModal onAdd={(e) => { const old = w.exercisesList.find((x) => x.id === w.swapTargetId); if (old) w.handleSwap(old, e); }} onClose={() => w.setSwapTargetId(null)} defaultSegment={w.exercisesList.find((x) => x.id === w.swapTargetId)?.body_segment} />}
            {w.showAddModal && <AddExerciseModal onAdd={w.handleAddExercise} onClose={() => w.setShowAddModal(false)} existingIds={new Set(w.exercisesList.map((e) => e.exercise_id))} />}
            {detailExercise && (
                <ExerciseDetailSheet exerciseId={detailExercise.exercise_id} exerciseName={detailExercise.name} equipment={detailExercise.equipment} bodySegment={detailExercise.body_segment} weightUnit={w.weightUnit} userSex={w.userSex} imageUrl={detailExercise.image_url} onClose={() => setDetailExercise(null)}
                    currentSetVolumes={w.status === "active" ? (w.logs[detailExercise.id] ?? []).filter(s => s.completed && !s.is_warmup && s.set_type !== "drop" && s.set_type !== "rest_pause" && s.weight && s.reps).map(s => Number(s.weight) * Number(s.reps)) : undefined}
                />
            )}
            {formCheckExercise && <LazyFormCheck exerciseName={formCheckExercise} onClose={() => setFormCheckExercise(null)} />}

            {importConfirm && createPortal(
                <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-[var(--fg-08)] bg-[var(--bg-card)] p-5">
                        <p className="text-sm font-semibold text-[var(--fg-85)] mb-2">Switch plan?</p>
                        <p className="text-[11px] text-[var(--fg-35)] mb-4">
                            Replace <span className="text-[var(--fg-60)]">{importConfirm.label}</span> with <span className="text-[var(--fg-60)]">{importConfirm.plan.name}</span>? This will update the days this plan uses.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setImportConfirm(null)} className="flex-1 text-sm font-medium py-2.5 rounded-xl border border-[var(--fg-08)] text-[var(--fg-50)] hover:text-[var(--fg-80)] transition">Cancel</button>
                            <button onClick={() => executeImport(importConfirm.plan)} className="flex-1 text-sm font-semibold py-2.5 rounded-xl bg-[rgb(var(--accent-rgb))] text-black hover:brightness-110 transition">Switch</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* ═══ DRUM PICKER OVERLAY ═══ */}
        </main>
    );
}
