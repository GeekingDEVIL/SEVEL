"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthProvider";
import { calculateSessionXP, type XPBreakdown } from "./xpEngine";
import { generateWarmupSets } from "./warmupSets";
import { computeLevel, getRank } from "./levelSystem";
import { checkAndAwardAchievements } from "./achievements";
import { updateUserStats } from "./updateUserStats";
import { updateExerciseLeaderboard } from "./updateExerciseLeaderboard";
import { useSex } from "./useSex";
import { useUnits } from "./useUnits";
import { kgToUnit, weightInputToKg } from "./units";
import { fetchCycleTrainingData, assessExerciseRisk, getCycleAdjustedWeight, type PhaseTrainingProfile, type EnergyForecast, type ExerciseRisk } from "./cycleTrainingEngine";
import { findSubstitutions, type Substitution } from "./substitutionEngine";
import { useEquipment } from "./useEquipment";
import { autoCompleteHabits } from "./habitAutoComplete";
import { enqueue, setupOnlineListener, flushQueue, removeFromQueue } from "./offlineQueue";

/* ─── TYPES ─── */
export type TrackingMode = "weight_reps" | "rounds_duration" | "duration_only" | "distance_time";
export type Discipline = "strength" | "boxing" | "muay_thai" | "kickboxing" | "bjj" | "wrestling" | "judo" | "mma" | "karate" | "taekwondo" | "kung_fu" | "krav_maga" | "capoeira" | "aikido" | "calisthenics" | "cardio" | "mobility" | "other";

export type WorkoutExercise = {
    id: string;
    exercise_id: string;
    order_index: number;
    target_sets: number;
    target_reps: string;
    target_weight: number | null;
    rest_seconds: number | null;
    name: string;
    category: string;
    equipment: string;
    body_segment: string;
    isCardio: boolean;
    isBodyweight: boolean;
    is_unilateral: boolean;
    per_side_weight: boolean;
    tracking_mode: TrackingMode;
    discipline: Discipline;
    superset_group?: number | null;
    image_url?: string | null;
};

export function isDualWeight(ex: WorkoutExercise): boolean {
    if (ex.isCardio || ex.isBodyweight) return false;
    return ex.per_side_weight;
}

export type SetEntry = {
    index: number;
    weight: string;
    reps: string;
    duration: string;
    distance: string;
    note: string;
    completed: boolean;
    logId: string | null;
    is_warmup?: boolean;
    warmup_label?: string;
    rpe?: number;
    set_type?: "working" | "warmup" | "drop" | "rest_pause";
};

export type SessionStatus = "loading" | "not_started" | "active" | "completed" | "rest_day" | "no_plan" | "freestyle";

export type OverloadSuggestion = {
    type: "weight_up" | "reps_up" | "first_time" | "maintain";
    text: string;
    suggestedWeight: number | null;
};

export type SessionSummary = {
    duration: number;
    sets: number;
    volume: number;
    xpBreakdown: XPBreakdown;
    level: number;
    rankName: string;
};

export type TodaySession = {
    id: string;
    title: string;
    duration: number;
    sets: number;
    volume: number;
    xp: number;
};

export type RecentSession = {
    id: string;
    date: string;
    title: string;
    sets: number;
    volume: number;
    xp: number;
};

/* ─── HELPERS ─── */
export function toDateString(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatClock(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function emptySet(i: number): SetEntry {
    return { index: i, weight: "", reps: "", duration: "", distance: "", note: "", completed: false, logId: null };
}

function computeOverload(lastW: number | null, lastR: number | null, targetReps: string, unit: "kg" | "lbs" = "kg"): OverloadSuggestion {
    if (lastW === null || lastR === null) return { type: "first_time", text: "First session — establish your baseline", suggestedWeight: null };
    const maxTarget = Number(targetReps.split("-").pop()) || 10;
    if (lastR >= maxTarget) {
        const next = lastW < 20 ? lastW + 1 : lastW < 50 ? lastW + 2.5 : lastW + 5;
        return { type: "weight_up", text: `Hit ${lastR} reps → increase to ${kgToUnit(next, unit)}${unit}`, suggestedWeight: next };
    }
    return { type: "reps_up", text: `Got ${lastR} reps @ ${kgToUnit(lastW, unit)}${unit} → aim for ${lastR + 1}+`, suggestedWeight: lastW };
}

const MAX_SESSIONS_PER_DAY = 3;

/* ─── HOOK ─── */
export function useWorkoutSession() {
    const { user } = useAuth();
    const { sex: userSex } = useSex();
    const { equipmentAccess } = useEquipment();
    const weightUnit = useUnits();

    const today = toDateString(new Date());
    const loadInFlight = useRef(false);

    /* ── STATE ── */
    type LoadHint = "completed" | "active" | "default";
    const cachedInit = useRef<{ exercises: WorkoutExercise[]; title: string; status: SessionStatus; loadHint: LoadHint } | null>(null);
    if (cachedInit.current === null) {
        try {
            const c = JSON.parse(localStorage.getItem("sevel_workout_cache") || "null");
            const hasActiveSession = localStorage.getItem("sevel_active_session") === "true";
            if (c && c.date === today && c.sex === userSex && c.exercises?.length) {
                const hint: LoadHint = c.completed ? "completed" : hasActiveSession ? "active" : "default";
                cachedInit.current = { exercises: c.exercises, title: c.title || "Workout", status: "loading", loadHint: hint };
            } else {
                cachedInit.current = { exercises: [], title: "", status: "loading", loadHint: hasActiveSession ? "active" : "default" };
            }
        } catch { cachedInit.current = { exercises: [], title: "", status: "loading", loadHint: "default" }; }
    }
    const [status, setStatus] = useState<SessionStatus>(cachedInit.current.status);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [dayTitle, setDayTitle] = useState(cachedInit.current.title);
    const [scheduledDayId, setScheduledDayId] = useState<string | null>(null);
    const [exercisesList, setExercisesList] = useState<WorkoutExercise[]>(cachedInit.current.exercises);
    const [logs, setLogs] = useState<Record<string, SetEntry[]>>({});
    const [lastPerformance, setLastPerformance] = useState<Record<string, { weight: number | null; reps: number | null }>>({});
    const [lastSets, setLastSets] = useState<Record<string, { weight: number | null; reps: number | null }[]>>({});
    const [predictedSets, setPredictedSets] = useState<Record<string, { weight: number; reps: number }[]>>({});
    const [overloadHints, setOverloadHints] = useState<Record<string, OverloadSuggestion>>({});
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [startedAt, setStartedAt] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [restRemaining, setRestRemaining] = useState<number | null>(null);
    const [restPaused, setRestPaused] = useState(false);
    const [sessionPaused, setSessionPaused] = useState(false);
    const [pausedElapsed, setPausedElapsed] = useState(0);
    const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [preWorkoutWeight, setPreWorkoutWeight] = useState("");
    const [weightLogged, setWeightLogged] = useState(false);
    const [confirmedExercises, setConfirmedExercises] = useState<Set<string>>(new Set());
    const [prCount, setPrCount] = useState(0);
    const [prExerciseIds, setPrExerciseIds] = useState<Set<string>>(new Set());
    const [summary, setSummary] = useState<SessionSummary | null>(null);
    const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
    const [sharing, setSharing] = useState(false);
    const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
    const [weekDays, setWeekDays] = useState<boolean[]>(new Array(7).fill(false));
    const [weeklyVolumes, setWeeklyVolumes] = useState<number[]>([]);
    const [statsLoaded, setStatsLoaded] = useState(false);
    const [sessionCount, setSessionCount] = useState(0);
    const [nextSession, setNextSession] = useState<{ name: string; exerciseCount: number; dayLabel: string } | null>(null);
    const [staleExercises, setStaleExercises] = useState<Array<{ id: string; name: string; body_segment: string; lastDone: string; daysSince: number }>>([]);
    const [freestyleExercises, setFreestyleExercises] = useState<WorkoutExercise[]>([]);
    const [showFreestyleAddModal, setShowFreestyleAddModal] = useState(false);
    const [startingFreestyle, setStartingFreestyle] = useState(false);
    const [showFreestylePrompt, setShowFreestylePrompt] = useState(false);
    const [savingFreestylePlan, setSavingFreestylePlan] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [showDeletePlanConfirm, setShowDeletePlanConfirm] = useState(false);
    const [deletingPlan, setDeletingPlan] = useState(false);
    const [lastAction, setLastAction] = useState<{ exId: string; setIdx: number; logId: string | null; ts: number; exName: string; weight: string; reps: string } | null>(null);
    const [skippedExercises, setSkippedExercises] = useState<Set<string>>(new Set());
    const [warmupExercises, setWarmupExercises] = useState<Set<string>>(new Set());
    const [cycleProfile, setCycleProfile] = useState<PhaseTrainingProfile | null>(null);
    const [energyForecast, setEnergyForecast] = useState<EnergyForecast[]>([]);
    const [exerciseRisks, setExerciseRisks] = useState<Record<string, ExerciseRisk>>({});
    const [substitutions, setSubstitutions] = useState<Record<string, Substitution[]>>({});
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    /* ── DERIVED ── */
    const totalPlanned = exercisesList.reduce((sum, e) => sum + (e.isCardio ? 1 : e.target_sets), 0);
    const completedCount = Object.values(logs).flat().filter((s) => s.completed && !s.is_warmup).length;
    const sessionVolume = Object.entries(logs).reduce((total, [exId, sets]) => {
        const ex = exercisesList.find((e) => e.id === exId);
        const mult = ex && isDualWeight(ex) ? 2 : 1;
        return total + sets.filter((s) => s.completed && !s.is_warmup).reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0) * mult, 0);
    }, 0);

    useEffect(() => {
        if (status !== "active") return;
        const ex = exercisesList.find(e => e.id === expandedId);
        if (ex) localStorage.setItem("sevel_current_exercise", ex.name);
        localStorage.setItem("sevel_set_progress", `${completedCount}/${totalPlanned}`);
    }, [expandedId, status, exercisesList, completedCount, totalPlanned]);

    useEffect(() => {
        if (status !== "active") { localStorage.removeItem("sevel_resting"); return; }
        localStorage.setItem("sevel_resting", restRemaining !== null ? "true" : "false");
    }, [status, restRemaining]);

    /* ── LOAD ── */
    const activeSessionRef = useRef<string | null>(null);

    const load = useCallback(async () => {
        if (!user || loadInFlight.current) return;
        if (activeSessionRef.current) return;
        loadInFlight.current = true;
        try {
            const sex = userSex;

            if (exercisesList.length === 0) setStatus("loading");
            setLoadProgress(10);

            const weekday = new Date().getDay();
            const { data: plans } = await supabase
                .from("recurring_plans")
                .select("template_id, is_rest, session_type, workout_templates(name)")
                .eq("user_id", user.id)
                .eq("weekday", weekday)
                .eq("sex", sex)
                .or("session_type.eq.gym,session_type.is.null")
                .order("created_at", { ascending: false })
                .limit(1);
            const plan = plans?.[0] ?? null;

            if (!plan) { localStorage.removeItem("sevel_workout_cache"); setStatus("no_plan"); return; }
            if (plan.is_rest) { localStorage.removeItem("sevel_workout_cache"); setStatus("rest_day"); return; }
            if (!plan.template_id) { localStorage.removeItem("sevel_workout_cache"); setStatus("no_plan"); return; }

            setLoadProgress(20);
            const planTitle = (plan as any).workout_templates?.name || "Workout";
            setDayTitle(planTitle);

            let { data: day } = await supabase.from("scheduled_days").select("id").eq("user_id", user.id).eq("date", today).maybeSingle();
            const dayExisted = !!day;
            if (!day) {
                const { data: created, error: insertErr } = await supabase.from("scheduled_days").insert({ user_id: user.id, date: today, title: planTitle, is_rest: false }).select("id").single();
                if (insertErr) {
                    const { data: retry } = await supabase.from("scheduled_days").select("id").eq("user_id", user.id).eq("date", today).maybeSingle();
                    day = retry;
                } else {
                    day = created;
                }
            }
            if (!day) { setStatus("no_plan"); return; }
            setScheduledDayId(day.id);

            setLoadProgress(35);
            const { data: sessionCheck } = await supabase.from("workout_sessions").select("id, status").eq("user_id", user.id).eq("date", today).eq("sex", sex).in("status", ["active", "completed"]).limit(1);
            const hasSessionToday = !!sessionCheck?.length;
            if (!hasSessionToday) {
                if (dayExisted) await supabase.from("scheduled_exercises").delete().eq("scheduled_day_id", day.id);
                const { data: te } = await supabase.from("workout_template_exercises").select("exercise_id, order_index, target_sets, target_reps, target_weight, rest_seconds, notes").eq("template_id", plan.template_id).order("order_index");
                if (te?.length) {
                    await supabase.from("scheduled_exercises").insert(te.map((t: any) => ({ scheduled_day_id: day!.id, user_id: user.id, exercise_id: t.exercise_id, order_index: t.order_index, target_sets: t.target_sets, target_reps: t.target_reps, target_weight: t.target_weight, rest_seconds: t.rest_seconds, notes: t.notes })));
                }
            }

            const { data: exRows } = await supabase
                .from("scheduled_exercises")
                .select("id, order_index, target_sets, target_reps, target_weight, rest_seconds, exercise_id, superset_group, exercises(name, category, equipment, body_segment, is_unilateral, per_side_weight, image_url)")
                .eq("scheduled_day_id", day.id)
                .order("order_index");
            const mapped: WorkoutExercise[] = (exRows ?? []).map((r: any) => {
                const seg = r.exercises?.body_segment ?? "";
                const equip = r.exercises?.equipment ?? "";
                return { id: r.id, exercise_id: r.exercise_id, order_index: r.order_index, target_sets: r.target_sets, target_reps: r.target_reps, target_weight: r.target_weight, rest_seconds: r.rest_seconds, name: r.exercises?.name ?? "Unknown", category: r.exercises?.category ?? "", equipment: equip, body_segment: seg, isCardio: seg === "Cardio", isBodyweight: equip.toLowerCase() === "bodyweight" && seg !== "Cardio", is_unilateral: r.exercises?.is_unilateral ?? false, per_side_weight: r.exercises?.per_side_weight ?? false, tracking_mode: r.exercises?.tracking_mode ?? (seg === "Cardio" ? "distance_time" : "weight_reps") as TrackingMode, discipline: (r.exercises?.discipline ?? "strength") as Discipline, superset_group: r.superset_group ?? null, image_url: r.exercises?.image_url ?? null };
            });
            setExercisesList(mapped);
            if (mapped.length === 0) { setStatus("no_plan"); return; }

            try { localStorage.setItem("sevel_workout_cache", JSON.stringify({ date: today, sex, title: planTitle, exercises: mapped })); } catch {}

            if (sex === "female") {
                try {
                    const cycleData = await fetchCycleTrainingData(user.id);
                    if (cycleData) {
                        setCycleProfile(cycleData.profile);
                        setEnergyForecast(cycleData.forecast);
                        const risks: Record<string, ExerciseRisk> = {};
                        mapped.forEach(ex => {
                            const risk = assessExerciseRisk(ex.name, ex.exercise_id, cycleData.profile.phase, cycleData.profile.subPhase, ex.body_segment);
                            if (risk.riskLevel !== "none") risks[ex.id] = risk;
                        });
                        setExerciseRisks(risks);
                    }
                } catch { /* cycle data is optional */ }
            } else {
                setCycleProfile(null);
                setEnergyForecast([]);
                setExerciseRisks({});
            }

            setLoadProgress(50);
            const exerciseIds = mapped.map((m) => m.exercise_id);
            const { data: priorLogs } = await supabase.from("exercise_set_logs").select("exercise_id, weight, reps, set_index, is_warmup, completed_at, workout_session_id, workout_sessions!inner(sex)").eq("user_id", user.id).eq("workout_sessions.sex", sex).in("exercise_id", exerciseIds).order("completed_at", { ascending: false }).limit(2000);

            setLoadProgress(65);
            const { data: completedSessions } = await supabase
                .from("workout_sessions")
                .select("id, title, total_sets, total_volume, duration_seconds, xp_earned")
                .eq("user_id", user.id)
                .eq("date", today)
                .eq("sex", sex)
                .eq("status", "completed")
                .order("created_at", { ascending: true });
            if (completedSessions && completedSessions.length > 0 && completedSessions.length >= MAX_SESSIONS_PER_DAY) {
                setLoadProgress(80);
                localStorage.removeItem("sevel_active_session");
                const lastDone = completedSessions[completedSessions.length - 1];
                setTodaySessions(completedSessions.map((s: any) => ({ id: s.id, title: (typeof s.title === "string" ? s.title : "Workout").replace(/\[object Object\]/g, "Session"), sets: s.total_sets ?? 0, volume: Number(s.total_volume) || 0, duration: s.duration_seconds ?? 0, xp: s.xp_earned ?? 0 })));
                const allDoneIds = completedSessions.map((s: any) => s.id);
                const { data: doneLogRows } = await supabase.from("exercise_set_logs").select("*").in("workout_session_id", allDoneIds);
                const doneLogMap: Record<string, SetEntry[]> = {};
                mapped.forEach((ex) => {
                    const rows = (doneLogRows ?? []).filter((l: any) => l.scheduled_exercise_id === ex.id).sort((a: any, b: any) => a.set_index - b.set_index);
                    if (rows.length > 0) doneLogMap[ex.id] = rows.map((r: any, i: number) => ({ index: i, weight: r.weight != null ? String(r.weight) : "", reps: r.reps != null ? String(r.reps) : "", duration: r.duration_seconds != null ? String(r.duration_seconds) : "", distance: r.distance != null ? String(r.distance) : "", note: "", completed: true, logId: r.id, is_warmup: r.is_warmup ?? false, rpe: r.rpe ?? undefined, set_type: r.set_type ?? (r.is_warmup ? "warmup" : "working") }));
                });
                setLogs(doneLogMap);
                const { data: xpRows } = await supabase.from("workout_sessions").select("xp_earned").eq("user_id", user.id).eq("status", "completed").eq("sex", sex);
                const totalXp = (xpRows ?? []).reduce((s: number, r: any) => s + (r.xp_earned || 0), 0);
                const lvl = computeLevel(totalXp).level;
                setSummary({ sets: lastDone.total_sets ?? 0, volume: Number(lastDone.total_volume) || 0, duration: lastDone.duration_seconds ?? 0, xpBreakdown: { base: 0, setCompletion: 0, completionBonus: 0, prBonus: 0, progressionBonus: 0, consistencyBonus: 0, total: lastDone.xp_earned ?? 0, details: [] }, level: lvl, rankName: getRank(lvl).name });
                setLoadProgress(100);
                setStatus("completed");
                try { const c = JSON.parse(localStorage.getItem("sevel_workout_cache") || "null"); if (c) { c.completed = true; localStorage.setItem("sevel_workout_cache", JSON.stringify(c)); } } catch {}
                return;
            }

            const { data: activeRows } = await supabase.from("workout_sessions").select("*").eq("user_id", user.id).eq("date", today).eq("sex", sex).eq("status", "active").order("created_at", { ascending: false }).limit(1);
            const existingSession = activeRows?.[0] ?? null;

            const lastMap: Record<string, { weight: number | null; reps: number | null }> = {};
            const lastSetsMap: Record<string, { weight: number | null; reps: number | null }[]> = {};
            const hints: Record<string, OverloadSuggestion> = {};
            const sessionsByExercise: Record<string, string> = {};
            (priorLogs ?? []).forEach((row: any) => {
                if (existingSession && row.workout_session_id === existingSession.id) return;
                if (!sessionsByExercise[row.exercise_id]) sessionsByExercise[row.exercise_id] = row.workout_session_id;
                if (!lastMap[row.exercise_id]) lastMap[row.exercise_id] = { weight: row.weight, reps: row.reps };
            });
            const perExRows: Record<string, any[]> = {};
            (priorLogs ?? []).forEach((row: any) => {
                if (existingSession && row.workout_session_id === existingSession.id) return;
                if (row.workout_session_id !== sessionsByExercise[row.exercise_id]) return;
                if (row.is_warmup) return;
                if (!perExRows[row.exercise_id]) perExRows[row.exercise_id] = [];
                perExRows[row.exercise_id].push(row);
            });
            for (const [exId, rows] of Object.entries(perExRows)) {
                rows.sort((a: any, b: any) => (a.set_index ?? 0) - (b.set_index ?? 0));
                lastSetsMap[exId] = rows.map((r: any) => ({ weight: r.weight, reps: r.reps }));
            }
            mapped.forEach((ex) => {
                const last = lastMap[ex.exercise_id];
                hints[ex.exercise_id] = computeOverload(last?.weight ?? null, last?.reps ?? null, ex.target_reps, weightUnit);
            });
            setLastPerformance(lastMap);
            setLastSets(lastSetsMap);
            setOverloadHints(hints);

            const predicted: Record<string, { weight: number; reps: number }[]> = {};
            const sessionOrder: string[] = [];
            const seen = new Set<string>();
            (priorLogs ?? []).forEach((row: any) => {
                if (existingSession && row.workout_session_id === existingSession.id) return;
                if (!seen.has(row.workout_session_id)) { seen.add(row.workout_session_id); sessionOrder.push(row.workout_session_id); }
            });
            for (const ex of mapped) {
                const bySession: Record<string, { weight: number; reps: number }[]> = {};
                (priorLogs ?? []).forEach((row: any) => {
                    if (existingSession && row.workout_session_id === existingSession.id) return;
                    if (row.exercise_id !== ex.exercise_id || row.is_warmup) return;
                    if (!bySession[row.workout_session_id]) bySession[row.workout_session_id] = [];
                    bySession[row.workout_session_id].push({ weight: row.weight ?? 0, reps: row.reps ?? 0 });
                });
                const sessions = sessionOrder.filter(sid => bySession[sid]).map(sid => {
                    const sets = bySession[sid];
                    sets.sort((a, b) => (a.weight || 0) - (b.weight || 0));
                    const topWeight = sets.reduce((mx, s) => Math.max(mx, s.weight || 0), 0);
                    const topReps = sets.find(s => s.weight === topWeight)?.reps ?? sets[0]?.reps ?? 0;
                    return { weight: topWeight, reps: topReps, sets };
                });
                if (sessions.length < 2) {
                    if (lastSetsMap[ex.exercise_id]) predicted[ex.exercise_id] = lastSetsMap[ex.exercise_id].map(s => ({ weight: s.weight ?? 0, reps: s.reps ?? 0 }));
                    continue;
                }
                const recent = sessions.slice(0, Math.min(4, sessions.length));
                recent.reverse();
                let weightDelta = 0, repsDelta = 0, trendCount = 0;
                for (let i = 1; i < recent.length; i++) {
                    weightDelta += recent[i].weight - recent[i - 1].weight;
                    repsDelta += recent[i].reps - recent[i - 1].reps;
                    trendCount++;
                }
                if (trendCount > 0) { weightDelta /= trendCount; repsDelta /= trendCount; }
                const lastSession = sessions[0];
                const lastSetsForEx = lastSetsMap[ex.exercise_id] ?? lastSession.sets;
                const isIncreasing = weightDelta > 0;
                const maxTarget = Number(ex.target_reps.split("-").pop()) || 10;
                predicted[ex.exercise_id] = lastSetsForEx.map(s => {
                    const w = s.weight ?? 0;
                    const r = s.reps ?? 0;
                    if (isIncreasing) {
                        const step = w < 20 ? 1 : w < 50 ? 2.5 : 5;
                        return { weight: Math.round((w + step) * 10) / 10, reps: r };
                    }
                    if (r >= maxTarget && weightDelta >= 0) {
                        const step = w < 20 ? 1 : w < 50 ? 2.5 : 5;
                        return { weight: Math.round((w + step) * 10) / 10, reps: Math.max(1, r - 2) };
                    }
                    if (repsDelta > 0) {
                        return { weight: w, reps: Math.min(r + 1, maxTarget) };
                    }
                    return { weight: w, reps: r };
                });
            }
            setPredictedSets(predicted);

            if (existingSession) {
                setSessionId(existingSession.id);
                activeSessionRef.current = existingSession.id;
                setStartedAt(new Date(existingSession.started_at).getTime());
                const { data: existingLogs } = await supabase.from("exercise_set_logs").select("*").eq("workout_session_id", existingSession.id);
                const logMap: Record<string, SetEntry[]> = {};
                mapped.forEach((ex) => {
                    const rows = (existingLogs ?? []).filter((l: any) => l.scheduled_exercise_id === ex.id).sort((a: any, b: any) => a.set_index - b.set_index);
                    const count = Math.max(ex.target_sets, rows.length);
                    const arr: SetEntry[] = [];
                    for (let i = 0; i < count; i++) {
                        const saved = rows.find((r: any) => r.set_index === i);
                        arr.push(saved ? { index: i, weight: saved.weight != null ? String(saved.weight) : "", reps: saved.reps != null ? String(saved.reps) : "", duration: saved.duration_seconds != null ? String(saved.duration_seconds) : "", distance: saved.distance != null ? String(saved.distance) : "", note: "", completed: true, logId: saved.id, is_warmup: saved.is_warmup ?? false, rpe: saved.rpe ?? undefined, set_type: saved.set_type ?? (saved.is_warmup ? "warmup" : "working") } : emptySet(i));
                    }
                    logMap[ex.id] = arr;
                });
                setLogs(restoreDrafts(logMap, existingSession.id));
                const restoredWarmups = new Set<string>();
                for (const ex of mapped) {
                    if (logMap[ex.id]?.some((s) => s.is_warmup)) restoredWarmups.add(ex.id);
                }
                if (restoredWarmups.size > 0) setWarmupExercises(restoredWarmups);
                localStorage.setItem("sevel_active_session", "true");
                setStatus("active");
                setExpandedId(mapped[0]?.id ?? null);
            } else if (completedSessions && completedSessions.length > 0) {
                localStorage.removeItem("sevel_active_session");
                const lastDone = completedSessions[completedSessions.length - 1];
                setTodaySessions(completedSessions.map((s: any) => ({ id: s.id, title: (typeof s.title === "string" ? s.title : "Workout").replace(/\[object Object\]/g, "Session"), sets: s.total_sets ?? 0, volume: Number(s.total_volume) || 0, duration: s.duration_seconds ?? 0, xp: s.xp_earned ?? 0 })));
                const allSessionIds = completedSessions.map((s: any) => s.id);
                const { data: doneLogRows2 } = await supabase.from("exercise_set_logs").select("*").in("workout_session_id", allSessionIds);
                const doneLogMap2: Record<string, SetEntry[]> = {};
                mapped.forEach((ex) => {
                    const rows = (doneLogRows2 ?? []).filter((l: any) => l.scheduled_exercise_id === ex.id).sort((a: any, b: any) => a.set_index - b.set_index);
                    if (rows.length > 0) doneLogMap2[ex.id] = rows.map((r: any, i: number) => ({ index: i, weight: r.weight != null ? String(r.weight) : "", reps: r.reps != null ? String(r.reps) : "", duration: r.duration_seconds != null ? String(r.duration_seconds) : "", distance: r.distance != null ? String(r.distance) : "", note: "", completed: true, logId: r.id, is_warmup: r.is_warmup ?? false, rpe: r.rpe ?? undefined, set_type: r.set_type ?? (r.is_warmup ? "warmup" : "working") }));
                });
                setLogs(doneLogMap2);
                const { data: xpRows2 } = await supabase.from("workout_sessions").select("xp_earned").eq("user_id", user.id).eq("status", "completed").eq("sex", sex);
                const totalXp2 = (xpRows2 ?? []).reduce((s: number, r: any) => s + (r.xp_earned || 0), 0);
                const lvl2 = computeLevel(totalXp2).level;
                setSummary({ sets: lastDone.total_sets ?? 0, volume: Number(lastDone.total_volume) || 0, duration: lastDone.duration_seconds ?? 0, xpBreakdown: { base: 0, setCompletion: 0, completionBonus: 0, prBonus: 0, progressionBonus: 0, consistencyBonus: 0, total: lastDone.xp_earned ?? 0, details: [] }, level: lvl2, rankName: getRank(lvl2).name });
                setLoadProgress(100);
                setStatus("completed");
                try { const c = JSON.parse(localStorage.getItem("sevel_workout_cache") || "null"); if (c) { c.completed = true; localStorage.setItem("sevel_workout_cache", JSON.stringify(c)); } } catch {}
            } else {
                // Double-check: if cache says completed but query returned null/empty, re-query once
                const cacheCheck = (() => { try { const c = JSON.parse(localStorage.getItem("sevel_workout_cache") || "null"); return c?.completed === true; } catch { return false; } })();
                if (cacheCheck && !completedSessions) {
                    const { data: retry } = await supabase.from("workout_sessions").select("id, title, total_sets, total_volume, duration_seconds, xp_earned").eq("user_id", user.id).eq("date", today).eq("sex", sex).eq("status", "completed").order("created_at", { ascending: true });
                    if (retry && retry.length > 0) {
                        localStorage.removeItem("sevel_active_session");
                        const lastDone = retry[retry.length - 1];
                        setTodaySessions(retry.map((s: any) => ({ id: s.id, title: (typeof s.title === "string" ? s.title : "Workout").replace(/\[object Object\]/g, "Session"), sets: s.total_sets ?? 0, volume: Number(s.total_volume) || 0, duration: s.duration_seconds ?? 0, xp: s.xp_earned ?? 0 })));
                        const { data: doneLogRows3 } = await supabase.from("exercise_set_logs").select("*").eq("workout_session_id", lastDone.id);
                        const doneLogMap3: Record<string, SetEntry[]> = {};
                        mapped.forEach((ex) => {
                            const rows = (doneLogRows3 ?? []).filter((l: any) => l.scheduled_exercise_id === ex.id).sort((a: any, b: any) => a.set_index - b.set_index);
                            if (rows.length > 0) doneLogMap3[ex.id] = rows.map((r: any, i: number) => ({ index: i, weight: r.weight != null ? String(r.weight) : "", reps: r.reps != null ? String(r.reps) : "", duration: r.duration_seconds != null ? String(r.duration_seconds) : "", distance: r.distance != null ? String(r.distance) : "", note: "", completed: true, logId: r.id, is_warmup: r.is_warmup ?? false, rpe: r.rpe ?? undefined, set_type: r.set_type ?? (r.is_warmup ? "warmup" : "working") }));
                        });
                        setLogs(doneLogMap3);
                        const { data: xpRows3 } = await supabase.from("workout_sessions").select("xp_earned").eq("user_id", user.id).eq("status", "completed").eq("sex", sex);
                        const totalXp3 = (xpRows3 ?? []).reduce((s: number, r: any) => s + (r.xp_earned || 0), 0);
                        const lvl3 = computeLevel(totalXp3).level;
                        setSummary({ sets: lastDone.total_sets ?? 0, volume: Number(lastDone.total_volume) || 0, duration: lastDone.duration_seconds ?? 0, xpBreakdown: { base: 0, setCompletion: 0, completionBonus: 0, prBonus: 0, progressionBonus: 0, consistencyBonus: 0, total: lastDone.xp_earned ?? 0, details: [] }, level: lvl3, rankName: getRank(lvl3).name });
                        setLoadProgress(100);
                        setStatus("completed");
                        try { const c = JSON.parse(localStorage.getItem("sevel_workout_cache") || "null"); if (c) { c.completed = true; localStorage.setItem("sevel_workout_cache", JSON.stringify(c)); } } catch {}
                        return;
                    }
                }
                localStorage.removeItem("sevel_active_session");
                localStorage.removeItem("sevel_workout_cache");
                const initLogs: Record<string, SetEntry[]> = {};
                mapped.forEach((ex) => {
                    const hint = hints[ex.exercise_id];
                    const last = lastMap[ex.exercise_id];
                    const prefill = hint?.suggestedWeight ?? last?.weight ?? ex.target_weight;
                    const setCount = ex.isCardio ? 1 : ex.target_sets;
                    initLogs[ex.id] = Array.from({ length: setCount }, (_, i) => ({ ...emptySet(i), weight: !ex.isCardio && !ex.isBodyweight && prefill ? String(prefill) : "" }));
                });
                setLogs(initLogs);
                setStatus("not_started");
            }
        } finally {
            loadInFlight.current = false;
            setHasLoaded(true);
        }
    }, [user, today, userSex, weightUnit]);

    useEffect(() => { load(); }, [load]);

    /* ── LOAD STATS ── */
    useEffect(() => {
        if (!user || (status !== "not_started" && status !== "completed")) return;
        let cancelled = false;
        async function loadStats() {
            const sex = userSex;
            const dateStr = toDateString(new Date());
            const now = new Date(dateStr + "T00:00:00");
            const dayOfWeek = now.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(now);
            monday.setDate(now.getDate() + mondayOffset);
            const mondayStr = toDateString(monday);

            const weeksBack = 6;
            const sixWeeksAgo = new Date(monday);
            sixWeeksAgo.setDate(sixWeeksAgo.getDate() - (weeksBack - 1) * 7);
            const sixWeeksAgoStr = toDateString(sixWeeksAgo);

            const [{ data: recent }, { data: weekSessions }, { data: volSessions }, { count: totalCount }] = await Promise.all([
                supabase.from("workout_sessions").select("id, date, title, total_sets, total_volume, xp_earned").eq("user_id", user!.id).eq("status", "completed").eq("sex", sex).order("date", { ascending: false }).limit(5),
                supabase.from("workout_sessions").select("date").eq("user_id", user!.id).eq("status", "completed").eq("sex", sex).gte("date", mondayStr),
                supabase.from("workout_sessions").select("id, date, total_volume").eq("user_id", user!.id).eq("status", "completed").eq("sex", sex).gte("date", sixWeeksAgoStr),
                supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "completed").eq("sex", sex),
            ]);
            if (cancelled) return;

            setRecentSessions((recent ?? []).map((s: any) => ({ id: s.id, date: s.date, title: (typeof s.title === "string" ? s.title : "Workout").replace(/\[object Object\]/g, "Session"), sets: s.total_sets ?? 0, volume: Number(s.total_volume) || 0, xp: s.xp_earned ?? 0 })));
            setSessionCount(totalCount ?? 0);

            const completedDates = new Set((weekSessions ?? []).map((s: any) => s.date));
            const days: boolean[] = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(monday);
                d.setDate(monday.getDate() + i);
                days.push(completedDates.has(toDateString(d)));
            }
            setWeekDays(days);

            const volumes: number[] = [];
            for (let w = 0; w < weeksBack; w++) {
                const wStart = new Date(monday);
                wStart.setDate(monday.getDate() - (weeksBack - 1 - w) * 7);
                const wEnd = new Date(wStart);
                wEnd.setDate(wStart.getDate() + 7);
                const wStartStr = toDateString(wStart);
                const wEndStr = toDateString(wEnd);
                const vol = (volSessions ?? []).filter((s: any) => s.date >= wStartStr && s.date < wEndStr).reduce((sum: number, s: any) => sum + (Number(s.total_volume) || 0), 0);
                volumes.push(Math.round(vol));
            }
            setWeeklyVolumes(volumes);

            if (status === "completed") {
                const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                for (let offset = 1; offset <= 7; offset++) {
                    const checkDate = new Date();
                    checkDate.setDate(checkDate.getDate() + offset);
                    const wd = checkDate.getDay();
                    const { data: nextPlan } = await supabase
                        .from("recurring_plans")
                        .select("template_id, is_rest, workout_templates(name)")
                        .eq("user_id", user!.id)
                        .eq("weekday", wd)
                        .eq("sex", sex)
                        .order("created_at", { ascending: false })
                        .limit(1);
                    if (cancelled) return;
                    const np = nextPlan?.[0];
                    if (!np || np.is_rest || !np.template_id) continue;
                    const { count: exCount } = await supabase
                        .from("workout_template_exercises")
                        .select("id", { count: "exact", head: true })
                        .eq("template_id", np.template_id);
                    if (cancelled) return;
                    const label = offset === 1 ? "Tomorrow" : dayNames[wd];
                    setNextSession({ name: (np as any).workout_templates?.name || "Workout", exerciseCount: exCount ?? 0, dayLabel: label });
                    break;
                }
            }

            // Exercise rotation: find exercises not done in 21+ days
            const ninetyDaysAgo = new Date(now);
            ninetyDaysAgo.setDate(now.getDate() - 90);
            const twentyOneDaysAgo = new Date(now);
            twentyOneDaysAgo.setDate(now.getDate() - 21);
            const ninetyStr = toDateString(ninetyDaysAgo);
            const twentyOneStr = toDateString(twentyOneDaysAgo);

            const { data: allLogs90 } = await supabase
                .from("exercise_set_logs")
                .select("exercise_id, completed_at, exercises(name, body_segment)")
                .eq("user_id", user!.id)
                .gte("completed_at", ninetyStr + "T00:00:00")
                .order("completed_at", { ascending: false });
            if (cancelled) return;

            if (allLogs90 && allLogs90.length > 0) {
                const lastDoneMap = new Map<string, { name: string; segment: string; date: string }>();
                for (const log of allLogs90) {
                    if (lastDoneMap.has(log.exercise_id)) continue;
                    const d = (log.completed_at ?? "").slice(0, 10);
                    lastDoneMap.set(log.exercise_id, {
                        name: (log as any).exercises?.name ?? "Unknown",
                        segment: (log as any).exercises?.body_segment ?? "",
                        date: d,
                    });
                }
                const stale: typeof staleExercises = [];
                const todayMs = now.getTime();
                for (const [id, info] of lastDoneMap) {
                    if (info.date >= twentyOneStr) continue;
                    const daysSince = Math.floor((todayMs - new Date(info.date + "T00:00:00").getTime()) / 86400000);
                    stale.push({ id, name: info.name, body_segment: info.segment, lastDone: info.date, daysSince });
                }
                stale.sort((a, b) => b.daysSince - a.daysSince);
                setStaleExercises(stale.slice(0, 8));
            }

            setStatsLoaded(true);
        }
        loadStats();
        return () => { cancelled = true; };
    }, [user, status, userSex]);

    /* ── WAKE LOCK (3.2) ── */
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const [wakeLockTipShown, setWakeLockTipShown] = useState(false);

    async function requestWakeLock() {
        try {
            if ("wakeLock" in navigator) {
                wakeLockRef.current = await navigator.wakeLock.request("screen");
                wakeLockRef.current.addEventListener("release", () => { wakeLockRef.current = null; });
            }
        } catch {
            if (!wakeLockTipShown) setWakeLockTipShown(true);
        }
    }

    function releaseWakeLock() {
        wakeLockRef.current?.release().catch(() => {});
        wakeLockRef.current = null;
    }

    // Re-acquire wake lock when tab becomes visible again (browser releases on tab hide)
    useEffect(() => {
        if (status !== "active") return;
        function handleVisibility() {
            if (document.visibilityState === "visible" && !wakeLockRef.current) requestWakeLock();
        }
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [status]);

    // Release on unmount
    useEffect(() => { return () => releaseWakeLock(); }, []);

    /* ── OFFLINE QUEUE (3.3) ── */
    useEffect(() => {
        flushQueue(supabase).catch(() => {});
        return setupOnlineListener(supabase);
    }, []);

    /* ── PAUSE TRACKING ── */
    const pauseStartRef = useRef<number | null>(null);
    const pausedElapsedRef = useRef(0);
    useEffect(() => {
        if (sessionPaused) { pauseStartRef.current = Date.now(); }
        else if (pauseStartRef.current) {
            const added = Math.floor((Date.now() - pauseStartRef.current) / 1000);
            pausedElapsedRef.current += added;
            setPausedElapsed(pausedElapsedRef.current);
            pauseStartRef.current = null;
        }
    }, [sessionPaused]);

    /* ── ELAPSED TIMER ── */
    useEffect(() => {
        if (status !== "active" || !startedAt || sessionPaused) return;
        const tick = () => {
            const raw = Math.floor((Date.now() - startedAt) / 1000) - pausedElapsedRef.current;
            setElapsed(Math.max(0, raw));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [status, startedAt, sessionPaused, pausedElapsed]);

    /* ── UNDO AUTO-DISMISS ── */
    useEffect(() => {
        if (!lastAction) return;
        const id = setTimeout(() => setLastAction(null), 5000);
        return () => clearTimeout(id);
    }, [lastAction]);

    /* ── REST TIMER ── */
    useEffect(() => {
        if (restRemaining === null || restPaused) return;
        if (restRemaining <= 0) { setRestRemaining(null); return; }
        const id = setTimeout(() => setRestRemaining((r) => (r !== null ? r - 1 : null)), 1000);
        return () => clearTimeout(id);
    }, [restRemaining, restPaused]);

    /* ── EQUIPMENT SUBSTITUTIONS ── */
    useEffect(() => {
        if (equipmentAccess.length === 0 || exercisesList.length === 0) return;
        const ownedSet = new Set([...equipmentAccess, "Bodyweight"]);
        const unavailable = exercisesList.filter((ex) => !ownedSet.has(ex.equipment));
        if (unavailable.length === 0) { setSubstitutions({}); return; }
        const existingIds = new Set(exercisesList.map((e) => e.exercise_id));
        Promise.all(
            unavailable.map(async (ex) => {
                const subs = await findSubstitutions(ex.exercise_id, equipmentAccess, { limit: 3, excludeIds: existingIds });
                return [ex.id, subs] as const;
            }),
        ).then((results) => {
            const map: Record<string, Substitution[]> = {};
            for (const [id, subs] of results) if (subs.length > 0) map[id] = subs;
            setSubstitutions(map);
        });
    }, [exercisesList, equipmentAccess]);

    /* ── ACTIONS ── */
    async function startWorkout() {
        if (!user || !scheduledDayId) return;
        if (todaySessions.length >= MAX_SESSIONS_PER_DAY) return;
        const { data: existing } = await supabase.from("workout_sessions").select("id").eq("user_id", user.id).eq("date", today).eq("sex", userSex).eq("status", "active").limit(1);
        if (existing && existing.length > 0) return;
        const { data } = await supabase.from("workout_sessions").insert({ user_id: user.id, scheduled_day_id: scheduledDayId, date: today, title: dayTitle, status: "active", sex: userSex }).select().single();
        if (!data) return;
        setSessionId(data.id);
        activeSessionRef.current = data.id;
        setStartedAt(new Date(data.started_at).getTime());
        localStorage.setItem("sevel_active_session", "true");
        localStorage.setItem("sevel_session_start", String(new Date(data.started_at).getTime()));
        if (exercisesList[0]) localStorage.setItem("sevel_current_exercise", exercisesList[0].name);
        setStatus("active");
        setExpandedId(exercisesList[0]?.id ?? null);
        requestWakeLock();
    }

    function addFreestyleExercise(ex: { id: string; name: string; category?: string; equipment?: string; body_segment?: string; tracking_mode?: TrackingMode; discipline?: Discipline }) {
        const seg = ex.body_segment ?? "";
        const equip = ex.equipment ?? "";
        const localEx: WorkoutExercise = {
            id: `freestyle-${ex.id}-${Date.now()}`,
            exercise_id: ex.id,
            order_index: freestyleExercises.length,
            target_sets: 3,
            target_reps: "8-10",
            target_weight: null,
            rest_seconds: 90,
            name: ex.name,
            category: ex.category ?? "",
            equipment: equip,
            body_segment: seg,
            isCardio: seg === "Cardio",
            isBodyweight: equip.toLowerCase() === "bodyweight" && seg !== "Cardio",
            is_unilateral: false,
            per_side_weight: false,
            tracking_mode: ex.tracking_mode ?? (seg === "Cardio" ? "distance_time" : "weight_reps"),
            discipline: ex.discipline ?? "strength",
        };
        supabase.from("exercises").select("per_side_weight").eq("id", ex.id).maybeSingle().then(({ data }) => {
            if (data) setFreestyleExercises((p) => p.map((e) => e.exercise_id === ex.id ? { ...e, per_side_weight: data.per_side_weight ?? false } : e));
        });
        setFreestyleExercises((p) => [...p, localEx]);
        setShowFreestyleAddModal(false);
    }

    function removeFreestyleExercise(id: string) {
        setFreestyleExercises((p) => p.filter((e) => e.id !== id));
    }

    async function beginFreestyleSession() {
        if (!user || freestyleExercises.length === 0) return;
        if (todaySessions.length >= MAX_SESSIONS_PER_DAY) return;
        const { data: existingActive } = await supabase.from("workout_sessions").select("id").eq("user_id", user.id).eq("date", today).eq("sex", userSex).eq("status", "active").limit(1);
        if (existingActive && existingActive.length > 0) return;
        setStartingFreestyle(true);

        let { data: day } = await supabase.from("scheduled_days").select("id").eq("user_id", user.id).eq("date", today).maybeSingle();
        if (!day) {
            const { data: created } = await supabase.from("scheduled_days").insert({ user_id: user.id, date: today, title: "Freestyle Session", is_rest: false }).select("id").single();
            day = created;
        } else {
            await supabase.from("scheduled_exercises").delete().eq("scheduled_day_id", day.id);
            await supabase.from("scheduled_days").update({ title: "Freestyle Session", is_rest: false }).eq("id", day.id);
        }
        if (!day) { setStartingFreestyle(false); return; }

        await supabase.from("scheduled_exercises").insert(freestyleExercises.map((ex, i) => ({
            scheduled_day_id: day.id, user_id: user.id, exercise_id: ex.exercise_id, order_index: i,
            target_sets: ex.target_sets, target_reps: ex.target_reps, target_weight: ex.target_weight, rest_seconds: ex.rest_seconds,
        })));

        const { data: exRows } = await supabase
            .from("scheduled_exercises")
            .select("id, order_index, target_sets, target_reps, target_weight, rest_seconds, exercise_id, superset_group, exercises(name, category, equipment, body_segment, is_unilateral, per_side_weight, image_url)")
            .eq("scheduled_day_id", day.id)
            .order("order_index");

        const mapped: WorkoutExercise[] = (exRows ?? []).map((r: any) => {
            const seg = r.exercises?.body_segment ?? ""; const equip = r.exercises?.equipment ?? "";
            return { id: r.id, exercise_id: r.exercise_id, order_index: r.order_index, target_sets: r.target_sets, target_reps: r.target_reps, target_weight: r.target_weight, rest_seconds: r.rest_seconds, name: r.exercises?.name ?? "Unknown", category: r.exercises?.category ?? "", equipment: equip, body_segment: seg, isCardio: seg === "Cardio", isBodyweight: equip.toLowerCase() === "bodyweight" && seg !== "Cardio", is_unilateral: r.exercises?.is_unilateral ?? false, per_side_weight: r.exercises?.per_side_weight ?? false, tracking_mode: (seg === "Cardio" ? "distance_time" : "weight_reps") as TrackingMode, discipline: "strength" as Discipline, superset_group: r.superset_group ?? null, image_url: r.exercises?.image_url ?? null };
        });

        const { data: session } = await supabase.from("workout_sessions").insert({ user_id: user.id, scheduled_day_id: day.id, date: today, title: "Freestyle Session", status: "active", sex: userSex }).select().single();
        if (!session) { setStartingFreestyle(false); return; }

        const initLogs: Record<string, SetEntry[]> = {};
        mapped.forEach((ex) => {
            const setCount = ex.isCardio ? 1 : ex.target_sets;
            initLogs[ex.id] = Array.from({ length: setCount }, (_, i) => emptySet(i));
        });

        setScheduledDayId(day.id);
        setDayTitle("Freestyle Session");
        setExercisesList(mapped);
        setLogs(initLogs);
        setSessionId(session.id);
        activeSessionRef.current = session.id;
        setStartedAt(new Date(session.started_at).getTime());
        setExpandedId(mapped[0]?.id ?? null);
        setFreestyleExercises([]);
        setStartingFreestyle(false);
        localStorage.setItem("sevel_active_session", "true");
        setStatus("active");
    }

    /* ── DRAFT PERSISTENCE (3.1) ── */
    const draftKey = sessionId ? `sevel_session_draft_${sessionId}` : null;

    function saveDraft(exId: string, idx: number, field: string, val: string) {
        if (!draftKey) return;
        try {
            const raw = localStorage.getItem(draftKey);
            const draft = raw ? JSON.parse(raw) : {};
            if (!draft[exId]) draft[exId] = {};
            if (!draft[exId][idx]) draft[exId][idx] = {};
            draft[exId][idx][field] = val;
            localStorage.setItem(draftKey, JSON.stringify(draft));
        } catch { /* storage full or unavailable */ }
    }

    function clearDraft() {
        if (!draftKey) return;
        try { localStorage.removeItem(draftKey); } catch {}
    }

    function restoreDrafts(logMap: Record<string, SetEntry[]>, sid: string): Record<string, SetEntry[]> {
        try {
            const raw = localStorage.getItem(`sevel_session_draft_${sid}`);
            if (!raw) return logMap;
            const draft = JSON.parse(raw);
            const merged = { ...logMap };
            for (const [exId, sets] of Object.entries(merged)) {
                if (!draft[exId]) continue;
                merged[exId] = sets.map((s) => {
                    const d = draft[exId][s.index];
                    if (!d || s.completed) return s;
                    return { ...s, weight: d.weight ?? s.weight, reps: d.reps ?? s.reps, duration: d.duration ?? s.duration, distance: d.distance ?? s.distance };
                });
            }
            return merged;
        } catch { return logMap; }
    }

    function updateSet(exId: string, idx: number, field: keyof SetEntry, val: string) {
        setLogs((p) => ({ ...p, [exId]: (p[exId] ?? []).map((s) => (s.index === idx ? { ...s, [field]: val } : s)) }));
        saveDraft(exId, idx, field, val);
    }

    async function checkPR(exerciseId: string, name: string, w: number, r: number) {
        if (!user || w <= 0) return;
        const { data } = await supabase.from("exercise_set_logs").select("weight, workout_sessions!inner(sex)").eq("user_id", user.id).eq("exercise_id", exerciseId).eq("workout_sessions.sex", userSex).gt("weight", 0).order("weight", { ascending: false }).limit(1);
        const prev = data?.[0]?.weight ?? 0;
        if (w > prev && prev > 0) {
            setPrCount((c) => c + 1);
            setPrExerciseIds((s) => new Set(s).add(exerciseId));
            await supabase.from("notifications").insert({ user_id: user.id, type: "new_pr", title: "NEW PERSONAL RECORD", message: `${name}: ${kgToUnit(w, weightUnit)}${weightUnit} × ${r} — previous best was ${kgToUnit(prev, weightUnit)}${weightUnit}`, metadata: { exercise_name: name, weight: w, reps: r, previous_best: prev }, sex: userSex });
        }
    }

    function editSet(exId: string, idx: number) {
        setLogs((p) => ({
            ...p,
            [exId]: (p[exId] ?? []).map((s) => (s.index === idx ? { ...s, completed: false } : s)),
        }));
    }

    async function completeSet(ex: WorkoutExercise, idx: number, overrides?: { weight?: string; reps?: string }) {
        if (!user || !sessionId) return;
        const set = logs[ex.id]?.find((s) => s.index === idx);
        if (!set) return;

        const warmupCount = (logs[ex.id] ?? []).filter((x) => x.is_warmup).length;
        const workingIdx = set.is_warmup ? -1 : idx - warmupCount;
        const prevSets = lastSets[ex.exercise_id] ?? [];
        const prevSet = !set.is_warmup ? prevSets[workingIdx] : undefined;

        let finalWeight = overrides?.weight ?? set.weight;
        let finalReps = overrides?.reps ?? set.reps;
        if (!finalWeight && prevSet?.weight != null && !ex.isCardio && !ex.isBodyweight) finalWeight = String(prevSet.weight);
        if (!finalReps && prevSet?.reps != null && !ex.isCardio) finalReps = String(prevSet.reps);

        if (ex.isCardio) {
            if (!set.duration && !set.distance) return;
        } else {
            if (!finalReps) return;
        }

        const perSide = isDualWeight(ex);
        const setType = set.set_type ?? (set.is_warmup ? "warmup" : "working");
        const payload: any = { workout_session_id: sessionId, user_id: user.id, exercise_id: ex.exercise_id, scheduled_exercise_id: ex.id, set_index: idx, is_warmup: set.is_warmup ?? false, is_per_side: perSide, set_type: setType };
        if (ex.isCardio) { payload.duration_seconds = set.duration ? Number(set.duration) : null; payload.distance = set.distance ? Number(set.distance) : null; }
        else { payload.weight = ex.isBodyweight ? 0 : (finalWeight ? Number(finalWeight) : null); payload.reps = finalReps ? Number(finalReps) : null; }

        setLogs((p) => ({ ...p, [ex.id]: p[ex.id].map((s) => (s.index === idx ? { ...s, weight: finalWeight, reps: finalReps, completed: true } : s)) }));
        // Clear this set's draft entry since it's now saved to DB
        if (draftKey) {
            try {
                const raw = localStorage.getItem(draftKey);
                if (raw) { const d = JSON.parse(raw); if (d[ex.id]) { delete d[ex.id][idx]; localStorage.setItem(draftKey, JSON.stringify(d)); } }
            } catch {}
        }
        if (navigator.vibrate) navigator.vibrate(50);
        const isDrop = set.set_type === "drop";
        const isRestPause = set.set_type === "rest_pause";
        if (!ex.isCardio && !ex.isBodyweight && finalWeight && finalReps && !set.is_warmup && !isDrop) checkPR(ex.exercise_id, ex.name, Number(finalWeight), Number(finalReps));

        const isEdit = !!set.logId;
        let logId = set.logId;
        try {
            if (logId) {
                const { error } = await supabase.from("exercise_set_logs").update(payload).eq("id", logId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from("exercise_set_logs").insert(payload).select().single();
                if (error) throw error;
                logId = data?.id ?? null;
            }
        } catch {
            if (!logId) enqueue({ table: "exercise_set_logs", operation: "insert", data: payload });
            else enqueue({ table: "exercise_set_logs", operation: "update", data: payload, match: { id: logId } });
        }
        setLogs((p) => ({ ...p, [ex.id]: p[ex.id].map((s) => (s.index === idx ? { ...s, logId } : s)) }));

        if (!isEdit) {
            setLastAction({ exId: ex.id, setIdx: idx, logId, ts: Date.now(), exName: ex.name, weight: finalWeight, reps: finalReps });
            if (!isDrop) {
                const inSuperset = ex.superset_group != null;
                const supersetDone = inSuperset && (() => {
                    const group = exercisesList.filter((e) => e.superset_group === ex.superset_group);
                    return group.every((gex) => {
                        const gSets = logs[gex.id] ?? [];
                        const currentSetIdx = gSets.filter((gs) => !gs.is_warmup && gs.completed).length;
                        const targetIdx = gex.id === ex.id ? currentSetIdx : currentSetIdx;
                        return targetIdx > 0;
                    });
                })();
                const shouldRest = inSuperset ? supersetDone : true;
                const restSec = ex.rest_seconds ?? 90;
                const adjustedRest = Math.round(restSec * (cycleProfile?.restMultiplier ?? 1));
                if (adjustedRest > 0 && !isRestPause && shouldRest) { setRestRemaining(adjustedRest); setRestPaused(false); }
            }
        }
    }

    async function undoLastSet() {
        if (!lastAction) return;
        const { exId, setIdx, logId } = lastAction;
        setLogs((p) => ({
            ...p,
            [exId]: (p[exId] ?? []).map((s) => (s.index === setIdx ? { ...s, completed: false, logId: null } : s)),
        }));
        if (logId) {
            await supabase.from("exercise_set_logs").delete().eq("id", logId);
        } else {
            const undoneExId = exercisesList.find((e) => e.id === exId)?.exercise_id;
            if (undoneExId) {
                removeFromQueue((w) => w.table === "exercise_set_logs" && w.operation === "insert" && (w.data as any)?.exercise_id === undoneExId && (w.data as any)?.set_index === setIdx);
            }
        }
        setRestRemaining(null);
        setRestPaused(false);
        setLastAction(null);
    }

    async function updateSetRpe(exId: string, setIdx: number, rpe: number) {
        setLogs((p) => ({ ...p, [exId]: (p[exId] ?? []).map((s) => (s.index === setIdx ? { ...s, rpe } : s)) }));
        const set = logs[exId]?.find((s) => s.index === setIdx);
        if (set?.logId) await supabase.from("exercise_set_logs").update({ rpe }).eq("id", set.logId);
    }

    function addDropSet(exId: string) {
        const sets = logs[exId] ?? [];
        const lastCompleted = [...sets].reverse().find((s) => s.completed && !s.is_warmup);
        const dropWeight = lastCompleted?.weight ? String(Math.round(Number(lastCompleted.weight) * 0.8)) : "";
        const newIdx = sets.length;
        const newSet: SetEntry = { ...emptySet(newIdx), weight: dropWeight, set_type: "drop" };
        setLogs((p) => ({ ...p, [exId]: [...(p[exId] ?? []), newSet] }));
    }

    function addRestPauseSet(exId: string) {
        const sets = logs[exId] ?? [];
        const lastCompleted = [...sets].reverse().find((s) => s.completed && !s.is_warmup);
        const newIdx = sets.length;
        const newSet: SetEntry = { ...emptySet(newIdx), weight: lastCompleted?.weight ?? "", set_type: "rest_pause" };
        setLogs((p) => ({ ...p, [exId]: [...(p[exId] ?? []), newSet] }));
        setRestRemaining(15);
        setRestPaused(false);
    }

    async function toggleSuperset(exId1: string, exId2: string) {
        if (!user) return;
        const ex1 = exercisesList.find((e) => e.id === exId1);
        const ex2 = exercisesList.find((e) => e.id === exId2);
        if (!ex1 || !ex2) return;

        if (ex1.superset_group != null && ex1.superset_group === ex2.superset_group) {
            await supabase.from("scheduled_exercises").update({ superset_group: null }).in("id", [exId1, exId2]);
            setExercisesList((p) => p.map((e) => e.id === exId1 || e.id === exId2 ? { ...e, superset_group: null } : e));
        } else {
            const maxGroup = Math.max(0, ...exercisesList.map((e) => e.superset_group ?? 0));
            const groupNum = maxGroup + 1;
            await supabase.from("scheduled_exercises").update({ superset_group: groupNum }).in("id", [exId1, exId2]);
            setExercisesList((p) => p.map((e) => e.id === exId1 || e.id === exId2 ? { ...e, superset_group: groupNum } : e));
        }
    }

    function getSupersetGroup(exId: string): WorkoutExercise[] {
        const ex = exercisesList.find((e) => e.id === exId);
        if (!ex?.superset_group) return [ex!];
        return exercisesList.filter((e) => e.superset_group === ex.superset_group);
    }

    function isSupersetComplete(exId: string): boolean {
        const group = getSupersetGroup(exId);
        return group.every((gex) => {
            const sets = logs[gex.id] ?? [];
            const working = sets.filter((s) => !s.is_warmup);
            return working.length > 0 && working.every((s) => s.completed);
        });
    }

    async function propagateToTemplate(orderIdx: number, newExId: string) {
        if (!user) return;
        const wd = new Date(today + "T00:00:00").getDay();
        const { data: rp } = await supabase.from("recurring_plans").select("template_id").eq("user_id", user.id).eq("weekday", wd).eq("sex", userSex).maybeSingle();
        if (!rp?.template_id) return;
        const { data: rows } = await supabase.from("workout_template_exercises").select("id, order_index").eq("template_id", rp.template_id).order("order_index");
        const match = (rows ?? []).find((r: any) => r.order_index === orderIdx);
        if (match) await supabase.from("workout_template_exercises").update({ exercise_id: newExId }).eq("id", match.id);
    }

    async function handleSwap(oldEx: WorkoutExercise, newEx: { id: string; name: string }) {
        if (!user) return;
        const { data } = await supabase.from("exercises").select("category, equipment, body_segment, is_unilateral, per_side_weight").eq("id", newEx.id).maybeSingle();
        const seg = data?.body_segment ?? ""; const equip = data?.equipment ?? "";
        await supabase.from("scheduled_exercises").update({ exercise_id: newEx.id }).eq("id", oldEx.id);
        setExercisesList((p) => p.map((e) => (e.id === oldEx.id ? { ...e, exercise_id: newEx.id, name: newEx.name, body_segment: seg, equipment: equip, isCardio: seg === "Cardio", isBodyweight: equip.toLowerCase() === "bodyweight" && seg !== "Cardio", is_unilateral: data?.is_unilateral ?? false, per_side_weight: data?.per_side_weight ?? false, tracking_mode: (seg === "Cardio" ? "distance_time" : "weight_reps") as TrackingMode, discipline: "strength" as Discipline } : e)));
        setLogs((p) => ({ ...p, [oldEx.id]: Array.from({ length: oldEx.target_sets }, (_, i) => emptySet(i)) }));
        setSwapTargetId(null);
    }

    async function handleAddExercise(newEx: { id: string; name: string }) {
        if (!user || !sessionId) return;
        const { data: exData } = await supabase.from("exercises").select("category, equipment, body_segment, is_unilateral, per_side_weight").eq("id", newEx.id).maybeSingle();
        const seg = exData?.body_segment ?? ""; const equip = exData?.equipment ?? ""; const nextOrder = exercisesList.length;
        const { data: created } = await supabase.from("scheduled_exercises").insert({ scheduled_day_id: scheduledDayId, user_id: user.id, exercise_id: newEx.id, order_index: nextOrder, target_sets: 3, target_reps: "8-10" }).select().single();
        if (!created) return;
        const ex: WorkoutExercise = { id: created.id, exercise_id: newEx.id, order_index: nextOrder, target_sets: 3, target_reps: "8-10", target_weight: null, rest_seconds: 90, name: newEx.name, category: exData?.category ?? "", equipment: equip, body_segment: seg, isCardio: seg === "Cardio", isBodyweight: equip.toLowerCase() === "bodyweight" && seg !== "Cardio", is_unilateral: exData?.is_unilateral ?? false, per_side_weight: exData?.per_side_weight ?? false, tracking_mode: (seg === "Cardio" ? "distance_time" : "weight_reps") as TrackingMode, discipline: "strength" as Discipline };
        setExercisesList((p) => [...p, ex]);
        setLogs((p) => ({ ...p, [ex.id]: Array.from({ length: 3 }, (_, i) => emptySet(i)) }));
        setExpandedId(ex.id);
        setShowAddModal(false);
    }

    function addSet(exId: string) { setLogs((p) => { const prev = p[exId] ?? []; return { ...p, [exId]: [...prev, emptySet(prev.length)] }; }); }

    async function removeSet(exId: string, idx: number) {
        const set = logs[exId]?.find((s) => s.index === idx);
        if (!set) return;
        if (set.logId) await supabase.from("exercise_set_logs").delete().eq("id", set.logId);
        setLogs((p) => ({
            ...p,
            [exId]: (p[exId] ?? []).filter((s) => s.index !== idx).map((s, i) => ({ ...s, index: i })),
        }));
    }

    async function deletePlan() {
        if (!user) return;
        setDeletingPlan(true);
        const sex = userSex;
        const { data: plans } = await supabase.from("recurring_plans").select("id, template_id").eq("user_id", user.id).eq("sex", sex);
        if (plans?.length) {
            const templateIds = plans.map((p: any) => p.template_id).filter(Boolean);
            if (templateIds.length) {
                await supabase.from("workout_template_exercises").delete().in("template_id", templateIds);
                await supabase.from("workout_templates").delete().in("id", templateIds);
            }
            await supabase.from("recurring_plans").delete().eq("user_id", user.id).eq("sex", sex);
        }
        if (scheduledDayId) {
            await supabase.from("scheduled_exercises").delete().eq("scheduled_day_id", scheduledDayId);
            await supabase.from("scheduled_days").delete().eq("id", scheduledDayId);
        }
        setDeletingPlan(false);
        setShowDeletePlanConfirm(false);
        setScheduledDayId(null);
        setExercisesList([]);
        setStatus("no_plan");
    }

    async function removeExercise(exId: string) {
        await supabase.from("scheduled_exercises").delete().eq("id", exId);
        setExercisesList((p) => p.filter((e) => e.id !== exId));
        setLogs((p) => { const next = { ...p }; delete next[exId]; return next; });
        if (expandedId === exId) setExpandedId(null);
    }

    function skipExercise(exId: string) {
        setSkippedExercises((prev) => new Set([...prev, exId]));
        const currentIdx = exercisesList.findIndex((e) => e.id === exId);
        const nextUnskipped = exercisesList.slice(currentIdx + 1).find((e) => !skippedExercises.has(e.id));
        if (nextUnskipped) setExpandedId(nextUnskipped.id);
        else setExpandedId(null);
    }

    function unskipExercise(exId: string) {
        setSkippedExercises((prev) => { const next = new Set(prev); next.delete(exId); return next; });
    }

    function laterExercise(exId: string) {
        setExercisesList((prev) => {
            const idx = prev.findIndex(e => e.id === exId);
            if (idx === -1 || idx === prev.length - 1) return prev;
            const item = prev[idx];
            const next = [...prev.slice(0, idx), ...prev.slice(idx + 1), item];
            return next;
        });
        const currentIdx = exercisesList.findIndex(e => e.id === exId);
        const nextEx = exercisesList.slice(currentIdx + 1).find(e => !skippedExercises.has(e.id) && !confirmedExercises.has(e.id));
        if (nextEx) setExpandedId(nextEx.id);
    }

    function toggleWarmup(ex: WorkoutExercise) {
        const hasWarmup = warmupExercises.has(ex.id);
        if (hasWarmup) {
            setWarmupExercises((prev) => { const next = new Set(prev); next.delete(ex.id); return next; });
            setLogs((p) => ({ ...p, [ex.id]: (p[ex.id] ?? []).filter((s) => !s.is_warmup).map((s, i) => ({ ...s, index: i })) }));
        } else {
            const currentSets = logs[ex.id] ?? [];
            const firstWorkingWeight = currentSets.find((s) => !s.is_warmup && s.weight)?.weight;
            const workingWeightDisplay = firstWorkingWeight ? Number(firstWorkingWeight) : (ex.target_weight ? kgToUnit(ex.target_weight, weightUnit) : 0);
            const workingWeightKg = weightInputToKg(workingWeightDisplay, weightUnit);
            if (workingWeightKg <= 20) return;
            const isBarbell = ex.equipment.toLowerCase().includes("barbell");
            const warmups = generateWarmupSets(workingWeightKg, isBarbell);
            if (warmups.length === 0) return;
            const warmupEntries: SetEntry[] = warmups.map((w, i) => ({
                index: i,
                weight: String(kgToUnit(w.weight, weightUnit)),
                reps: String(w.reps),
                duration: "", distance: "", note: "",
                completed: false, logId: null,
                is_warmup: true,
                warmup_label: w.label,
            }));
            const reindexed = [...warmupEntries, ...currentSets.map((s, i) => ({ ...s, index: warmupEntries.length + i }))];
            setLogs((p) => ({ ...p, [ex.id]: reindexed }));
            setWarmupExercises((prev) => new Set([...prev, ex.id]));
        }
    }

    async function finishWorkout() {
        if (!user || !sessionId || !startedAt || finishing) return;
        setFinishing(true);
        const allSets = Object.values(logs).flat().filter((s) => s.completed);
        const workingSets = allSets.filter((s) => !s.is_warmup);
        const totalSets = workingSets.length;
        const totalVolume = workingSets.reduce((sum, s) => {
            const ex = exercisesList.find((e) => logs[e.id]?.includes(s));
            const mult = ex && isDualWeight(ex) ? 2 : 1;
            return sum + (Number(s.weight) || 0) * (Number(s.reps) || 0) * mult;
        }, 0);
        const dur = Math.floor((Date.now() - startedAt) / 1000) - pausedElapsed;
        const totalPlannedSets = exercisesList.reduce((sum, e) => sum + (e.isCardio ? 1 : e.target_sets), 0);
        const setsData = workingSets.map((s) => { const ex = exercisesList.find((e) => logs[e.id]?.includes(s)); return { exercise_id: ex?.exercise_id ?? "", weight: Number(s.weight) || null, reps: Number(s.reps) || null }; });
        const xp = await calculateSessionXP(user.id, sessionId, setsData, totalPlannedSets, prCount, userSex);

        await supabase.from("workout_sessions").update({ status: "completed", completed_at: new Date().toISOString(), duration_seconds: dur, total_volume: totalVolume, total_sets: totalSets, xp_earned: xp.total, ...(cycleProfile ? { cycle_phase: cycleProfile.phase, cycle_day: cycleProfile.cycleDay } : {}) }).eq("id", sessionId);
        await supabase.from("notifications").insert({ user_id: user.id, type: "workout_complete", title: "WORKOUT COMPLETE", message: `${dayTitle} — ${totalSets} sets, ${Math.round(kgToUnit(totalVolume, weightUnit)).toLocaleString()}${weightUnit} volume, +${xp.total} XP`, metadata: { sets: totalSets, volume: totalVolume, xp: xp.total }, sex: userSex });

        const { data: sessions } = await supabase.from("workout_sessions").select("date").eq("user_id", user.id).eq("status", "completed").eq("sex", userSex).order("date", { ascending: false }).limit(120);
        if (sessions) {
            const { data: plans } = await supabase.from("recurring_plans").select("weekday, is_rest").eq("user_id", user.id).eq("sex", userSex);
            const restDays = new Set((plans ?? []).filter((p: any) => p.is_rest).map((p: any) => p.weekday));
            const dates = new Set(sessions.map((s: any) => s.date));
            let streak = 0; const check = new Date(today + "T00:00:00");
            for (let i = 0; i < 120; i++) { const d = toDateString(check); const wd = check.getDay(); if (restDays.has(wd)) { check.setDate(check.getDate() - 1); continue; } if (dates.has(d)) { streak++; check.setDate(check.getDate() - 1); } else break; }
            if ([7, 14, 30, 60, 100].includes(streak)) await supabase.from("notifications").insert({ user_id: user.id, type: "streak_milestone", title: `${streak}-DAY STREAK`, message: `Consistent for ${streak} days!`, metadata: { streak }, sex: userSex });
        }

        const { data: xpRows } = await supabase.from("workout_sessions").select("xp_earned").eq("user_id", user.id).eq("status", "completed").eq("sex", userSex);
        const totalXp = (xpRows ?? []).reduce((s, r: any) => s + (r.xp_earned || 0), 0);
        const lvlBefore = computeLevel(totalXp - xp.total).level;
        const lvlAfter = computeLevel(totalXp).level;
        if (lvlAfter > lvlBefore) {
            await supabase.from("notifications").insert({
                user_id: user.id, type: "level_up", title: "LEVEL UP",
                message: `You've reached Level ${lvlAfter}!`,
                metadata: { level: lvlAfter, total_xp: totalXp },
                sex: userSex,
            });
        }

        await checkAndAwardAchievements(user.id, userSex);
        await updateUserStats(user.id);
        await updateExerciseLeaderboard(user.id);
        await autoCompleteHabits(user.id, "workout_complete").catch(() => {});

        if (dayTitle === "Freestyle Session") {
            const weekday = new Date().getDay();
            const { data: existingPlan } = await supabase.from("recurring_plans").select("id").eq("user_id", user.id).eq("weekday", weekday).eq("sex", userSex).limit(1);
            if (!existingPlan?.length) setShowFreestylePrompt(true);
        }

        localStorage.removeItem("sevel_active_session");
        localStorage.removeItem("sevel_current_exercise");
        localStorage.removeItem("sevel_session_start");
        localStorage.removeItem("sevel_set_progress");
        localStorage.removeItem("sevel_resting");
        localStorage.removeItem("sevel_momentum");
        activeSessionRef.current = null;
        clearDraft();
        releaseWakeLock();
        setTodaySessions(prev => [...prev, { id: sessionId!, title: dayTitle, duration: dur, sets: totalSets, volume: totalVolume, xp: xp.total }]);
        setSummary({ duration: dur, sets: totalSets, volume: totalVolume, xpBreakdown: xp, level: lvlAfter, rankName: getRank(lvlAfter).name });
        setStatus("completed");
        try { const c = JSON.parse(localStorage.getItem("sevel_workout_cache") || "null"); if (c) { c.completed = true; localStorage.setItem("sevel_workout_cache", JSON.stringify(c)); } } catch {}
        setRestRemaining(null);
    }

    async function cancelSession() {
        if (!sessionId) return;
        try {
            await supabase.from("exercise_set_logs").delete().eq("workout_session_id", sessionId);
            await supabase.from("workout_sessions").delete().eq("id", sessionId);
        } catch {}
        localStorage.removeItem("sevel_active_session");
        localStorage.removeItem("sevel_current_exercise");
        localStorage.removeItem("sevel_session_start");
        localStorage.removeItem("sevel_set_progress");
        localStorage.removeItem("sevel_resting");
        localStorage.removeItem("sevel_momentum");
        activeSessionRef.current = null;
        clearDraft();
        releaseWakeLock();
        setSessionId(null);
        setStartedAt(null);
        setElapsed(0);
        setPausedElapsed(0);
        pausedElapsedRef.current = 0;
        setSessionPaused(false);
        setShowCancelConfirm(false);
        setRestRemaining(null);
        setLogs((prev) => {
            const reset: Record<string, SetEntry[]> = {};
            for (const [exId, sets] of Object.entries(prev)) {
                reset[exId] = sets.map((s) => ({ ...s, completed: false, logId: null }));
            }
            return reset;
        });
        setConfirmedExercises(new Set());
        setSkippedExercises(new Set());
        setWarmupExercises(new Set());
        setPrCount(0);
        setPrExerciseIds(new Set());
        setLastAction(null);
        setStatus("not_started");
    }

    async function generateShareImage(): Promise<Blob | null> {
        if (!summary) return null;
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim();
        const accent = raw ? `rgb(${raw})` : "#22d3ee";
        const accentA = (a: number) => raw ? `rgba(${raw},${a})` : `rgba(34,211,238,${a})`;

        const bg = ctx.createLinearGradient(0, 0, 0, 1920);
        bg.addColorStop(0, "#0a1524");
        bg.addColorStop(1, getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || "#050914");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1080, 1920);

        const glow = ctx.createRadialGradient(540, 300, 50, 540, 300, 700);
        glow.addColorStop(0, accentA(0.18));
        glow.addColorStop(1, accentA(0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 1080, 1920);

        ctx.textAlign = "center";

        ctx.fillStyle = accent;
        ctx.font = "bold 64px ui-monospace, monospace";
        ctx.fillText("SEVEL", 540, 180);
        ctx.fillStyle = "var(--fg-30)";
        ctx.font = "24px ui-monospace, monospace";
        ctx.fillText("YOUR TRAINING SYSTEM", 540, 220);

        ctx.fillStyle = accentA(0.6);
        ctx.font = "28px ui-monospace, monospace";
        ctx.fillText("SESSION COMPLETE", 540, 420);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 72px ui-monospace, monospace";
        ctx.fillText(dayTitle, 540, 510);
        ctx.fillStyle = "var(--fg-40)";
        ctx.font = "30px ui-monospace, monospace";
        ctx.fillText(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }), 540, 560);

        const badgeText = `LVL ${summary.level} · ${summary.rankName}`;
        ctx.font = "bold 34px ui-monospace, monospace";
        const badgeW = Math.max(300, ctx.measureText(badgeText).width + 100);
        ctx.strokeStyle = accentA(0.5);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(540 - badgeW / 2, 650, badgeW, 90, 45);
        ctx.stroke();
        ctx.fillStyle = accent;
        ctx.fillText(badgeText, 540, 707);

        const stats: [string, string][] = [
            ["DURATION", formatClock(summary.duration)],
            ["SETS", String(summary.sets)],
            ["VOLUME", `${Math.round(kgToUnit(summary.volume, weightUnit)).toLocaleString()} ${weightUnit.toUpperCase()}`],
            ["XP EARNED", `+${summary.xpBreakdown.total}`],
        ];
        const cellW = 460, cellH = 220, gap = 40;
        const startX = 540 - cellW - gap / 2;
        const startY = 850;
        stats.forEach(([label, value], i) => {
            const col = i % 2, row = Math.floor(i / 2);
            const x = startX + col * (cellW + gap);
            const y = startY + row * (cellH + gap);
            ctx.strokeStyle = "var(--fg-10)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x, y, cellW, cellH, 20);
            ctx.stroke();
            ctx.fillStyle = "var(--fg-35)";
            ctx.font = "24px ui-monospace, monospace";
            ctx.fillText(label, x + cellW / 2, y + 70);
            ctx.fillStyle = i === 3 ? accent : "#ffffff";
            ctx.font = "bold 56px ui-monospace, monospace";
            ctx.fillText(value, x + cellW / 2, y + 150);
        });

        ctx.fillStyle = "var(--fg-20)";
        ctx.font = "24px ui-monospace, monospace";
        ctx.fillText("sevel.app", 540, 1850);

        return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
    }

    async function handleShare() {
        setSharing(true);
        const blob = await generateShareImage();
        if (!blob) { setSharing(false); return; }

        const file = new File([blob], `sevel-${today}.png`, { type: "image/png" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: "SEVEL Workout Summary" });
            } catch {
                // user cancelled
            }
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `sevel-${today}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }
        setSharing(false);
    }

    async function saveFreestyleAsRecurringPlan() {
        if (!user) return;
        setSavingFreestylePlan(true);
        const weekday = new Date().getDay();
        const weekdayName = new Date().toLocaleDateString(undefined, { weekday: "long" });

        const { data: template } = await supabase.from("workout_templates").insert({ user_id: user.id, name: `${weekdayName} Workout` }).select("id").single();
        if (template) {
            await supabase.from("workout_template_exercises").insert(exercisesList.map((ex, i) => ({
                template_id: template.id, user_id: user.id, exercise_id: ex.exercise_id, order_index: i,
                target_sets: ex.target_sets, target_reps: ex.target_reps, target_weight: ex.target_weight, rest_seconds: ex.rest_seconds,
            })));
            await supabase.from("recurring_plans").insert({ user_id: user.id, weekday, template_id: template.id, is_rest: false, sex: userSex });
        }
        setSavingFreestylePlan(false);
        setShowFreestylePrompt(false);
    }

    /* ── EXTRACTED INLINE ACTIONS ── */
    async function logBodyWeight() {
        if (!user || !preWorkoutWeight) return;
        await supabase.from("body_weight_logs").insert({ user_id: user.id, weight: weightInputToKg(Number(preWorkoutWeight), weightUnit), context: "pre_workout", sex: userSex });
        setWeightLogged(true);
    }

    function confirmExercise(exId: string) {
        setConfirmedExercises((prev) => new Set([...prev, exId]));
        const currentIdx = exercisesList.findIndex((e) => e.id === exId);
        const remaining = exercisesList.slice(currentIdx + 1);
        const next = remaining.find((e) => {
            const eSets = (logs[e.id] ?? []).filter((s) => !s.is_warmup);
            return eSets.length === 0 || eSets.some((s) => !s.completed);
        });
        if (next) setExpandedId(next.id);
        else setExpandedId(null);
    }

    function startAnotherWorkout() {
        setSummary(null);
        setSessionId(null);
        activeSessionRef.current = null;
        setStartedAt(null);
        setElapsed(0);
        setPausedElapsed(0);
        pausedElapsedRef.current = 0;
        setSessionPaused(false);
        setLogs({});
        setConfirmedExercises(new Set());
        setSkippedExercises(new Set());
        setWarmupExercises(new Set());
        setPrCount(0);
        setPrExerciseIds(new Set());
        setLastAction(null);
        setTodaySessions([]);
        setStatus("not_started");
    }

    function startManualRestTimer() {
        const curEx = exercisesList.find((e) => e.id === expandedId);
        const sec = curEx?.rest_seconds ?? 90;
        setRestRemaining(Math.round(sec * (cycleProfile?.restMultiplier ?? 1)));
        setRestPaused(false);
    }

    function addRestTime(seconds: number) {
        setRestRemaining((r) => (r !== null ? r + seconds : null));
    }

    function dismissRestTimer() {
        setRestRemaining(null);
        setRestPaused(false);
    }

    function goBackFromFreestyle() {
        setFreestyleExercises([]);
        setStatus(exercisesList.length > 0 ? "not_started" : "no_plan");
    }

    async function repeatLastSession() {
        if (!user) return;
        let lastSession: { id: string } | null = null;
        const { data: sexMatch } = await supabase
            .from("workout_sessions")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .eq("sex", userSex)
            .order("completed_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        lastSession = sexMatch;
        if (!lastSession) {
            const { data: anyMatch } = await supabase
                .from("workout_sessions")
                .select("id")
                .eq("user_id", user.id)
                .eq("status", "completed")
                .order("completed_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            lastSession = anyMatch;
        }
        if (!lastSession) {
            setStatus("freestyle");
            return;
        }

        const { data: lastLogs } = await supabase
            .from("exercise_set_logs")
            .select("exercise_id, exercises(name, category, equipment, body_segment, is_unilateral, per_side_weight, image_url)")
            .eq("workout_session_id", lastSession.id)
            .order("set_index");
        if (!lastLogs || lastLogs.length === 0) {
            setStatus("freestyle");
            return;
        }

        const seen = new Set<string>();
        const exercises: WorkoutExercise[] = [];
        let idx = 0;
        for (const log of lastLogs) {
            if (seen.has(log.exercise_id)) continue;
            seen.add(log.exercise_id);
            const ex = (log as any).exercises;
            const seg = ex?.body_segment ?? "";
            const equip = ex?.equipment ?? "";
            const setsCount = lastLogs.filter(l => l.exercise_id === log.exercise_id).length;
            exercises.push({
                id: `repeat-${idx}-${Date.now()}`,
                exercise_id: log.exercise_id,
                order_index: idx,
                target_sets: setsCount || 3,
                target_reps: "8-10",
                target_weight: null,
                rest_seconds: 90,
                name: ex?.name ?? "Unknown",
                category: ex?.category ?? "",
                equipment: equip,
                body_segment: seg,
                isCardio: seg === "Cardio",
                isBodyweight: equip.toLowerCase() === "bodyweight" && seg !== "Cardio",
                is_unilateral: ex?.is_unilateral ?? false,
                per_side_weight: ex?.per_side_weight ?? false,
                tracking_mode: ex?.tracking_mode ?? "weight_reps",
                discipline: ex?.discipline ?? "strength",
                image_url: ex?.image_url ?? null,
            });
            idx++;
        }
        setFreestyleExercises(exercises);
        setStatus("freestyle");
    }

    return {
        // Core state
        status, dayTitle, scheduledDayId, exercisesList, logs, sessionId, startedAt, elapsed,

        // UI state
        expandedId, restRemaining, restPaused, sessionPaused, pausedElapsed,
        swapTargetId, showAddModal, showEndConfirm, showCancelConfirm, showFreestyleAddModal,
        showDeletePlanConfirm, showFreestylePrompt, finishing, sharing,

        // Data
        lastPerformance, lastSets, predictedSets, overloadHints, summary, todaySessions,
        recentSessions, weekDays, weeklyVolumes, statsLoaded, sessionCount, nextSession, staleExercises,
        cycleProfile, energyForecast, exerciseRisks, substitutions,
        freestyleExercises, skippedExercises, warmupExercises,
        confirmedExercises, prCount, prExerciseIds, preWorkoutWeight, weightLogged, lastAction,
        startingFreestyle, savingFreestylePlan, deletingPlan,

        // Derived
        hasLoaded, loadHint: cachedInit.current!.loadHint, loadProgress, totalPlanned, completedCount, sessionVolume, today, weightUnit, userSex, equipmentAccess,

        // Constants
        MAX_SESSIONS_PER_DAY,

        // Setters (used directly in JSX for simple state toggles)
        setExpandedId, setSwapTargetId, setShowAddModal, setShowEndConfirm,
        setShowFreestyleAddModal, setShowDeletePlanConfirm, setStatus,
        setRestRemaining, setRestPaused, setSessionPaused, setPreWorkoutWeight,
        setSummary, setSessionId, setShowFreestylePrompt, setShowCancelConfirm,
        setFreestyleExercises,

        // Actions
        startWorkout, beginFreestyleSession, addFreestyleExercise, removeFreestyleExercise, repeatLastSession,
        updateSet, completeSet, editSet, undoLastSet, updateSetRpe, addDropSet, addRestPauseSet, toggleSuperset, getSupersetGroup, handleSwap, handleAddExercise, addSet, removeSet,
        deletePlan, removeExercise, skipExercise, unskipExercise, laterExercise, toggleWarmup,
        finishWorkout, handleShare, saveFreestyleAsRecurringPlan, cancelSession,
        logBodyWeight, confirmExercise, startAnotherWorkout, startManualRestTimer,
        addRestTime, dismissRestTimer, goBackFromFreestyle,
    };
}

// Re-export types used by cycleTrainingEngine for JSX access
export { getCycleAdjustedWeight } from "./cycleTrainingEngine";
export type { PhaseTrainingProfile, EnergyForecast, ExerciseRisk } from "./cycleTrainingEngine";
export type { Substitution } from "./substitutionEngine";
export { kgToUnit } from "./units";
